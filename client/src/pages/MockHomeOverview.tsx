import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  ArrowLeft,
  Star,
  MapPin,
  Plus,
  ExternalLink,
  Heart,
  CheckCircle2,
} from "lucide-react";

const trendingPlaces = [
  {
    id: "t1",
    name: "渋谷の隠れ家ラーメン",
    source: "TikTok",
    tags: ["ラーメン", "行列", "コスパ"],
    rating: 4.4,
    address: "渋谷区宇田川町",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "t2",
    name: "表参道の朝カフェ",
    source: "Instagram",
    tags: ["カフェ", "映え", "デート"],
    rating: 4.2,
    address: "港区北青山",
    image:
      "https://images.unsplash.com/photo-1481833761820-0509d3217039?q=80&w=1200&auto=format&fit=crop",
  },
];

const recommendedPlaces = [
  {
    id: "r1",
    name: "新宿の焼肉名店",
    reason: "焼肉が好きそう",
    rating: 4.6,
    address: "新宿区歌舞伎町",
  },
  {
    id: "r2",
    name: "恵比寿の夜パスタ",
    reason: "イタリアンが好きそう",
    rating: 4.3,
    address: "渋谷区恵比寿",
  },
];

const savedPlaces = [
  {
    id: "s1",
    name: "池袋の餃子バル",
    status: "行きたい",
    rating: 4.1,
    address: "豊島区南池袋",
  },
  {
    id: "s2",
    name: "中目黒の和食",
    status: "訪問済み",
    rating: 4.5,
    address: "目黒区青葉台",
  },
];

export default function MockHomeOverview() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <p className="text-sm text-muted-foreground">モック</p>
          <h1 className="text-lg font-semibold">ホーム</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">話題のお店</h2>
            <Badge variant="secondary" className="text-xs">縦スワイプ</Badge>
          </div>
          <div className="space-y-3">
            {trendingPlaces.map((place) => (
              <Card key={place.id} className="overflow-hidden">
                <div className="h-36 w-full bg-muted relative">
                  <img src={place.image} alt={place.name} className="h-full w-full object-cover" />
                  <Badge className="absolute left-2 top-2 bg-black/70 text-white">
                    {place.source}
                  </Badge>
                </div>
                <CardContent className="p-3 space-y-2">
                  <div>
                    <p className="text-sm font-semibold">{place.name}</p>
                    <p className="text-xs text-muted-foreground">{place.address}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {place.tags.map((tag) => (
                      <span
                        key={`${place.id}-${tag}`}
                        className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {place.rating}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="h-8 text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      保存して次へ
                    </Button>
                    <Button variant="outline" className="h-8 text-xs">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      投稿
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">あなたへのおすすめ</h2>
            <Badge variant="secondary" className="text-xs">パーソナライズ</Badge>
          </div>
          <div className="grid gap-3">
            {recommendedPlaces.map((place) => (
              <Card key={place.id}>
                <CardContent className="p-3 space-y-2">
                  <div>
                    <p className="text-sm font-semibold">{place.name}</p>
                    <p className="text-xs text-muted-foreground">{place.address}</p>
                    <p className="text-[10px] text-muted-foreground">{place.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {place.rating}
                  </div>
                  <Button className="h-8 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    保存する
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">保存した店舗</h2>
            <Badge variant="secondary" className="text-xs">一覧</Badge>
          </div>
          <div className="space-y-3">
            {savedPlaces.map((place) => (
              <Card key={place.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {place.status === "行きたい" ? (
                        <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                      <p className="text-sm font-semibold">{place.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{place.address}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {place.rating}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
