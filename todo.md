# 行きたい店マップ - TODO

## データベース設計
- [x] Placeテーブル（店舗情報）
- [x] Listテーブル（ユーザー独自リスト）
- [x] ListPlaceテーブル（リストと店舗の中間テーブル）
- [x] マイグレーション実行

## バックエンドAPI
- [x] 店舗CRUD API（place router）
- [x] リストCRUD API（list router）
- [x] Google Places API連携（店舗情報取得）
- [x] LLM連携（店舗情報要約生成）
- [x] 自然言語検索API（条件解析・フィルタリング）

## フロントエンド
- [x] マップ画面（Googleマップ表示・ピン表示）
- [x] 検索入力欄（自然言語検索）
- [x] リスト一覧画面
- [x] リスト詳細画面（店舗カード表示）
- [x] 店舗追加画面（URL/店名入力）
- [x] 条件タグフィルタUI
- [x] 店舗詳細リンク（Googleマップへ遷移）

## 認証・その他
- [x] OAuth認証（Manus OAuth）
- [x] レスポンシブデザイン対応


## 追加機能（v2）
- [x] 現在地取得機能（Geolocation API）
- [x] 現在地をマップに表示
- [x] お気に入り・訪問済みステータス機能
- [x] 店舗評価機能（5段階評価）
- [x] 評価・ステータスのDB保存
- [x] ステータス別フィルタリング


## Expo GO対応（v3）
- [x] Expoプロジェクト初期化
- [x] React Native用マップ画面実装
- [x] React Native用リスト画面実装
- [x] React Native用検索画面実装
- [x] React Native用店舗追加画面実装
- [x] tRPC API連携設定
- [x] OAuth認証対応（デモモード）
- [x] 現在地取得機能（expo-location）
- [x] Expo GO接続設定ドキュメント作成


## 本番OAuth認証（v4）
- [x] expo-auth-sessionインストール
- [x] OAuth認証フロー実装
- [x] ログイン画面作成
- [x] 認証状態の永続化（SecureStore）
- [x] 認証済みユーザーのみアクセス可能に
