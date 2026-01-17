import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Star, ExternalLink, CheckCircle2, ChevronDown } from "lucide-react";
import { Link } from "wouter";

const mockPlaces = [
  {
    id: "1",
    title: "渋谷の隠れ家ラーメン",
    subtitle: "濃厚魚介 × 自家製麺",
    rating: 4.4,
    reviews: 1240,
    distance: "420m",
    source: "TikTok",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop",
    saved: false,
  },
  {
    id: "2",
    title: "表参道の朝カフェ",
    subtitle: "季節のフルーツトースト",
    rating: 4.2,
    reviews: 980,
    distance: "650m",
    source: "Instagram",
    image:
      "https://images.unsplash.com/photo-1481833761820-0509d3217039?q=80&w=1200&auto=format&fit=crop",
    saved: true,
  },
  {
    id: "3",
    title: "新宿の炭火焼肉",
    subtitle: "厚切りタンが名物",
    rating: 4.6,
    reviews: 2310,
    distance: "1.3km",
    source: "YouTube",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop",
    saved: false,
  },
  {
    id: "4",
    title: "下北沢の夜パフェ",
    subtitle: "大人の締めスイーツ",
    rating: 4.3,
    reviews: 540,
    distance: "2.0km",
    source: "TikTok",
    image:
      "https://images.unsplash.com/photo-1505250469679-203ad9ced0cb?q=80&w=1200&auto=format&fit=crop",
    saved: false,
  },
];

export default function TrendingStackMock() {
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
          <h1 className="text-lg font-semibold">話題のお店・縦スワイプ</h1>
        </div>
      </header>

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm">
            <span className="font-medium">片手で探す</span>
            <span className="text-muted-foreground"> / 上下スワイプ</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            近くの人気
          </Badge>
        </div>

        <div className="h-[70vh] overflow-y-auto snap-y snap-mandatory rounded-2xl border bg-muted/30">
          <div className="space-y-4 p-3">
            {mockPlaces.map((place, index) => (
              <Card
                key={place.id}
                className="snap-start overflow-hidden bg-background shadow-sm"
              >
                <div className="relative h-48 w-full">
                  <img
                    src={place.image}
                    alt={place.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    <Badge className="bg-black/70 text-white">{place.source}</Badge>
                    {place.saved && (
                      <Badge className="bg-emerald-500 text-white">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        追加済み
                      </Badge>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 rounded-full bg-black/70 px-2 py-1 text-xs text-white">
                    #{index + 1}
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="text-base font-semibold">{place.title}</p>
                    <p className="text-sm text-muted-foreground">{place.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1 text-foreground">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {place.rating}
                      <span className="text-xs text-muted-foreground">({place.reviews})</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {place.distance}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="h-10">保存して次へ</Button>
                    <Button variant="outline" className="h-10">
                      <ExternalLink className="mr-1 h-4 w-4" />
                      投稿を見る
                    </Button>
                  </div>
                  <div className="flex items-center justify-center text-xs text-muted-foreground">
                    <ChevronDown className="mr-1 h-3 w-3" />
                    次へスワイプ
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          指一本で上下にスワイプして、気に入ったら即保存する動線を想定しています。
        </div>
      </div>
    </div>
  );
}
