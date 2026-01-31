import { Button } from "@/components/ui/button";
import { Share2, BookmarkPlus, Route } from "lucide-react";

type PlaceActionBarProps = {
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
  shareUrl?: string;
  routeUrl?: string;
  size?: "sm" | "md";
};

const buttonSize = {
  sm: "h-9 text-xs",
  md: "h-10 text-sm",
};

export default function PlaceActionBar({
  onSave,
  saving = false,
  saved = false,
  shareUrl,
  routeUrl,
  size = "md",
}: PlaceActionBarProps) {
  const handleShare = () => {
    if (!shareUrl) return;
    if (navigator.share) {
      navigator.share({ url: shareUrl }).catch(() => undefined);
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => undefined);
    }
  };

  const handleRoute = () => {
    if (!routeUrl) return;
    window.open(routeUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <Button
        className={`${buttonSize[size]} w-full`}
        onClick={onSave}
        disabled={!onSave || saving || saved}
      >
        <BookmarkPlus className="w-4 h-4 mr-1" />
        {saved ? "保存済み" : saving ? "保存中" : "保存"}
      </Button>
      <Button
        variant="outline"
        className={`${buttonSize[size]} w-full`}
        onClick={handleShare}
        disabled={!shareUrl}
      >
        <Share2 className="w-4 h-4 mr-1" />
        共有
      </Button>
      <Button
        variant="outline"
        className={`${buttonSize[size]} w-full`}
        onClick={handleRoute}
        disabled={!routeUrl}
      >
        <Route className="w-4 h-4 mr-1" />
        ルート
      </Button>
    </div>
  );
}
