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
  createList: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    name: "デート用",
    description: "デートで行きたいお店",
    color: "#ef4444",
    icon: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getListsByUserId: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      name: "デート用",
      description: "デートで行きたいお店",
      color: "#ef4444",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      userId: 1,
      name: "会食用",
      description: "接待で使えるお店",
      color: "#3b82f6",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getListById: vi.fn().mockImplementation((id: number) => {
    if (id === 1) {
      return Promise.resolve({
        id: 1,
        userId: 1,
        name: "デート用",
        description: "デートで行きたいお店",
        color: "#ef4444",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return Promise.resolve(undefined);
  }),
  updateList: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    name: "更新されたリスト",
    description: "更新された説明",
    color: "#22c55e",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  deleteList: vi.fn().mockResolvedValue(undefined),
  getListPlaceCount: vi.fn().mockResolvedValue(3),
  getPlacesInList: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      name: "Test Restaurant",
      address: "Tokyo, Japan",
      genre: "Italian",
    },
  ]),
  addPlaceToList: vi.fn().mockResolvedValue(undefined),
  removePlaceFromList: vi.fn().mockResolvedValue(undefined),
  getPlaceById: vi.fn().mockImplementation((id: number) => {
    if (id === 1) {
      return Promise.resolve({
        id: 1,
        userId: 1,
        name: "Test Restaurant",
      });
    }
    return Promise.resolve(undefined);
  }),
}));

describe("list router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list.create", () => {
    it("creates a list for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.list.create({
        name: "デート用",
        description: "デートで行きたいお店",
        color: "#ef4444",
      });

      expect(result).toBeDefined();
      expect(result.name).toBe("デート用");
      expect(result.color).toBe("#ef4444");
    });

    it("throws error for unauthenticated user", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.list.create({
          name: "デート用",
        })
      ).rejects.toThrow();
    });
  });

  describe("list.list", () => {
    it("returns lists with place count for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.list.list();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0].name).toBe("デート用");
      expect(result[0].placeCount).toBe(3);
    });

    it("throws error for unauthenticated user", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.list.list()).rejects.toThrow();
    });
  });

  describe("list.get", () => {
    it("returns a list with places by id", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.list.get({ id: 1 });

      expect(result).toBeDefined();
      expect(result?.name).toBe("デート用");
      expect(result?.places).toBeDefined();
      expect(Array.isArray(result?.places)).toBe(true);
    });

    it("returns null for non-existent list", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.list.get({ id: 999 });

      expect(result).toBeNull();
    });
  });

  describe("list.delete", () => {
    it("deletes a list for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.list.delete({ id: 1 });

      expect(result.success).toBe(true);
    });

    it("throws error when deleting non-existent list", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.list.delete({ id: 999 })).rejects.toThrow();
    });
  });

  describe("list.addPlace", () => {
    it("adds a place to a list", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.list.addPlace({
        listId: 1,
        placeId: 1,
      });

      expect(result.success).toBe(true);
    });

    it("throws error for non-existent list", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.list.addPlace({
          listId: 999,
          placeId: 1,
        })
      ).rejects.toThrow();
    });
  });

  describe("list.removePlace", () => {
    it("removes a place from a list", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.list.removePlace({
        listId: 1,
        placeId: 1,
      });

      expect(result.success).toBe(true);
    });
  });
});
