import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useState, useMemo, useEffect } from "react";
import { Link, useSearch, useLocation } from "wouter";
import {
  ArrowLeft,
  Search as SearchIcon,
  Loader2,
  MapPin,
  Star,
  ExternalLink,
  X,
  Heart,
  Check,
  Bookmark,
} from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const FEATURE_OPTIONS = [
  "個室あり",
  "カップル向け",
  "静か",
  "会食向き",
  "カジュアル",
  "高級感",
  "子連れOK",
];

const STATUS_OPTIONS = [
  { value: "want_to_go", label: "行きたい", icon: Heart, color: "text-pink-500" },
  { value: "visited", label: "訪問済み", icon: Check, color: "text-green-500" },
] as const;

type PlaceStatus = "none" | "want_to_go" | "visited";
type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;

const getDistanceKm = (from: LatLng, to: LatLng) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const a = Math.sin(dLat / 2) ** 2 +
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

export default function Search() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const searchParams = useSearch();
  const [, setLocation] = useLocation();

  const params = useMemo(() => new URLSearchParams(searchParams), [searchParams]);
  const initialQuery = params.get("q") || "";
  const initialFeatures = params.get("features")?.split(",").filter(Boolean) || [];
  const initialGenre = params.get("genre") || "";
  const initialStatus = (params.get("status") as PlaceStatus) || undefined;

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(initialFeatures);
  const [selectedStatus, setSelectedStatus] = useState<PlaceStatus | undefined>(initialStatus);
  const [isSearching, setIsSearching] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [sortByDistance, setSortByDistance] = useState(false);

  const parseSearchMutation = trpc.ai.parseSearchQuery.useMutation();
  const { data: searchResults, isLoading } = trpc.place.search.useQuery(
    {
      query: initialGenre || initialQuery,
      features: selectedFeatures.length > 0 ? selectedFeatures : undefined,
      status: selectedStatus,
    },
    {
      enabled:
        isAuthenticated && (!!initialQuery || selectedFeatures.length > 0 || !!selectedStatus),
    }
  );
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
        setCurrentLocation(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 10 * 60 * 1000,
      }
    );
  }, [currentLocation]);

  const sortedSearchResults = useMemo(() => {
    if (!searchResults) return searchResults;
    if (!sortByDistance || !currentLocation) return searchResults;
    const withDistance = searchResults
      .map((place) => {
        const lat = place.latitude ? parseFloat(place.latitude) : null;
        const lng = place.longitude ? parseFloat(place.longitude) : null;
        const distance = lat !== null && lng !== null
          ? getDistanceKm(currentLocation, { lat, lng })
          : null;
        return { place, distance };
      })
      .sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      })
      .map(({ place }) => place);
    return withDistance;
  }, [searchResults, sortByDistance, currentLocation]);

  const travelTargets = useMemo(() => {
    if (!sortedSearchResults) return [];
    return sortedSearchResults
      .map((place) => {
        const lat = place.latitude ? parseFloat(place.latitude) : null;
        const lng = place.longitude ? parseFloat(place.longitude) : null;
        if (lat === null || lng === null) return null;
        return { id: place.id, lat, lng };
      })
      .filter((place): place is { id: number; lat: number; lng: number } => Boolean(place))
      .slice(0, 10);
  }, [sortedSearchResults]);

  const { data: travelTimes } = trpc.place.travelTimes.useQuery(
    {
      origin: currentLocation ?? { lat: 0, lng: 0 },
      destinations: travelTargets,
    },
    {
      enabled: Boolean(currentLocation && travelTargets.length > 0),
    }
  );

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("検索キーワードを入力してください");
      return;
    }

    setIsSearching(true);
    try {
      const result = await parseSearchMutation.mutateAsync({ query: searchQuery });

      const newParams = new URLSearchParams();
      newParams.set("q", searchQuery);

      if (result.features?.length) {
        setSelectedFeatures(result.features);
        newParams.set("features", result.features.join(","));
      }
      if (result.genre) {
        newParams.set("genre", result.genre);
      }
      if (selectedStatus) {
        newParams.set("status", selectedStatus);
      }

      setLocation(`/search?${newParams.toString()}`);
    } catch (error) {
      toast.error("検索に失敗しました");
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFeature = (feature: string) => {
    const newFeatures = selectedFeatures.includes(feature)
      ? selectedFeatures.filter((f) => f !== feature)
      : [...selectedFeatures, feature];

    setSelectedFeatures(newFeatures);

    const newParams = new URLSearchParams(params);
    if (newFeatures.length > 0) {
      newParams.set("features", newFeatures.join(","));
    } else {
      newParams.delete("features");
    }
    setLocation(`/search?${newParams.toString()}`);
  };

  const toggleStatus = (status: PlaceStatus) => {
    const newStatus = selectedStatus === status ? undefined : status;
    setSelectedStatus(newStatus);

    const newParams = new URLSearchParams(params);
    if (newStatus) {
      newParams.set("status", newStatus);
    } else {
      newParams.delete("status");
    }
    setLocation(`/search?${newParams.toString()}`);
  };

  const clearFilters = () => {
    setSelectedFeatures([]);
    setSelectedStatus(undefined);
    setSearchQuery("");
    setLocation("/search");
  };

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - スマホ最適化 */}
      <header className="border-b bg-card px-3 py-2 sticky top-0 z-10 safe-area-top">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
          <Button
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <SearchIcon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Filters - スマホ最適化 */}
      <div className="px-4 py-3 border-b bg-card space-y-3">
        {/* Status Filters */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">ステータス</span>
            {(selectedFeatures.length > 0 || selectedStatus) && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                <X className="w-3 h-3 mr-1" />
                クリア
              </Button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            {STATUS_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors border whitespace-nowrap ${
                  selectedStatus === value
                    ? value === "want_to_go"
                      ? "bg-pink-100 border-pink-300 text-pink-700"
                      : "bg-green-100 border-green-300 text-green-700"
                    : "bg-background border-border"
                }`}
                onClick={() => toggleStatus(value)}
              >
                <Icon
                  className={`w-4 h-4 ${selectedStatus === value && value === "want_to_go" ? "fill-pink-500" : ""}`}
                />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Feature Filters */}
        <div>
          <span className="text-xs font-medium text-muted-foreground mb-2 block">こだわり条件</span>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            {FEATURE_OPTIONS.map((feature) => (
              <button
                key={feature}
                type="button"
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors border whitespace-nowrap ${
                  selectedFeatures.includes(feature)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border"
                }`}
                onClick={() => toggleFeature(feature)}
              >
                {feature}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <main className="flex-1 px-4 py-4 pb-24 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedSearchResults && sortedSearchResults.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {sortedSearchResults.length} 件の店舗
              </p>
              <Button
                variant={sortByDistance ? "default" : "outline"}
                size="sm"
                onClick={() => setSortByDistance((prev) => !prev)}
                disabled={!currentLocation}
              >
                近い順
              </Button>
            </div>
            {sortedSearchResults.map((place) => {
              const lat = place.latitude ? parseFloat(place.latitude) : null;
              const lng = place.longitude ? parseFloat(place.longitude) : null;
              const distance = currentLocation && lat !== null && lng !== null
                ? getDistanceKm(currentLocation, { lat, lng })
                : null;
              const travelInfo = travelTimes?.[place.id];
              const matrixDistanceKm = travelInfo?.distanceMeters
                ? travelInfo.distanceMeters / 1000
                : null;
              const distanceLabel = matrixDistanceKm !== null
                ? formatDistance(matrixDistanceKm)
                : distance !== null
                  ? formatDistance(distance)
                  : null;
              const travelLabel = travelInfo?.walkingDurationText || travelInfo?.drivingDurationText
                ? [
                    travelInfo?.walkingDurationText
                      ? `徒歩${travelInfo.walkingDurationText}`
                      : null,
                    travelInfo?.drivingDurationText
                      ? `車${travelInfo.drivingDurationText}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" / ")
                : null;
              return (
                <Card key={place.id} className="active:scale-[0.98] transition-transform">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-base truncate">{place.name}</h3>
                          {getStatusIcon(place.status as PlaceStatus)}
                        </div>

                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {place.genre && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">{place.genre}</span>
                          )}
                          {place.rating && (
                            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {place.rating}
                            </span>
                          )}
                          {place.userRating && (
                            <span className="flex items-center gap-0.5 text-xs text-primary">
                              <Star className="w-3 h-3 fill-primary" />
                              {place.userRating}
                            </span>
                          )}
                          {distanceLabel && (
                            <span className="text-xs text-muted-foreground">
                              現在地から{distanceLabel}
                            </span>
                          )}
                          {travelLabel && (
                            <span className="text-xs text-muted-foreground">
                              {travelLabel}
                            </span>
                          )}
                        </div>

                        {place.summary && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {place.summary}
                          </p>
                        )}

                        {place.features && place.features.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {place.features.slice(0, 3).map((feature, i) => (
                              <span
                                key={i}
                                className={`text-xs px-2 py-0.5 rounded-full border ${
                                  selectedFeatures.includes(feature)
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "bg-muted border-transparent"
                                }`}
                              >
                                {feature}
                              </span>
                            ))}
                            {place.features.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{place.features.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {place.address && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{place.address}</span>
                          </div>
                        )}
                      </div>

                      {place.googleMapsUrl && (
                        <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" asChild>
                          <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : initialQuery || selectedFeatures.length > 0 || selectedStatus ? (
          <div className="text-center py-12">
            <SearchIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">該当する店舗がありません</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <SearchIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">
              キーワードを入力するか、
              <br />
              条件を選択して検索してください
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
