import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { useState, useCallback, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Search,
  Plus,
  List,
  MapPin,
  Star,
  ExternalLink,
  Loader2,
  UtensilsCrossed,
  Navigation,
  Heart,
  Check,
  Bookmark,
  Filter,
  X,
  ChevronUp,
  Home as HomeIcon,
  User,
} from "lucide-react";
import { toast } from "sonner";
import PlaceDetailDialog from "@/components/PlaceDetailDialog";
import PlaceEditDialog from "@/components/PlaceEditDialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";

type PlaceStatus = "none" | "want_to_go" | "visited";

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<number | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isPlaceListOpen, setIsPlaceListOpen] = useState(false);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const currentLocationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const utils = trpc.useUtils();
  const { data: places, isLoading: placesLoading } = trpc.place.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const parseSearchMutation = trpc.ai.parseSearchQuery.useMutation();
  const updateStatusMutation = trpc.place.updateStatus.useMutation({
    onSuccess: () => {
      utils.place.list.invalidate();
    },
  });

  const handleMapReady = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  // 現在地を取得
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("お使いのブラウザは位置情報に対応していません");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        setIsLocating(false);

        if (map) {
          map.panTo({ lat: latitude, lng: longitude });
          map.setZoom(15);

          // 現在地マーカーを更新
          if (currentLocationMarkerRef.current) {
            currentLocationMarkerRef.current.map = null;
          }

          const locationPin = document.createElement("div");
          locationPin.innerHTML = `
            <div style="
              width: 24px;
              height: 24px;
              background: #3b82f6;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            "></div>
          `;

          currentLocationMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: { lat: latitude, lng: longitude },
            content: locationPin,
            title: "現在地",
          });
        }

        toast.success("現在地を取得しました");
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("位置情報の取得が許可されていません");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("位置情報を取得できませんでした");
            break;
          case error.TIMEOUT:
            toast.error("位置情報の取得がタイムアウトしました");
            break;
          default:
            toast.error("位置情報の取得に失敗しました");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [map]);

  // マーカーを配置
  useEffect(() => {
    if (!map || !places) return;

    // 既存マーカーをクリア
    markersRef.current.forEach((marker) => (marker.map = null));
    markersRef.current = [];

    places.forEach((place) => {
      if (place.latitude && place.longitude) {
        const lat = parseFloat(place.latitude);
        const lng = parseFloat(place.longitude);

        // ステータスに応じた色を設定
        let pinColor = "#c53030"; // デフォルト（赤）
        let emoji = "🍽";
        if (place.status === "want_to_go") {
          pinColor = "#ec4899"; // ピンク（行きたい）
          emoji = "❤️";
        } else if (place.status === "visited") {
          pinColor = "#22c55e"; // 緑（訪問済み）
          emoji = "✓";
        }

        const pinElement = document.createElement("div");
        pinElement.innerHTML = `
          <div style="
            background: ${pinColor};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          ">
            <span style="transform: rotate(45deg); color: white; font-size: 14px;">${emoji}</span>
          </div>
        `;

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat, lng },
          content: pinElement,
          title: place.name,
        });

        marker.addListener("click", () => {
          setSelectedPlace(place.id);
          map.panTo({ lat, lng });
        });

        markersRef.current.push(marker);
      }
    });

    // 全マーカーが見えるようにズーム調整
    if (places.length > 0 && markersRef.current.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      places.forEach((place) => {
        if (place.latitude && place.longitude) {
          bounds.extend({
            lat: parseFloat(place.latitude),
            lng: parseFloat(place.longitude),
          });
        }
      });
      map.fitBounds(bounds);
    }
  }, [map, places]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const result = await parseSearchMutation.mutateAsync({ query: searchQuery });
      const params = new URLSearchParams();
      params.set("q", searchQuery);
      if (result.features?.length) {
        params.set("features", result.features.join(","));
      }
      if (result.genre) {
        params.set("genre", result.genre);
      }
      setLocation(`/search?${params.toString()}`);
    } catch (error) {
      toast.error("検索に失敗しました");
    }
  };

  const handleStatusChange = async (placeId: number, status: PlaceStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id: placeId, status });
      toast.success(
        status === "want_to_go"
          ? "行きたいリストに追加しました"
          : status === "visited"
          ? "訪問済みにしました"
          : "ステータスを解除しました"
      );
    } catch (error) {
      toast.error("更新に失敗しました");
    }
  };

  const selectedPlaceData = places?.find((p) => p.id === selectedPlace);

  const getStatusIcon = (status: PlaceStatus) => {
    switch (status) {
      case "want_to_go":
        return <Heart className="w-4 h-4 fill-pink-500 text-pink-500" />;
      case "visited":
        return <Check className="w-4 h-4 text-green-500" />;
      default:
        return <Bookmark className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: PlaceStatus) => {
    switch (status) {
      case "want_to_go":
        return "行きたい";
      case "visited":
        return "訪問済み";
      default:
        return "未設定";
    }
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
      <div className="min-h-screen flex flex-col bg-background">
        {/* Hero Section - スマホ最適化 */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="text-center max-w-md mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
                <UtensilsCrossed className="w-7 h-7 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-3">行きたい店マップ</h1>
            <p className="text-base text-muted-foreground mb-6">
              気になるお店を一箇所にまとめて、
              <br />
              目的に合わせて簡単に検索・整理
            </p>

            <div className="space-y-3 mb-8 text-left">
              <Card className="bg-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <MapPin className="w-6 h-6 text-primary shrink-0" />
                  <div>
                    <h3 className="font-semibold text-sm">店舗をまとめる</h3>
                    <p className="text-xs text-muted-foreground">Googleマップから店舗情報を取得</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <List className="w-6 h-6 text-primary shrink-0" />
                  <div>
                    <h3 className="font-semibold text-sm">リストで整理</h3>
                    <p className="text-xs text-muted-foreground">デート用、会食用など目的別に分類</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <Search className="w-6 h-6 text-primary shrink-0" />
                  <div>
                    <h3 className="font-semibold text-sm">自然言語で検索</h3>
                    <p className="text-xs text-muted-foreground">「カップル向け イタリアン」で即検索</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button size="lg" asChild className="w-full h-12 text-base">
              <a href={getLoginUrl()}>ログインして始める</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header - スマホ最適化 */}
      <header className="border-b bg-card px-3 py-2 flex items-center gap-2 shrink-0 safe-area-top">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="カップル向け イタリアン..."
              className="pl-9 pr-3 h-10 rounded-full text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
        </div>

        {/* Filter Button */}
        <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" asChild>
          <Link href="/filter">
            <Filter className="w-5 h-5" />
          </Link>
        </Button>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Map */}
        <MapView
          onMapReady={handleMapReady}
          className="w-full h-full"
          initialCenter={{ lat: 35.6812, lng: 139.7671 }}
          initialZoom={12}
        />

        {/* Map Controls - 右上 */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-11 w-11 shadow-lg bg-card"
            onClick={getCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Navigation className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Place Count Badge - 左上 */}
        {places && places.length > 0 && (
          <div className="absolute top-3 left-3 bg-card/95 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg">
            <span className="text-sm font-medium">{places.length} 件</span>
          </div>
        )}

        {/* Place List Drawer - スマホ用ボトムシート */}
        <Drawer open={isPlaceListOpen} onOpenChange={setIsPlaceListOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="secondary"
              className="absolute bottom-20 left-1/2 -translate-x-1/2 shadow-lg bg-card h-11 px-4 gap-2"
            >
              <ChevronUp className="w-4 h-4" />
              店舗一覧
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[70vh]">
            <DrawerHeader className="border-b">
              <DrawerTitle>保存した店舗 ({places?.length || 0}件)</DrawerTitle>
            </DrawerHeader>
            <ScrollArea className="flex-1 px-4">
              <div className="py-4 space-y-3 pb-8">
                {placesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : places && places.length > 0 ? (
                  places.map((place) => (
                    <Card
                      key={place.id}
                      className={`cursor-pointer active:scale-[0.98] transition-transform ${
                        selectedPlace === place.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => {
                        setSelectedPlace(place.id);
                        setIsPlaceListOpen(false);
                        if (map && place.latitude && place.longitude) {
                          map.panTo({
                            lat: parseFloat(place.latitude),
                            lng: parseFloat(place.longitude),
                          });
                          map.setZoom(16);
                        }
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-base truncate">{place.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {place.genre && (
                                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                  {place.genre}
                                </span>
                              )}
                              {place.userRating && (
                                <span className="flex items-center gap-0.5 text-xs text-primary">
                                  <Star className="w-3 h-3 fill-primary" />
                                  {place.userRating}
                                </span>
                              )}
                            </div>
                            {place.summary && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {place.summary}
                              </p>
                            )}
                          </div>
                          {getStatusIcon(place.status as PlaceStatus)}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">まだ店舗がありません</p>
                    <Button variant="link" size="sm" asChild className="mt-2">
                      <Link href="/add">店舗を追加する</Link>
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DrawerContent>
        </Drawer>

        {/* Selected Place Card - スマホ最適化 */}
        {selectedPlaceData && (
          <div className="absolute bottom-20 left-3 right-3">
            <Card className="shadow-lg">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-base flex-1 truncate pr-2">
                    {selectedPlaceData.name}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 -mr-2 -mt-1"
                    onClick={() => setSelectedPlace(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {selectedPlaceData.genre && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      {selectedPlaceData.genre}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      selectedPlaceData.status === "want_to_go"
                        ? "bg-pink-100 text-pink-700"
                        : selectedPlaceData.status === "visited"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {getStatusIcon(selectedPlaceData.status as PlaceStatus)}
                    {getStatusLabel(selectedPlaceData.status as PlaceStatus)}
                  </span>
                </div>

                {selectedPlaceData.summary && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {selectedPlaceData.summary}
                  </p>
                )}

                {/* Status Buttons */}
                <div className="flex gap-2 mb-3">
                  <Button
                    variant={selectedPlaceData.status === "want_to_go" ? "default" : "outline"}
                    size="sm"
                    className={`flex-1 h-10 ${
                      selectedPlaceData.status === "want_to_go" ? "bg-pink-500 hover:bg-pink-600" : ""
                    }`}
                    onClick={() =>
                      handleStatusChange(
                        selectedPlaceData.id,
                        selectedPlaceData.status === "want_to_go" ? "none" : "want_to_go"
                      )
                    }
                  >
                    <Heart
                      className={`w-4 h-4 mr-1 ${
                        selectedPlaceData.status === "want_to_go" ? "fill-white" : ""
                      }`}
                    />
                    行きたい
                  </Button>
                  <Button
                    variant={selectedPlaceData.status === "visited" ? "default" : "outline"}
                    size="sm"
                    className={`flex-1 h-10 ${
                      selectedPlaceData.status === "visited" ? "bg-green-500 hover:bg-green-600" : ""
                    }`}
                    onClick={() =>
                      handleStatusChange(
                        selectedPlaceData.id,
                        selectedPlaceData.status === "visited" ? "none" : "visited"
                      )
                    }
                  >
                    <Check className="w-4 h-4 mr-1" />
                    訪問済み
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10"
                    onClick={() => setDetailDialogOpen(true)}
                  >
                    詳細・評価
                  </Button>
                  {selectedPlaceData.googleMapsUrl && (
                    <Button variant="outline" size="icon" className="h-10 w-10" asChild>
                      <a
                        href={selectedPlaceData.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Navigation - スマホ用 */}
      <nav className="border-t bg-card px-2 py-2 safe-area-bottom">
        <div className="flex items-center justify-around">
          <Link href="/">
            <Button variant="ghost" className="flex-col h-14 w-16 gap-1">
              <HomeIcon className="w-5 h-5" />
              <span className="text-xs">ホーム</span>
            </Button>
          </Link>
          <Link href="/filter">
            <Button variant="ghost" className="flex-col h-14 w-16 gap-1">
              <Search className="w-5 h-5" />
              <span className="text-xs">検索</span>
            </Button>
          </Link>
          <Link href="/add">
            <Button variant="default" className="h-12 w-12 rounded-full shadow-lg">
              <Plus className="w-6 h-6" />
            </Button>
          </Link>
          <Link href="/lists">
            <Button variant="ghost" className="flex-col h-14 w-16 gap-1">
              <List className="w-5 h-5" />
              <span className="text-xs">リスト</span>
            </Button>
          </Link>
          <Link href="/lists">
            <Button variant="ghost" className="flex-col h-14 w-16 gap-1">
              <User className="w-5 h-5" />
              <span className="text-xs">マイページ</span>
            </Button>
          </Link>
        </div>
      </nav>

      {/* Place Detail Dialog */}
      {selectedPlaceData && (
        <PlaceDetailDialog
          place={selectedPlaceData}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          onEdit={() => setEditDialogOpen(true)}
        />
      )}

      {/* Place Edit Dialog */}
      {selectedPlaceData && (
        <PlaceEditDialog
          place={selectedPlaceData}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
    </div>
  );
}
