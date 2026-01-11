import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { colors, spacing, fontSize, borderRadius } from "../lib/theme";

export default function ProfileScreen() {
  const { user, logout, isLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      "ログアウト",
      "ログアウトしますか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "ログアウト",
          style: "destructive",
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("エラー", "ログアウトに失敗しました");
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>プロフィール</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color={colors.primary} />
            </View>
          </View>
          <Text style={styles.userName}>{user?.name || "ユーザー"}</Text>
          <Text style={styles.userEmail}>{user?.email || "メールアドレス未設定"}</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>統計情報</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="location" size={24} color={colors.primary} />
              <Text style={styles.statValue}>-</Text>
              <Text style={styles.statLabel}>保存した店舗</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="list" size={24} color={colors.primary} />
              <Text style={styles.statValue}>-</Text>
              <Text style={styles.statLabel}>リスト</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              <Text style={styles.statValue}>-</Text>
              <Text style={styles.statLabel}>訪問済み</Text>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>設定</Text>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="notifications-outline" size={22} color={colors.foreground} />
              <Text style={styles.settingsItemText}>通知設定</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="help-circle-outline" size={22} color={colors.foreground} />
              <Text style={styles.settingsItemText}>ヘルプ</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="document-text-outline" size={22} color={colors.foreground} />
              <Text style={styles.settingsItemText}>利用規約</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="shield-outline" size={22} color={colors.foreground} />
              <Text style={styles.settingsItemText}>プライバシーポリシー</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfoCard}>
          <Text style={styles.appName}>行きたい店マップ</Text>
          <Text style={styles.appVersion}>バージョン 1.0.0</Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color={colors.destructive} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
              <Text style={styles.logoutButtonText}>ログアウト</Text>
            </>
          )}
        </TouchableOpacity>

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl + 20,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: "bold",
    color: colors.foreground,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: "bold",
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: "bold",
    color: colors.foreground,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  settingsItemText: {
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  appInfoCard: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  appName: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  appVersion: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  logoutButtonText: {
    fontSize: fontSize.base,
    color: colors.destructive,
    fontWeight: "500",
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});
