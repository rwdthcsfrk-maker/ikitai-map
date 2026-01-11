import { eq, and, like, or, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, places, lists, listPlaces, InsertPlace, InsertList, InsertListPlace, Place, List } from "../drizzle/schema";
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
