import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// Mock the database functions
vi.mock("./db", () => ({
  createPlace: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    name: "Test Restaurant",
    address: "Tokyo, Japan",
    latitude: "35.6812",
    longitude: "139.7671",
    genre: "Italian",
    features: ["個室あり", "カップル向け"],
    summary: "素敵なイタリアンレストラン",
    source: "Google",
    googleMapsUrl: "https://maps.google.com/...",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getPlacesByUserId: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      name: "Test Restaurant",
      address: "Tokyo, Japan",
      latitude: "35.6812",
      longitude: "139.7671",
      genre: "Italian",
      features: ["個室あり"],
      summary: "素敵なレストラン",
      source: "Google",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getPlaceById: vi.fn().mockImplementation((id: number) => {
    if (id === 1) {
      return Promise.resolve({
        id: 1,
        userId: 1,
        name: "Test Restaurant",
        address: "Tokyo, Japan",
        latitude: "35.6812",
        longitude: "139.7671",
        genre: "Italian",
        features: ["個室あり"],
        summary: "素敵なレストラン",
        source: "Google",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return Promise.resolve(undefined);
  }),
  updatePlace: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    name: "Updated Restaurant",
    address: "Tokyo, Japan",
    latitude: "35.6812",
    longitude: "139.7671",
    genre: "Italian",
    features: ["個室あり", "静か"],
    summary: "更新されたレストラン",
    source: "Google",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  deletePlace: vi.fn().mockResolvedValue(undefined),
  searchPlaces: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      name: "Italian Restaurant",
      address: "Tokyo, Japan",
      genre: "Italian",
      features: ["個室あり", "カップル向け"],
      summary: "素敵なイタリアン",
    },
  ]),
  getListsForPlace: vi.fn().mockResolvedValue([]),
}));

describe("place router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("place.create", () => {
    it("creates a place for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.place.create({
        name: "Test Restaurant",
        address: "Tokyo, Japan",
        latitude: 35.6812,
        longitude: 139.7671,
        genre: "Italian",
        features: ["個室あり", "カップル向け"],
      });

      expect(result).toBeDefined();
      expect(result.name).toBe("Test Restaurant");
      expect(result.genre).toBe("Italian");
    });

    it("throws error for unauthenticated user", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.place.create({
          name: "Test Restaurant",
        })
      ).rejects.toThrow();
    });
  });

  describe("place.list", () => {
    it("returns places for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.place.list();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].name).toBe("Test Restaurant");
    });

    it("throws error for unauthenticated user", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.place.list()).rejects.toThrow();
    });
  });

  describe("place.get", () => {
    it("returns a place by id for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.place.get({ id: 1 });

      expect(result).toBeDefined();
      expect(result?.name).toBe("Test Restaurant");
    });

    it("returns null for non-existent place", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.place.get({ id: 999 });

      expect(result).toBeNull();
    });
  });

  describe("place.search", () => {
    it("searches places with query", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.place.search({
        query: "Italian",
        features: ["個室あり"],
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it("searches places with features only", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.place.search({
        features: ["カップル向け"],
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

describe("place.delete", () => {
  it("deletes a place for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.place.delete({ id: 1 });

    expect(result.success).toBe(true);
  });

  it("throws error when deleting non-existent place", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.place.delete({ id: 999 })).rejects.toThrow();
  });
});

describe("place.updateStatus", () => {
  it("updates place status to want_to_go", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.place.updateStatus({
      id: 1,
      status: "want_to_go",
    });

    expect(result).toBeDefined();
  });

  it("updates place status to visited", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.place.updateStatus({
      id: 1,
      status: "visited",
    });

    expect(result).toBeDefined();
  });

  it("throws error for non-existent place", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.place.updateStatus({ id: 999, status: "visited" })
    ).rejects.toThrow();
  });
});

describe("place.updateRating", () => {
  it("updates user rating for a place", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.place.updateRating({
      id: 1,
      userRating: 4,
      userNote: "美味しかった！",
    });

    expect(result).toBeDefined();
  });

  it("clears user rating when set to null", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.place.updateRating({
      id: 1,
      userRating: null,
    });

    expect(result).toBeDefined();
  });

  it("throws error for non-existent place", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.place.updateRating({ id: 999, userRating: 5 })
    ).rejects.toThrow();
  });
});
});
