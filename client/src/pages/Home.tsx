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
  ChevronDown,
  Coffee,
  Utensils,
  Wine,
  Flame,
  Soup,
  IceCream,
  Globe,
  Beer,
} from "lucide-react";
import { toast } from "sonner";
import PlaceDetailDialog from "@/components/PlaceDetailDialog";
import PlaceEditDialog from "@/components/PlaceEditDialog";
import BottomNav from "@/components/BottomNav";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PARENT_GENRES, BUDGET_BANDS, DISTANCE_OPTIONS } from "@shared/masters";

type PlaceStatus = "none" | "want_to_go" | "visited";

// ジャンルアイコンマッピング
const genreIcons: Record<string, React.ReactNode> = {
  cafe: <Coffee className="w-5 h-5" />,
  japanese: <Utensils className="w-5 h-5" />,
  western: <Utensils className="w-5 h-5" />,
  chinese: <Soup className="w-5 h-5" />,
  asian: <Globe className="w-5 h-5" />,
  yakiniku: <Flame className="w-5 h-5" />,
  izakaya: <Beer className="w-5 h-5" />,
  ramen: <Soup className="w-5 h-5" />,
  sweets: <IceCream className="w-5 h-5" />,
};

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
  const [showFilters, setShowFilters] = useState(true);
  const [initialPlaceHandled, setInitialPlaceHandled] = useState(false);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const currentLocationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // クイックフィルタ状態
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [selectedDistance, setSelectedDistance] = useState<string>("");
  const [selectedBudget, setSelectedBudget] = useState<string>("");

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
    // マップが準備できたらすぐに現在地を取得して中心に設定
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          mapInstance.panTo({ lat: latitude, lng: longitude });
          mapInstance.setZoom(16);

          // 現在地マーカーを追加
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
            map: mapInstance,
            position: { lat: latitude, lng: longitude },
            content: locationPin,
            title: "現在地",
          });
        },
        () => {
          // 位置情報取得失敗時はデフォルトの東京駅を表示
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000,
        }
      );
    }
  }, []);

  // 現在地を取得
  const getCurrentLocation = useCallback((options?: { showToast?: boolean }) => {
    const showToast = options?.showToast ?? true;
    if (!navigator.geolocation) {
      if (showToast) {
        toast.error("お使いのブラウザは位置情報に対応していません");
      }
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
          map.setZoom(16); // 飲食店POIが見やすいズームレベル

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

        if (showToast) {
          toast.success("現在地を取得しました");
        }
      },
      (error) => {
        setIsLocating(false);
        if (showToast) {
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
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [map]);

  // 現在地の自動取得はhandleMapReadyで実行するためここでは不要

  // フィルタリングされた店舗
  const filteredPlaces = places?.filter((place) => {
    if (selectedGenre && place.genreParent !== selectedGenre) return false;
    if (selectedBudget) {
      const matchLunch = place.budgetLunch === selectedBudget;
      const matchDinner = place.budgetDinner === selectedBudget;
      if (!matchLunch && !matchDinner) return false;
    }
    // 距離フィルタは現在地がある場合のみ
    if (selectedDistance && currentLocation && place.latitude && place.longitude) {
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        parseFloat(place.latitude),
        parseFloat(place.longitude)
      );
      const maxDistance = parseInt(selectedDistance);
      if (distance > maxDistance) return false;
    }
    return true;
  });

  // 距離計算（メートル）
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // マーカーを配置
  useEffect(() => {
    if (!map || !filteredPlaces) return;

    markersRef.current.forEach((marker) => (marker.map = null));
    markersRef.current = [];

    filteredPlaces.forEach((place) => {
      if (place.latitude && place.longitude) {
        const lat = parseFloat(place.latitude);
        const lng = parseFloat(place.longitude);

        let pinColor = "#c53030";
        let emoji = "🍽";
        if (place.status === "want_to_go") {
          pinColor = "#ec4899";
          emoji = "❤️";
        } else if (place.status === "visited") {
          pinColor = "#22c55e";
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

    if (currentLocation) {
      map.panTo({ lat: currentLocation.lat, lng: currentLocation.lng });
      map.setZoom(14);
      return;
    }
    if (filteredPlaces.length > 0 && markersRef.current.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      filteredPlaces.forEach((place) => {
        if (place.latitude && place.longitude) {
          bounds.extend({
            lat: parseFloat(place.latitude),
            lng: parseFloat(place.longitude),
          });
        }
      });
      map.fitBounds(bounds);
    }
  }, [map, filteredPlaces, currentLocation]);

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

  const handleQuickFilter = () => {
    const params = new URLSearchParams();
    if (selectedGenre) params.set("genreParent", selectedGenre);
    if (selectedBudget) params.set("budgetLunch", selectedBudget);
    if (selectedDistance && currentLocation) {
      params.set("distance", selectedDistance);
      params.set("lat", currentLocation.lat.toString());
      params.set("lng", currentLocation.lng.toString());
    }
    if (params.toString()) {
      setLocation(`/search?${params.toString()}`);
    }
  };

  const clearFilters = () => {
    setSelectedGenre("");
    setSelectedDistance("");
    setSelectedBudget("");
  };

  const hasActiveFilters = selectedGenre || selectedDistance || selectedBudget;

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

  const selectedPlaceData = filteredPlaces?.find((p) => p.id === selectedPlace);

  useEffect(() => {
    if (initialPlaceHandled || !places) return;
    const params = new URLSearchParams(window.location.search);
    const placeIdParam = params.get("placeId");
    if (!placeIdParam) return;

    const placeId = Number(placeIdParam);
    if (!Number.isNaN(placeId)) {
      const exists = places.some((place) => place.id === placeId);
      if (exists) {
        setSelectedPlace(placeId);
        setDetailDialogOpen(true);
      }
    }
    setInitialPlaceHandled(true);
    window.history.replaceState({}, "", window.location.pathname);
  }, [initialPlaceHandled, places]);

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

  // スコアを表示用にフォーマット
  const formatScore = (score: number | null) => {
    if (score === null) return null;
    return score;
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
                    <h3 className="font-semibold text-sm">条件で検索</h3>
                    <p className="text-xs text-muted-foreground">ジャンル・予算・距離で絞り込み</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button asChild size="lg" className="w-full h-14 text-base">
              <a href={getLoginUrl()}>ログインして始める</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* ヘッダー - 検索バー */}
      <header className="bg-background border-b px-3 py-2 safe-area-top">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <UtensilsCrossed className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="カップル向け イタリアン..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9 pr-4 h-10 text-base"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className={`w-5 h-5 ${hasActiveFilters ? "text-primary" : ""}`} />
          </Button>
        </div>

        {/* クイックフィルタ */}
        {showFilters && (
          <div className="mt-3 space-y-2">
            {/* ジャンル選択（横スクロール） */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
              <Button
                variant={selectedGenre === "" ? "default" : "outline"}
                size="sm"
                className="shrink-0 h-9"
                onClick={() => setSelectedGenre("")}
              >
                すべて
              </Button>
              {PARENT_GENRES.map((genre) => (
                <Button
                  key={genre.id}
                  variant={selectedGenre === genre.id ? "default" : "outline"}
                  size="sm"
                  className="shrink-0 h-9 gap-1"
                  onClick={() => setSelectedGenre(genre.id)}
                >
                  {genreIcons[genre.id] || <Utensils className="w-4 h-4" />}
                  {genre.name}
                </Button>
              ))}
            </div>

            {/* 距離・予算セレクト */}
            <div className="flex gap-2">
              <Select value={selectedDistance} onValueChange={setSelectedDistance}>
                <SelectTrigger className="flex-1 h-10">
                  <SelectValue placeholder="距離" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">距離指定なし</SelectItem>
                  {DISTANCE_OPTIONS.filter(opt => opt.meters !== null).map((opt) => (
                    <SelectItem key={opt.id} value={opt.meters?.toString() || ''}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedBudget} onValueChange={setSelectedBudget}>
                <SelectTrigger className="flex-1 h-10">
                  <SelectValue placeholder="予算" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">予算指定なし</SelectItem>
                  {BUDGET_BANDS.lunch.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* 詳細検索ボタン */}
            <Link href="/search">
              <Button
                variant="outline"
                className="w-full h-12 text-base"
                type="button"
              >
                <Filter className="w-5 h-5 mr-2" />
                詳細条件で検索
              </Button>
            </Link>
          </div>
        )}
      </header>

      {/* マップエリア */}
      <div className="flex-1 relative">
        <MapView onMapReady={handleMapReady} />

        {/* 件数バッジ */}
        <div className="absolute top-3 left-3 bg-background/95 backdrop-blur px-3 py-1.5 rounded-full shadow-lg text-sm font-medium">
          {filteredPlaces?.length ?? 0} 件
        </div>

        {/* 現在地ボタン */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-3 right-3 w-11 h-11 rounded-full shadow-lg"
          onClick={() => getCurrentLocation()}
          disabled={isLocating}
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Navigation className="w-5 h-5" />
          )}
        </Button>

        {/* 店舗一覧ボタン */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
          <Button
            variant="secondary"
            className="rounded-full shadow-lg px-5 h-11"
            onClick={() => setIsPlaceListOpen(true)}
          >
            <ChevronUp className="w-4 h-4 mr-2" />
            店舗一覧
          </Button>
        </div>
      </div>

      {/* 店舗一覧Drawer */}
      <Drawer open={isPlaceListOpen} onOpenChange={setIsPlaceListOpen}>
        <DrawerContent className="max-h-[85vh] flex flex-col">
          <DrawerHeader className="pb-2 shrink-0">
            <DrawerTitle className="flex items-center justify-between">
              <span>保存した店舗 ({filteredPlaces?.length ?? 0}件)</span>
              <Button variant="ghost" size="sm" onClick={() => setIsPlaceListOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {placesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredPlaces && filteredPlaces.length > 0 ? (
              <div className="space-y-3">
                {filteredPlaces.map((place) => (
                  <Card
                    key={place.id}
                    className={`cursor-pointer transition-all active:scale-[0.98] ${
                      selectedPlace === place.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => {
                      setSelectedPlace(place.id);
                      setDetailDialogOpen(true);
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(place.status as PlaceStatus)}
                            <h3 className="font-semibold text-sm truncate">{place.name}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-1">
                            {place.genre || place.genreParent || "ジャンル未設定"}
                            {place.address && ` · ${place.address.split(" ")[0]}`}
                          </p>
                          {place.summary && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{place.summary}</p>
                          )}
                          {place.userRating !== null && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-xs font-bold text-primary">{place.userRating}点</span>
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${place.userRating}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlace(place.id);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm mb-4">
                  {hasActiveFilters ? "条件に一致する店舗がありません" : "まだ店舗が保存されていません"}
                </p>
                {!hasActiveFilters && (
                  <Button asChild size="sm">
                    <Link href="/add">
                      <Plus className="w-4 h-4 mr-1" />
                      店舗を追加
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* 店舗詳細ダイアログ */}
      {selectedPlaceData && (
        <>
          <PlaceDetailDialog
            place={selectedPlaceData}
            open={detailDialogOpen}
            onOpenChange={setDetailDialogOpen}
            onEdit={() => {
              setDetailDialogOpen(false);
              setEditDialogOpen(true);
            }}
          />
          <PlaceEditDialog
            place={selectedPlaceData}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
        </>
      )}

      <BottomNav />
    </div>
  );
}
