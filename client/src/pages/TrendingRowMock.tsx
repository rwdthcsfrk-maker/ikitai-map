import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Star, ExternalLink, Plus } from "lucide-react";
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
  },
];

export default function TrendingRowMock() {
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
          <h1 className="text-lg font-semibold">話題のお店・横スクロール</h1>
        </div>
      </header>

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm">
            <span className="font-medium">話題のピックアップ</span>
            <span className="text-muted-foreground"> / 横スクロール</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            近くの人気
          </Badge>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {mockPlaces.map((place) => (
            <Card
              key={place.id}
              className="w-64 shrink-0 overflow-hidden bg-background shadow-sm"
            >
              <div className="relative h-32 w-full">
                <img
                  src={place.image}
                  alt={place.title}
                  className="h-full w-full object-cover"
                />
                <Badge className="absolute left-2 top-2 bg-black/70 text-white">
                  {place.source}
                </Badge>
              </div>
              <CardContent className="p-3 space-y-2">
                <div>
                  <p className="text-sm font-semibold line-clamp-1">{place.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {place.subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-foreground">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {place.rating}
                    <span className="text-[10px] text-muted-foreground">
                      ({place.reviews})
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {place.distance}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button className="h-8 text-xs">
                    <Plus className="mr-1 h-3 w-3" />
                    追加
                  </Button>
                  <Button variant="outline" className="h-8 text-xs">
                    <ExternalLink className="mr-1 h-3 w-3" />
                    投稿
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          横スクロールで複数カードを比較しながら選ぶ従来パターンの想定です。
        </div>
      </div>
    </div>
  );
}
