import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PlaceCardHeader from "@/components/PlaceCardHeader";
import EmptyState from "@/components/EmptyState";
import PlaceCardSkeleton from "@/components/PlaceCardSkeleton";
import PlaceActionBar from "@/components/PlaceActionBar";
import { trpc } from "@/lib/trpc";
import { showSavedToast } from "@/lib/toast";
import { buildDirectionsUrl } from "@/lib/maps";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Loader2,
  Star,
  Sparkles,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

export default function Recommend() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [savingPlaceId, setSavingPlaceId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: places } = trpc.place.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: recommendedPlaces, isLoading: recommendedLoading } = trpc.place.recommended.useQuery(
    {
      location: currentLocation ?? undefined,
      limit: 20,
    },
    {
      enabled: isAuthenticated,
    }
  );
  const savedPlaceIds = new Set(
    (places || [])
      .map((place) => place.googlePlaceId)
      .filter((placeId): placeId is string => Boolean(placeId))
  );

  const createPlaceMutation = trpc.place.create.useMutation();

  // 現在地を取得
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
        // 位置情報取得失敗時は何もしない
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 10 * 60 * 1000,
      }
    );
  }, [currentLocation]);

  const formatDistanceKm = (distanceKm: number) => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    }
    return `${distanceKm.toFixed(1)}km`;
  };

  const getDistanceKm = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(to.lat - from.lat);
    const dLng = toRad(to.lng - from.lng);
    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);

    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
  };

  const handleSaveRecommended = (place: {
    placeId: string;
    name: string;
    address: string;
    rating?: number;
    latitude: number;
    longitude: number;
    googleMapsUrl: string;
  }) => {
    if (savedPlaceIds.has(place.placeId)) {
      toast.success("すでに追加済みです");
      return;
    }
    setSavingPlaceId(place.placeId);
    createPlaceMutation
      .mutateAsync({
        googlePlaceId: place.placeId,
        name: place.name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        rating: place.rating,
        source: "Google",
        googleMapsUrl: place.googleMapsUrl,
      })
      .then(() => {
        utils.place.list.invalidate();
        showSavedToast({
          placeName: place.name,
          shareUrl: place.googleMapsUrl,
          onOpenLists: () => {
            setLocation("/lists");
          },
        });
      })
      .catch(() => {
        toast.error("追加に失敗しました");
      })
      .finally(() => {
        setSavingPlaceId(null);
      });
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
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6 text-center">
              <Sparkles className="w-16 h-16 mx-auto text-primary mb-4" />
              <h2 className="text-xl font-bold mb-2">ログインが必要です</h2>
              <p className="text-muted-foreground mb-4">
                あなたへのおすすめを表示するにはログインしてください
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ヘッダー */}
      <header className="border-b bg-card px-3 py-2 sticky top-0 z-10 safe-area-top">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              あなたへのおすすめ
            </h1>
            <p className="text-xs text-muted-foreground">保存した傾向からピックアップ</p>
          </div>
          {currentLocation && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Navigation className="w-3 h-3" />
              <span>現在地取得済み</span>
            </div>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto pb-20">
        {recommendedLoading ? (
          <div className="p-4">
            <PlaceCardSkeleton count={4} />
          </div>
        ) : recommendedPlaces && recommendedPlaces.length > 0 ? (
          <div className="p-4 space-y-3">
            {recommendedPlaces.map((place) => {
              const distanceLabel = currentLocation
                ? formatDistanceKm(
                  getDistanceKm(currentLocation, {
                    lat: place.latitude,
                    lng: place.longitude,
                  })
                )
                : undefined;
              return (
              <Card key={place.placeId} className="overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-3">
                    <PlaceCardHeader
                      name={place.name}
                      address={place.address ?? undefined}
                      distanceLabel={distanceLabel}
                      openLabel="情報なし"
                    />
                    {place.reason && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {place.reason}
                      </p>
                    )}
                    {place.rating && (
                      <span className="flex items-center gap-1 text-sm">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {place.rating}
                      </span>
                    )}
                    <PlaceActionBar
                      onSave={() => handleSaveRecommended(place)}
                      saved={savedPlaceIds.has(place.placeId)}
                      saving={
                        createPlaceMutation.isPending || savingPlaceId === place.placeId
                      }
                      shareUrl={place.googleMapsUrl}
                      routeUrl={buildDirectionsUrl({
                        lat: place.latitude,
                        lng: place.longitude,
                        address: place.address,
                        placeId: place.placeId,
                      })}
                      size="sm"
                    />
                  </div>
                </CardContent>
              </Card>
            );})}
          </div>
        ) : (
          <EmptyState
            title="おすすめを表示できません"
            description="店舗を保存すると、あなたの好みに合ったおすすめが表示されます"
            icon={Sparkles}
            actionLabel="店舗を追加する"
            onAction={() => {
              setLocation("/add");
            }}
          />
        )}
      </div>

      <BottomNav />
    </div>
  );
}
