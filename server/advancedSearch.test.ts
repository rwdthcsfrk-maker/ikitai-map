import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
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

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("master router", () => {
  it("returns genre master data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.master.genres();

    expect(result).toHaveProperty("parents");
    expect(result).toHaveProperty("children");
    expect(Array.isArray(result.parents)).toBe(true);
    expect(result.parents.length).toBeGreaterThan(0);
    expect(result.parents[0]).toHaveProperty("id");
    expect(result.parents[0]).toHaveProperty("name");
  });

  it("returns budget master data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.master.budgets();

    expect(result).toHaveProperty("lunch");
    expect(result).toHaveProperty("dinner");
    expect(Array.isArray(result.lunch)).toBe(true);
    expect(Array.isArray(result.dinner)).toBe(true);
  });

  it("returns distance options", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.master.distances();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("label");
  });

  it("returns feature options", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.master.features();

    expect(result).toHaveProperty("smoking");
    expect(result).toHaveProperty("privateRoom");
    expect(result).toHaveProperty("takeout");
    expect(result).toHaveProperty("wifi");
  });

  it("returns sort options", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.master.sortOptions();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result.find((s) => s.id === "recommended")).toBeDefined();
    expect(result.find((s) => s.id === "distance")).toBeDefined();
  });

  it("returns prefecture list", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.master.prefectures();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(47); // 47 prefectures in Japan
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("name");
  });
});

describe("advancedSearch router", () => {
  it("returns search results with default filters", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.advancedSearch.filter({});

    expect(result).toHaveProperty("places");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page");
    expect(result).toHaveProperty("limit");
    expect(result).toHaveProperty("hasMore");
    expect(Array.isArray(result.places)).toBe(true);
  });

  it("accepts genre filter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.advancedSearch.filter({
      genreParent: "japanese",
    });

    expect(result).toHaveProperty("places");
    expect(result).toHaveProperty("total");
  });

  it("accepts budget filter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.advancedSearch.filter({
      budgetType: "lunch",
      budgetBand: "lunch_1000",
    });

    expect(result).toHaveProperty("places");
  });

  it("accepts location and distance filter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.advancedSearch.filter({
      location: { lat: 35.6812, lng: 139.7671 },
      distanceRadius: 1000,
    });

    expect(result).toHaveProperty("places");
  });

  it("accepts features filter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.advancedSearch.filter({
      features: ["private_room", "non_smoking"],
    });

    expect(result).toHaveProperty("places");
  });

  it("accepts status filter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.advancedSearch.filter({
      status: "want_to_go",
    });

    expect(result).toHaveProperty("places");
  });

  it("accepts sort option", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.advancedSearch.filter({
      sort: "rating",
    });

    expect(result).toHaveProperty("places");
  });

  it("accepts pagination", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.advancedSearch.filter({
      page: 2,
      limit: 10,
    });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
  });

  it("accepts combined filters", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.advancedSearch.filter({
      genreParent: "italian",
      budgetType: "dinner",
      budgetBand: "dinner_5000",
      features: ["private_room"],
      status: "want_to_go",
      sort: "rating",
      page: 1,
      limit: 20,
    });

    expect(result).toHaveProperty("places");
    expect(result).toHaveProperty("total");
  });
});
