import { toast } from "sonner";

type SavedToastOptions = {
  placeName: string;
  shareUrl?: string;
  onOpenLists?: () => void;
};

export const showSavedToast = ({ placeName, shareUrl, onOpenLists }: SavedToastOptions) => {
  toast.custom((t) => (
    <div className="w-full max-w-sm rounded-2xl border bg-background shadow-lg px-4 py-3">
      <p className="text-sm font-semibold">保存しました</p>
      <p className="text-xs text-muted-foreground mt-1 truncate">{placeName}</p>
      <div className="mt-3 flex items-center gap-2">
        <button
          className="flex-1 text-xs h-9 rounded-lg border bg-muted/40"
          onClick={() => {
            toast.dismiss(t);
            if (shareUrl && navigator.share) {
              navigator.share({ title: placeName, url: shareUrl }).catch(() => undefined);
            }
          }}
        >
          共有
        </button>
        <button
          className="flex-1 text-xs h-9 rounded-lg bg-primary text-primary-foreground"
          onClick={() => {
            toast.dismiss(t);
            onOpenLists?.();
          }}
        >
          リスト追加
        </button>
      </div>
    </div>
  ));
};
