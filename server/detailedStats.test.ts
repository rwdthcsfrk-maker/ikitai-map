import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("user.stats", () => {
  it("returns user statistics", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.user.stats();

    expect(result).toHaveProperty("totalPlaces");
    expect(result).toHaveProperty("totalLists");
    expect(result).toHaveProperty("visitedCount");
    expect(result).toHaveProperty("wantToGoCount");
    expect(typeof result.totalPlaces).toBe("number");
    expect(typeof result.totalLists).toBe("number");
    expect(typeof result.visitedCount).toBe("number");
    expect(typeof result.wantToGoCount).toBe("number");
  });
});

describe("user.detailedStats", () => {
  it("returns detailed user statistics", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.user.detailedStats();

    // Check structure
    expect(result).toHaveProperty("ratingDistribution");
    expect(result).toHaveProperty("genreStats");
    expect(result).toHaveProperty("visitHistory");
    expect(result).toHaveProperty("avgRating");
    expect(result).toHaveProperty("ratedCount");

    // Check types
    expect(Array.isArray(result.ratingDistribution)).toBe(true);
    expect(Array.isArray(result.genreStats)).toBe(true);
    expect(Array.isArray(result.visitHistory)).toBe(true);
    expect(typeof result.ratedCount).toBe("number");

    // Check rating distribution structure
    expect(result.ratingDistribution.length).toBe(5);
    result.ratingDistribution.forEach((item) => {
      expect(item).toHaveProperty("range");
      expect(item).toHaveProperty("count");
      expect(typeof item.range).toBe("string");
      expect(typeof item.count).toBe("number");
    });
  });

  it("rating distribution has correct ranges", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.user.detailedStats();

    const expectedRanges = ["0-20", "21-40", "41-60", "61-80", "81-100"];
    const actualRanges = result.ratingDistribution.map((r) => r.range);
    
    expect(actualRanges).toEqual(expectedRanges);
  });
});

describe("master.genres", () => {
  it("returns genre master data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.master.genres();

    expect(result).toHaveProperty("parents");
    expect(result).toHaveProperty("children");
    expect(Array.isArray(result.parents)).toBe(true);
    expect(result.parents.length).toBeGreaterThan(0);
    
    // Check parent genre structure
    result.parents.forEach((parent) => {
      expect(parent).toHaveProperty("id");
      expect(parent).toHaveProperty("name");
      expect(parent).toHaveProperty("icon");
    });
  });
});

describe("master.budgets", () => {
  it("returns budget master data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.master.budgets();

    expect(result).toHaveProperty("lunch");
    expect(result).toHaveProperty("dinner");
    expect(Array.isArray(result.lunch)).toBe(true);
    expect(Array.isArray(result.dinner)).toBe(true);
    expect(result.lunch.length).toBeGreaterThan(0);
    expect(result.dinner.length).toBeGreaterThan(0);
  });
});

describe("master.distances", () => {
  it("returns distance options", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.master.distances();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    
    result.forEach((option) => {
      expect(option).toHaveProperty("id");
      expect(option).toHaveProperty("label");
      expect(option).toHaveProperty("meters");
    });
  });
});
