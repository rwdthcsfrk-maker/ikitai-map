import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Star,
  Plus,
  Home as HomeIcon,
  Search,
  List,
  User,
  CheckCircle2,
  Sparkles,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";

export default function Recommend() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [savingPlaceId, setSavingPlaceId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: places } = trpc.place.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: recommendedPlaces, isLoading: recommendedLoading } = trpc.place.recommended.useQuery(
    {
      location: currentLocation ?? undefined,
      limit: 20,
    },
    {
      enabled: isAuthenticated,
    }
  );
  const savedPlaceIds = new Set(
    (places || [])
      .map((place) => place.googlePlaceId)
      .filter((placeId): placeId is string => Boolean(placeId))
  );

  const createPlaceMutation = trpc.place.create.useMutation({
    onSuccess: () => {
      utils.place.list.invalidate();
      toast.success("行きたいに追加しました");
    },
    onError: () => {
      toast.error("追加に失敗しました");
    },
  });

  // 現在地を取得
  useEffect(() => {
    if (!navigator.geolocation || currentLocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        // 位置情報取得失敗時は何もしない
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 10 * 60 * 1000,
      }
    );
  }, [currentLocation]);

  const handleSaveRecommended = (place: {
    placeId: string;
    name: string;
    address: string;
    rating?: number;
    latitude: number;
    longitude: number;
    googleMapsUrl: string;
  }) => {
    if (savedPlaceIds.has(place.placeId)) {
      toast.success("すでに追加済みです");
      return;
    }
    setSavingPlaceId(place.placeId);
    createPlaceMutation.mutate(
      {
        googlePlaceId: place.placeId,
        name: place.name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        rating: place.rating,
        source: "Google",
        googleMapsUrl: place.googleMapsUrl,
      },
      {
        onSettled: () => setSavingPlaceId(null),
      }
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6 text-center">
              <Sparkles className="w-16 h-16 mx-auto text-primary mb-4" />
              <h2 className="text-xl font-bold mb-2">ログインが必要です</h2>
              <p className="text-muted-foreground mb-4">
                あなたへのおすすめを表示するにはログインしてください
              </p>
              <Button asChild className="w-full">
                <a href={getLoginUrl()}>ログイン</a>
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ヘッダー */}
      <header className="border-b bg-card px-3 py-2 sticky top-0 z-10 safe-area-top">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              あなたへのおすすめ
            </h1>
            <p className="text-xs text-muted-foreground">保存した傾向からピックアップ</p>
          </div>
          {currentLocation && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Navigation className="w-3 h-3" />
              <span>現在地取得済み</span>
            </div>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto pb-20">
        {recommendedLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : recommendedPlaces && recommendedPlaces.length > 0 ? (
          <div className="p-4 space-y-3">
            {recommendedPlaces.map((place) => (
              <Card key={place.placeId} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{place.name}</h3>
                      <p className="text-sm text-muted-foreground truncate flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {place.address?.split(" ")[0]}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {place.reason}
                      </p>
                      <div className="flex items-center gap-3 mt-3">
                        {place.rating && (
                          <span className="flex items-center gap-1 text-sm">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            {place.rating}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col justify-between items-end shrink-0">
                      <Button
                        size="sm"
                        className="h-9 px-4"
                        onClick={() => handleSaveRecommended(place)}
                        disabled={
                          createPlaceMutation.isPending ||
                          savingPlaceId === place.placeId ||
                          savedPlaceIds.has(place.placeId)
                        }
                      >
                        {savedPlaceIds.has(place.placeId) ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            追加済み
                          </>
                        ) : savingPlaceId === place.placeId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-1" />
                            追加
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <Sparkles className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">おすすめを表示できません</h3>
            <p className="text-muted-foreground text-sm">
              店舗を保存すると、あなたの好みに合ったおすすめが表示されます
            </p>
            <Link href="/add">
              <Button className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                店舗を追加する
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* ボトムナビゲーション */}
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        <Link href="/">
          <button className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground">
            <HomeIcon className="w-5 h-5" />
            <span className="text-xs">ホーム</span>
          </button>
        </Link>
        <Link href="/search">
          <button className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground">
            <Search className="w-5 h-5" />
            <span className="text-xs">検索</span>
          </button>
        </Link>
        <Link href="/add">
          <button className="flex flex-col items-center justify-center w-14 h-14 -mt-6 rounded-full bg-primary text-primary-foreground shadow-lg">
            <Plus className="w-6 h-6" />
          </button>
        </Link>
        <Link href="/lists">
          <button className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground">
            <List className="w-5 h-5" />
            <span className="text-xs">リスト</span>
          </button>
        </Link>
        <Link href="/mypage">
          <button className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground">
            <User className="w-5 h-5" />
            <span className="text-xs">マイページ</span>
          </button>
        </Link>
      </div>
    </nav>
  );
}
