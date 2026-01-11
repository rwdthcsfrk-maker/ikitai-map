import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useMemo } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { ArrowLeft, Search as SearchIcon, Loader2, MapPin, Star, ExternalLink, X, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

const FEATURE_OPTIONS = [
  "個室あり",
  "カップル向け",
  "静か",
  "会食向き",
  "カジュアル",
  "高級感",
  "子連れOK",
];

export default function Search() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const searchParams = useSearch();
  const [, setLocation] = useLocation();
  
  const params = useMemo(() => new URLSearchParams(searchParams), [searchParams]);
  const initialQuery = params.get("q") || "";
  const initialFeatures = params.get("features")?.split(",").filter(Boolean) || [];
  const initialGenre = params.get("genre") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(initialFeatures);
  const [isSearching, setIsSearching] = useState(false);

  const parseSearchMutation = trpc.ai.parseSearchQuery.useMutation();
  
  const { data: searchResults, isLoading, refetch } = trpc.place.search.useQuery(
    {
      query: initialGenre || initialQuery,
      features: selectedFeatures.length > 0 ? selectedFeatures : undefined,
    },
    {
      enabled: isAuthenticated && (!!initialQuery || selectedFeatures.length > 0),
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

  const clearFilters = () => {
    setSelectedFeatures([]);
    setSearchQuery("");
    setLocation("/search");
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 sticky top-0 z-10">
        <div className="container flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-1" />
              マップ
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="font-semibold">検索</h1>
          </div>
        </div>
      </header>

      {/* Search Section */}
      <div className="container py-6">
        {/* Search Input */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="カップル向け イタリアン 個室あり..."
              className="pl-12 pr-4 py-6 text-lg rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button
            className="w-full mt-3"
            size="lg"
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <SearchIcon className="w-5 h-5 mr-2" />
            )}
            自然言語で検索
          </Button>
        </div>

        {/* Feature Filters */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">条件タグで絞り込み</h2>
            {selectedFeatures.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                クリア
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {FEATURE_OPTIONS.map((feature) => (
              <button
                key={feature}
                type="button"
                className={`feature-tag transition-colors ${
                  selectedFeatures.includes(feature) ? "active" : ""
                }`}
                onClick={() => toggleFeature(feature)}
              >
                {feature}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="max-w-2xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {searchResults.length} 件の店舗が見つかりました
              </p>
              {searchResults.map((place) => (
                <Card key={place.id} className="place-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg truncate">
                            {place.name}
                          </h3>
                          {place.genre && (
                            <span className="feature-tag shrink-0">{place.genre}</span>
                          )}
                        </div>

                        {place.summary && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {place.summary}
                          </p>
                        )}

                        {place.features && place.features.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {place.features.map((feature, i) => (
                              <span
                                key={i}
                                className={`feature-tag text-xs ${
                                  selectedFeatures.includes(feature) ? "active" : ""
                                }`}
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {place.rating && (
                            <span className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              {place.rating}
                            </span>
                          )}
                          {place.address && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-4 h-4 shrink-0" />
                              {place.address}
                            </span>
                          )}
                        </div>
                      </div>

                      {place.googleMapsUrl && (
                        <Button variant="outline" size="sm" asChild className="shrink-0">
                          <a
                            href={place.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            詳細
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : initialQuery || selectedFeatures.length > 0 ? (
            <div className="text-center py-12">
              <SearchIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-lg font-medium mb-2">該当する店舗がありません</h2>
              <p className="text-muted-foreground mb-4">
                条件を変更するか、新しい店舗を追加してください
              </p>
              <Button asChild>
                <Link href="/add">店舗を追加</Link>
              </Button>
            </div>
          ) : (
            <div className="text-center py-12">
              <SearchIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-lg font-medium mb-2">検索してみましょう</h2>
              <p className="text-muted-foreground">
                自然言語で条件を入力するか、<br />
                タグを選択して店舗を検索できます
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
