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
  Navigation,
  ChevronUp,
  ChevronDown,
  X,
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
import PlaceCardHeader from "@/components/PlaceCardHeader";
import { showSavedToast } from "@/lib/toast";
import PlaceActionBar from "@/components/PlaceActionBar";
import PlaceCardSkeleton from "@/components/PlaceCardSkeleton";
import { buildDirectionsUrl } from "@/lib/maps";

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

const FRONTEND_FORGE_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FRONTEND_FORGE_BASE =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FRONTEND_FORGE_BASE}/v1/maps/proxy`;

const buildPhotoUrl = (photoReference?: string) => {
  if (!photoReference || !FRONTEND_FORGE_KEY) return undefined;
  return `${MAPS_PROXY_URL}/maps/api/place/photo?key=${FRONTEND_FORGE_KEY}&maxwidth=800&photoreference=${encodeURIComponent(
    photoReference
  )}`;
};

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
  const [sceneQuery, setSceneQuery] = useState("");
  const [saveNote, setSaveNote] = useState("");
  const [showListPicker, setShowListPicker] = useState(false);
  const shouldLockMap = isRecommendOpen || isResultsOpen || isSaveDrawerOpen;
  const sheetTouchStartY = useRef<number | null>(null);
  const recommendMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const currentLocationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const recommendedCardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const sceneDebounceRef = useRef<number | null>(null);
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
  useEffect(() => {
    if (sceneDebounceRef.current) {
      window.clearTimeout(sceneDebounceRef.current);
    }
    sceneDebounceRef.current = window.setTimeout(() => {
      setSceneQuery(sceneInput.trim());
    }, 400);
    return () => {
      if (sceneDebounceRef.current) {
        window.clearTimeout(sceneDebounceRef.current);
      }
    };
  }, [sceneInput]);

  const { data: recommendedPlaces, isLoading: recommendedLoading } = trpc.place.recommended.useQuery(
    {
      location: currentLocation ?? undefined,
      limit: 6,
      scene: sceneQuery || undefined,
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

  useEffect(() => {
    if (!map) return;
    recommendMarkersRef.current.forEach((marker) => {
      marker.map = null;
    });
    recommendMarkersRef.current = [];

    if (!recommendedPlaces || recommendedPlaces.length === 0) return;
    recommendedPlaces.forEach((place) => {
      const pin = document.createElement("div");
      pin.innerHTML = `
        <div style="
          background: #ef4444;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          box-shadow: 0 8px 16px rgba(0,0,0,0.2);
          border: 2px solid white;
        ">★</div>
      `;
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: place.latitude, lng: place.longitude },
        content: pin,
        title: place.name,
      });
      marker.addListener("click", () => {
        setIsRecommendOpen(true);
        const index = recommendedPlaces.findIndex((item) => item.placeId === place.placeId);
        if (index >= 0) {
          window.setTimeout(() => {
            recommendedCardRefs.current[index]?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 120);
        }
      });
      recommendMarkersRef.current.push(marker);
    });
  }, [map, recommendedPlaces]);

  useEffect(() => {
    if (!map || !currentLocation) return;
    const pin = document.createElement("div");
    pin.innerHTML = `
      <div style="
        width: 20px;
        height: 20px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 999px;
        box-shadow: 0 6px 14px rgba(37, 99, 235, 0.3);
      " class="current-location-pulse"></div>
    `;
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.position = {
        lat: currentLocation.lat,
        lng: currentLocation.lng,
      };
      currentLocationMarkerRef.current.content = pin;
      currentLocationMarkerRef.current.map = map;
      return;
    }
    currentLocationMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat: currentLocation.lat, lng: currentLocation.lng },
      content: pin,
      title: "現在地",
    });
  }, [map, currentLocation]);

  const handleRecenter = () => {
    if (!map || !currentLocation) return;
    map.panTo({ lat: currentLocation.lat, lng: currentLocation.lng });
    map.setZoom(15);
  };

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
      showSavedToast({
        placeName: payload.name,
        shareUrl: payload.googleMapsUrl,
        onOpenLists: () => setLocation("/lists"),
      });

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

  useEffect(() => {
    if (!map) return;
    map.setOptions({ gestureHandling: shouldLockMap ? "none" : "auto" });
  }, [map, shouldLockMap]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !placesServiceRef.current || !map) return;

    const SEARCH_RESULTS_LIMIT = 30;
    const center = currentLocation ?? (() => {
      const mapCenter = map.getCenter();
      return mapCenter ? { lat: mapCenter.lat(), lng: mapCenter.lng() } : null;
    })();

    setIsSearching(true);
    setSearchResults([]);

    const request: google.maps.places.TextSearchRequest = {
      query: searchQuery,
      type: "restaurant",
      location: center ? new google.maps.LatLng(center.lat, center.lng) : undefined,
      radius: center ? 3000 : undefined,
    };

    const collected: PlaceResult[] = [];
    const appendResults = (results: google.maps.places.PlaceResult[]) => {
      results.forEach((place) => {
        if (collected.length >= SEARCH_RESULTS_LIMIT) return;
        if (!place.place_id || !place.geometry?.location) return;
        collected.push({
          placeId: place.place_id || "",
          name: place.name || "",
          address: place.formatted_address || "",
          lat: place.geometry?.location?.lat() || 0,
          lng: place.geometry?.location?.lng() || 0,
          rating: place.rating,
          priceLevel: place.price_level,
          types: place.types,
          photoUrl: place.photos?.[0]?.getUrl({ maxWidth: 400 }),
        });
      });
      setSearchResults([...collected]);
    };

    placesServiceRef.current.textSearch(request, (results, status, pagination) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        appendResults(results);
        if (pagination?.hasNextPage && collected.length < SEARCH_RESULTS_LIMIT) {
          pagination.nextPage();
          return;
        }
        setIsSearching(false);
        setIsResultsOpen(true);

        if (collected.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          collected.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
          map.fitBounds(bounds);
        }
      } else {
        setIsSearching(false);
        toast.error("検索結果が見つかりませんでした");
      }
    });
  }, [searchQuery, map, currentLocation]);

  const handleSelectPlace = useCallback(
    (place: PlaceResult) => {
      if (!place.placeId || !place.lat || !place.lng) {
        toast.error("店舗情報の取得に失敗しました。別の店舗を選択してください。");
        return;
      }
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


  const scrollToRecommendedIndex = (index: number) => {
    recommendedCardRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

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
  }, index?: number) => {
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
      onSuccess: () => {
        setSavingRecommendedId(null);
        if (typeof index === "number") {
          const nextIndex = Math.min(index + 1, recommendedCardRefs.current.length - 1);
          if (nextIndex !== index) {
            scrollToRecommendedIndex(nextIndex);
          }
        }
      },
    }).catch(() => setSavingRecommendedId(null));
  };

  const handleSave = async () => {
    if (!selectedPlace) return;
    if (!selectedPlace.placeId) {
      toast.error("店舗情報の取得に失敗しました。もう一度お試しください。");
      return;
    }

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

    const memoSummary = saveNote ? `${summary}\nメモ: ${saveNote}`.trim() : summary;
    await handleCreatePlace({
      googlePlaceId: selectedPlace.placeId,
      name: selectedPlace.name,
      address: selectedPlace.address,
      latitude: selectedPlace.lat,
      longitude: selectedPlace.lng,
      genre: genre || undefined,
      features: features.length > 0 ? features : undefined,
      summary: memoSummary || undefined,
      source: "Google",
      googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${selectedPlace.placeId}`,
      rating: selectedPlace.rating,
      priceLevel: selectedPlace.priceLevel,
      photoUrl: selectedPlace.photoUrl,
    }, {
      redirect: true,
    });
    setSaveNote("");
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
        <div className="relative flex-1">
          <MapView
            onMapReady={handleMapReady}
            className={`w-full h-full ${shouldLockMap ? "pointer-events-none" : ""}`}
            initialCenter={{ lat: 35.6812, lng: 139.7671 }}
            initialZoom={12}
          />

          {currentLocation && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-3 top-3 h-10 w-10 rounded-full shadow-lg bg-card"
              onClick={handleRecenter}
            >
              <Navigation className="w-4 h-4" />
            </Button>
          )}

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

            <div className="space-y-2 mb-6">
              <Label className="text-sm font-medium">保存メモ（任意）</Label>
              <Input
                value={saveNote}
                onChange={(event) => setSaveNote(event.target.value)}
                placeholder="気になった理由を一言で"
                className="h-11"
              />
            </div>

            {(lists && lists.length > 0) || (sharedLists && sharedLists.length > 0) ? (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-11 justify-between"
                  onClick={() => setShowListPicker((prev) => !prev)}
                >
                  リストに追加（任意）
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showListPicker ? "rotate-180" : ""}`}
                  />
                </Button>
                {showListPicker && (
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
                )}
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
        recommendedCardRefs={recommendedCardRefs}
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
    matchScore?: number;
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
  const distanceKm =
    currentLocation ? getDistanceKm(currentLocation, { lat: place.latitude, lng: place.longitude }) : null;
  const openingLabel = detailsLoading
    ? "取得中"
    : details?.opening_hours
      ? details.opening_hours.open_now
        ? "営業中"
        : "営業時間外"
      : "情報なし";
  const priceLabel = detailsLoading ? "取得中" : formatPriceLevel(details?.price_level);
  const showOpenNowTag =
    details?.opening_hours?.open_now && distanceKm !== null && distanceKm <= 1.2;

  const photoUrl = buildPhotoUrl(details?.photos?.[0]?.photo_reference);

  return (
    <Card className={`${variant === "stack" ? "w-full" : "w-60"} shrink-0 border bg-background/95 shadow-sm`}>
      <CardContent className="p-3 sm:p-4 space-y-3">
        <PlaceCardHeader
          name={place.name}
          address={place.address}
          photoUrl={photoUrl}
          distanceLabel={distanceLabel}
          openLabel={openingLabel}
        />

        <div className="flex flex-wrap gap-1.5">
          {place.rating && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground">
              ★ {place.rating}
            </span>
          )}
          {showOpenNowTag && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              近くで今空いてそう
            </span>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground">
            価格帯 {priceLabel}
          </span>
        </div>

        {place.reason && (
          <p className="text-xs text-muted-foreground line-clamp-2">{place.reason}</p>
        )}

        <PlaceActionBar
          onSave={() => onSave(place)}
          saved={savedPlaceIds.has(place.placeId)}
          saving={isSaving || savingRecommendedId === place.placeId}
          shareUrl={place.googleMapsUrl}
          routeUrl={buildDirectionsUrl({
            lat: place.latitude,
            lng: place.longitude,
            address: place.address,
            placeId: place.placeId,
          })}
          size="sm"
        />
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
  recommendedCardRefs,
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
    matchScore?: number;
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
  }, index?: number) => void;
  recommendedCardRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
}) {
  const sceneTokens = sceneInput.trim().length > 0
    ? sceneInput.split(/[、,\s]+/).filter(Boolean)
    : [];
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40"
      style={{
        transform: isOpen ? "translateY(0)" : "translateY(62%)",
        transition: "transform 0.25s ease",
      }}
    >
      <div
        className="mx-auto w-full max-w-lg rounded-t-[28px] bg-background/95 backdrop-blur border-t shadow-[0_-18px_50px_rgba(15,23,42,0.18)]"
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
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-semibold">あなたへのおすすめ</p>
              <p className="text-xs text-muted-foreground">
                近くのおすすめをすぐに確認できます
              </p>
            </div>
            {recommendedLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="mt-2 rounded-2xl border bg-card px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">シーン</span>
              <Input
                value={sceneInput}
                onChange={(event) => onSceneChange(event.target.value)}
                placeholder="2名・シーン（例: デート / 家族ご飯）"
                className="h-9 border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="mt-4 space-y-4 max-h-[52vh] overflow-y-auto pr-1">
            {recommendedLoading ? (
              <PlaceCardSkeleton count={3} />
            ) : (
              recommendedPlaces.map((place, index) => (
                <div
                  key={place.placeId}
                  ref={(element) => {
                    recommendedCardRefs.current[index] = element;
                  }}
                >
                  <RecommendedPlaceCard
                    place={place}
                    currentLocation={currentLocation}
                    savedPlaceIds={savedPlaceIds}
                    savingRecommendedId={savingRecommendedId}
                    isSaving={isSaving}
                    onSave={(payload) => onSave(payload, index)}
                    sceneTokens={sceneTokens}
                    variant="stack"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
