import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { useState, useCallback, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, Plus, List, MapPin, Star, ExternalLink, Loader2, UtensilsCrossed, Navigation, Heart, Check, Bookmark } from "lucide-react";
import { toast } from "sonner";
import PlaceDetailDialog from "@/components/PlaceDetailDialog";
import PlaceEditDialog from "@/components/PlaceEditDialog";

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
    markersRef.current.forEach(marker => marker.map = null);
    markersRef.current = [];

    places.forEach(place => {
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
        
        const pinElement = document.createElement('div');
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

        marker.addListener('click', () => {
          setSelectedPlace(place.id);
          map.panTo({ lat, lng });
        });

        markersRef.current.push(marker);
      }
    });

    // 全マーカーが見えるようにズーム調整
    if (places.length > 0 && markersRef.current.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      places.forEach(place => {
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
        status === "want_to_go" ? "行きたいリストに追加しました" :
        status === "visited" ? "訪問済みにしました" :
        "ステータスを解除しました"
      );
    } catch (error) {
      toast.error("更新に失敗しました");
    }
  };

  const selectedPlaceData = places?.find(p => p.id === selectedPlace);

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
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
          <div className="text-center max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
                <UtensilsCrossed className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              行きたい店マップ
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              気になるお店を一箇所にまとめて、<br />
              目的に合わせて簡単に検索・整理できます
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 text-left">
              <Card className="bg-card">
                <CardContent className="pt-6">
                  <MapPin className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">店舗をまとめる</h3>
                  <p className="text-sm text-muted-foreground">
                    Googleマップから店舗情報を取得して保存
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card">
                <CardContent className="pt-6">
                  <List className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">リストで整理</h3>
                  <p className="text-sm text-muted-foreground">
                    デート用、会食用など目的別に分類
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card">
                <CardContent className="pt-6">
                  <Search className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">自然言語で検索</h3>
                  <p className="text-sm text-muted-foreground">
                    「カップル向け イタリアン」で即検索
                  </p>
                </CardContent>
              </Card>
            </div>

            <Button size="lg" asChild className="px-8">
              <a href={getLoginUrl()}>ログインして始める</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground hidden sm:inline">行きたい店マップ</span>
        </div>
        
        {/* Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="カップル向け イタリアン 個室あり..."
              className="pl-10 pr-4 rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/lists">
              <List className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">リスト</span>
            </Link>
          </Button>
          <Button variant="default" size="sm" asChild>
            <Link href="/add">
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">追加</span>
            </Link>
          </Button>
        </nav>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          <MapView
            onMapReady={handleMapReady}
            className="w-full h-full"
            initialCenter={{ lat: 35.6812, lng: 139.7671 }}
            initialZoom={12}
          />

          {/* Current Location Button */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 right-4 shadow-md bg-card"
            onClick={getCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Navigation className="w-5 h-5" />
            )}
          </Button>

          {/* Place Count Badge */}
          {places && places.length > 0 && (
            <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md">
              <span className="text-sm font-medium">{places.length} 件の店舗</span>
            </div>
          )}

          {/* Selected Place Card */}
          {selectedPlaceData && (
            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80">
              <Card className="place-card shadow-lg">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{selectedPlaceData.name}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setSelectedPlace(null)}
                    >
                      ✕
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    {selectedPlaceData.genre && (
                      <span className="feature-tag">{selectedPlaceData.genre}</span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      selectedPlaceData.status === "want_to_go" ? "bg-pink-100 text-pink-700" :
                      selectedPlaceData.status === "visited" ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {getStatusIcon(selectedPlaceData.status as PlaceStatus)}
                      {getStatusLabel(selectedPlaceData.status as PlaceStatus)}
                    </span>
                  </div>
                  
                  {selectedPlaceData.summary && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {selectedPlaceData.summary}
                    </p>
                  )}

                  {selectedPlaceData.features && selectedPlaceData.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {selectedPlaceData.features.map((feature, i) => (
                        <span key={i} className="feature-tag text-xs">
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    {selectedPlaceData.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {selectedPlaceData.rating}
                      </span>
                    )}
                    {selectedPlaceData.userRating && (
                      <span className="flex items-center gap-1 text-primary">
                        <Star className="w-4 h-4 fill-primary text-primary" />
                        {selectedPlaceData.userRating}/5 (自分)
                      </span>
                    )}
                  </div>

                  {/* Status Buttons */}
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant={selectedPlaceData.status === "want_to_go" ? "default" : "outline"}
                      size="sm"
                      className={selectedPlaceData.status === "want_to_go" ? "bg-pink-500 hover:bg-pink-600" : ""}
                      onClick={() => handleStatusChange(
                        selectedPlaceData.id,
                        selectedPlaceData.status === "want_to_go" ? "none" : "want_to_go"
                      )}
                    >
                      <Heart className={`w-4 h-4 mr-1 ${selectedPlaceData.status === "want_to_go" ? "fill-white" : ""}`} />
                      行きたい
                    </Button>
                    <Button
                      variant={selectedPlaceData.status === "visited" ? "default" : "outline"}
                      size="sm"
                      className={selectedPlaceData.status === "visited" ? "bg-green-500 hover:bg-green-600" : ""}
                      onClick={() => handleStatusChange(
                        selectedPlaceData.id,
                        selectedPlaceData.status === "visited" ? "none" : "visited"
                      )}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      訪問済み
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setDetailDialogOpen(true)}
                    >
                      詳細・評価
                    </Button>
                    {selectedPlaceData.googleMapsUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedPlaceData.googleMapsUrl} target="_blank" rel="noopener noreferrer">
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

        {/* Sidebar - Place List (Desktop) */}
        <aside className="hidden lg:block w-80 border-l bg-card overflow-y-auto">
          <div className="p-4">
            <h2 className="font-semibold mb-4">保存した店舗</h2>
            {placesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : places && places.length > 0 ? (
              <div className="space-y-3">
                {places.map((place) => (
                  <Card
                    key={place.id}
                    className={`place-card cursor-pointer ${selectedPlace === place.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => {
                      setSelectedPlace(place.id);
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
                        <h4 className="font-medium text-sm mb-1">{place.name}</h4>
                        {getStatusIcon(place.status as PlaceStatus)}
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        {place.genre && (
                          <span className="feature-tag text-xs">{place.genre}</span>
                        )}
                        {place.userRating && (
                          <span className="flex items-center gap-0.5 text-xs text-primary">
                            <Star className="w-3 h-3 fill-primary" />
                            {place.userRating}
                          </span>
                        )}
                      </div>
                      {place.summary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {place.summary}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
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
        </aside>
      </div>

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
