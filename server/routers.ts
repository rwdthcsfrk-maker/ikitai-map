import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { PARENT_GENRES, CHILD_GENRES, BUDGET_BANDS, DISTANCE_OPTIONS, FEATURE_OPTIONS, SORT_OPTIONS, PREFECTURES } from "@shared/masters";

// ==================== Place Router ====================
const placeRouter = router({
  create: protectedProcedure
    .input(z.object({
      googlePlaceId: z.string().optional(),
      name: z.string().min(1),
      address: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      genre: z.string().optional(),
      features: z.array(z.string()).optional(),
      summary: z.string().optional(),
      source: z.string().optional(),
      googleMapsUrl: z.string().optional(),
      phoneNumber: z.string().optional(),
      rating: z.number().optional(),
      priceLevel: z.number().optional(),
      photoUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.createPlace({
        userId: ctx.user.id,
        ...input,
        latitude: input.latitude?.toString(),
        longitude: input.longitude?.toString(),
        rating: input.rating?.toString(),
      });
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getPlacesByUserId(ctx.user.id);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const place = await db.getPlaceById(input.id);
      if (!place || place.userId !== ctx.user.id) {
        return null;
      }
      return place;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      address: z.string().optional(),
      genre: z.string().optional(),
      features: z.array(z.string()).optional(),
      summary: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const place = await db.getPlaceById(input.id);
      if (!place || place.userId !== ctx.user.id) {
        throw new Error("Place not found or unauthorized");
      }
      const { id, ...data } = input;
      return db.updatePlace(id, data);
    }),

  // Update place status (want_to_go, visited, none)
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["none", "want_to_go", "visited"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const place = await db.getPlaceById(input.id);
      if (!place || place.userId !== ctx.user.id) {
        throw new Error("Place not found or unauthorized");
      }
      const updateData: { status: "none" | "want_to_go" | "visited"; visitedAt?: Date | null } = {
        status: input.status,
      };
      // Set visitedAt when marking as visited
      if (input.status === "visited") {
        updateData.visitedAt = new Date();
      } else {
        updateData.visitedAt = null;
      }
      return db.updatePlace(input.id, updateData);
    }),

  // Update user rating and note
  updateRating: protectedProcedure
    .input(z.object({
      id: z.number(),
      userRating: z.number().min(1).max(5).nullable(),
      userNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const place = await db.getPlaceById(input.id);
      if (!place || place.userId !== ctx.user.id) {
        throw new Error("Place not found or unauthorized");
      }
      return db.updatePlace(input.id, {
        userRating: input.userRating,
        userNote: input.userNote,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const place = await db.getPlaceById(input.id);
      if (!place || place.userId !== ctx.user.id) {
        throw new Error("Place not found or unauthorized");
      }
      await db.deletePlace(input.id);
      return { success: true };
    }),

  search: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
      features: z.array(z.string()).optional(),
      status: z.enum(["none", "want_to_go", "visited"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return db.searchPlaces(ctx.user.id, input.query || "", input.features, input.status);
    }),

  getListsForPlace: protectedProcedure
    .input(z.object({ placeId: z.number() }))
    .query(async ({ input }) => {
      return db.getListsForPlace(input.placeId);
    }),
});

// ==================== List Router ====================
const listRouter = router({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      color: z.string().optional(),
      icon: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.createList({
        userId: ctx.user.id,
        ...input,
      });
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const lists = await db.getListsByUserId(ctx.user.id);
    const listsWithCount = await Promise.all(
      lists.map(async (list) => ({
        ...list,
        placeCount: await db.getListPlaceCount(list.id),
      }))
    );
    return listsWithCount;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const list = await db.getListById(input.id);
      if (!list || list.userId !== ctx.user.id) {
        return null;
      }
      const places = await db.getPlacesInList(input.id);
      return { ...list, places };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      color: z.string().optional(),
      icon: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const list = await db.getListById(input.id);
      if (!list || list.userId !== ctx.user.id) {
        throw new Error("List not found or unauthorized");
      }
      const { id, ...data } = input;
      return db.updateList(id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const list = await db.getListById(input.id);
      if (!list || list.userId !== ctx.user.id) {
        throw new Error("List not found or unauthorized");
      }
      await db.deleteList(input.id);
      return { success: true };
    }),

  addPlace: protectedProcedure
    .input(z.object({
      listId: z.number(),
      placeId: z.number(),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const list = await db.getListById(input.listId);
      if (!list || list.userId !== ctx.user.id) {
        throw new Error("List not found or unauthorized");
      }
      const place = await db.getPlaceById(input.placeId);
      if (!place || place.userId !== ctx.user.id) {
        throw new Error("Place not found or unauthorized");
      }
      await db.addPlaceToList(input.listId, input.placeId, input.note);
      return { success: true };
    }),

  removePlace: protectedProcedure
    .input(z.object({
      listId: z.number(),
      placeId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const list = await db.getListById(input.listId);
      if (!list || list.userId !== ctx.user.id) {
        throw new Error("List not found or unauthorized");
      }
      await db.removePlaceFromList(input.listId, input.placeId);
      return { success: true };
    }),
});

// ==================== AI Router ====================
const aiRouter = router({
  generateSummary: protectedProcedure
    .input(z.object({
      name: z.string(),
      address: z.string().optional(),
      genre: z.string().optional(),
      rating: z.number().optional(),
      priceLevel: z.number().optional(),
      reviews: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const prompt = `以下の飲食店情報から、1〜2行の簡潔な要約と特徴タグを生成してください。

店名: ${input.name}
住所: ${input.address || "不明"}
ジャンル: ${input.genre || "不明"}
評価: ${input.rating ? `${input.rating}/5` : "不明"}
価格帯: ${input.priceLevel ? "¥".repeat(input.priceLevel) : "不明"}
${input.reviews?.length ? `レビュー抜粋: ${input.reviews.slice(0, 3).join(" / ")}` : ""}

出力形式（JSON）:
{
  "summary": "店舗の雰囲気や特徴を1〜2行で",
  "features": ["個室あり", "カップル向け", "静か", "会食向き", "カジュアル", "高級感", "子連れOK"] のうち該当するもの,
  "genre": "イタリアン" などジャンル名
}`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "あなたは飲食店情報を要約するアシスタントです。JSON形式で出力してください。" },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "place_summary",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "店舗の要約（1〜2行）" },
                  features: { type: "array", items: { type: "string" }, description: "特徴タグ" },
                  genre: { type: "string", description: "ジャンル名" },
                },
                required: ["summary", "features", "genre"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (content && typeof content === 'string') {
          return JSON.parse(content);
        }
        return { summary: "", features: [], genre: input.genre || "" };
      } catch (error) {
        console.error("LLM error:", error);
        return { summary: "", features: [], genre: input.genre || "" };
      }
    }),

  parseSearchQuery: protectedProcedure
    .input(z.object({ query: z.string() }))
    .mutation(async ({ input }) => {
      const prompt = `以下の自然言語の検索クエリを解析し、検索条件を抽出してください。

クエリ: "${input.query}"

出力形式（JSON）:
{
  "keywords": ["検索キーワード"],
  "features": ["個室あり", "カップル向け", "静か", "会食向き", "カジュアル", "高級感", "子連れOK"] のうち該当するもの,
  "genre": "イタリアン" などジャンル名（なければnull）,
  "priceRange": "high" | "medium" | "low" | null
}`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "あなたは検索クエリを解析するアシスタントです。JSON形式で出力してください。" },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "search_query",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  keywords: { type: "array", items: { type: "string" }, description: "検索キーワード" },
                  features: { type: "array", items: { type: "string" }, description: "特徴タグ" },
                  genre: { type: ["string", "null"], description: "ジャンル名" },
                  priceRange: { type: ["string", "null"], enum: ["high", "medium", "low", null], description: "価格帯" },
                },
                required: ["keywords", "features", "genre", "priceRange"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (content && typeof content === 'string') {
          return JSON.parse(content);
        }
        return { keywords: [input.query], features: [], genre: null, priceRange: null };
      } catch (error) {
        console.error("LLM error:", error);
        return { keywords: [input.query], features: [], genre: null, priceRange: null };
      }
    }),
});

// ==================== User Router ====================
const userRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserStats(ctx.user.id);
  }),

  detailedStats: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserDetailedStats(ctx.user.id);
  }),
});

// ==================== Master Router ====================
const masterRouter = router({
  genres: publicProcedure.query(() => ({
    parents: PARENT_GENRES,
    children: CHILD_GENRES,
  })),
  budgets: publicProcedure.query(() => BUDGET_BANDS),
  distances: publicProcedure.query(() => DISTANCE_OPTIONS),
  features: publicProcedure.query(() => FEATURE_OPTIONS),
  sortOptions: publicProcedure.query(() => SORT_OPTIONS),
  prefectures: publicProcedure.query(() => PREFECTURES),
});

// ==================== Advanced Search Router ====================
const advancedSearchRouter = router({
  filter: protectedProcedure
    .input(z.object({
      location: z.object({
        lat: z.number(),
        lng: z.number(),
      }).optional(),
      distanceRadius: z.number().nullable().optional(),
      prefecture: z.string().optional(),
      genreParent: z.string().optional(),
      genreChild: z.string().optional(),
      budgetType: z.enum(['lunch', 'dinner']).optional(),
      budgetBand: z.string().optional(),
      openNow: z.boolean().optional(),
      features: z.array(z.string()).optional(),
      status: z.enum(['none', 'want_to_go', 'visited']).optional(),
      sort: z.enum(['recommended', 'distance', 'rating', 'reviews', 'new']).optional(),
      page: z.number().optional(),
      limit: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return db.advancedSearchPlaces(ctx.user.id, input);
    }),
});

// ==================== Main Router ====================
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  user: userRouter,
  place: placeRouter,
  list: listRouter,
  ai: aiRouter,
  master: masterRouter,
  advancedSearch: advancedSearchRouter,
});

export type AppRouter = typeof appRouter;
