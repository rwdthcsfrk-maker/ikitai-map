import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import { User } from "../types";
import { setAuthToken } from "../lib/trpc";
import { API_BASE_URL } from "../lib/config";

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "auth_token";
const USER_KEY = "user_data";

// OAuth Discovery
const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: `${API_BASE_URL}/api/oauth/authorize`,
  tokenEndpoint: `${API_BASE_URL}/api/oauth/token`,
};

interface AuthProviderProps {
  children: ReactNode;
}

// SecureStoreヘルパー
const saveToSecureStore = async (key: string, value: string) => {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
};

const getFromSecureStore = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Failed to get ${key}:`, error);
    return null;
  }
};

const removeFromSecureStore = async (key: string) => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Failed to remove ${key}:`, error);
  }
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // リダイレクトURI
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "ikitai-map",
    path: "oauth/callback",
  });

  // AuthSessionのリクエスト設定
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: "ikitai-map-mobile",
      scopes: ["openid", "profile", "email"],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
    },
    discovery
  );

  // 初期化時に保存された認証情報を読み込む
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          getFromSecureStore(TOKEN_KEY),
          getFromSecureStore(USER_KEY),
        ]);

        if (storedToken && storedUser) {
          setAuthToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Failed to load auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  // OAuth認証レスポンスを処理
  useEffect(() => {
    const handleAuthResponse = async () => {
      if (response?.type === "success" && response.params.code) {
        setIsLoading(true);
        try {
          // 認証コードをトークンに交換
          const tokenResponse = await fetch(
            `${API_BASE_URL}/api/oauth/mobile/token`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                code: response.params.code,
                redirectUri,
                clientId: "ikitai-map-mobile",
              }),
            }
          );

          if (tokenResponse.ok) {
            const data = await tokenResponse.json();
            const { accessToken, user: userData } = data;

            // トークンとユーザー情報を保存
            await saveToSecureStore(TOKEN_KEY, accessToken);
            await saveToSecureStore(USER_KEY, JSON.stringify(userData));
            setAuthToken(accessToken);
            setUser(userData);
          } else {
            console.error("Token exchange failed");
          }
        } catch (error) {
          console.error("Auth error:", error);
        } finally {
          setIsLoading(false);
        }
      } else if (response?.type === "error") {
        console.error("Auth error:", response.error);
        setIsLoading(false);
      }
    };

    handleAuthResponse();
  }, [response, redirectUri]);

  // ログイン
  const login = useCallback(async () => {
    if (request) {
      await promptAsync();
    }
  }, [request, promptAsync]);

  // ログアウト
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await removeFromSecureStore(TOKEN_KEY);
      await removeFromSecureStore(USER_KEY);
      setAuthToken(null);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ユーザー情報を更新
  const refreshUser = useCallback(async () => {
    const token = await getFromSecureStore(TOKEN_KEY);
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/trpc/auth.me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const userData = data.result?.data;
        if (userData) {
          await saveToSecureStore(USER_KEY, JSON.stringify(userData));
          setUser(userData);
        }
      } else if (res.status === 401) {
        await logout();
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
