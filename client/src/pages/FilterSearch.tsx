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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
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
  SlidersHorizontal,
  ChevronRight,
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

  // Open filter drawer
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - スマホ最適化 */}
      <header className="sticky top-0 z-50 bg-background border-b safe-area-top">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="font-semibold text-lg">店舗を探す</h1>
          </div>
          <Button
            variant={currentLocation ? "default" : "outline"}
            size="sm"
            onClick={handleGetLocation}
            className="h-9"
          >
            <Navigation className="h-4 w-4 mr-1" />
            {currentLocation ? "ON" : "現在地"}
          </Button>
        </div>
      </header>

      {/* Filter Bar - スマホ最適化 */}
      <div className="bg-muted/30 border-b">
        <div className="px-4 py-3">
          {/* フィルタボタン行 */}
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
                          <label className="text-sm text-muted-foreground mb-2 block">現在地からの距離</label>
                          <Select
                            value={tempFilters.distanceRadius?.toString() || 'any'}
                            onValueChange={(v) =>
                              setTempFilters((prev) => ({
                                ...prev,
                                distanceRadius: v === 'any' ? null : Number(v),
                              }))
                            }
                          >
                            <SelectTrigger className="h-12">
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
                          <label className="text-sm text-muted-foreground mb-2 block">都道府県</label>
                          <Select
                            value={tempFilters.prefecture || 'any'}
                            onValueChange={(v) =>
                              setTempFilters((prev) => ({
                                ...prev,
                                prefecture: v === 'any' ? undefined : v,
                              }))
                            }
                          >
                            <SelectTrigger className="h-12">
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
                      <h3 className="font-medium mb-3 text-base">ジャンル</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">大ジャンル</label>
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
                            <SelectTrigger className="h-12">
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
                            <label className="text-sm text-muted-foreground mb-2 block">小ジャンル</label>
                            <Select
                              value={tempFilters.genreChild || 'any'}
                              onValueChange={(v) =>
                                setTempFilters((prev) => ({
                                  ...prev,
                                  genreChild: v === 'any' ? undefined : v,
                                }))
                              }
                            >
                              <SelectTrigger className="h-12">
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
                      <h3 className="font-medium mb-3 text-base">予算</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={tempFilters.budgetType === 'lunch' ? 'default' : 'outline'}
                            className="h-12"
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
                            className="h-12"
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
                            <label className="text-sm text-muted-foreground mb-2 block">予算帯</label>
                            <Select
                              value={tempFilters.budgetBand || 'any'}
                              onValueChange={(v) =>
                                setTempFilters((prev) => ({
                                  ...prev,
                                  budgetBand: v === 'any' ? undefined : v,
                                }))
                              }
                            >
                              <SelectTrigger className="h-12">
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
                      <h3 className="font-medium mb-3 text-base">ステータス</h3>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant={!tempFilters.status ? 'default' : 'outline'}
                          className="h-12"
                          onClick={() => setTempFilters((prev) => ({ ...prev, status: undefined }))}
                        >
                          すべて
                        </Button>
                        <Button
                          variant={tempFilters.status === 'want_to_go' ? 'default' : 'outline'}
                          className="h-12"
                          onClick={() => setTempFilters((prev) => ({ ...prev, status: 'want_to_go' }))}
                        >
                          <Heart className="h-4 w-4 mr-1" />
                          行きたい
                        </Button>
                        <Button
                          variant={tempFilters.status === 'visited' ? 'default' : 'outline'}
                          className="h-12"
                          onClick={() => setTempFilters((prev) => ({ ...prev, status: 'visited' }))}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
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
                          Object.entries(featuresData).map(([category, data]) => (
                            data.options.map((option) => (
                              <Button
                                key={option.id}
                                variant={tempFilters.features?.includes(option.id) ? 'default' : 'outline'}
                                size="sm"
                                className="h-10"
                                onClick={() => toggleFeature(option.id)}
                              >
                                {option.label}
                              </Button>
                            ))
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
                <DrawerFooter className="border-t pt-4 shrink-0">
                  <Button onClick={applyFilters} className="w-full h-12 text-base">
                    この条件で検索（{searchQuery.data?.total || 0}件）
                  </Button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          {/* アクティブフィルタチップ */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.genreParent && (
                <Badge variant="secondary" className="h-8 gap-1 px-3">
                  {getFilterLabel('genreParent', filters.genreParent)}
                  <X
                    className="h-3 w-3 cursor-pointer ml-1"
                    onClick={() => removeFilter('genreParent')}
                  />
                </Badge>
              )}
              {filters.prefecture && (
                <Badge variant="secondary" className="h-8 gap-1 px-3">
                  {getFilterLabel('prefecture', filters.prefecture)}
                  <X
                    className="h-3 w-3 cursor-pointer ml-1"
                    onClick={() => removeFilter('prefecture')}
                  />
                </Badge>
              )}
              {filters.distanceRadius && (
                <Badge variant="secondary" className="h-8 gap-1 px-3">
                  {distancesData?.find((d) => d.meters === filters.distanceRadius)?.label}
                  <X
                    className="h-3 w-3 cursor-pointer ml-1"
                    onClick={() => removeFilter('distanceRadius')}
                  />
                </Badge>
              )}
              {filters.budgetBand && (
                <Badge variant="secondary" className="h-8 gap-1 px-3">
                  {getFilterLabel('budgetBand', filters.budgetBand)}
                  <X
                    className="h-3 w-3 cursor-pointer ml-1"
                    onClick={() => removeFilter('budgetBand')}
                  />
                </Badge>
              )}
              {filters.status && (
                <Badge variant="secondary" className="h-8 gap-1 px-3">
                  {getFilterLabel('status', filters.status)}
                  <X
                    className="h-3 w-3 cursor-pointer ml-1"
                    onClick={() => removeFilter('status')}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sort & Results Count */}
      <div className="px-4 py-3 flex items-center justify-between border-b">
        <Select
          value={filters.sort || 'recommended'}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, sort: v as SortOption }))}
        >
          <SelectTrigger className="w-[130px] h-10">
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
          {searchQuery.data?.total || 0}件
        </span>
      </div>

      {/* Results - スマホ最適化 */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-3 pb-24">
          {searchQuery.isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : searchQuery.data?.places.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">条件に一致する店舗が見つかりませんでした</p>
              <Button variant="outline" onClick={() => setFilters({ sort: 'recommended' })}>
                条件をクリア
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {searchQuery.data?.places.map((place) => (
                <Card key={place.id} className="overflow-hidden active:scale-[0.98] transition-transform">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-base truncate">{place.name}</h3>
                          {place.status === 'want_to_go' && (
                            <Heart className="h-4 w-4 text-pink-500 fill-pink-500 shrink-0" />
                          )}
                          {place.status === 'visited' && (
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {place.rating && (
                            <span className="flex items-center">
                              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 mr-0.5" />
                              {place.rating}
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
                        {place.address && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {place.address}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {place.genre && (
                            <Badge variant="outline" className="text-xs h-6">
                              {place.genre}
                            </Badge>
                          )}
                          {place.features?.slice(0, 2).map((f) => (
                            <Badge key={f} variant="secondary" className="text-xs h-6">
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
                          className="shrink-0"
                        >
                          <Button variant="ghost" size="icon" className="h-10 w-10">
                            <ExternalLink className="h-5 w-5" />
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
                    className="w-full h-12"
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
    </div>
  );
}
