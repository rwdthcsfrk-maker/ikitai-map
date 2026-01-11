export type PlaceStatus = "none" | "want_to_go" | "visited";

export interface Place {
  id: number;
  userId: number;
  name: string;
  address?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  genre?: string | null;
  features?: string[] | null;
  summary?: string | null;
  rating?: string | null;
  googlePlaceId?: string | null;
  googleMapsUrl?: string | null;
  photoUrl?: string | null;
  source?: string | null;
  status: PlaceStatus;
  userRating?: number | null;
  userNote?: string | null;
  visitedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaceList {
  id: number;
  userId: number;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: number;
  openId: string;
  name?: string | null;
  email?: string | null;
}
