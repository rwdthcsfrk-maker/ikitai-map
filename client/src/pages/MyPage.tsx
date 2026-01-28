import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { 
  User, 
  LogOut, 
  MapPin, 
  Heart, 
  CheckCircle, 
  List, 
  Star,
  TrendingUp,
  Calendar,
  BarChart3,
  Loader2,
  ChevronRight
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { PARENT_GENRES } from "@shared/masters";
import BottomNav from "@/components/BottomNav";

export default function MyPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: stats, isLoading: statsLoading } = trpc.user.stats.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: detailedStats, isLoading: detailedLoading } = trpc.user.detailedStats.useQuery(undefined, {
    enabled: !!user,
  });

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // 未ログイン
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6 text-center">
              <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">ログインが必要です</h2>
              <p className="text-muted-foreground mb-4">
                マイページを表示するにはログインしてください
              </p>
              <Button asChild className="w-full">
                <a href={getLoginUrl()}>ログイン</a>
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ローディング
  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ジャンル名を取得
  const getGenreName = (genreId: string) => {
    const genre = PARENT_GENRES.find(g => g.id === genreId);
    return genre?.name || genreId;
  };

  // 評価分布の最大値を取得（グラフ用）
  const maxRatingCount = Math.max(...(detailedStats?.ratingDistribution.map(r => r.count) || [1]));

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ヘッダー */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold">マイページ</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* プロフィールカード */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{user?.name || "ユーザー"}</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 統計サマリー */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalPlaces || 0}</p>
                  <p className="text-xs text-muted-foreground">保存した店舗</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.wantToGoCount || 0}</p>
                  <p className="text-xs text-muted-foreground">行きたい</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.visitedCount || 0}</p>
                  <p className="text-xs text-muted-foreground">訪問済み</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <List className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalLists || 0}</p>
                  <p className="text-xs text-muted-foreground">リスト</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 評価サマリー */}
        {detailedStats && detailedStats.ratedCount > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                評価サマリー
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-primary">
                    {detailedStats.avgRating || "-"}
                    <span className="text-base font-normal text-muted-foreground">/100</span>
                  </p>
                  <p className="text-sm text-muted-foreground">平均評価</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{detailedStats.ratedCount}</p>
                  <p className="text-sm text-muted-foreground">評価済み</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 評価分布 */}
        {detailedStats && detailedStats.ratingDistribution.some(r => r.count > 0) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                評価分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {detailedStats.ratingDistribution.map((item) => (
                  <div key={item.range} className="flex items-center gap-3">
                    <span className="text-sm w-14 text-muted-foreground">{item.range}</span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(item.count / maxRatingCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm w-8 text-right font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ジャンル別統計 */}
        {detailedStats && detailedStats.genreStats.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-5 h-5" />
                ジャンル別統計
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {detailedStats.genreStats.slice(0, 5).map((item) => (
                  <div key={item.genre} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {PARENT_GENRES.find(g => g.id === item.genre)?.icon || "🍽️"}
                      </span>
                      <span className="font-medium">{getGenreName(item.genre)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{item.count}件</span>
                      {item.avgRating && (
                        <span className="text-sm font-medium text-primary">
                          {item.avgRating}点
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 訪問履歴 */}
        {detailedStats && detailedStats.visitHistory.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                最近の訪問
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {detailedStats.visitHistory.slice(0, 5).map((item) => (
                  <Link key={item.id} href={`/?placeId=${encodeURIComponent(item.id)}`}>
                    <div className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.visitedAt).toLocaleDateString("ja-JP")}
                          {item.genre && ` • ${getGenreName(item.genre)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.userRating && (
                          <span className="text-sm font-bold text-primary">
                            {item.userRating}点
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ログアウトボタン */}
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          ログアウト
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
