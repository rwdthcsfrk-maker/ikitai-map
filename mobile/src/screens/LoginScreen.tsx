import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { colors, spacing, fontSize, borderRadius } from "../lib/theme";

export default function LoginScreen() {
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* ロゴ・タイトル */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="restaurant" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>行きたい店マップ</Text>
          <Text style={styles.subtitle}>
            お気に入りのお店を{"\n"}まとめて管理しよう
          </Text>
        </View>

        {/* 機能紹介 */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="map-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>マップで一覧</Text>
              <Text style={styles.featureDesc}>
                保存した店舗をマップ上で確認
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="search-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>自然言語検索</Text>
              <Text style={styles.featureDesc}>
                「個室 イタリアン」で簡単検索
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="list-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>リスト管理</Text>
              <Text style={styles.featureDesc}>
                デート用・会食用など目的別に整理
              </Text>
            </View>
          </View>
        </View>

        {/* ログインボタン */}
        <View style={styles.loginSection}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <>
                <Ionicons
                  name="log-in-outline"
                  size={20}
                  color={colors.primaryForeground}
                />
                <Text style={styles.loginButtonText}>ログインして始める</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.loginHint}>
            Manus アカウントでログインします
          </Text>
        </View>
      </View>

      {/* フッター */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl * 2,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl * 2,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 24,
  },
  features: {
    marginBottom: spacing.xl * 2,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  loginSection: {
    alignItems: "center",
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.xl * 2,
    borderRadius: borderRadius.full,
    width: "100%",
  },
  loginButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  loginHint: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 18,
  },
});
