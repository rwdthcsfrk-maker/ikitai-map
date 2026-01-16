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

interface TrendingPlace {
  placeId: string;
  name: string;
  address: string;
  rating?: number | null;
  userRatingsTotal?: number | null;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
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
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  const utils = trpc.useUtils();
  const { data: lists } = trpc.list.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: trendingPlaces, isLoading: trendingLoading } = trpc.place.trending.useQuery(
    {
      location: currentLocation ?? undefined,
      limit: 8,
    },
    {
      enabled: isAuthenticated,
    }
  );

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

  const toPlaceResultFromTrending = (place: TrendingPlace): PlaceResult => ({
    placeId: place.placeId,
    name: place.name,
    address: place.address,
    lat: place.latitude,
    lng: place.longitude,
    rating: place.rating ?? undefined,
  });

  const handleSelectTrendingPlace = (place: TrendingPlace) => {
    handleSelectPlace(toPlaceResultFromTrending(place));
  };

  const handleAddTrendingPlace = (place: TrendingPlace) => {
    handleSelectPlace(toPlaceResultFromTrending(place));
    setIsSaveDrawerOpen(true);
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

        {/* Recommended Places */}
        {!selectedPlace && (
          <div className="absolute top-3 left-3 right-3 z-10">
            <Card className="border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50/80 dark:from-amber-950/40 dark:to-orange-950/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">おすすめの店</p>
                      <p className="text-xs text-muted-foreground">
                        {currentLocation ? "近くで人気のお店" : "人気のお店をピックアップ"}
                      </p>
                    </div>
                  </div>
                  {trendingLoading && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {(trendingPlaces || []).map((place) => (
                    <Card
                      key={place.placeId}
                      className="w-52 shrink-0 border bg-background/80 cursor-pointer active:scale-[0.98] transition-transform"
                      onClick={() => handleSelectTrendingPlace(place)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{place.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {place.address}
                            </p>
                            {place.rating && (
                              <div className="flex items-center gap-1 mt-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs font-medium">{place.rating}</span>
                                {place.userRatingsTotal && (
                                  <span className="text-[10px] text-muted-foreground">
                                    ({place.userRatingsTotal})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full h-8 mt-2"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleAddTrendingPlace(place);
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          追加
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {!trendingLoading && (!trendingPlaces || trendingPlaces.length === 0) && (
                    <div className="text-xs text-muted-foreground px-2 py-3">
                      近くのおすすめが見つかりませんでした
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
