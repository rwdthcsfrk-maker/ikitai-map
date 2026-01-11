import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { useState, useCallback, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, Plus, List, MapPin, Star, ExternalLink, Loader2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<number | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  const { data: places, isLoading: placesLoading } = trpc.place.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const parseSearchMutation = trpc.ai.parseSearchQuery.useMutation();

  const handleMapReady = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

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
        
        const pinElement = document.createElement('div');
        pinElement.innerHTML = `
          <div style="
            background: var(--primary, #c53030);
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          ">
            <span style="transform: rotate(45deg); color: white; font-size: 14px;">🍽</span>
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

  const selectedPlaceData = places?.find(p => p.id === selectedPlace);

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
                  
                  {selectedPlaceData.genre && (
                    <span className="feature-tag mb-2">{selectedPlaceData.genre}</span>
                  )}
                  
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
                    {selectedPlaceData.address && (
                      <span className="truncate">{selectedPlaceData.address}</span>
                    )}
                  </div>

                  {selectedPlaceData.googleMapsUrl && (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href={selectedPlaceData.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Googleマップで見る
                      </a>
                    </Button>
                  )}
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
                      <h4 className="font-medium text-sm mb-1">{place.name}</h4>
                      {place.genre && (
                        <span className="feature-tag text-xs">{place.genre}</span>
                      )}
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
    </div>
  );
}
