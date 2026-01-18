import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowLeft, Folder, ExternalLink, Trash2, Users } from "lucide-react";

const myLists = [
  {
    id: "l1",
    name: "デート用",
    count: 12,
    description: "雰囲気重視のお店",
  },
  {
    id: "l2",
    name: "会食用",
    count: 8,
    description: "静かで落ち着く場所",
  },
];

const sharedLists = [
  {
    id: "l3",
    name: "友達とシェア",
    count: 6,
    role: "編集可",
  },
];

const listPlaces = [
  {
    id: "p1",
    name: "丸の内ビストロ",
    genre: "フレンチ",
    address: "千代田区丸の内",
    rating: 4.5,
  },
  {
    id: "p2",
    name: "神楽坂の和食",
    genre: "和食",
    address: "新宿区神楽坂",
    rating: 4.3,
  },
];

export default function MockListsOverview() {
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
          <h1 className="text-lg font-semibold">リスト一覧 / 詳細</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">マイリスト</h2>
            <Badge variant="secondary" className="text-xs">自分用</Badge>
          </div>
          <div className="space-y-3">
            {myLists.map((list) => (
              <Card key={list.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{list.name}</p>
                    <p className="text-xs text-muted-foreground">{list.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{list.count}件</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">共有リスト</h2>
            <Badge variant="secondary" className="text-xs">コラボ</Badge>
          </div>
          <div className="space-y-3">
            {sharedLists.map((list) => (
              <Card key={list.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted text-foreground flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{list.name}</p>
                    <p className="text-xs text-muted-foreground">{list.count}件</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{list.role}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">リスト詳細</h2>
            <Badge variant="secondary" className="text-xs">例: デート用</Badge>
          </div>
          <div className="space-y-3">
            {listPlaces.map((place) => (
              <Card key={place.id}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{place.name}</p>
                    <p className="text-xs text-muted-foreground">{place.genre}</p>
                    <p className="text-xs text-muted-foreground">{place.address}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <Trash2 className="h-4 w-4" />
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
