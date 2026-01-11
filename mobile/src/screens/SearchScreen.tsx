import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, borderRadius } from "../lib/theme";
import { Place, PlaceStatus } from "../types";

const FEATURE_OPTIONS = [
  "個室あり",
  "カップル向け",
  "静か",
  "会食向き",
  "カジュアル",
  "高級感",
  "子連れOK",
];

const STATUS_OPTIONS = [
  { value: "want_to_go" as PlaceStatus, label: "行きたい", icon: "heart" },
  { value: "visited" as PlaceStatus, label: "訪問済み", icon: "checkmark" },
];

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
  {
    id: 3,
    userId: 1,
    name: "焼肉 牛角",
    address: "東京都新宿区歌舞伎町1-2-3",
    latitude: "35.6938",
    longitude: "139.7034",
    genre: "焼肉",
    features: ["カジュアル", "子連れOK"],
    summary: "リーズナブルに楽しめる焼肉チェーン",
    rating: "3.8",
    status: "none",
    userRating: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function SearchScreen({ route, navigation }: any) {
  const initialQuery = route?.params?.query || "";
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<PlaceStatus | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Place[]>([]);

  useEffect(() => {
    if (initialQuery) {
      handleSearch();
    }
  }, []);

  const handleSearch = () => {
    setIsSearching(true);
    // デモ: フィルタリング
    setTimeout(() => {
      let filtered = [...DEMO_PLACES];

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.genre?.toLowerCase().includes(query) ||
            p.summary?.toLowerCase().includes(query)
        );
      }

      if (selectedFeatures.length > 0) {
        filtered = filtered.filter((p) =>
          selectedFeatures.some((f) => p.features?.includes(f))
        );
      }

      if (selectedStatus) {
        filtered = filtered.filter((p) => p.status === selectedStatus);
      }

      setResults(filtered);
      setIsSearching(false);
    }, 500);
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const toggleStatus = (status: PlaceStatus) => {
    setSelectedStatus((prev) => (prev === status ? null : status));
  };

  const clearFilters = () => {
    setSelectedFeatures([]);
    setSelectedStatus(null);
    setSearchQuery("");
    setResults([]);
  };

  const openGoogleMaps = (place: Place) => {
    if (place.googleMapsUrl) {
      Linking.openURL(place.googleMapsUrl);
    } else if (place.latitude && place.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
      Linking.openURL(url);
    }
  };

  const getStatusIcon = (status: PlaceStatus) => {
    switch (status) {
      case "want_to_go":
        return "heart";
      case "visited":
        return "checkmark";
      default:
        return "bookmark-outline";
    }
  };

  const getStatusColor = (status: PlaceStatus) => {
    switch (status) {
      case "want_to_go":
        return colors.pink;
      case "visited":
        return colors.success;
      default:
        return colors.mutedForeground;
    }
  };

  const renderPlaceItem = ({ item }: { item: Place }) => (
    <View style={styles.placeCard}>
      <View style={styles.placeHeader}>
        <Text style={styles.placeName}>{item.name}</Text>
        <Ionicons
          name={getStatusIcon(item.status) as any}
          size={18}
          color={getStatusColor(item.status)}
        />
      </View>

      <View style={styles.placeInfo}>
        {item.genre && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.genre}</Text>
          </View>
        )}
      </View>

      {item.summary && (
        <Text style={styles.placeSummary} numberOfLines={2}>
          {item.summary}
        </Text>
      )}

      {item.features && item.features.length > 0 && (
        <View style={styles.featuresContainer}>
          {item.features.map((feature, index) => (
            <View
              key={index}
              style={[
                styles.featureTag,
                selectedFeatures.includes(feature) && styles.featureTagActive,
              ]}
            >
              <Text
                style={[
                  styles.featureTagText,
                  selectedFeatures.includes(feature) &&
                    styles.featureTagTextActive,
                ]}
              >
                {feature}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.placeFooter}>
        <View style={styles.ratingContainer}>
          {item.rating && (
            <View style={styles.ratingItem}>
              <Ionicons name="star" size={14} color="#facc15" />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          )}
          {item.userRating && (
            <View style={styles.ratingItem}>
              <Ionicons name="star" size={14} color={colors.primary} />
              <Text style={[styles.ratingText, { color: colors.primary }]}>
                {item.userRating}/5
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.detailButton}
          onPress={() => openGoogleMaps(item)}
        >
          <Ionicons name="open-outline" size={16} color={colors.primary} />
          <Text style={styles.detailButtonText}>詳細</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>検索</Text>
      </View>

      {/* Search Input */}
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
            placeholder="カップル向け イタリアン 個室あり..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>

        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>検索</Text>
        </TouchableOpacity>
      </View>

      {/* Status Filters */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>ステータス</Text>
        <View style={styles.filterRow}>
          {STATUS_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.statusButton,
                selectedStatus === option.value && styles.statusButtonActive,
                selectedStatus === option.value &&
                  option.value === "want_to_go" &&
                  styles.statusButtonPink,
                selectedStatus === option.value &&
                  option.value === "visited" &&
                  styles.statusButtonGreen,
              ]}
              onPress={() => toggleStatus(option.value)}
            >
              <Ionicons
                name={option.icon as any}
                size={16}
                color={
                  selectedStatus === option.value
                    ? "#fff"
                    : colors.mutedForeground
                }
              />
              <Text
                style={[
                  styles.statusButtonText,
                  selectedStatus === option.value &&
                    styles.statusButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Feature Filters */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterLabel}>条件タグ</Text>
          {(selectedFeatures.length > 0 || selectedStatus) && (
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearText}>クリア</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.filterRow}>
          {FEATURE_OPTIONS.map((feature) => (
            <TouchableOpacity
              key={feature}
              style={[
                styles.featureButton,
                selectedFeatures.includes(feature) && styles.featureButtonActive,
              ]}
              onPress={() => toggleFeature(feature)}
            >
              <Text
                style={[
                  styles.featureButtonText,
                  selectedFeatures.includes(feature) &&
                    styles.featureButtonTextActive,
                ]}
              >
                {feature}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Results */}
      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderPlaceItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.resultsContainer}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {results.length} 件の店舗が見つかりました
            </Text>
          }
        />
      ) : searchQuery || selectedFeatures.length > 0 || selectedStatus ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="search-outline"
            size={64}
            color={colors.mutedForeground}
          />
          <Text style={styles.emptyTitle}>該当する店舗がありません</Text>
          <Text style={styles.emptyText}>
            条件を変更するか、新しい店舗を追加してください
          </Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="search-outline"
            size={64}
            color={colors.mutedForeground}
          />
          <Text style={styles.emptyTitle}>検索してみましょう</Text>
          <Text style={styles.emptyText}>
            自然言語で条件を入力するか、{"\n"}
            タグを選択して店舗を検索できます
          </Text>
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
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
  },
  searchButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  filterSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  filterLabel: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  clearText: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  statusButtonActive: {
    borderColor: "transparent",
  },
  statusButtonPink: {
    backgroundColor: colors.pink,
  },
  statusButtonGreen: {
    backgroundColor: colors.success,
  },
  statusButtonText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  statusButtonTextActive: {
    color: "#fff",
  },
  featureButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  featureButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  featureButtonText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  featureButtonTextActive: {
    color: colors.accentForeground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  resultsContainer: {
    padding: spacing.md,
  },
  resultsCount: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  placeCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  placeHeader: {
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
  featureTagActive: {
    backgroundColor: colors.accent,
  },
  featureTagText: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  featureTagTextActive: {
    color: colors.accentForeground,
  },
  placeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
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
  detailButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  detailButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 22,
  },
});
