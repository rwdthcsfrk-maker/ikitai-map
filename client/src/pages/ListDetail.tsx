import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import { ArrowLeft, ExternalLink, Loader2, MapPin, Star, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

export default function ListDetail() {
  const { id } = useParams<{ id: string }>();
  const listId = parseInt(id || "0");
  const { isAuthenticated, loading: authLoading } = useAuth();

  const utils = trpc.useUtils();
  const { data: list, isLoading } = trpc.list.get.useQuery(
    { id: listId },
    { enabled: isAuthenticated && listId > 0 }
  );

  const removePlaceMutation = trpc.list.removePlace.useMutation({
    onSuccess: () => {
      utils.list.get.invalidate({ id: listId });
      toast.success("店舗をリストから削除しました");
    },
    onError: () => {
      toast.error("削除に失敗しました");
    },
  });

  const handleRemovePlace = (placeId: number) => {
    if (confirm("この店舗をリストから削除しますか？")) {
      removePlaceMutation.mutate({ listId, placeId });
    }
  };

  if (authLoading || isLoading) {
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

  if (!list) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="mb-4">リストが見つかりません</p>
            <Button asChild>
              <Link href="/lists">リスト一覧へ</Link>
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
            <Link href="/lists">
              <ArrowLeft className="w-4 h-4 mr-1" />
              リスト
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: list.color || "#3b82f6" }}
            >
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold">{list.name}</h1>
              {list.description && (
                <p className="text-xs text-muted-foreground">{list.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-6">
        {list.places && list.places.length > 0 ? (
          <div className="space-y-4">
            {list.places.map((place) => (
              <Card key={place.id} className="place-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg truncate">{place.name}</h3>
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
                            <span key={i} className="feature-tag text-xs">
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

                    <div className="flex flex-col gap-2 shrink-0">
                      {place.googleMapsUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={place.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemovePlace(place.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-lg font-medium mb-2">店舗がありません</h2>
            <p className="text-muted-foreground mb-4">
              このリストにはまだ店舗が追加されていません
            </p>
            <Button asChild>
              <Link href="/add">店舗を追加</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
