import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, borderRadius } from "../lib/theme";
import { Place, PlaceStatus } from "../types";
import { useAuth } from "../contexts/AuthContext";

// デモデータ
const DEMO_PLACES: Place[] = [
  {
    id: 1,
    userId: 1,
    name: "トラットリア イタリアーノ",
    address: "東京都渋谷区神宮前1-2-3",
    latitude: "35.6695",
    longitude: "139.7030",
    genre: "イタリアン",
    features: ["個室あり", "カップル向け"],
    summary: "本格的なイタリア料理を楽しめる隠れ家レストラン",
    rating: "4.2",
    status: "want_to_go",
    userRating: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    userId: 1,
    name: "鮨 さいとう",
    address: "東京都港区六本木4-5-6",
    latitude: "35.6627",
    longitude: "139.7318",
    genre: "寿司",
    features: ["カウンター席", "会食向き"],
    summary: "新鮮なネタが自慢の本格江戸前寿司",
    rating: "4.5",
    status: "visited",
    userRating: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function HomeScreen({ navigation }: any) {
  const { isAuthenticated, login } = useAuth();
  const [places, setPlaces] = useState<Place[]>(DEMO_PLACES);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const mapRef = useRef<MapView>(null);

  const getCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("エラー", "位置情報の許可が必要です");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });

      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      Alert.alert("エラー", "位置情報の取得に失敗しました");
    } finally {
      setIsLocating(false);
    }
  };

  const getMarkerColor = (status: PlaceStatus) => {
    switch (status) {
      case "want_to_go":
        return colors.pink;
      case "visited":
        return colors.success;
      default:
        return colors.primary;
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigation.navigate("Search", { query: searchQuery });
    }
  };

  const openGoogleMaps = (place: Place) => {
    if (place.googleMapsUrl) {
      Linking.openURL(place.googleMapsUrl);
    } else if (place.latitude && place.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
      Linking.openURL(url);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.loginContainer}>
        <View style={styles.logoContainer}>
          <Ionicons name="restaurant" size={64} color={colors.primary} />
        </View>
        <Text style={styles.title}>行きたい店マップ</Text>
        <Text style={styles.subtitle}>
          気になるお店を一箇所にまとめて、{"\n"}
          目的に合わせて簡単に検索・整理できます
        </Text>
        <TouchableOpacity style={styles.loginButton} onPress={login}>
          <Text style={styles.loginButtonText}>ログインして始める</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={colors.mutedForeground}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="カップル向け イタリアン 個室あり..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: 35.6812,
            longitude: 139.7671,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {places.map((place) =>
            place.latitude && place.longitude ? (
              <Marker
                key={place.id}
                coordinate={{
                  latitude: parseFloat(place.latitude),
                  longitude: parseFloat(place.longitude),
                }}
                title={place.name}
                description={place.genre || ""}
                pinColor={getMarkerColor(place.status)}
                onPress={() => setSelectedPlace(place)}
              />
            ) : null
          )}
        </MapView>

        {/* Current Location Button */}
        <TouchableOpacity
          style={styles.locationButton}
          onPress={getCurrentLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="navigate" size={24} color={colors.primary} />
          )}
        </TouchableOpacity>

        {/* Place Count Badge */}
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{places.length} 件の店舗</Text>
        </View>
      </View>

      {/* Selected Place Card */}
      {selectedPlace && (
        <View style={styles.placeCard}>
          <View style={styles.placeCardHeader}>
            <Text style={styles.placeName}>{selectedPlace.name}</Text>
            <TouchableOpacity onPress={() => setSelectedPlace(null)}>
              <Ionicons name="close" size={24} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.placeInfo}>
            {selectedPlace.genre && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{selectedPlace.genre}</Text>
              </View>
            )}
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    selectedPlace.status === "want_to_go"
                      ? colors.pinkLight
                      : selectedPlace.status === "visited"
                      ? "#dcfce7"
                      : colors.muted,
                },
              ]}
            >
              <Ionicons
                name={
                  selectedPlace.status === "want_to_go"
                    ? "heart"
                    : selectedPlace.status === "visited"
                    ? "checkmark"
                    : "bookmark-outline"
                }
                size={14}
                color={
                  selectedPlace.status === "want_to_go"
                    ? colors.pink
                    : selectedPlace.status === "visited"
                    ? colors.success
                    : colors.mutedForeground
                }
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      selectedPlace.status === "want_to_go"
                        ? colors.pink
                        : selectedPlace.status === "visited"
                        ? colors.success
                        : colors.mutedForeground,
                  },
                ]}
              >
                {selectedPlace.status === "want_to_go"
                  ? "行きたい"
                  : selectedPlace.status === "visited"
                  ? "訪問済み"
                  : "未設定"}
              </Text>
            </View>
          </View>

          {selectedPlace.summary && (
            <Text style={styles.placeSummary}>{selectedPlace.summary}</Text>
          )}

          {selectedPlace.features && selectedPlace.features.length > 0 && (
            <View style={styles.featuresContainer}>
              {selectedPlace.features.map((feature, index) => (
                <View key={index} style={styles.featureTag}>
                  <Text style={styles.featureTagText}>{feature}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.ratingContainer}>
            {selectedPlace.rating && (
              <View style={styles.ratingItem}>
                <Ionicons name="star" size={16} color="#facc15" />
                <Text style={styles.ratingText}>{selectedPlace.rating}</Text>
              </View>
            )}
            {selectedPlace.userRating && (
              <View style={styles.ratingItem}>
                <Ionicons name="star" size={16} color={colors.primary} />
                <Text style={[styles.ratingText, { color: colors.primary }]}>
                  {selectedPlace.userRating}/5 (自分)
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.mapsButton}
            onPress={() => openGoogleMaps(selectedPlace)}
          >
            <Ionicons name="open-outline" size={18} color={colors.primary} />
            <Text style={styles.mapsButtonText}>Googleマップで見る</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loginContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize["3xl"],
    fontWeight: "bold",
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  loginButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl + 20,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  locationButton: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.card,
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  countBadge: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  countText: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.foreground,
  },
  placeCard: {
    position: "absolute",
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  placeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  placeName: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.foreground,
    flex: 1,
    marginRight: spacing.sm,
  },
  placeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tag: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  tagText: {
    fontSize: fontSize.xs,
    color: colors.accentForeground,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: "500",
  },
  placeSummary: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  featuresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  featureTag: {
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  featureTagText: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  ratingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  mapsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  mapsButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: "500",
  },
});
