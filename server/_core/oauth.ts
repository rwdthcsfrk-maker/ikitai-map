import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // モバイル用OAuth認証エンドポイント
  app.get("/api/oauth/authorize", async (req: Request, res: Response) => {
    const clientId = getQueryParam(req, "client_id");
    const redirectUri = getQueryParam(req, "redirect_uri");
    const state = getQueryParam(req, "state");
    const scope = getQueryParam(req, "scope");

    if (!clientId || !redirectUri) {
      res.status(400).json({ error: "client_id and redirect_uri are required" });
      return;
    }

    try {
      // Manus OAuthの認証ページにリダイレクト
      const callbackUri = `${req.protocol}://${req.get("host")}/api/oauth/mobile/callback`;
      const stateData = JSON.stringify({ clientId, redirectUri, state });
      const encodedRedirectUri = Buffer.from(callbackUri).toString("base64");
      
      const authUrl = new URL(ENV.oAuthPortalUrl);
      authUrl.searchParams.set("app_id", ENV.appId);
      authUrl.searchParams.set("state", encodedRedirectUri);
      
      res.redirect(302, authUrl.toString());
    } catch (error) {
      console.error("[OAuth] Authorize failed", error);
      res.status(500).json({ error: "OAuth authorization failed" });
    }
  });

  // モバイル用OAuthコールバック（Webコールバックと同じエンドポイントを使用）
  // モバイルアプリはカスタムスキームでリダイレクトを受け取る

  // モバイル用トークン交換エンドポイント
  app.post("/api/oauth/mobile/token", async (req: Request, res: Response) => {
    const { code, redirectUri, clientId } = req.body;

    if (!code) {
      res.status(400).json({ error: "code is required" });
      return;
    }

    try {
      // 認証コードをデコード
      const decoded = JSON.parse(Buffer.from(code, "base64").toString("utf-8"));
      const { openId, name, email, timestamp } = decoded;

      // コードの有効期限チェック（5分）
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        res.status(400).json({ error: "Code expired" });
        return;
      }

      // ユーザー情報を取得
      const user = await db.getUserByOpenId(openId);
      if (!user) {
        res.status(400).json({ error: "User not found" });
        return;
      }

      // アクセストークンを生成
      const accessToken = await sdk.createSessionToken(openId, {
        name: name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      res.json({
        accessToken,
        tokenType: "Bearer",
        expiresIn: ONE_YEAR_MS / 1000,
        user: {
          id: user.id,
          openId: user.openId,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("[OAuth] Token exchange failed", error);
      res.status(500).json({ error: "Token exchange failed" });
    }
  });

  // Web用OAuthコールバック
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
