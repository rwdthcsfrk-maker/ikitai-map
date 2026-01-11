import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Plus, Folder, Loader2, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 sticky top-0 z-10">
        <div className="container flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-1" />
              マップ
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="font-semibold">マイリスト</h1>
          </div>
          <div className="flex-1" />
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                新規リスト
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新しいリストを作成</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">リスト名</Label>
                  <Input
                    id="name"
                    placeholder="例: デート用、会食用"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">説明（任意）</Label>
                  <Input
                    id="description"
                    placeholder="リストの説明"
                    value={newListDescription}
                    onChange={(e) => setNewListDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>カラー</Label>
                  <div className="flex gap-2 flex-wrap">
                    {LIST_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
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
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  作成
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <main className="container py-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : lists && lists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((list) => (
              <Link key={list.id} href={`/lists/${list.id}`}>
                <Card className="place-card h-full cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: list.color || LIST_COLORS[0].value }}
                        >
                          <Folder className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{list.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {list.placeCount} 件
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(list.id, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  {list.description && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {list.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Folder className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-lg font-medium mb-2">リストがありません</h2>
            <p className="text-muted-foreground mb-4">
              お店を整理するためのリストを作成しましょう
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              リストを作成
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
