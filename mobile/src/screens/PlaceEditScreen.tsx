import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, borderRadius } from "../lib/theme";

const AVAILABLE_FEATURES = [
  "個室あり",
  "カップル向け",
  "静か",
  "会食向き",
  "カジュアル",
  "高級感",
  "子連れOK",
  "テラス席",
  "禁煙",
  "喫煙可",
  "駐車場あり",
  "駅近",
];

interface Place {
  id: number;
  name: string;
  address?: string | null;
  genre?: string | null;
  features?: string[] | null;
  summary?: string | null;
}

interface PlaceEditScreenProps {
  place: Place;
  onSave: (data: Partial<Place>) => Promise<void>;
  onCancel: () => void;
}

export default function PlaceEditScreen({
  place,
  onSave,
  onCancel,
}: PlaceEditScreenProps) {
  const [name, setName] = useState(place.name);
  const [address, setAddress] = useState(place.address ?? "");
  const [genre, setGenre] = useState(place.genre ?? "");
  const [summary, setSummary] = useState(place.summary ?? "");
  const [features, setFeatures] = useState<string[]>(place.features ?? []);
  const [isSaving, setIsSaving] = useState(false);

  const toggleFeature = (feature: string) => {
    setFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("エラー", "店舗名を入力してください");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: place.id,
        name: name.trim(),
        address: address.trim() || undefined,
        genre: genre.trim() || undefined,
        summary: summary.trim() || undefined,
        features: features.length > 0 ? features : undefined,
      });
    } catch (error) {
      Alert.alert("エラー", "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>店舗を編集</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.headerButton}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.saveButton}>保存</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>店舗名 *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="店舗名を入力"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        {/* Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>住所</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="住所を入力"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        {/* Genre */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>ジャンル</Text>
          <TextInput
            style={styles.input}
            value={genre}
            onChangeText={setGenre}
            placeholder="例: イタリアン、和食、カフェ"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        {/* Summary */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>要約・メモ</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={summary}
            onChangeText={setSummary}
            placeholder="お店の特徴や雰囲気を入力"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Features */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>特徴タグ</Text>
          <View style={styles.featuresGrid}>
            {AVAILABLE_FEATURES.map((feature) => (
              <TouchableOpacity
                key={feature}
                onPress={() => toggleFeature(feature)}
                style={[
                  styles.featureTag,
                  features.includes(feature) && styles.featureTagActive,
                ]}
              >
                <Text
                  style={[
                    styles.featureTagText,
                    features.includes(feature) && styles.featureTagTextActive,
                  ]}
                >
                  {feature}
                </Text>
                {features.includes(feature) && (
                  <Ionicons name="close" size={14} color="white" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    justifyContent: "space-between",
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl + 20,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    padding: spacing.xs,
    minWidth: 60,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: "bold",
    color: colors.foreground,
  },
  saveButton: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.primary,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.sm,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  featureTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
  },
  featureTagActive: {
    backgroundColor: colors.primary,
  },
  featureTagText: {
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  featureTagTextActive: {
    color: "white",
  },
  bottomSpacer: {
    height: spacing.xl * 2,
  },
});
