import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { useState, useCallback, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Search,
  Loader2,
  MapPin,
  Star,
  Plus,
  Home as HomeIcon,
  List,
  User,
  Filter,
  ChevronUp,
  X,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  priceLevel?: number;
  types?: string[];
  photoUrl?: string;
}

type LatLng = { lat: number; lng: number };

// SNSで話題のお店の型定義
interface SNSTrendingPlace {
  name: string;
  source: string;
  description: string;
  engagement: number;
  sourceUrl?: string;
  thumbnailUrl?: string;
  extractedStoreName?: string;
  placeInfo?: {
    placeId: string;
    name: string;
    address: string;
    rating?: number;
    latitude: number;
    longitude: number;
    googleMapsUrl: string;
  };
}

export default function AddPlace() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [selectedLists, setSelectedLists] = useState<number[]>([]);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [isSaveDrawerOpen, setIsSaveDrawerOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  const utils = trpc.useUtils();
  const { data: lists } = trpc.list.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  // SNSで話題のお店を取得
  const { data: trendingData, isLoading: trendingLoading } = trpc.advancedSearch.trending.useQuery(
    {
      limit: 10,
      area: selectedArea || undefined,
    },
    {
      enabled: isAuthenticated,
    }
  );

  // エリア選択肢
  const areas = [
    { id: '', label: '全国' },
    { id: '渋谷', label: '渋谷' },
    { id: '新宿', label: '新宿' },
    { id: '池袋', label: '池袋' },
    { id: '東京', label: '東京' },
    { id: '横浜', label: '横浜' },
    { id: '大阪', label: '大阪' },
    { id: '京都', label: '京都' },
    { id: '福岡', label: '福岡' },
  ];

  const createPlaceMutation = trpc.place.create.useMutation({
    onSuccess: (place) => {
      utils.place.list.invalidate();
      toast.success("店舗を保存しました");

      // 選択したリストに追加
      if (selectedLists.length > 0) {
        selectedLists.forEach((listId) => {
          addToListMutation.mutate({ listId, placeId: place.id });
        });
      }

      setLocation("/");
    },
    onError: () => {
      toast.error("店舗の保存に失敗しました");
    },
  });

  const addToListMutation = trpc.list.addPlace.useMutation({
    onSuccess: () => {
      utils.list.list.invalidate();
    },
  });

  const generateSummaryMutation = trpc.ai.generateSummary.useMutation();

  const handleMapReady = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    placesServiceRef.current = new google.maps.places.PlacesService(mapInstance);
  }, []);

  const centerMapOnCurrentLocation = useCallback(() => {
    if (!map || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        map.panTo({ lat: latitude, lng: longitude });
        map.setZoom(14);
      },
      () => {
        setCurrentLocation(null);
        // Ignore geolocation errors to keep the default center.
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [map]);

  useEffect(() => {
    centerMapOnCurrentLocation();
  }, [centerMapOnCurrentLocation]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !placesServiceRef.current || !map) return;

    setIsSearching(true);
    setSearchResults([]);

    const request: google.maps.places.TextSearchRequest = {
      query: searchQuery,
      type: "restaurant",
    };

    placesServiceRef.current.textSearch(request, (results, status) => {
      setIsSearching(false);
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const places: PlaceResult[] = results.slice(0, 10).map((place) => ({
          placeId: place.place_id || "",
          name: place.name || "",
          address: place.formatted_address || "",
          lat: place.geometry?.location?.lat() || 0,
          lng: place.geometry?.location?.lng() || 0,
          rating: place.rating,
          priceLevel: place.price_level,
          types: place.types,
          photoUrl: place.photos?.[0]?.getUrl({ maxWidth: 400 }),
        }));
        setSearchResults(places);
        setIsResultsOpen(true);

        // 検索結果が見えるようにマップを調整
        if (places.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          places.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
          map.fitBounds(bounds);
        }
      } else {
        toast.error("検索結果が見つかりませんでした");
      }
    });
  }, [searchQuery, map]);

  const handleSelectPlace = useCallback(
    (place: PlaceResult) => {
      setSelectedPlace(place);
      setIsResultsOpen(false);

      if (map) {
        map.panTo({ lat: place.lat, lng: place.lng });
        map.setZoom(16);

        // 既存マーカーを削除
        if (markerRef.current) {
          markerRef.current.map = null;
        }

        // 新しいマーカーを追加
        const pinElement = document.createElement("div");
        pinElement.innerHTML = `
          <div style="
            background: var(--primary, #c53030);
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          ">
            <span style="transform: rotate(45deg); color: white; font-size: 18px;">🍽</span>
          </div>
        `;

        markerRef.current = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: place.lat, lng: place.lng },
          content: pinElement,
          title: place.name,
        });
      }
    },
    [map]
  );

  // SNS話題のお店をリストに追加するハンドラ
  const handleAddSNSTrendingPlace = (place: SNSTrendingPlace) => {
    // Google Places情報があればそれを使用
    if (place.placeInfo) {
      createPlaceMutation.mutate({
        googlePlaceId: place.placeInfo.placeId,
        name: place.placeInfo.name,
        address: place.placeInfo.address,
        latitude: place.placeInfo.latitude,
        longitude: place.placeInfo.longitude,
        rating: place.placeInfo.rating,
        summary: place.description,
        source: `${place.source}で話題`,
        googleMapsUrl: place.placeInfo.googleMapsUrl,
        photoUrl: place.thumbnailUrl,
      });
    } else {
      // Google Places情報がない場合は動画情報のみで保存
      createPlaceMutation.mutate({
        name: place.extractedStoreName || place.name,
        summary: place.description,
        source: `${place.source}で話題`,
        photoUrl: place.thumbnailUrl,
      });
    }
  };

  const handleSave = async () => {
    if (!selectedPlace) return;

    // LLMで要約を生成
    let summary = "";
    let features: string[] = [];
    let genre = "";

    try {
      const result = await generateSummaryMutation.mutateAsync({
        name: selectedPlace.name,
        address: selectedPlace.address,
        genre: selectedPlace.types?.find((t) =>
          ["restaurant", "cafe", "bar", "bakery", "meal_takeaway"].includes(t)
        ),
        rating: selectedPlace.rating,
        priceLevel: selectedPlace.priceLevel,
      });
      summary = result.summary;
      features = result.features;
      genre = result.genre;
    } catch (error) {
      console.error("Failed to generate summary:", error);
    }

    createPlaceMutation.mutate({
      googlePlaceId: selectedPlace.placeId,
      name: selectedPlace.name,
      address: selectedPlace.address,
      latitude: selectedPlace.lat,
      longitude: selectedPlace.lng,
      genre: genre || undefined,
      features: features.length > 0 ? features : undefined,
      summary: summary || undefined,
      source: "Google",
      googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${selectedPlace.placeId}`,
      rating: selectedPlace.rating,
      priceLevel: selectedPlace.priceLevel,
      photoUrl: selectedPlace.photoUrl,
    });
  };

  const toggleList = (listId: number) => {
    setSelectedLists((prev) =>
      prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId]
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
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="mb-4">ログインが必要です</p>
            <Button asChild className="w-full h-12">
              <a href={getLoginUrl()}>ログイン</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header - スマホ最適化 */}
      <header className="border-b bg-card px-3 py-2 shrink-0 safe-area-top">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="店名や場所で検索..."
                className="pl-9 pr-3 h-10 rounded-full text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
          </div>
          <Button
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          onMapReady={handleMapReady}
          className="w-full h-full"
          initialCenter={{ lat: 35.6812, lng: 139.7671 }}
          initialZoom={12}
        />

        {/* SNSで話題のお店 */}
        {!selectedPlace && (
          <div className="absolute top-3 left-3 right-3 z-10">
            <Card className="border-0 shadow-lg bg-gradient-to-r from-pink-50 to-red-50/80 dark:from-pink-950/40 dark:to-red-950/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white flex items-center justify-center shadow-sm">
                      <span className="text-base">🔥</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">話題のお店</p>
                      <p className="text-xs text-muted-foreground">
                        SNSで今話題のグルメスポット
                      </p>
                    </div>
                  </div>
                  {trendingLoading && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {/* エリア選択ボタン */}
                <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                  {areas.map((area) => (
                    <Button
                      key={area.id}
                      variant={selectedArea === area.id ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 px-3 text-xs shrink-0 rounded-full"
                      onClick={() => setSelectedArea(area.id)}
                    >
                      {area.label}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {(trendingData?.places || []).map((place, index) => (
                    <Card
                      key={index}
                      className="w-56 shrink-0 border bg-background/90 cursor-pointer active:scale-[0.98] transition-transform overflow-hidden"
                    >
                      {/* サムネイル表示 */}
                      {place.thumbnailUrl && (
                        <div className="relative w-full h-28 bg-muted">
                          <img
                            src={place.thumbnailUrl}
                            alt={place.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium text-white ${
                            place.source === 'TikTok' ? 'bg-pink-500' : place.source === 'Instagram' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-red-500'
                          }`}>
                            {place.source}
                          </div>
                        </div>
                      )}
                      <CardContent className="p-2.5">
                        <div className="min-w-0">
                          <p className="text-xs font-medium line-clamp-2 leading-tight mb-1">
                            {place.extractedStoreName || place.name}
                          </p>
                          {place.placeInfo && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{place.placeInfo.address?.split(' ')[0]}</span>
                              {place.placeInfo.rating && (
                                <span className="flex items-center ml-1">
                                  <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                                  {place.placeInfo.rating}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="w-full h-7 mt-2 text-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleAddSNSTrendingPlace(place);
                          }}
                          disabled={createPlaceMutation.isPending}
                        >
                          {createPlaceMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Plus className="w-3 h-3 mr-1" />
                              追加
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {!trendingLoading && (!trendingData?.places || trendingData.places.length === 0) && (
                    <div className="text-xs text-muted-foreground px-2 py-3">
                      話題のお店が見つかりませんでした
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search Results Button */}
        {searchResults.length > 0 && !isResultsOpen && (
          <Button
            variant="secondary"
            className="absolute bottom-24 left-1/2 -translate-x-1/2 shadow-lg bg-card h-11 px-4 gap-2"
            onClick={() => setIsResultsOpen(true)}
          >
            <ChevronUp className="w-4 h-4" />
            検索結果 ({searchResults.length}件)
          </Button>
        )}

        {/* Selected Place Card */}
        {selectedPlace && (
          <div className="absolute bottom-24 left-3 right-3">
            <Card className="shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {selectedPlace.photoUrl ? (
                    <img
                      src={selectedPlace.photoUrl}
                      alt={selectedPlace.name}
                      className="w-16 h-16 object-cover rounded-lg shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-base truncate pr-2">
                        {selectedPlace.name}
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
                    <p className="text-sm text-muted-foreground truncate">
                      {selectedPlace.address}
                    </p>
                    {selectedPlace.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{selectedPlace.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  className="w-full mt-3 h-11"
                  onClick={() => setIsSaveDrawerOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  この店舗を保存
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Search Results Drawer */}
      <Drawer open={isResultsOpen} onOpenChange={setIsResultsOpen}>
        <DrawerContent className="max-h-[70vh]">
          <DrawerHeader className="border-b">
            <DrawerTitle>検索結果 ({searchResults.length}件)</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4">
            <div className="py-4 space-y-3 pb-8">
              {searchResults.map((place) => (
                <Card
                  key={place.placeId}
                  className={`cursor-pointer active:scale-[0.98] transition-transform ${
                    selectedPlace?.placeId === place.placeId ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleSelectPlace(place)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {place.photoUrl ? (
                        <img
                          src={place.photoUrl}
                          alt={place.name}
                          className="w-14 h-14 object-cover rounded-lg shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center shrink-0">
                          <MapPin className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{place.name}</h4>
                        <p className="text-xs text-muted-foreground truncate">{place.address}</p>
                        {place.rating && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs">{place.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Save Drawer */}
      <Drawer open={isSaveDrawerOpen} onOpenChange={setIsSaveDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="border-b">
            <DrawerTitle>店舗を保存</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 py-6">
            {selectedPlace && (
              <div className="flex items-start gap-3 mb-6">
                {selectedPlace.photoUrl ? (
                  <img
                    src={selectedPlace.photoUrl}
                    alt={selectedPlace.name}
                    className="w-16 h-16 object-cover rounded-lg shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base">{selectedPlace.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedPlace.address}</p>
                </div>
              </div>
            )}

            {lists && lists.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">リストに追加（任意）</Label>
                <div className="space-y-2">
                  {lists.map((list) => (
                    <div
                      key={list.id}
                      className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer active:bg-muted/50"
                      onClick={() => toggleList(list.id)}
                    >
                      <Checkbox
                        checked={selectedLists.includes(list.id)}
                        onCheckedChange={() => toggleList(list.id)}
                      />
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: list.color || "#3b82f6" }}
                      >
                        <List className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm">{list.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DrawerFooter className="border-t pt-4">
            <Button
              onClick={handleSave}
              disabled={createPlaceMutation.isPending || generateSummaryMutation.isPending}
              className="w-full h-12"
            >
              {createPlaceMutation.isPending || generateSummaryMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  保存中...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  保存する
                </>
              )}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full h-12">
                キャンセル
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Bottom Navigation */}
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
              <Filter className="w-5 h-5" />
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
    </div>
  );
}
