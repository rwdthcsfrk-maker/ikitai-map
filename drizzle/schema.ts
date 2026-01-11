import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Place table - stores restaurant/shop information
 */
/**
 * Place status enum
 * - want_to_go: 行きたい（お気に入り）
 * - visited: 訪問済み
 * - none: 未設定
 */
export const placeStatusEnum = mysqlEnum("status", ["none", "want_to_go", "visited"]);

export const places = mysqlTable("places", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  googlePlaceId: varchar("googlePlaceId", { length: 255 }),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  genre: varchar("genre", { length: 100 }),
  features: json("features").$type<string[]>(),
  summary: text("summary"),
  source: varchar("source", { length: 50 }),
  googleMapsUrl: text("googleMapsUrl"),
  phoneNumber: varchar("phoneNumber", { length: 50 }),
  rating: decimal("rating", { precision: 2, scale: 1 }),
  priceLevel: int("priceLevel"),
  photoUrl: text("photoUrl"),
  // User status and rating
  status: placeStatusEnum.default("none").notNull(),
  userRating: int("userRating"), // 1-5 stars, null if not rated
  userNote: text("userNote"), // User's personal note/review
  visitedAt: timestamp("visitedAt"), // When the user visited
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Place = typeof places.$inferSelect;
export type InsertPlace = typeof places.$inferInsert;

/**
 * List table - user-created lists for organizing places
 */
export const lists = mysqlTable("lists", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 20 }),
  icon: varchar("icon", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type List = typeof lists.$inferSelect;
export type InsertList = typeof lists.$inferInsert;

/**
 * ListPlace table - junction table for many-to-many relationship
 */
export const listPlaces = mysqlTable("listPlaces", {
  id: int("id").autoincrement().primaryKey(),
  listId: int("listId").notNull(),
  placeId: int("placeId").notNull(),
  note: text("note"),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type ListPlace = typeof listPlaces.$inferSelect;
export type InsertListPlace = typeof listPlaces.$inferInsert;
