import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface Place {
  id: number;
  name: string;
  address?: string | null;
  genre?: string | null;
  features?: string[] | null;
  summary?: string | null;
}

interface PlaceEditDialogProps {
  place: Place;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABLE_FEATURES = [
  "個室あり",
  "カップル向け",
  "静か",
  "会食向き",
  "カジュアル",
  "高級感",
  "子連れOK",
  "テラス席",
  "禁煙",
  "喫煙可",
  "駐車場あり",
  "駅近",
];

export default function PlaceEditDialog({
  place,
  open,
  onOpenChange,
}: PlaceEditDialogProps) {
  const [name, setName] = useState(place.name);
  const [address, setAddress] = useState(place.address ?? "");
  const [genre, setGenre] = useState(place.genre ?? "");
  const [summary, setSummary] = useState(place.summary ?? "");
  const [features, setFeatures] = useState<string[]>(place.features ?? []);

  const utils = trpc.useUtils();

  const updateMutation = trpc.place.update.useMutation({
    onSuccess: () => {
      utils.place.list.invalidate();
      toast.success("店舗情報を更新しました");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("更新に失敗しました");
    },
  });

  useEffect(() => {
    setName(place.name);
    setAddress(place.address ?? "");
    setGenre(place.genre ?? "");
    setSummary(place.summary ?? "");
    setFeatures(place.features ?? []);
  }, [place]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("店舗名を入力してください");
      return;
    }
    updateMutation.mutate({
      id: place.id,
      name: name.trim(),
      address: address.trim() || undefined,
      genre: genre.trim() || undefined,
      summary: summary.trim() || undefined,
      features: features.length > 0 ? features : undefined,
    });
  };

  const toggleFeature = (feature: string) => {
    setFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>店舗情報を編集</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">店舗名 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="店舗名を入力"
              required
            />
          </div>

          <div>
            <Label htmlFor="address">住所</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="住所を入力"
            />
          </div>

          <div>
            <Label htmlFor="genre">ジャンル</Label>
            <Input
              id="genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="例: イタリアン、和食、カフェ"
            />
          </div>

          <div>
            <Label htmlFor="summary">要約・メモ</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="お店の特徴や雰囲気を入力"
              rows={3}
            />
          </div>

          <div>
            <Label className="mb-2 block">特徴タグ</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_FEATURES.map((feature) => (
                <button
                  key={feature}
                  type="button"
                  onClick={() => toggleFeature(feature)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    features.includes(feature)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {feature}
                  {features.includes(feature) && (
                    <X className="w-3 h-3 ml-1 inline" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
