import { eq, and, like, or, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, places, lists, listPlaces, listMembers, InsertPlace, InsertList, InsertListPlace, InsertListMember, Place, List } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== User Queries ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return null;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return null;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ==================== Place Queries ====================

export async function createPlace(place: InsertPlace): Promise<Place> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(places).values(place);
  const insertId = result[0].insertId;
  
  const [newPlace] = await db.select().from(places).where(eq(places.id, insertId));
  return newPlace;
}

export async function getPlaceById(id: number): Promise<Place | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const [place] = await db.select().from(places).where(eq(places.id, id));
  return place;
}

export async function getPlacesByUserId(userId: number): Promise<Place[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(places).where(eq(places.userId, userId)).orderBy(sql`${places.createdAt} DESC`);
}

export async function updatePlace(id: number, data: Partial<InsertPlace>): Promise<Place | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  await db.update(places).set(data).where(eq(places.id, id));
  return getPlaceById(id);
}

export async function deletePlace(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(listPlaces).where(eq(listPlaces.placeId, id));
  await db.delete(places).where(eq(places.id, id));
}

export async function searchPlaces(
  userId: number,
  query: string,
  features?: string[],
  status?: "none" | "want_to_go" | "visited"
): Promise<Place[]> {
  const db = await getDb();
  if (!db) return [];
  
  let conditions = [eq(places.userId, userId)];
  
  if (query) {
    conditions.push(
      or(
        like(places.name, `%${query}%`),
        like(places.address, `%${query}%`),
        like(places.genre, `%${query}%`),
        like(places.summary, `%${query}%`)
      )!
    );
  }

  if (status) {
    conditions.push(eq(places.status, status));
  }
  
  const results = await db.select().from(places).where(and(...conditions));
  
  if (features && features.length > 0) {
    return results.filter(place => {
      if (!place.features) return false;
      return features.some(f => place.features?.includes(f));
    });
  }
  
  return results;
}

// ==================== List Queries ====================

export async function createList(list: InsertList): Promise<List> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(lists).values(list);
  const insertId = result[0].insertId;
  
  const [newList] = await db.select().from(lists).where(eq(lists.id, insertId));
  return newList;
}

export async function getListById(id: number): Promise<List | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const [list] = await db.select().from(lists).where(eq(lists.id, id));
  return list;
}

export async function getListsByUserId(userId: number): Promise<List[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(lists).where(eq(lists.userId, userId)).orderBy(sql`${lists.createdAt} DESC`);
}

export async function getListsSharedWithUser(userId: number): Promise<List[]> {
  const db = await getDb();
  if (!db) return [];

  const relations = await db
    .select()
    .from(listMembers)
    .where(eq(listMembers.userId, userId));

  if (relations.length === 0) return [];

  const listIds = relations.map((relation) => relation.listId);
  return db
    .select()
    .from(lists)
    .where(and(inArray(lists.id, listIds), sql`${lists.userId} <> ${userId}`));
}

export async function updateList(id: number, data: Partial<InsertList>): Promise<List | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  await db.update(lists).set(data).where(eq(lists.id, id));
  return getListById(id);
}

export async function deleteList(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(listPlaces).where(eq(listPlaces.listId, id));
  await db.delete(listMembers).where(eq(listMembers.listId, id));
  await db.delete(lists).where(eq(lists.id, id));
}

// ==================== ListPlace Queries ====================

export async function addPlaceToList(listId: number, placeId: number, note?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const existing = await db.select().from(listPlaces)
    .where(and(eq(listPlaces.listId, listId), eq(listPlaces.placeId, placeId)));
  
  if (existing.length === 0) {
    await db.insert(listPlaces).values({ listId, placeId, note });
  }
}

export async function removePlaceFromList(listId: number, placeId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(listPlaces).where(
    and(eq(listPlaces.listId, listId), eq(listPlaces.placeId, placeId))
  );
}

export async function getPlacesInList(listId: number): Promise<Place[]> {
  const db = await getDb();
  if (!db) return [];
  
  const relations = await db.select().from(listPlaces).where(eq(listPlaces.listId, listId));
  
  if (relations.length === 0) return [];
  
  const placeIds = relations.map(r => r.placeId);
  return db.select().from(places).where(inArray(places.id, placeIds));
}

export async function getListsForPlace(placeId: number): Promise<List[]> {
  const db = await getDb();
  if (!db) return [];
  
  const relations = await db.select().from(listPlaces).where(eq(listPlaces.placeId, placeId));
  
  if (relations.length === 0) return [];
  
  const listIds = relations.map(r => r.listId);
  return db.select().from(lists).where(inArray(lists.id, listIds));
}

export async function getListPlaceCount(listId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(listPlaces)
    .where(eq(listPlaces.listId, listId));
  
  return result[0]?.count ?? 0;
}

// ==================== List Member Queries ====================

export async function getListMemberRole(listId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(listMembers)
    .where(and(eq(listMembers.listId, listId), eq(listMembers.userId, userId)))
    .limit(1);

  return result[0]?.role ?? null;
}

export async function addListMember(input: InsertListMember): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(listMembers)
    .where(and(eq(listMembers.listId, input.listId), eq(listMembers.userId, input.userId)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(listMembers).values(input);
  } else {
    await db
      .update(listMembers)
      .set({ role: input.role })
      .where(and(eq(listMembers.listId, input.listId), eq(listMembers.userId, input.userId)));
  }
}

export async function removeListMember(listId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .delete(listMembers)
    .where(and(eq(listMembers.listId, listId), eq(listMembers.userId, userId)));
}

export async function getListMembers(listId: number) {
  const db = await getDb();
  if (!db) return [];

  const relations = await db.select().from(listMembers).where(eq(listMembers.listId, listId));

  if (relations.length === 0) return [];

  const userIds = relations.map((relation) => relation.userId);
  const usersResult = await db.select().from(users).where(inArray(users.id, userIds));

  return relations.map((relation) => {
    const user = usersResult.find((u) => u.id === relation.userId);
    return {
      userId: relation.userId,
      role: relation.role,
      name: user?.name ?? "",
      email: user?.email ?? "",
    };
  });
}


// ==================== Statistics Queries ====================

export async function getUserStats(userId: number): Promise<{
  totalPlaces: number;
  totalLists: number;
  visitedCount: number;
  wantToGoCount: number;
}> {
  const db = await getDb();
  if (!db) {
    return { totalPlaces: 0, totalLists: 0, visitedCount: 0, wantToGoCount: 0 };
  }

  // Total places
  const placesResult = await db.select({ count: sql<number>`count(*)` })
    .from(places)
    .where(eq(places.userId, userId));
  const totalPlaces = placesResult[0]?.count ?? 0;

  // Total lists
  const listsResult = await db.select({ count: sql<number>`count(*)` })
    .from(lists)
    .where(eq(lists.userId, userId));
  const totalLists = listsResult[0]?.count ?? 0;

  // Visited count
  const visitedResult = await db.select({ count: sql<number>`count(*)` })
    .from(places)
    .where(and(eq(places.userId, userId), eq(places.status, "visited")));
  const visitedCount = visitedResult[0]?.count ?? 0;

  // Want to go count
  const wantToGoResult = await db.select({ count: sql<number>`count(*)` })
    .from(places)
    .where(and(eq(places.userId, userId), eq(places.status, "want_to_go")));
  const wantToGoCount = wantToGoResult[0]?.count ?? 0;

  return { totalPlaces, totalLists, visitedCount, wantToGoCount };
}


// ==================== Advanced Search Queries ====================

export interface AdvancedSearchFilters {
  // エリア・距離
  location?: { lat: number; lng: number };
  distanceRadius?: number | null;
  prefecture?: string;

  // ジャンル
  genreParent?: string;
  genreChild?: string;

  // 予算
  budgetType?: 'lunch' | 'dinner';
  budgetBand?: string;

  // 営業
  openNow?: boolean;

  // 特徴
  features?: string[];

  // ステータス
  status?: 'none' | 'want_to_go' | 'visited';

  // 並び替え
  sort?: 'recommended' | 'distance' | 'rating' | 'reviews' | 'new';

  // ページネーション
  page?: number;
  limit?: number;
}

export interface PlaceWithDistance extends Place {
  distance?: number;
}

export interface AdvancedSearchResult {
  places: PlaceWithDistance[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function advancedSearchPlaces(
  userId: number,
  filters: AdvancedSearchFilters
): Promise<AdvancedSearchResult> {
  const db = await getDb();
  if (!db) {
    return { places: [], total: 0, page: 1, limit: 20, hasMore: false };
  }

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  // Build conditions
  let conditions = [eq(places.userId, userId)];

  // Genre filter
  if (filters.genreParent) {
    conditions.push(eq(places.genreParent, filters.genreParent));
  }
  if (filters.genreChild) {
    conditions.push(eq(places.genreChild, filters.genreChild));
  }

  // Budget filter
  if (filters.budgetBand) {
    if (filters.budgetType === 'lunch') {
      conditions.push(eq(places.budgetLunch, filters.budgetBand));
    } else if (filters.budgetType === 'dinner') {
      conditions.push(eq(places.budgetDinner, filters.budgetBand));
    }
  }

  // Status filter
  if (filters.status) {
    conditions.push(eq(places.status, filters.status));
  }

  // Prefecture filter (check in address)
  if (filters.prefecture) {
    conditions.push(like(places.address, `%${filters.prefecture}%`));
  }

  // Get all matching places
  let results = await db.select().from(places).where(and(...conditions));

  // Filter by features (in-memory, since features is JSON)
  if (filters.features && filters.features.length > 0) {
    results = results.filter(place => {
      if (!place.features) return false;
      return filters.features!.some(f => place.features?.includes(f));
    });
  }

  // Calculate distances and filter by radius
  let placesWithDistance: PlaceWithDistance[] = results.map(place => {
    let distance: number | undefined;
    if (filters.location && place.latitude && place.longitude) {
      distance = calculateDistance(
        filters.location.lat,
        filters.location.lng,
        parseFloat(place.latitude),
        parseFloat(place.longitude)
      );
    }
    return { ...place, distance };
  });

  // Filter by distance radius
  if (filters.location && filters.distanceRadius) {
    placesWithDistance = placesWithDistance.filter(place => {
      if (place.distance === undefined) return true;
      return place.distance <= filters.distanceRadius!;
    });
  }

  // Sort
  switch (filters.sort) {
    case 'distance':
      placesWithDistance.sort((a, b) => {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      });
      break;
    case 'rating':
      placesWithDistance.sort((a, b) => {
        const ratingA = a.rating ? parseFloat(a.rating) : 0;
        const ratingB = b.rating ? parseFloat(b.rating) : 0;
        return ratingB - ratingA;
      });
      break;
    case 'reviews':
      placesWithDistance.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
      break;
    case 'new':
      placesWithDistance.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
    case 'recommended':
    default:
      // Default: mix of rating and recency
      placesWithDistance.sort((a, b) => {
        const ratingA = a.rating ? parseFloat(a.rating) : 0;
        const ratingB = b.rating ? parseFloat(b.rating) : 0;
        const scoreA = ratingA * 0.7 + (a.userRating || 0) * 0.3;
        const scoreB = ratingB * 0.7 + (b.userRating || 0) * 0.3;
        return scoreB - scoreA;
      });
      break;
  }

  const total = placesWithDistance.length;
  const paginatedResults = placesWithDistance.slice(offset, offset + limit);

  return {
    places: paginatedResults,
    total,
    page,
    limit,
    hasMore: offset + limit < total,
  };
}


// ==================== Detailed Statistics Queries ====================

export interface RatingDistribution {
  range: string;
  count: number;
}

export interface GenreStats {
  genre: string;
  count: number;
  avgRating: number | null;
}

export interface VisitHistory {
  id: number;
  name: string;
  visitedAt: Date;
  userRating: number | null;
  genre: string | null;
}

export async function getUserDetailedStats(userId: number): Promise<{
  ratingDistribution: RatingDistribution[];
  genreStats: GenreStats[];
  visitHistory: VisitHistory[];
  avgRating: number | null;
  ratedCount: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      ratingDistribution: [],
      genreStats: [],
      visitHistory: [],
      avgRating: null,
      ratedCount: 0,
    };
  }

  // 評価分布（0-20, 21-40, 41-60, 61-80, 81-100）
  const ratingDistribution: RatingDistribution[] = [];
  const ranges = [
    { label: '0-20', min: 0, max: 20 },
    { label: '21-40', min: 21, max: 40 },
    { label: '41-60', min: 41, max: 60 },
    { label: '61-80', min: 61, max: 80 },
    { label: '81-100', min: 81, max: 100 },
  ];

  for (const range of ranges) {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(places)
      .where(and(
        eq(places.userId, userId),
        sql`${places.userRating} >= ${range.min}`,
        sql`${places.userRating} <= ${range.max}`
      ));
    ratingDistribution.push({
      range: range.label,
      count: result[0]?.count ?? 0,
    });
  }

  // ジャンル別統計
  const genreResults = await db.select({
    genre: places.genreParent,
    count: sql<number>`count(*)`,
    avgRating: sql<number>`avg(${places.userRating})`,
  })
    .from(places)
    .where(and(eq(places.userId, userId), sql`${places.genreParent} IS NOT NULL`))
    .groupBy(places.genreParent);

  const genreStats: GenreStats[] = genreResults.map(r => ({
    genre: r.genre || 'その他',
    count: r.count,
    avgRating: r.avgRating ? Math.round(r.avgRating * 10) / 10 : null,
  }));

  // 訪問履歴（最新20件）
  const visitResults = await db.select({
    id: places.id,
    name: places.name,
    visitedAt: places.visitedAt,
    userRating: places.userRating,
    genre: places.genreParent,
  })
    .from(places)
    .where(and(
      eq(places.userId, userId),
      eq(places.status, "visited"),
      sql`${places.visitedAt} IS NOT NULL`
    ))
    .orderBy(sql`${places.visitedAt} DESC`)
    .limit(20);

  const visitHistory: VisitHistory[] = visitResults.map(r => ({
    id: r.id,
    name: r.name,
    visitedAt: r.visitedAt!,
    userRating: r.userRating,
    genre: r.genre,
  }));

  // 平均評価と評価済み件数
  const avgResult = await db.select({
    avgRating: sql<number>`avg(${places.userRating})`,
    count: sql<number>`count(*)`,
  })
    .from(places)
    .where(and(eq(places.userId, userId), sql`${places.userRating} IS NOT NULL`));

  const avgRating = avgResult[0]?.avgRating ? Math.round(avgResult[0].avgRating * 10) / 10 : null;
  const ratedCount = avgResult[0]?.count ?? 0;

  return {
    ratingDistribution,
    genreStats,
    visitHistory,
    avgRating,
    ratedCount,
  };
}
