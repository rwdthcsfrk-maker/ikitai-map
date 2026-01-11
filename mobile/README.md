# 行きたい店マップ - モバイルアプリ (Expo GO)

飲食店を保存・整理し、目的別に検索・管理できるモバイルアプリです。

## 機能

- **マップ表示**: 保存した店舗をマップ上にピン表示
- **現在地取得**: GPSで現在位置を取得
- **店舗検索**: 自然言語で条件検索
- **リスト管理**: デート用・会食用など目的別に整理
- **ステータス管理**: 行きたい/訪問済みのマーク
- **評価機能**: 5段階評価とメモ

## セットアップ

### 1. 依存関係のインストール

```bash
cd mobile
npm install
```

### 2. API接続設定

`src/lib/config.ts` を編集して、バックエンドAPIのURLを設定します：

```typescript
// 開発時: PCのローカルIPアドレスを設定
export const API_BASE_URL = __DEV__ 
  ? "http://192.168.x.x:3000"  // ← PCのIPアドレスに変更
  : "https://your-production-url.com";
```

**PCのIPアドレスの確認方法:**
- Mac: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- Windows: `ipconfig` でIPv4アドレスを確認

### 3. Expo GOで起動

```bash
npx expo start
```

表示されるQRコードをExpo GOアプリでスキャンしてください。

## Expo GOアプリのインストール

- **iOS**: [App Store](https://apps.apple.com/app/expo-go/id982107779)
- **Android**: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

## 開発モード

### 開発サーバーの起動

```bash
# Expo開発サーバー
npx expo start

# トンネルモード（外部ネットワークからアクセス）
npx expo start --tunnel
```

### デバッグ

- シェイクジェスチャーで開発者メニューを表示
- `r` キーでリロード
- `m` キーでメニュー表示

## プロジェクト構成

```
mobile/
├── App.tsx                 # エントリーポイント
├── src/
│   ├── screens/           # 画面コンポーネント
│   │   ├── HomeScreen.tsx      # マップ画面
│   │   ├── ListsScreen.tsx     # リスト一覧
│   │   ├── SearchScreen.tsx    # 検索画面
│   │   └── AddPlaceScreen.tsx  # 店舗追加
│   ├── components/        # 共通コンポーネント
│   ├── contexts/          # Reactコンテキスト
│   │   └── AuthContext.tsx     # 認証状態管理
│   ├── lib/               # ユーティリティ
│   │   ├── config.ts          # 設定
│   │   ├── theme.ts           # テーマ・スタイル
│   │   └── trpc.ts            # APIクライアント
│   └── types/             # 型定義
│       └── index.ts
├── app.json               # Expo設定
└── package.json
```

## バックエンドとの連携

このアプリは既存のWebアプリのバックエンドAPIを使用します。

1. Webアプリのサーバーを起動: `pnpm dev`
2. モバイルアプリの `config.ts` でAPIのURLを設定
3. 同じWi-Fiネットワークに接続

## 注意事項

- **Google Maps**: iOS/Androidの実機で動作させるには、Google Maps APIキーが必要です
- **位置情報**: 初回起動時に位置情報の許可を求められます
- **認証**: 現在はデモモードで動作します。本番環境ではOAuth認証を実装してください

## トラブルシューティング

### マップが表示されない

- Google Maps APIキーが設定されているか確認
- `app.json` の `ios.config.googleMapsApiKey` と `android.config.googleMaps.apiKey` を設定

### APIに接続できない

- PCとスマートフォンが同じWi-Fiに接続されているか確認
- `config.ts` のIPアドレスが正しいか確認
- ファイアウォールでポート3000がブロックされていないか確認

### Expo GOでQRコードが読み取れない

- `npx expo start --tunnel` でトンネルモードを試す
- Expo GOアプリを最新版に更新
