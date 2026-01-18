import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { ArrowLeft, Search, Star, MapPin, Plus, ExternalLink } from "lucide-react";

const searchResults = [
  {
    id: "s1",
    name: "神保町カレー",
    address: "千代田区神田神保町",
    rating: 4.1,
  },
  {
    id: "s2",
    name: "銀座すし屋",
    address: "中央区銀座",
    rating: 4.6,
  },
];

const trendingPlaces = [
  {
    id: "t1",
    name: "渋谷の隠れ家ラーメン",
    source: "TikTok",
    rating: 4.4,
    address: "渋谷区宇田川町",
  },
  {
    id: "t2",
    name: "表参道の朝カフェ",
    source: "Instagram",
    rating: 4.2,
    address: "港区北青山",
  },
];

export default function MockAddOverview() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="店名や場所で検索..." className="pl-9 h-10" />
        </div>
        <Button size="icon" className="h-10 w-10">
          <Search className="w-4 h-4" />
        </Button>
      </header>

      <div className="px-4 py-4 space-y-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">検索結果</h2>
            <Badge variant="secondary" className="text-xs">Google</Badge>
          </div>
          <div className="space-y-3">
            {searchResults.map((place) => (
              <Card key={place.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{place.name}</p>
                    <p className="text-xs text-muted-foreground">{place.address}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {place.rating}
                    </div>
                  </div>
                  <Button className="h-8 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    保存
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">話題のお店</h2>
            <Badge variant="secondary" className="text-xs">縦スワイプ</Badge>
          </div>
          <div className="space-y-3">
            {trendingPlaces.map((place) => (
              <Card key={place.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-black/70 text-white text-[10px]">{place.source}</Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {place.rating}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{place.name}</p>
                    <p className="text-xs text-muted-foreground">{place.address}</p>
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
      </div>
    </div>
  );
}
