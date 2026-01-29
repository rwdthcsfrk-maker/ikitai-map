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
import type { TouchEvent as ReactTouchEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Search,
  Loader2,
  MapPin,
  Star,
  Plus,
  List,
  ChevronUp,
  X,
  CheckCircle2,
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
import BottomNav from "@/components/BottomNav";

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

const EARTH_RADIUS_KM = 6371;

const getDistanceKm = (from: LatLng, to: LatLng) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

const formatDistance = (distanceKm: number) => {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
};

const formatPriceLevel = (priceLevel?: number) => {
  if (!priceLevel) return "情報なし";
  return "￥".repeat(Math.min(Math.max(priceLevel, 1), 4));
};

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
  const [savingRecommendedId, setSavingRecommendedId] = useState<string | null>(null);
  const [isRecommendOpen, setIsRecommendOpen] = useState(false);
  const [sceneInput, setSceneInput] = useState("");
  const sheetTouchStartY = useRef<number | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  const utils = trpc.useUtils();
  const { data: lists } = trpc.list.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: sharedLists } = trpc.list.shared.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: savedPlaces } = trpc.place.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: recommendedPlaces, isLoading: recommendedLoading } = trpc.place.recommended.useQuery(
    {
      location: currentLocation ?? undefined,
      limit: 6,
    },
    {
      enabled: isAuthenticated,
    }
  );
  const savedPlaceIds = new Set(
    (savedPlaces || [])
      .map((place) => place.googlePlaceId)
      .filter((placeId): placeId is string => Boolean(placeId))
  );

  const createPlaceMutation = trpc.place.create.useMutation();

  const addToListMutation = trpc.list.addPlace.useMutation({
    onSuccess: () => {
      utils.list.list.invalidate();
    },
  });

  const generateSummaryMutation = trpc.ai.generateSummary.useMutation();

  const handleCreatePlace = async (
    payload: Parameters<typeof createPlaceMutation.mutateAsync>[0],
    options?: {
      redirect?: boolean;
      onSuccess?: () => void;
    }
  ) => {
    try {
      const place = await createPlaceMutation.mutateAsync(payload);
      utils.place.list.invalidate();
      toast.success("店舗を保存しました");

      // 選択したリストに追加
      if (selectedLists.length > 0) {
        selectedLists.forEach((listId) => {
          addToListMutation.mutate({ listId, placeId: place.id });
        });
      }

      options?.onSuccess?.();

      if (options?.redirect) {
        setLocation("/");
      }
    } catch (error) {
      toast.error("店舗の保存に失敗しました");
    }
  };

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


  const handleSaveRecommended = (place: {
    placeId: string;
    name: string;
    address: string;
    rating?: number;
    userRatingsTotal?: number;
    latitude: number;
    longitude: number;
    googleMapsUrl: string;
    reason?: string;
  }) => {
    if (savedPlaceIds.has(place.placeId)) {
      toast.success("すでに追加済みです");
      return;
    }
    setSavingRecommendedId(place.placeId);
    handleCreatePlace({
      googlePlaceId: place.placeId,
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      rating: place.rating,
      summary: place.reason,
      source: "Google",
      googleMapsUrl: place.googleMapsUrl,
    }, {
      onSuccess: () => setSavingRecommendedId(null),
    }).catch(() => setSavingRecommendedId(null));
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

    await handleCreatePlace({
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
    }, {
      redirect: true,
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

      {/* Map + Sections */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="relative h-[42vh] shrink-0">
          <MapView
            onMapReady={handleMapReady}
            className="w-full h-full"
            initialCenter={{ lat: 35.6812, lng: 139.7671 }}
            initialZoom={12}
          />

          {/* Search Results Button */}
          {searchResults.length > 0 && !isResultsOpen && (
            <Button
              variant="secondary"
              className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg bg-card h-11 px-4 gap-2"
              onClick={() => setIsResultsOpen(true)}
            >
              <ChevronUp className="w-4 h-4" />
              検索結果 ({searchResults.length}件)
            </Button>
          )}

          {/* Selected Place Card */}
          {selectedPlace && (
            <div className="absolute bottom-4 left-3 right-3">
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

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 bg-background border-t pb-24">
          <Card className="border-0 shadow-sm bg-muted/40">
            <CardContent className="p-4">
              <p className="text-sm font-semibold">あなたへのおすすめ</p>
              <p className="text-xs text-muted-foreground mt-1">
                画面下のパネルを上にスワイプしておすすめを確認できます
              </p>
            </CardContent>
          </Card>
        </div>
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

            {(lists && lists.length > 0) || (sharedLists && sharedLists.length > 0) ? (
              <div className="space-y-3">
                <Label className="text-sm font-medium">リストに追加（任意）</Label>
                <div className="space-y-2">
                  {[...(lists || []), ...(sharedLists || [])].map((list) => (
                    <div
                      key={list.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        list.accessRole === "viewer"
                          ? "opacity-60 cursor-not-allowed"
                          : "cursor-pointer active:bg-muted/50"
                      }`}
                      onClick={() => {
                        if (list.accessRole === "viewer") return;
                        toggleList(list.id);
                      }}
                    >
                      <Checkbox
                        checked={selectedLists.includes(list.id)}
                        onCheckedChange={() => toggleList(list.id)}
                        disabled={list.accessRole === "viewer"}
                      />
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: list.color || "#3b82f6" }}
                      >
                        <List className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm">{list.name}</span>
                      {list.accessRole && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {list.accessRole === "editor" ? "編集可" : "閲覧"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
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

      <RecommendedSheet
        isOpen={isRecommendOpen}
        onToggle={() => setIsRecommendOpen((prev) => !prev)}
        onTouchStart={(event) => {
          sheetTouchStartY.current = event.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(event) => {
          if (sheetTouchStartY.current === null) return;
          const endY = event.changedTouches[0]?.clientY ?? sheetTouchStartY.current;
          const delta = sheetTouchStartY.current - endY;
          if (delta > 40) setIsRecommendOpen(true);
          if (delta < -40) setIsRecommendOpen(false);
          sheetTouchStartY.current = null;
        }}
        sceneInput={sceneInput}
        onSceneChange={setSceneInput}
        recommendedPlaces={recommendedPlaces || []}
        recommendedLoading={recommendedLoading}
        currentLocation={currentLocation}
        savedPlaceIds={savedPlaceIds}
        savingRecommendedId={savingRecommendedId}
        isSaving={createPlaceMutation.isPending}
        onSave={handleSaveRecommended}
      />

      <BottomNav />
    </div>
  );
}

function RecommendedPlaceCard({
  place,
  currentLocation,
  savedPlaceIds,
  savingRecommendedId,
  isSaving,
  onSave,
  sceneTokens = [],
  variant = "stack",
}: {
  place: {
    placeId: string;
    name: string;
    address: string;
    rating?: number;
    userRatingsTotal?: number;
    latitude: number;
    longitude: number;
    googleMapsUrl: string;
    reason: string;
  };
  currentLocation: LatLng | null;
  savedPlaceIds: Set<string>;
  savingRecommendedId: string | null;
  isSaving: boolean;
  onSave: (place: {
    placeId: string;
    name: string;
    address: string;
    rating?: number;
    userRatingsTotal?: number;
    latitude: number;
    longitude: number;
    googleMapsUrl: string;
    reason?: string;
  }) => void;
  sceneTokens?: string[];
  variant?: "stack" | "inline";
}) {
  const { data: details, isLoading: detailsLoading } = trpc.place.googleDetails.useQuery(
    { placeId: place.placeId },
    { enabled: Boolean(place.placeId) }
  );
  const distanceLabel =
    currentLocation
      ? formatDistance(
          getDistanceKm(currentLocation, { lat: place.latitude, lng: place.longitude })
        )
      : "現在地未取得";
  const openingLabel = detailsLoading
    ? "取得中"
    : details?.opening_hours
      ? details.opening_hours.open_now
        ? "営業中"
        : "営業時間外"
      : "情報なし";
  const priceLabel = detailsLoading ? "取得中" : formatPriceLevel(details?.price_level);

  const matchScore = (() => {
    const base = 62;
    const ratingBoost = place.rating ? Math.round(place.rating * 6) : 0;
    const reviewBoost = place.userRatingsTotal
      ? Math.min(10, Math.round(Math.log10(place.userRatingsTotal + 1) * 8))
      : 0;
    const sceneBoost = sceneTokens.some((token) =>
      [place.name, place.reason].some((text) => text?.includes(token))
    )
      ? 8
      : 0;
    return Math.min(98, base + ratingBoost + reviewBoost + sceneBoost);
  })();

  return (
    <Card className={`${variant === "stack" ? "w-full" : "w-60"} shrink-0 border bg-background/90`}>
      <CardContent className="p-3 space-y-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{place.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {place.address?.split(" ")[0]}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {place.rating && (
            <span className="flex items-center gap-1 text-foreground">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {place.rating}
            </span>
          )}
          {place.userRatingsTotal && (
            <span className="text-[10px] text-muted-foreground">
              {place.userRatingsTotal}件
            </span>
          )}
          <span className="ml-auto text-[10px] text-primary font-medium">
            マッチ度 {matchScore}%
          </span>
        </div>
        <div className="rounded-lg bg-muted/40 p-2 text-[10px] text-muted-foreground space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span>理由</span>
            <span className="truncate">{place.reason}</span>
          </div>
          {sceneTokens.length > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span>シーン</span>
              <span className="truncate">{sceneTokens.join(" / ")}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span>営業時間</span>
            <span>{openingLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>価格帯</span>
            <span>{priceLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>距離</span>
            <span>{distanceLabel}</span>
          </div>
        </div>
        <Button
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => onSave(place)}
          disabled={
            isSaving ||
            savingRecommendedId === place.placeId ||
            savedPlaceIds.has(place.placeId)
          }
        >
          {savedPlaceIds.has(place.placeId) ? (
            <>
              <CheckCircle2 className="w-3 h-3 mr-1" />
              追加済み
            </>
          ) : savingRecommendedId === place.placeId ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <Plus className="w-3 h-3 mr-1" />
              保存する
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function RecommendedSheet({
  isOpen,
  onToggle,
  onTouchStart,
  onTouchEnd,
  sceneInput,
  onSceneChange,
  recommendedPlaces,
  recommendedLoading,
  currentLocation,
  savedPlaceIds,
  savingRecommendedId,
  isSaving,
  onSave,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onTouchStart: (event: ReactTouchEvent<HTMLDivElement>) => void;
  onTouchEnd: (event: ReactTouchEvent<HTMLDivElement>) => void;
  sceneInput: string;
  onSceneChange: (value: string) => void;
  recommendedPlaces: Array<{
    placeId: string;
    name: string;
    address: string;
    rating?: number;
    userRatingsTotal?: number;
    latitude: number;
    longitude: number;
    googleMapsUrl: string;
    reason: string;
  }>;
  recommendedLoading: boolean;
  currentLocation: LatLng | null;
  savedPlaceIds: Set<string>;
  savingRecommendedId: string | null;
  isSaving: boolean;
  onSave: (place: {
    placeId: string;
    name: string;
    address: string;
    rating?: number;
    userRatingsTotal?: number;
    latitude: number;
    longitude: number;
    googleMapsUrl: string;
    reason?: string;
  }) => void;
}) {
  const sceneTokens = sceneInput.trim().length > 0
    ? sceneInput.split(/[、,\s]+/).filter(Boolean)
    : [];
  const scenePreset = [
    "デート",
    "家族ご飯",
    "友達と",
    "接待",
    "一人ごはん",
  ];

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40"
      style={{
        transform: isOpen ? "translateY(0)" : "translateY(62%)",
        transition: "transform 0.25s ease",
      }}
    >
      <div
        className="mx-auto w-full max-w-lg rounded-t-3xl bg-background/95 backdrop-blur border-t shadow-[0_-12px_40px_rgba(0,0,0,0.1)]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          className="w-full py-3 flex items-center justify-center gap-2"
          onClick={onToggle}
          aria-label="おすすめパネルを開閉"
        >
          <span className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        </button>
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold">あなたへのおすすめ</p>
              <p className="text-xs text-muted-foreground">
                シーンに合わせてマッチ度を表示
              </p>
            </div>
            {recommendedLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {scenePreset.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`px-3 py-1.5 text-xs rounded-full border ${
                  sceneTokens.includes(preset)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground"
                }`}
                onClick={() => {
                  if (sceneTokens.includes(preset)) {
                    onSceneChange(sceneTokens.filter((token) => token !== preset).join(" "));
                  } else {
                    onSceneChange([...sceneTokens, preset].join(" "));
                  }
                }}
              >
                {preset}
              </button>
            ))}
          </div>

          <Input
            value={sceneInput}
            onChange={(event) => onSceneChange(event.target.value)}
            placeholder="2名・シーン（例: デート / 家族ご飯）"
            className="h-11 mt-2"
          />

          <div className="mt-4 space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {recommendedPlaces.map((place) => (
              <RecommendedPlaceCard
                key={place.placeId}
                place={place}
                currentLocation={currentLocation}
                savedPlaceIds={savedPlaceIds}
                savingRecommendedId={savingRecommendedId}
                isSaving={isSaving}
                onSave={onSave}
                sceneTokens={sceneTokens}
                variant="stack"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
