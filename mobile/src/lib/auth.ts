import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { API_BASE_URL } from "./config";

// Expo WebBrowserの設定
WebBrowser.maybeCompleteAuthSession();

// SecureStoreのキー
const TOKEN_KEY = "auth_token";
const USER_KEY = "user_data";

// OAuth設定
const OAUTH_CONFIG = {
  // Manus OAuthのエンドポイント
  authorizationEndpoint: `${API_BASE_URL}/api/oauth/authorize`,
  tokenEndpoint: `${API_BASE_URL}/api/oauth/token`,
};

// リダイレクトURIを取得
export const getRedirectUri = () => {
  return AuthSession.makeRedirectUri({
    scheme: "ikitai-map",
    path: "oauth/callback",
  });
};

// 認証リクエストを作成
export const createAuthRequest = () => {
  const redirectUri = getRedirectUri();
  
  return new AuthSession.AuthRequest({
    clientId: "ikitai-map-mobile",
    scopes: ["openid", "profile", "email"],
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
  });
};

// トークンを保存
export const saveToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error("Failed to save token:", error);
  }
};

// トークンを取得
export const getToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error("Failed to get token:", error);
    return null;
  }
};

// トークンを削除
export const removeToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error("Failed to remove token:", error);
  }
};

// ユーザー情報を保存
export const saveUser = async (user: any): Promise<void> => {
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("Failed to save user:", error);
  }
};

// ユーザー情報を取得
export const getUser = async (): Promise<any | null> => {
  try {
    const userData = await SecureStore.getItemAsync(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("Failed to get user:", error);
    return null;
  }
};

// ユーザー情報を削除
export const removeUser = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch (error) {
    console.error("Failed to remove user:", error);
  }
};

// ログアウト
export const logout = async (): Promise<void> => {
  await removeToken();
  await removeUser();
};

// 認証コードをトークンに交換
export const exchangeCodeForToken = async (
  code: string,
  redirectUri: string
): Promise<{ token: string; user: any } | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/oauth/mobile/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        redirectUri,
        clientId: "ikitai-map-mobile",
      }),
    });

    if (!response.ok) {
      throw new Error("Token exchange failed");
    }

    const data = await response.json();
    return {
      token: data.accessToken,
      user: data.user,
    };
  } catch (error) {
    console.error("Failed to exchange code for token:", error);
    return null;
  }
};

// 現在のユーザー情報を取得（APIから）
export const fetchCurrentUser = async (): Promise<any | null> => {
  try {
    const token = await getToken();
    if (!token) return null;

    const response = await fetch(`${API_BASE_URL}/api/trpc/auth.me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        await logout();
      }
      return null;
    }

    const data = await response.json();
    return data.result?.data || null;
  } catch (error) {
    console.error("Failed to fetch current user:", error);
    return null;
  }
};
