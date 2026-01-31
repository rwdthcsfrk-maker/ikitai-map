import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import EmptyState from "@/components/EmptyState";
import ListCardSkeleton from "@/components/ListCardSkeleton";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Plus,
  Folder,
  Loader2,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const LIST_COLORS = [
  { name: "レッド", value: "#ef4444" },
  { name: "オレンジ", value: "#f97316" },
  { name: "イエロー", value: "#eab308" },
  { name: "グリーン", value: "#22c55e" },
  { name: "ブルー", value: "#3b82f6" },
  { name: "パープル", value: "#a855f7" },
  { name: "ピンク", value: "#ec4899" },
];

export default function Lists() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [newListColor, setNewListColor] = useState(LIST_COLORS[0].value);

  const utils = trpc.useUtils();
  const { data: lists, isLoading } = trpc.list.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: sharedLists } = trpc.list.shared.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createMutation = trpc.list.create.useMutation({
    onSuccess: () => {
      utils.list.list.invalidate();
      setIsCreateOpen(false);
      setNewListName("");
      setNewListDescription("");
      toast.success("リストを作成しました");
    },
    onError: () => {
      toast.error("リストの作成に失敗しました");
    },
  });

  const deleteMutation = trpc.list.delete.useMutation({
    onSuccess: () => {
      utils.list.list.invalidate();
      toast.success("リストを削除しました");
    },
    onError: () => {
      toast.error("リストの削除に失敗しました");
    },
  });

  const handleCreate = () => {
    if (!newListName.trim()) {
      toast.error("リスト名を入力してください");
      return;
    }
    createMutation.mutate({
      name: newListName,
      description: newListDescription || undefined,
      color: newListColor,
    });
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("このリストを削除しますか？")) {
      deleteMutation.mutate({ id });
    }
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
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="mb-4">ログインが必要です</p>
            <Button asChild className="w-full h-12">
              <a href={getLoginUrl()}>ログイン</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - スマホ最適化 */}
      <header className="border-b bg-card px-4 py-3 sticky top-0 z-10 safe-area-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-semibold text-lg">マイリスト</h1>
          </div>
          <Drawer open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DrawerTrigger asChild>
              <Button size="sm" className="h-10">
                <Plus className="w-4 h-4 mr-1" />
                新規
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className="border-b">
                <DrawerTitle>新しいリストを作成</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 py-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">リスト名</Label>
                  <Input
                    id="name"
                    placeholder="例: デート用、会食用"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">説明（任意）</Label>
                  <Input
                    id="description"
                    placeholder="リストの説明"
                    value={newListDescription}
                    onChange={(e) => setNewListDescription(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>カラー</Label>
                  <div className="flex gap-3 flex-wrap">
                    {LIST_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`w-10 h-10 rounded-full border-2 transition-all ${
                          newListColor === color.value
                            ? "border-foreground scale-110"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setNewListColor(color.value)}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DrawerFooter className="border-t pt-4">
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="w-full h-12"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  作成
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline" className="w-full h-12">
                    キャンセル
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 pb-24">
        {isLoading ? (
          <ListCardSkeleton count={4} />
        ) : (lists && lists.length > 0) || (sharedLists && sharedLists.length > 0) ? (
          <div className="space-y-6">
            {lists && lists.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">マイリスト</p>
                {lists.map((list) => (
                  <Link key={list.id} href={`/lists/${list.id}`}>
                    <Card className="cursor-pointer active:scale-[0.98] transition-transform">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: list.color || LIST_COLORS[0].value }}
                          >
                            <Folder className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-base truncate">{list.name}</h3>
                            <p className="text-sm text-muted-foreground">{list.placeCount} 件</p>
                            {list.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {list.description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-10 w-10 text-muted-foreground"
                            onClick={(e) => handleDelete(list.id, e)}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
            {sharedLists && sharedLists.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">共有リスト</p>
                {sharedLists.map((list) => (
                  <Link key={list.id} href={`/lists/${list.id}`}>
                    <Card className="cursor-pointer active:scale-[0.98] transition-transform">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: list.color || LIST_COLORS[0].value }}
                          >
                            <Folder className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-base truncate">{list.name}</h3>
                            <p className="text-sm text-muted-foreground">{list.placeCount} 件</p>
                            {list.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {list.description}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {list.accessRole === "editor" ? "編集可" : "閲覧"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            title="リストがありません"
            description="お店を整理するためのリストを作成しましょう"
            icon={Folder}
            actionLabel="リストを作成"
            onAction={() => setIsCreateOpen(true)}
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
}
