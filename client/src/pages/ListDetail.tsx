import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PlaceCardHeader from "@/components/PlaceCardHeader";
import EmptyState from "@/components/EmptyState";
import PlaceCardSkeleton from "@/components/PlaceCardSkeleton";
import { trpc } from "@/lib/trpc";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, ExternalLink, Loader2, MapPin, Star, Trash2, UtensilsCrossed, Users } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";

export default function ListDetail() {
  const { id } = useParams<{ id: string }>();
  const listId = parseInt(id || "0");
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("viewer");

  const utils = trpc.useUtils();
  const { data: list, isLoading } = trpc.list.get.useQuery(
    { id: listId },
    { enabled: isAuthenticated && listId > 0 }
  );
  const { data: members } = trpc.list.members.useQuery(
    { listId },
    { enabled: isAuthenticated && listId > 0 }
  );

  const removePlaceMutation = trpc.list.removePlace.useMutation({
    onSuccess: () => {
      utils.list.get.invalidate({ id: listId });
      toast.success("店舗をリストから削除しました");
    },
    onError: () => {
      toast.error("削除に失敗しました");
    },
  });
  const inviteMutation = trpc.list.invite.useMutation({
    onSuccess: () => {
      utils.list.members.invalidate({ listId });
      setInviteEmail("");
      toast.success("共有メンバーを追加しました");
    },
    onError: (error) => {
      toast.error(error.message || "招待に失敗しました");
    },
  });
  const removeMemberMutation = trpc.list.removeMember.useMutation({
    onSuccess: () => {
      utils.list.members.invalidate({ listId });
      toast.success("メンバーを削除しました");
    },
    onError: () => {
      toast.error("削除に失敗しました");
    },
  });

  const handleRemovePlace = (placeId: number) => {
    if (confirm("この店舗をリストから削除しますか？")) {
      removePlaceMutation.mutate({ listId, placeId });
    }
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error("メールアドレスを入力してください");
      return;
    }
    inviteMutation.mutate({
      listId,
      email: inviteEmail.trim(),
      role: inviteRole,
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <PlaceCardSkeleton count={3} />
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

  if (!list) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="mb-4">リストが見つかりません</p>
            <Button asChild>
              <Link href="/lists">リスト一覧へ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canEdit = list.accessRole === "owner" || list.accessRole === "editor";
  const isOwner = list.accessRole === "owner";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 sticky top-0 z-10">
        <div className="container flex items-center gap-4 justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/lists">
              <ArrowLeft className="w-4 h-4 mr-1" />
              リスト
            </Link>
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: list.color || "#3b82f6" }}
            >
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold truncate">{list.name}</h1>
              {list.description && (
                <p className="text-xs text-muted-foreground truncate">{list.description}</p>
              )}
            </div>
          </div>
          {isOwner && (
            <Button variant="outline" size="sm" onClick={() => setIsShareOpen(true)}>
              <Users className="w-4 h-4 mr-1" />
              共有
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="container py-6">
        {list.places && list.places.length > 0 ? (
          <div className="space-y-4">
            {list.places.map((place) => (
              <Card key={place.id} className="place-card">
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-3">
                    <PlaceCardHeader
                      name={place.name}
                      address={place.address ?? undefined}
                      photoUrl={place.photoUrl ?? undefined}
                      openLabel="情報なし"
                      rightSlot={
                        <div className="flex flex-col gap-2 items-end">
                          {place.googleMapsUrl && (
                            <Button variant="outline" size="sm" asChild>
                              <a
                                href={place.googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemovePlace(place.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      }
                    />

                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      {place.genre && <span className="feature-tag shrink-0">{place.genre}</span>}
                      {place.rating && (
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {place.rating}
                        </span>
                      )}
                    </div>

                    {place.summary && (
                      <p className="text-sm text-muted-foreground">{place.summary}</p>
                    )}

                    {place.features && place.features.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {place.features.map((feature, i) => (
                          <span key={i} className="feature-tag text-xs">
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="店舗がありません"
            description="このリストにはまだ店舗が追加されていません"
            icon={MapPin}
            actionLabel="店舗を追加"
            onAction={() => {
              setLocation("/add");
            }}
          />
        )}
      </main>

      <Drawer open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DrawerContent>
          <DrawerHeader className="border-b">
            <DrawerTitle>リストを共有</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 py-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="invite-email">メールアドレス</Label>
              <Input
                id="invite-email"
                placeholder="example@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>権限</Label>
              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as "viewer" | "editor")}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">閲覧のみ</SelectItem>
                  <SelectItem value="editor">編集可</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>メンバー</Label>
              <div className="space-y-2">
                {members?.map((member) => (
                  <div
                    key={`${member.userId}-${member.role}`}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{member.name || member.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {member.role === "owner" ? "オーナー" : member.role === "editor" ? "編集可" : "閲覧"}
                      </span>
                      {member.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => removeMemberMutation.mutate({ listId, userId: member.userId })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DrawerFooter className="border-t pt-4">
            <Button onClick={handleInvite} disabled={inviteMutation.isPending} className="w-full h-12">
              {inviteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              共有する
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
  );
}
