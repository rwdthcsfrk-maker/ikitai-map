// API Base URL - 開発時はローカルサーバー、本番時は実際のURLに変更
// Expo GOで接続する場合は、PCのローカルIPアドレスを使用
export const API_BASE_URL = __DEV__ 
  ? "http://192.168.1.1:3000" // 開発時: PCのローカルIPに変更してください
  : "https://your-production-url.com"; // 本番URL

// OAuth設定
export const OAUTH_CONFIG = {
  clientId: "", // Manus OAuth Client ID
  redirectUri: "exp://localhost:8081/--/oauth/callback",
};
