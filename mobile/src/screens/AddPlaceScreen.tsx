import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, borderRadius } from "../lib/theme";

interface SearchResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: string;
  genre?: string;
}

// デモ検索結果
const DEMO_RESULTS: SearchResult[] = [
  {
    id: "1",
    name: "トラットリア ダ ルイジ",
    address: "東京都渋谷区神宮前3-1-25",
    latitude: 35.6695,
    longitude: 139.7030,
    rating: "4.3",
    genre: "イタリアン",
  },
  {
    id: "2",
    name: "ピッツェリア マルゲリータ",
    address: "東京都渋谷区神宮前4-2-10",
    latitude: 35.6680,
    longitude: 139.7050,
    rating: "4.1",
    genre: "イタリアン",
  },
  {
    id: "3",
    name: "リストランテ ベッラ",
    address: "東京都港区南青山5-3-2",
    latitude: 35.6620,
    longitude: 139.7120,
    rating: "4.5",
    genre: "イタリアン",
  },
];

export default function AddPlaceScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<SearchResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const mapRef = useRef<MapView>(null);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      Alert.alert("エラー", "店舗名を入力してください");
      return;
    }

    Keyboard.dismiss();
    setIsSearching(true);

    // デモ: 検索結果を表示
    setTimeout(() => {
      setSearchResults(DEMO_RESULTS);
      setIsSearching(false);
    }, 500);
  };

  const handleSelectPlace = (place: SearchResult) => {
    setSelectedPlace(place);
    setSearchResults([]);

    mapRef.current?.animateToRegion({
      latitude: place.latitude,
      longitude: place.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  const handleSavePlace = async () => {
    if (!selectedPlace) return;

    setIsSaving(true);

    // デモ: 保存処理
    setTimeout(() => {
      setIsSaving(false);
      Alert.alert("保存完了", `${selectedPlace.name}を保存しました`, [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>店舗を追加</Text>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={colors.mutedForeground}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="店舗名で検索..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>

        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={styles.searchButtonText}>検索</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>検索結果</Text>
          <ScrollView
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
          >
            {searchResults.map((result) => (
              <TouchableOpacity
                key={result.id}
                style={styles.resultItem}
                onPress={() => handleSelectPlace(result)}
              >
                <View style={styles.resultIcon}>
                  <Ionicons name="location" size={20} color={colors.primary} />
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{result.name}</Text>
                  <Text style={styles.resultAddress} numberOfLines={1}>
                    {result.address}
                  </Text>
                  <View style={styles.resultMeta}>
                    {result.genre && (
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>{result.genre}</Text>
                      </View>
                    )}
                    {result.rating && (
                      <View style={styles.ratingItem}>
                        <Ionicons name="star" size={12} color="#facc15" />
                        <Text style={styles.ratingText}>{result.rating}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

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
        >
          {selectedPlace && (
            <Marker
              coordinate={{
                latitude: selectedPlace.latitude,
                longitude: selectedPlace.longitude,
              }}
              title={selectedPlace.name}
              pinColor={colors.primary}
            />
          )}
        </MapView>
      </View>

      {/* Selected Place Card */}
      {selectedPlace && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedName}>{selectedPlace.name}</Text>
            <Text style={styles.selectedAddress}>{selectedPlace.address}</Text>
            <View style={styles.selectedMeta}>
              {selectedPlace.genre && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{selectedPlace.genre}</Text>
                </View>
              )}
              {selectedPlace.rating && (
                <View style={styles.ratingItem}>
                  <Ionicons name="star" size={14} color="#facc15" />
                  <Text style={styles.ratingText}>{selectedPlace.rating}</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSavePlace}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <>
                <Ionicons name="add" size={20} color={colors.primaryForeground} />
                <Text style={styles.saveButtonText}>保存する</Text>
              </>
            )}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl + 20,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: "bold",
    color: colors.foreground,
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.card,
  },
  searchContainer: {
    flex: 1,
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
  searchButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.full,
    minWidth: 60,
    alignItems: "center",
  },
  searchButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  resultsContainer: {
    maxHeight: 250,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultsTitle: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.mutedForeground,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  resultsList: {
    paddingHorizontal: spacing.md,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: fontSize.base,
    fontWeight: "500",
    color: colors.foreground,
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  resultMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  tagText: {
    fontSize: fontSize.xs,
    color: colors.accentForeground,
    fontWeight: "500",
  },
  ratingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  selectedCard: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.xl,
  },
  selectedInfo: {
    marginBottom: spacing.md,
  },
  selectedName: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: 4,
  },
  selectedAddress: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  selectedMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  saveButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: "600",
  },
});
