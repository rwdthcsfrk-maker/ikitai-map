import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Filter,
  MapPin,
  Star,
  ExternalLink,
  X,
  Navigation,
  Heart,
  CheckCircle,
} from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

type SortOption = 'recommended' | 'distance' | 'rating' | 'reviews' | 'new';
type BudgetType = 'lunch' | 'dinner';
type StatusFilter = 'none' | 'want_to_go' | 'visited' | undefined;

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

export default function FilterSearch() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [filters, setFilters] = useState<FilterState>({
    sort: 'recommended',
  });
  const [tempFilters, setTempFilters] = useState<FilterState>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [page, setPage] = useState(1);

  // Fetch master data
  const { data: genresData } = trpc.master.genres.useQuery();
  const { data: budgetsData } = trpc.master.budgets.useQuery();
  const { data: distancesData } = trpc.master.distances.useQuery();
  const { data: featuresData } = trpc.master.features.useQuery();
  const { data: sortOptionsData } = trpc.master.sortOptions.useQuery();
  const { data: prefecturesData } = trpc.master.prefectures.useQuery();

  // Search query
  const searchQuery = trpc.advancedSearch.filter.useQuery(
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

  // Get current location
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(loc);
          setFilters((prev) => ({ ...prev, location: loc }));
        },
        (error) => {
          console.error("Location error:", error);
        }
      );
    }
  };

  // Get child genres based on selected parent
  const childGenres = useMemo(() => {
    if (!genresData || !tempFilters.genreParent) return [];
    return genresData.children[tempFilters.genreParent as keyof typeof genresData.children] || [];
  }, [genresData, tempFilters.genreParent]);

  // Get budget bands based on selected type
  const budgetBands = useMemo(() => {
    if (!budgetsData || !tempFilters.budgetType) return [];
    return budgetsData[tempFilters.budgetType] || [];
  }, [budgetsData, tempFilters.budgetType]);

  // Open filter sheet
  const openFilter = () => {
    setTempFilters({ ...filters });
    setIsFilterOpen(true);
  };

  // Apply filters
  const applyFilters = () => {
    setFilters({ ...tempFilters });
    setPage(1);
    setIsFilterOpen(false);
  };

  // Clear all filters
  const clearFilters = () => {
    setTempFilters({ sort: 'recommended' });
  };

  // Remove a specific filter
  const removeFilter = (key: keyof FilterState) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    if (key === 'genreParent') {
      delete newFilters.genreChild;
    }
    if (key === 'budgetType') {
      delete newFilters.budgetBand;
    }
    setFilters(newFilters);
  };

  // Toggle feature
  const toggleFeature = (featureId: string) => {
    setTempFilters((prev) => {
      const currentFeatures = prev.features || [];
      if (currentFeatures.includes(featureId)) {
        return { ...prev, features: currentFeatures.filter((f) => f !== featureId) };
      } else {
        return { ...prev, features: [...currentFeatures, featureId] };
      }
    });
  };

  // Count active filters
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

  // Get display labels for active filters
  const getFilterLabel = (key: string, value: string | undefined): string => {
    if (!value) return '';
    
    switch (key) {
      case 'genreParent':
        return genresData?.parents.find((g) => g.id === value)?.name || value;
      case 'genreChild':
        if (filters.genreParent && genresData) {
          const children = genresData.children[filters.genreParent as keyof typeof genresData.children];
          return children?.find((g) => g.id === value)?.name || value;
        }
        return value;
      case 'prefecture':
        return prefecturesData?.find((p) => p.id === value)?.name || value;
      case 'distanceRadius':
        return distancesData?.find((d) => d.meters === Number(value))?.label || `${value}m`;
      case 'budgetBand':
        if (filters.budgetType && budgetsData) {
          const bands = budgetsData[filters.budgetType];
          return bands?.find((b) => b.id === value)?.label || value;
        }
        return value;
      case 'status':
        return value === 'want_to_go' ? '行きたい' : value === 'visited' ? '訪問済み' : '';
      default:
        return String(value);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold mb-4">ログインが必要です</h2>
        <Button asChild>
          <a href={getLoginUrl()}>ログイン</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="font-semibold">店舗を探す</h1>
          </div>
          {activeFilterCount > 0 && (
            <Badge variant="secondary">{activeFilterCount}件の条件</Badge>
          )}
        </div>
      </header>

      {/* Filter Chips */}
      <div className="border-b bg-muted/30">
        <div className="container px-4 py-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {/* Location button */}
            <Button
              variant={currentLocation ? "default" : "outline"}
              size="sm"
              onClick={handleGetLocation}
              className="shrink-0"
            >
              <Navigation className="h-4 w-4 mr-1" />
              {currentLocation ? "現在地ON" : "現在地"}
            </Button>

            {/* Active filter chips */}
            {filters.prefecture && (
              <Badge variant="secondary" className="shrink-0 gap-1">
                {getFilterLabel('prefecture', filters.prefecture)}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter('prefecture')}
                />
              </Badge>
            )}
            {filters.genreParent && (
              <Badge variant="secondary" className="shrink-0 gap-1">
                {getFilterLabel('genreParent', filters.genreParent)}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter('genreParent')}
                />
              </Badge>
            )}
            {filters.distanceRadius && (
              <Badge variant="secondary" className="shrink-0 gap-1">
                {distancesData?.find((d) => d.meters === filters.distanceRadius)?.label || `${filters.distanceRadius}m`}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter('distanceRadius')}
                />
              </Badge>
            )}
            {filters.status && (
              <Badge variant="secondary" className="shrink-0 gap-1">
                {getFilterLabel('status', filters.status)}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter('status')}
                />
              </Badge>
            )}

            {/* Filter button */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0" onClick={openFilter}>
                  <Filter className="h-4 w-4 mr-1" />
                  フィルタ
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh]">
                <SheetHeader className="flex flex-row items-center justify-between">
                  <SheetTitle>絞り込み条件</SheetTitle>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      クリア
                    </Button>
                    <Button size="sm" onClick={applyFilters}>
                      適用 ({searchQuery.data?.total || 0}件)
                    </Button>
                  </div>
                </SheetHeader>
                <ScrollArea className="h-full mt-4 pb-20">
                  <div className="space-y-6 pr-4">
                    {/* エリア・距離 */}
                    <div>
                      <h3 className="font-medium mb-3">エリア・距離</h3>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">現在地からの距離</Label>
                          <Select
                            value={tempFilters.distanceRadius?.toString() || 'any'}
                            onValueChange={(v) =>
                              setTempFilters((prev) => ({
                                ...prev,
                                distanceRadius: v === 'any' ? null : Number(v),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="指定なし" />
                            </SelectTrigger>
                            <SelectContent>
                              {distancesData?.map((d) => (
                                <SelectItem key={d.id} value={d.meters?.toString() || 'any'}>
                                  {d.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">都道府県</Label>
                          <Select
                            value={tempFilters.prefecture || 'any'}
                            onValueChange={(v) =>
                              setTempFilters((prev) => ({
                                ...prev,
                                prefecture: v === 'any' ? undefined : v,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="指定なし" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">指定なし</SelectItem>
                              {prefecturesData?.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
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
                      <h3 className="font-medium mb-3">ジャンル</h3>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">大ジャンル</Label>
                          <Select
                            value={tempFilters.genreParent || 'any'}
                            onValueChange={(v) =>
                              setTempFilters((prev) => ({
                                ...prev,
                                genreParent: v === 'any' ? undefined : v,
                                genreChild: undefined,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="指定なし" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">指定なし</SelectItem>
                              {genresData?.parents.map((g) => (
                                <SelectItem key={g.id} value={g.id}>
                                  {g.icon} {g.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {tempFilters.genreParent && childGenres.length > 0 && (
                          <div>
                            <Label className="text-sm text-muted-foreground">小ジャンル</Label>
                            <Select
                              value={tempFilters.genreChild || 'any'}
                              onValueChange={(v) =>
                                setTempFilters((prev) => ({
                                  ...prev,
                                  genreChild: v === 'any' ? undefined : v,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="指定なし" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">指定なし</SelectItem>
                                {childGenres.map((g) => (
                                  <SelectItem key={g.id} value={g.id}>
                                    {g.name}
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
                      <h3 className="font-medium mb-3">予算</h3>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Button
                            variant={tempFilters.budgetType === 'lunch' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() =>
                              setTempFilters((prev) => ({
                                ...prev,
                                budgetType: 'lunch',
                                budgetBand: undefined,
                              }))
                            }
                          >
                            ランチ
                          </Button>
                          <Button
                            variant={tempFilters.budgetType === 'dinner' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() =>
                              setTempFilters((prev) => ({
                                ...prev,
                                budgetType: 'dinner',
                                budgetBand: undefined,
                              }))
                            }
                          >
                            ディナー
                          </Button>
                        </div>
                        {tempFilters.budgetType && budgetBands.length > 0 && (
                          <div>
                            <Label className="text-sm text-muted-foreground">予算帯</Label>
                            <Select
                              value={tempFilters.budgetBand || 'any'}
                              onValueChange={(v) =>
                                setTempFilters((prev) => ({
                                  ...prev,
                                  budgetBand: v === 'any' ? undefined : v,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="指定なし" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">指定なし</SelectItem>
                                {budgetBands.map((b) => (
                                  <SelectItem key={b.id} value={b.id}>
                                    {b.label}
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
                      <h3 className="font-medium mb-3">ステータス</h3>
                      <Select
                        value={tempFilters.status || 'any'}
                        onValueChange={(v) =>
                          setTempFilters((prev) => ({
                            ...prev,
                            status: v === 'any' ? undefined : (v as StatusFilter),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="指定なし" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">すべて</SelectItem>
                          <SelectItem value="want_to_go">行きたい</SelectItem>
                          <SelectItem value="visited">訪問済み</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    {/* こだわり条件 */}
                    <div>
                      <h3 className="font-medium mb-3">こだわり条件</h3>
                      <div className="space-y-4">
                        {featuresData &&
                          Object.entries(featuresData).map(([key, category]) => (
                            <div key={key}>
                              <Label className="text-sm text-muted-foreground">{category.label}</Label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {category.options.map((option) => (
                                  <Badge
                                    key={option.id}
                                    variant={
                                      tempFilters.features?.includes(option.id)
                                        ? 'default'
                                        : 'outline'
                                    }
                                    className="cursor-pointer"
                                    onClick={() => toggleFeature(option.id)}
                                  >
                                    {option.label}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Sort & Results Count */}
      <div className="container px-4 py-2 flex items-center justify-between">
        <Select
          value={filters.sort || 'recommended'}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, sort: v as SortOption }))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptionsData?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {searchQuery.data?.total || 0}件の結果
        </span>
      </div>

      {/* Results */}
      <div className="container px-4 pb-20">
        {searchQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : searchQuery.data?.places.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            条件に一致する店舗が見つかりませんでした
          </div>
        ) : (
          <div className="space-y-3">
            {searchQuery.data?.places.map((place) => (
              <Card key={place.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{place.name}</h3>
                        {place.status === 'want_to_go' && (
                          <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />
                        )}
                        {place.status === 'visited' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        {place.rating && (
                          <span className="flex items-center">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 mr-0.5" />
                            {place.rating}
                          </span>
                        )}
                        {place.address && (
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-0.5" />
                            {place.address.split(' ')[0]}
                          </span>
                        )}
                        {place.distance !== undefined && (
                          <span>
                            {place.distance < 1000
                              ? `${Math.round(place.distance)}m`
                              : `${(place.distance / 1000).toFixed(1)}km`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {place.genre && (
                          <Badge variant="outline" className="text-xs">
                            {place.genre}
                          </Badge>
                        )}
                        {place.features?.slice(0, 3).map((f) => (
                          <Badge key={f} variant="secondary" className="text-xs">
                            {f}
                          </Badge>
                        ))}
                      </div>
                      {place.summary && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {place.summary}
                        </p>
                      )}
                    </div>
                    {place.googleMapsUrl && (
                      <a
                        href={place.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 ml-2"
                      >
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Load More */}
            {searchQuery.data?.hasMore && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={searchQuery.isFetching}
                >
                  {searchQuery.isFetching ? '読み込み中...' : 'もっと見る'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
