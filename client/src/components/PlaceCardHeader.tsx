import { MapPin } from "lucide-react";
import type { ReactNode } from "react";

type PlaceCardHeaderProps = {
  name: string;
  address?: string;
  photoUrl?: string;
  distanceLabel?: string;
  openLabel?: string;
  rightSlot?: ReactNode;
};

export default function PlaceCardHeader({
  name,
  address,
  photoUrl,
  distanceLabel,
  openLabel,
  rightSlot,
}: PlaceCardHeaderProps) {
  return (
    <div className="flex gap-3">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-muted shrink-0">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            <MapPin className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-semibold truncate">{name}</p>
            {address && (
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {address.split(" ")[0]}
              </p>
            )}
          </div>
          {rightSlot}
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs text-muted-foreground">
          <div className="rounded-lg bg-muted/40 px-2 py-1">
            <span className="block text-[9px]">距離</span>
            <span className="text-foreground">{distanceLabel || "現在地未取得"}</span>
          </div>
          <div className="rounded-lg bg-muted/40 px-2 py-1">
            <span className="block text-[9px]">営業時間</span>
            <span className="text-foreground">{openLabel || "情報なし"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
