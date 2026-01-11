import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Star, MapPin, ExternalLink, Heart, Check, Loader2, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Place {
  id: number;
  name: string;
  address?: string | null;
  genre?: string | null;
  features?: string[] | null;
  summary?: string | null;
  rating?: string | null;
  googleMapsUrl?: string | null;
  photoUrl?: string | null;
  status: string;
  userRating?: number | null;
  userNote?: string | null;
  visitedAt?: Date | null;
}

interface PlaceDetailDialogProps {
  place: Place;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export default function PlaceDetailDialog({
  place,
  open,
  onOpenChange,
  onEdit,
}: PlaceDetailDialogProps) {
  const [userRating, setUserRating] = useState<number | null>(place.userRating ?? null);
  const [userNote, setUserNote] = useState(place.userNote ?? "");
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const updateRatingMutation = trpc.place.updateRating.useMutation({
    onSuccess: () => {
      utils.place.list.invalidate();
      toast.success("評価を保存しました");
    },
    onError: () => {
      toast.error("保存に失敗しました");
    },
  });

  const updateStatusMutation = trpc.place.updateStatus.useMutation({
    onSuccess: () => {
      utils.place.list.invalidate();
    },
  });

  const deleteMutation = trpc.place.delete.useMutation({
    onSuccess: () => {
      utils.place.list.invalidate();
      toast.success("店舗を削除しました");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("削除に失敗しました");
    },
  });

  useEffect(() => {
    setUserRating(place.userRating ?? null);
    setUserNote(place.userNote ?? "");
  }, [place]);

  const handleSaveRating = () => {
    updateRatingMutation.mutate({
      id: place.id,
      userRating,
      userNote: userNote || undefined,
    });
  };

  const handleStatusChange = (status: "none" | "want_to_go" | "visited") => {
    updateStatusMutation.mutate({ id: place.id, status });
    toast.success(
      status === "want_to_go" ? "行きたいリストに追加しました" :
      status === "visited" ? "訪問済みにしました" :
      "ステータスを解除しました"
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{place.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Photo */}
          {place.photoUrl && (
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={place.photoUrl}
                alt={place.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-2">
            {place.genre && (
              <span className="feature-tag">{place.genre}</span>
            )}
            {place.summary && (
              <p className="text-sm text-muted-foreground">{place.summary}</p>
            )}
            {place.address && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{place.address}</span>
              </div>
            )}
            {place.rating && (
              <div className="flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>Google評価: {place.rating}</span>
              </div>
            )}
          </div>

          {/* Features */}
          {place.features && place.features.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">特徴</Label>
              <div className="flex flex-wrap gap-1">
                {place.features.map((feature, i) => (
                  <span key={i} className="feature-tag text-xs">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <Label className="text-sm font-medium mb-2 block">ステータス</Label>
            <div className="flex gap-2">
              <Button
                variant={place.status === "want_to_go" ? "default" : "outline"}
                size="sm"
                className={place.status === "want_to_go" ? "bg-pink-500 hover:bg-pink-600" : ""}
                onClick={() => handleStatusChange(
                  place.status === "want_to_go" ? "none" : "want_to_go"
                )}
              >
                <Heart className={`w-4 h-4 mr-1 ${place.status === "want_to_go" ? "fill-white" : ""}`} />
                行きたい
              </Button>
              <Button
                variant={place.status === "visited" ? "default" : "outline"}
                size="sm"
                className={place.status === "visited" ? "bg-green-500 hover:bg-green-600" : ""}
                onClick={() => handleStatusChange(
                  place.status === "visited" ? "none" : "visited"
                )}
              >
                <Check className="w-4 h-4 mr-1" />
                訪問済み
              </Button>
            </div>
            {place.visitedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                訪問日: {new Date(place.visitedAt).toLocaleDateString("ja-JP")}
              </p>
            )}
          </div>

          {/* User Rating */}
          <div>
            <Label className="text-sm font-medium mb-2 block">自分の評価</Label>
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  className="p-1 transition-transform hover:scale-110"
                  onMouseEnter={() => setHoveredRating(rating)}
                  onMouseLeave={() => setHoveredRating(null)}
                  onClick={() => setUserRating(userRating === rating ? null : rating)}
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      rating <= (hoveredRating ?? userRating ?? 0)
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
              {userRating && (
                <span className="ml-2 text-sm font-medium">{userRating}/5</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              クリックで評価、もう一度クリックで解除
            </p>
          </div>

          {/* User Note */}
          <div>
            <Label htmlFor="userNote" className="text-sm font-medium mb-2 block">
              メモ・感想
            </Label>
            <Textarea
              id="userNote"
              placeholder="お店の感想やメモを残せます..."
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleSaveRating}
                disabled={updateRatingMutation.isPending}
              >
                {updateRatingMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                評価を保存
              </Button>
              {place.googleMapsUrl && (
                <Button variant="outline" asChild>
                  <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Googleマップ
                  </a>
                </Button>
              )}
            </div>
            
            {/* Edit & Delete */}
            <div className="flex gap-2 pt-2 border-t">
              {onEdit && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit();
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  編集
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="flex-1 text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    削除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>店舗を削除しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                      「{place.name}」を削除します。この操作は取り消せません。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate({ id: place.id })}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      削除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
