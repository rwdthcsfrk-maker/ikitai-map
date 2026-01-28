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
  Navigation,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type LatLng = { lat: number; lng: number };
type SortOption = "recommended" | "distance" | "rating" | "reviews" | "new";
type BudgetType = "lunch" | "dinner";
type StatusFilter = "none" | "want_to_go" | "visited" | undefined;
type PlaceStatus = "none" | "want_to_go" | "visited";

interface FilterState {
  location?: { lat: number; lng: number };
  distanceRadius?: number | null;
  prefecture?: string;
  genreParent?: string;
  genreChild?: string;
  budgetType?: BudgetType;
  budgetBand?: string;
  features?: string[];
  status?: StatusFilter;
  sort?: SortOption;
}

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
  const initialStatus = (params.get("status") as StatusFilter) || undefined;

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    sort: "recommended",
    features: initialFeatures.length > 0 ? initialFeatures : undefined,
    status: initialStatus,
  });
  const [tempFilters, setTempFilters] = useState<FilterState>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data: genresData } = trpc.master.genres.useQuery();
  const { data: budgetsData } = trpc.master.budgets.useQuery();
  const { data: distancesData } = trpc.master.distances.useQuery();
  const { data: featuresData } = trpc.master.features.useQuery();
  const { data: sortOptionsData } = trpc.master.sortOptions.useQuery();
  const { data: prefecturesData } = trpc.master.prefectures.useQuery();

  const parseSearchMutation = trpc.ai.parseSearchQuery.useMutation();
  const { data: searchResults, isLoading } = trpc.advancedSearch.filter.useQuery(
    {
      ...filters,
      location: currentLocation || undefined,
      page,
      limit: 20,
    },
    {
      enabled: isAuthenticated,
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

  useEffect(() => {
    if (!genresData || !initialGenre || filters.genreParent) return;
    const matchedGenre = genresData.parents.find((genre) =>
      genre.name.includes(initialGenre)
    );
    if (matchedGenre) {
      setFilters((prev) => ({ ...prev, genreParent: matchedGenre.id }));
    }
  }, [genresData, initialGenre, filters.genreParent]);

  const childGenres = useMemo(() => {
    if (!genresData || !tempFilters.genreParent) return [];
    return genresData.children[tempFilters.genreParent as keyof typeof genresData.children] || [];
  }, [genresData, tempFilters.genreParent]);

  const budgetBands = useMemo(() => {
    if (!budgetsData || !tempFilters.budgetType) return [];
    return budgetsData[tempFilters.budgetType] || [];
  }, [budgetsData, tempFilters.budgetType]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setCurrentLocation(null);
      }
    );
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const sortedSearchResults = useMemo(() => {
    const base = searchResults?.places ?? [];
    if (!normalizedQuery) return base;
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
    return base.filter((place) => {
      const haystack = [
        place.name,
        place.address,
        place.summary,
        place.genre,
        ...(place.features || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [searchResults, normalizedQuery]);

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
      const featureMap: Record<string, string> = {
        個室あり: "private_room_yes",
      };
      const mappedFeatures = (result.features || [])
        .map((feature) => featureMap[feature])
        .filter(Boolean);
      const genreId = genresData?.parents.find(
        (genre) => genre.name.includes(result.genre || "")
      )?.id;

      setFilters((prev) => ({
        ...prev,
        features: mappedFeatures.length > 0 ? mappedFeatures : prev.features,
        genreParent: genreId || prev.genreParent,
      }));

      const newParams = new URLSearchParams();
      newParams.set("q", searchQuery);
      if (mappedFeatures.length > 0) {
        newParams.set("features", mappedFeatures.join(","));
      }
      if (result.genre) {
        newParams.set("genre", result.genre);
      }
      if (filters.status) {
        newParams.set("status", filters.status);
      }

      setLocation(`/search?${newParams.toString()}`);
    } catch (error) {
      toast.error("検索に失敗しました");
    } finally {
      setIsSearching(false);
    }
  };

  const openFilter = () => {
    setTempFilters({ ...filters });
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setFilters({ ...tempFilters });
    setPage(1);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setTempFilters({ sort: "recommended" });
  };

  const removeFilter = (key: keyof FilterState) => {
    const nextFilters = { ...filters };
    delete nextFilters[key];
    if (key === "genreParent") {
      delete nextFilters.genreChild;
    }
    if (key === "budgetType") {
      delete nextFilters.budgetBand;
    }
    setFilters(nextFilters);
  };

  const toggleFeature = (featureId: string) => {
    setTempFilters((prev) => {
      const currentFeatures = prev.features || [];
      if (currentFeatures.includes(featureId)) {
        return { ...prev, features: currentFeatures.filter((f) => f !== featureId) };
      }
      return { ...prev, features: [...currentFeatures, featureId] };
    });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.distanceRadius) count++;
    if (filters.prefecture) count++;
    if (filters.genreParent) count++;
    if (filters.budgetBand) count++;
    if (filters.features && filters.features.length > 0) count += filters.features.length;
    if (filters.status) count++;
    return count;
  }, [filters]);

  const getFilterLabel = (key: string, value: string | undefined): string => {
    if (!value) return "";
    switch (key) {
      case "genreParent":
        return genresData?.parents.find((g) => g.id === value)?.name || value;
      case "genreChild":
        if (filters.genreParent && genresData) {
          const children =
            genresData.children[filters.genreParent as keyof typeof genresData.children];
          return children?.find((g) => g.id === value)?.name || value;
        }
        return value;
      case "prefecture":
        return prefecturesData?.find((p) => p.id === value)?.name || value;
      case "distanceRadius":
        return (
          distancesData?.find((d) => d.meters === Number(value))?.label || `${value}m`
        );
      case "budgetBand":
        if (filters.budgetType && budgetsData) {
          const bands = budgetsData[filters.budgetType];
          return bands?.find((b) => b.id === value)?.label || value;
        }
        return value;
      case "status":
        return value === "want_to_go" ? "行きたい" : value === "visited" ? "訪問済み" : "";
      default:
        return String(value);
    }
  };

  const getFeatureLabel = (featureId: string): string => {
    if (!featuresData) return featureId;
    for (const category of Object.values(featuresData)) {
      const match = category.options.find((option) => option.id === featureId);
      if (match) return match.label;
    }
    return featureId;
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

      {/* Filter Bar */}
      <div className="bg-muted/30 border-b">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Drawer open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 justify-between h-11"
                  onClick={openFilter}
                >
                  <span className="flex items-center">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    絞り込み条件
                  </span>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[90vh] flex flex-col">
                <DrawerHeader className="border-b pb-4 shrink-0">
                  <div className="flex items-center justify-between">
                    <DrawerTitle>絞り込み条件</DrawerTitle>
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      クリア
                    </Button>
                  </div>
                </DrawerHeader>
                <div className="flex-1 overflow-y-auto px-4">
                  <div className="py-4 space-y-6">
                    {/* エリア・距離 */}
                    <div>
                      <h3 className="font-medium mb-3 text-base">エリア・距離</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">
                            現在地からの距離
                          </label>
                          <Select
                            value={tempFilters.distanceRadius?.toString() || "any"}
                            onValueChange={(value) =>
                              setTempFilters((prev) => ({
                                ...prev,
                                distanceRadius: value === "any" ? null : Number(value),
                              }))
                            }
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="指定なし" />
                            </SelectTrigger>
                            <SelectContent>
                              {distancesData?.map((distance) => (
                                <SelectItem
                                  key={distance.id}
                                  value={distance.meters?.toString() || "any"}
                                >
                                  {distance.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">
                            都道府県
                          </label>
                          <Select
                            value={tempFilters.prefecture || "any"}
                            onValueChange={(value) =>
                              setTempFilters((prev) => ({
                                ...prev,
                                prefecture: value === "any" ? undefined : value,
                              }))
                            }
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="指定なし" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">指定なし</SelectItem>
                              {prefecturesData?.map((pref) => (
                                <SelectItem key={pref.id} value={pref.id}>
                                  {pref.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* ジャンル */}
                    <div>
                      <h3 className="font-medium mb-3 text-base">ジャンル</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">
                            大ジャンル
                          </label>
                          <Select
                            value={tempFilters.genreParent || "any"}
                            onValueChange={(value) =>
                              setTempFilters((prev) => ({
                                ...prev,
                                genreParent: value === "any" ? undefined : value,
                                genreChild: undefined,
                              }))
                            }
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="指定なし" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">指定なし</SelectItem>
                              {genresData?.parents.map((genre) => (
                                <SelectItem key={genre.id} value={genre.id}>
                                  {genre.icon} {genre.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {tempFilters.genreParent && childGenres.length > 0 && (
                          <div>
                            <label className="text-sm text-muted-foreground mb-2 block">
                              小ジャンル
                            </label>
                            <Select
                              value={tempFilters.genreChild || "any"}
                              onValueChange={(value) =>
                                setTempFilters((prev) => ({
                                  ...prev,
                                  genreChild: value === "any" ? undefined : value,
                                }))
                              }
                            >
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="指定なし" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">指定なし</SelectItem>
                                {childGenres.map((genre) => (
                                  <SelectItem key={genre.id} value={genre.id}>
                                    {genre.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* 予算 */}
                    <div>
                      <h3 className="font-medium mb-3 text-base">予算</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={tempFilters.budgetType === "lunch" ? "default" : "outline"}
                            className="h-12"
                            onClick={() =>
                              setTempFilters((prev) => ({
                                ...prev,
                                budgetType: "lunch",
                                budgetBand: undefined,
                              }))
                            }
                          >
                            ランチ
                          </Button>
                          <Button
                            variant={tempFilters.budgetType === "dinner" ? "default" : "outline"}
                            className="h-12"
                            onClick={() =>
                              setTempFilters((prev) => ({
                                ...prev,
                                budgetType: "dinner",
                                budgetBand: undefined,
                              }))
                            }
                          >
                            ディナー
                          </Button>
                        </div>
                        {tempFilters.budgetType && budgetBands.length > 0 && (
                          <div>
                            <label className="text-sm text-muted-foreground mb-2 block">
                              予算帯
                            </label>
                            <Select
                              value={tempFilters.budgetBand || "any"}
                              onValueChange={(value) =>
                                setTempFilters((prev) => ({
                                  ...prev,
                                  budgetBand: value === "any" ? undefined : value,
                                }))
                              }
                            >
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="指定なし" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">指定なし</SelectItem>
                                {budgetBands.map((band) => (
                                  <SelectItem key={band.id} value={band.id}>
                                    {band.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* ステータス */}
                    <div>
                      <h3 className="font-medium mb-3 text-base">ステータス</h3>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant={!tempFilters.status ? "default" : "outline"}
                          className="h-12"
                          onClick={() =>
                            setTempFilters((prev) => ({ ...prev, status: undefined }))
                          }
                        >
                          すべて
                        </Button>
                        <Button
                          variant={tempFilters.status === "want_to_go" ? "default" : "outline"}
                          className="h-12"
                          onClick={() =>
                            setTempFilters((prev) => ({ ...prev, status: "want_to_go" }))
                          }
                        >
                          <Heart className="h-4 w-4 mr-1" />
                          行きたい
                        </Button>
                        <Button
                          variant={tempFilters.status === "visited" ? "default" : "outline"}
                          className="h-12"
                          onClick={() =>
                            setTempFilters((prev) => ({ ...prev, status: "visited" }))
                          }
                        >
                          <Check className="h-4 w-4 mr-1" />
                          訪問済
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* こだわり条件 */}
                    <div>
                      <h3 className="font-medium mb-3 text-base">こだわり条件</h3>
                      <div className="flex flex-wrap gap-2">
                        {featuresData &&
                          Object.entries(featuresData).map(([category, data]) =>
                            data.options.map((option) => (
                              <Button
                                key={`${category}-${option.id}`}
                                variant={
                                  tempFilters.features?.includes(option.id) ? "default" : "outline"
                                }
                                size="sm"
                                className="h-10"
                                onClick={() => toggleFeature(option.id)}
                              >
                                {option.label}
                              </Button>
                            ))
                          )}
                      </div>
                    </div>
                  </div>
                </div>
                <DrawerFooter className="border-t pt-4 shrink-0">
                  <Button onClick={applyFilters} className="w-full h-12 text-base">
                    この条件で検索（{searchResults?.total || 0}件）
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="outline" className="w-full h-12">
                      閉じる
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
            <Button
              variant={currentLocation ? "default" : "outline"}
              size="sm"
              onClick={handleGetLocation}
              className="h-11 px-3"
            >
              <Navigation className="h-4 w-4 mr-1" />
              {currentLocation ? "ON" : "現在地"}
            </Button>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.genreParent && (
                <Badge variant="secondary" className="h-8 gap-1 px-3">
                  {getFilterLabel("genreParent", filters.genreParent)}
                  <X
                    className="h-3 w-3 cursor-pointer ml-1"
                    onClick={() => removeFilter("genreParent")}
                  />
                </Badge>
              )}
              {filters.prefecture && (
                <Badge variant="secondary" className="h-8 gap-1 px-3">
                  {getFilterLabel("prefecture", filters.prefecture)}
                  <X
                    className="h-3 w-3 cursor-pointer ml-1"
                    onClick={() => removeFilter("prefecture")}
                  />
                </Badge>
              )}
              {filters.distanceRadius && (
                <Badge variant="secondary" className="h-8 gap-1 px-3">
                  {distancesData?.find((d) => d.meters === filters.distanceRadius)?.label}
                  <X
                    className="h-3 w-3 cursor-pointer ml-1"
                    onClick={() => removeFilter("distanceRadius")}
                  />
                </Badge>
              )}
              {filters.budgetBand && (
                <Badge variant="secondary" className="h-8 gap-1 px-3">
                  {getFilterLabel("budgetBand", filters.budgetBand)}
                  <X
                    className="h-3 w-3 cursor-pointer ml-1"
                    onClick={() => removeFilter("budgetBand")}
                  />
                </Badge>
              )}
              {filters.status && (
                <Badge variant="secondary" className="h-8 gap-1 px-3">
                  {getFilterLabel("status", filters.status)}
                  <X
                    className="h-3 w-3 cursor-pointer ml-1"
                    onClick={() => removeFilter("status")}
                  />
                </Badge>
              )}
              {filters.features?.map((featureId) => (
                <Badge key={featureId} variant="secondary" className="h-8 gap-1 px-3">
                  {getFeatureLabel(featureId)}
                  <X
                    className="h-3 w-3 cursor-pointer ml-1"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        features: prev.features?.filter((f) => f !== featureId),
                      }))
                    }
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 flex items-center justify-between border-b">
        <Select
          value={filters.sort || "recommended"}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, sort: value as SortOption }))
          }
        >
          <SelectTrigger className="w-[150px] h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptionsData?.map((sortOption) => (
              <SelectItem key={sortOption.id} value={sortOption.id}>
                {sortOption.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {sortedSearchResults.length}件
        </span>
      </div>

      {/* Results */}
      <main className="flex-1 px-4 py-4 pb-24 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedSearchResults && sortedSearchResults.length > 0 ? (
          <div className="space-y-3">
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
                                className="text-xs px-2 py-0.5 rounded-full border bg-muted border-transparent"
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
        ) : searchQuery.trim() || activeFilterCount > 0 ? (
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
