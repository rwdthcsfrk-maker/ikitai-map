import { Link, useLocation } from "wouter";
import { Home, Search, Plus, List, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/search", label: "検索", icon: Search },
  { href: "/add", label: "追加", icon: Plus, isPrimary: true },
  { href: "/lists", label: "リスト", icon: List },
  { href: "/mypage", label: "マイページ", icon: User },
];

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-50 safe-area-bottom safe-area-x">
      <div className="mx-auto flex w-full max-w-lg items-center justify-between h-16 px-6">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/"
            ? location === "/"
            : location.startsWith(item.href) ||
              (item.href === "/search" && location.startsWith("/filter"));
          if (item.isPrimary) {
            return (
              <Link key={item.href} href={item.href} className="flex-1 flex justify-center">
                <button
                  className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-primary text-primary-foreground shadow-lg"
                  aria-label={item.label}
                >
                  <item.icon className="w-6 h-6" />
                </button>
              </Link>
            );
          }
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <button
                className={`flex w-full flex-col items-center gap-1 py-2 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
