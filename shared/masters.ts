/**
 * マスタデータ定義
 * 店舗検索機能で使用するジャンル、予算帯、距離などの固定データ
 */

// ============================================
// 大ジャンル（固定）
// ============================================
export const PARENT_GENRES = [
  { id: 'cafe', name: 'カフェ', icon: '☕' },
  { id: 'japanese', name: '和食', icon: '🍱' },
  { id: 'western', name: '洋食', icon: '🍝' },
  { id: 'chinese', name: '中華', icon: '🥟' },
  { id: 'asian', name: 'アジア・エスニック', icon: '🍜' },
  { id: 'meat', name: '焼肉・肉', icon: '🥩' },
  { id: 'izakaya', name: '居酒屋・バー', icon: '🍺' },
  { id: 'ramen', name: 'ラーメン・麺', icon: '🍜' },
  { id: 'sweets', name: 'スイーツ', icon: '🍰' },
] as const;

export type ParentGenreId = typeof PARENT_GENRES[number]['id'];

// ============================================
// 小ジャンル（親に紐づく）
// ============================================
export const CHILD_GENRES: Record<ParentGenreId, Array<{ id: string; name: string }>> = {
  cafe: [
    { id: 'cafe_general', name: 'カフェ' },
    { id: 'cafe_specialty', name: 'スペシャルティコーヒー' },
    { id: 'cafe_chain', name: 'チェーン系カフェ' },
    { id: 'cafe_kissaten', name: '喫茶店' },
  ],
  japanese: [
    { id: 'sushi', name: '寿司' },
    { id: 'tempura', name: '天ぷら' },
    { id: 'kaiseki', name: '懐石・会席' },
    { id: 'udon', name: 'うどん' },
    { id: 'soba', name: 'そば' },
    { id: 'tonkatsu', name: 'とんかつ' },
    { id: 'yakitori', name: '焼き鳥' },
  ],
  western: [
    { id: 'italian', name: 'イタリアン' },
    { id: 'french', name: 'フレンチ' },
    { id: 'spanish', name: 'スペイン料理' },
    { id: 'steak', name: 'ステーキ' },
    { id: 'hamburger', name: 'ハンバーガー' },
    { id: 'pizza', name: 'ピザ' },
  ],
  chinese: [
    { id: 'chinese_general', name: '中華料理' },
    { id: 'chinese_sichuan', name: '四川料理' },
    { id: 'chinese_cantonese', name: '広東料理' },
    { id: 'chinese_dimsum', name: '飲茶・点心' },
  ],
  asian: [
    { id: 'thai', name: 'タイ料理' },
    { id: 'vietnamese', name: 'ベトナム料理' },
    { id: 'korean', name: '韓国料理' },
    { id: 'indian', name: 'インド料理' },
    { id: 'mexican', name: 'メキシカン' },
  ],
  meat: [
    { id: 'yakiniku', name: '焼肉' },
    { id: 'horumon', name: 'ホルモン' },
    { id: 'shabushabu', name: 'しゃぶしゃぶ' },
    { id: 'sukiyaki', name: 'すき焼き' },
  ],
  izakaya: [
    { id: 'izakaya_general', name: '居酒屋' },
    { id: 'tachinomi', name: '立ち飲み' },
    { id: 'beer_bar', name: 'ビアバー' },
    { id: 'wine_bar', name: 'ワインバー' },
    { id: 'cocktail_bar', name: 'カクテルバー' },
    { id: 'whisky_bar', name: 'ウイスキーバー' },
  ],
  ramen: [
    { id: 'ramen_general', name: 'ラーメン' },
    { id: 'tsukemen', name: 'つけ麺' },
    { id: 'tantanmen', name: '担々麺' },
  ],
  sweets: [
    { id: 'cake', name: 'ケーキ' },
    { id: 'parfait', name: 'パフェ' },
    { id: 'wagashi', name: '和菓子' },
    { id: 'crepe', name: 'クレープ' },
    { id: 'ice_cream', name: 'アイスクリーム' },
  ],
};

// ============================================
// 予算帯マスタ
// ============================================
export const BUDGET_BANDS = {
  lunch: [
    { id: 'lunch_1', label: '〜¥1,000', min: 0, max: 1000 },
    { id: 'lunch_2', label: '¥1,000–2,000', min: 1000, max: 2000 },
    { id: 'lunch_3', label: '¥2,000–3,000', min: 2000, max: 3000 },
    { id: 'lunch_4', label: '¥3,000+', min: 3000, max: null },
  ],
  dinner: [
    { id: 'dinner_1', label: '〜¥3,000', min: 0, max: 3000 },
    { id: 'dinner_2', label: '¥3,000–5,000', min: 3000, max: 5000 },
    { id: 'dinner_3', label: '¥5,000–8,000', min: 5000, max: 8000 },
    { id: 'dinner_4', label: '¥8,000+', min: 8000, max: null },
  ],
} as const;

export type BudgetType = keyof typeof BUDGET_BANDS;

// ============================================
// 距離オプション
// ============================================
export const DISTANCE_OPTIONS = [
  { id: '300m', label: '300m以内', meters: 300 },
  { id: '1km', label: '1km以内', meters: 1000 },
  { id: '3km', label: '3km以内', meters: 3000 },
  { id: '5km', label: '5km以内', meters: 5000 },
  { id: 'any', label: '指定なし', meters: null },
] as const;

export type DistanceOptionId = typeof DISTANCE_OPTIONS[number]['id'];

// ============================================
// 特徴フラグオプション
// ============================================
export const FEATURE_OPTIONS = {
  smoking: {
    label: '禁煙/喫煙',
    options: [
      { id: 'non_smoking', label: '完全禁煙' },
      { id: 'separated', label: '分煙' },
      { id: 'smoking_ok', label: '喫煙可' },
    ],
  },
  privateRoom: {
    label: '個室',
    options: [
      { id: 'private_room_yes', label: 'あり' },
      { id: 'private_room_no', label: 'なし' },
    ],
  },
  takeout: {
    label: 'テイクアウト',
    options: [
      { id: 'takeout_yes', label: 'あり' },
      { id: 'takeout_no', label: 'なし' },
    ],
  },
  wifi: {
    label: 'Wi-Fi',
    options: [
      { id: 'wifi_yes', label: 'あり' },
    ],
  },
  power: {
    label: '電源',
    options: [
      { id: 'power_yes', label: 'あり' },
    ],
  },
} as const;

export type FeatureCategory = keyof typeof FEATURE_OPTIONS;

// ============================================
// 並び替えオプション
// ============================================
export const SORT_OPTIONS = [
  { id: 'recommended', label: 'おすすめ' },
  { id: 'distance', label: '距離が近い' },
  { id: 'rating', label: '評価が高い' },
  { id: 'reviews', label: '口コミが多い' },
  { id: 'new', label: '新着' },
] as const;

export type SortOptionId = typeof SORT_OPTIONS[number]['id'];

// ============================================
// 都道府県マスタ
// ============================================
export const PREFECTURES = [
  { id: 'hokkaido', name: '北海道' },
  { id: 'aomori', name: '青森県' },
  { id: 'iwate', name: '岩手県' },
  { id: 'miyagi', name: '宮城県' },
  { id: 'akita', name: '秋田県' },
  { id: 'yamagata', name: '山形県' },
  { id: 'fukushima', name: '福島県' },
  { id: 'ibaraki', name: '茨城県' },
  { id: 'tochigi', name: '栃木県' },
  { id: 'gunma', name: '群馬県' },
  { id: 'saitama', name: '埼玉県' },
  { id: 'chiba', name: '千葉県' },
  { id: 'tokyo', name: '東京都' },
  { id: 'kanagawa', name: '神奈川県' },
  { id: 'niigata', name: '新潟県' },
  { id: 'toyama', name: '富山県' },
  { id: 'ishikawa', name: '石川県' },
  { id: 'fukui', name: '福井県' },
  { id: 'yamanashi', name: '山梨県' },
  { id: 'nagano', name: '長野県' },
  { id: 'gifu', name: '岐阜県' },
  { id: 'shizuoka', name: '静岡県' },
  { id: 'aichi', name: '愛知県' },
  { id: 'mie', name: '三重県' },
  { id: 'shiga', name: '滋賀県' },
  { id: 'kyoto', name: '京都府' },
  { id: 'osaka', name: '大阪府' },
  { id: 'hyogo', name: '兵庫県' },
  { id: 'nara', name: '奈良県' },
  { id: 'wakayama', name: '和歌山県' },
  { id: 'tottori', name: '鳥取県' },
  { id: 'shimane', name: '島根県' },
  { id: 'okayama', name: '岡山県' },
  { id: 'hiroshima', name: '広島県' },
  { id: 'yamaguchi', name: '山口県' },
  { id: 'tokushima', name: '徳島県' },
  { id: 'kagawa', name: '香川県' },
  { id: 'ehime', name: '愛媛県' },
  { id: 'kochi', name: '高知県' },
  { id: 'fukuoka', name: '福岡県' },
  { id: 'saga', name: '佐賀県' },
  { id: 'nagasaki', name: '長崎県' },
  { id: 'kumamoto', name: '熊本県' },
  { id: 'oita', name: '大分県' },
  { id: 'miyazaki', name: '宮崎県' },
  { id: 'kagoshima', name: '鹿児島県' },
  { id: 'okinawa', name: '沖縄県' },
] as const;

export type PrefectureId = typeof PREFECTURES[number]['id'];

// ============================================
// 検索フィルタの型定義
// ============================================
export interface SearchFilters {
  // エリア・距離
  location?: {
    lat: number;
    lng: number;
  };
  distanceRadius?: number | null;
  prefecture?: string;

  // ジャンル
  genreParent?: string;
  genreChild?: string;

  // 予算
  budgetType?: 'lunch' | 'dinner';
  budgetBand?: string;

  // 営業
  openNow?: boolean;

  // 特徴
  features?: string[];

  // 並び替え
  sort?: SortOptionId;

  // ページネーション
  page?: number;
  limit?: number;
}

// ============================================
// 検索結果の型定義
// ============================================
export interface SearchResult {
  places: PlaceWithDistance[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PlaceWithDistance {
  id: number;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  genre: string | null;
  genreParent: string | null;
  genreChild: string | null;
  features: string[];
  summary: string | null;
  rating: number | null;
  reviewCount: number | null;
  budgetLunch: string | null;
  budgetDinner: string | null;
  googleMapsUrl: string | null;
  distance?: number;
  status: 'none' | 'want_to_go' | 'visited';
  userRating: number | null;
}
