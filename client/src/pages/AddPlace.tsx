import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { useState, useCallback, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Search, Loader2, MapPin, Star, Plus, UtensilsCrossed, Check } from "lucide-react";
import { toast } from "sonner";

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

export default function AddPlace() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [selectedLists, setSelectedLists] = useState<number[]>([]);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  const utils = trpc.useUtils();
  const { data: lists } = trpc.list.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

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

  const handleSelectPlace = useCallback((place: PlaceResult) => {
    setSelectedPlace(place);

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
  }, [map]);

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
      prev.includes(listId)
        ? prev.filter((id) => id !== listId)
        : [...prev, listId]
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="mb-4">ログインが必要です</p>
            <Button asChild>
              <a href={getLoginUrl()}>ログイン</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 shrink-0">
        <div className="container flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-1" />
              戻る
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="font-semibold">店舗を追加</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Search & Results */}
        <div className="w-full md:w-96 border-r bg-card flex flex-col overflow-hidden">
          {/* Search Input */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="店名や場所で検索..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button
              className="w-full mt-2"
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              検索
            </Button>
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto p-4">
            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((place) => (
                  <Card
                    key={place.placeId}
                    className={`place-card cursor-pointer ${
                      selectedPlace?.placeId === place.placeId
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                    onClick={() => handleSelectPlace(place)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {place.photoUrl ? (
                          <img
                            src={place.photoUrl}
                            alt={place.name}
                            className="w-16 h-16 object-cover rounded-lg shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0">
                            <MapPin className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {place.name}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {place.address}
                          </p>
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
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">店名や場所を入力して検索してください</p>
              </div>
            )}
          </div>

          {/* Selected Place Actions */}
          {selectedPlace && (
            <div className="p-4 border-t bg-card">
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{selectedPlace.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-3">
                    {selectedPlace.address}
                  </p>

                  {/* List Selection */}
                  {lists && lists.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs">リストに追加（任意）</Label>
                      <div className="flex flex-wrap gap-2">
                        {lists.map((list) => (
                          <button
                            key={list.id}
                            type="button"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                              selectedLists.includes(list.id)
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            }`}
                            onClick={() => toggleList(list.id)}
                          >
                            {selectedLists.includes(list.id) && (
                              <Check className="w-3 h-3" />
                            )}
                            {list.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button
                className="w-full"
                onClick={handleSave}
                disabled={createPlaceMutation.isPending || generateSummaryMutation.isPending}
              >
                {createPlaceMutation.isPending || generateSummaryMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                この店舗を保存
              </Button>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="hidden md:block flex-1">
          <MapView
            onMapReady={handleMapReady}
            className="w-full h-full"
            initialCenter={{ lat: 35.6812, lng: 139.7671 }}
            initialZoom={12}
          />
        </div>
      </div>
    </div>
  );
}
