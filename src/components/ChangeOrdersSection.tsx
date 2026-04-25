import { useState } from "react";
import { ChangeOrder, ChangeOrderComment } from "@/types/project";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ClipboardList, MessageSquare } from "lucide-react";

interface ChangeOrdersProps {
  orders: ChangeOrder[];
  onChange: (orders: ChangeOrder[]) => void;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const initialsFrom = (name?: string | null): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Avatar = ({ initials }: { initials: string }) => (
  <div
    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-semibold ring-1 ring-primary/20"
    aria-hidden
  >
    {initials}
  </div>
);

const Meta = ({
  initials,
  name,
  createdAt,
}: {
  initials: string;
  name: string;
  createdAt: string;
}) => (
  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
    <Avatar initials={initials} />
    <span className="font-medium text-foreground">{name}</span>
    <span aria-hidden>·</span>
    <span>{formatDate(createdAt)}</span>
  </div>
);

const ChangeOrdersSection = ({ orders, onChange }: ChangeOrdersProps) => {
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [openReplyId, setOpenReplyId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const currentName =
    (user?.user_metadata as any)?.display_name ||
    user?.email?.split("@")[0] ||
    "You";
  const currentInitials = initialsFrom(currentName);

  const add = () => {
    if (!draft.trim()) return;
    const newOrder: ChangeOrder = {
      id: crypto.randomUUID(),
      text: draft.trim(),
      createdAt: new Date().toISOString(),
      authorName: currentName,
      authorInitials: currentInitials,
      createdBy: user?.id ?? null,
      comments: [],
    };
    onChange([newOrder, ...orders]);
    setDraft("");
  };

  const remove = (id: string) => onChange(orders.filter((o) => o.id !== id));

  const addReply = (orderId: string) => {
    const text = (replyDrafts[orderId] || "").trim();
    if (!text) return;
    const newComment: ChangeOrderComment = {
      id: crypto.randomUUID(),
      changeOrderId: orderId,
      text,
      authorName: currentName,
      authorInitials: currentInitials,
      createdBy: user?.id ?? null,
      createdAt: new Date().toISOString(),
    };
    onChange(
      orders.map((o) =>
        o.id === orderId ? { ...o, comments: [...(o.comments || []), newComment] } : o,
      ),
    );
    setReplyDrafts((d) => ({ ...d, [orderId]: "" }));
  };

  const deleteComment = (orderId: string, commentId: string) => {
    onChange(
      orders.map((o) =>
        o.id === orderId
          ? { ...o, comments: (o.comments || []).filter((c) => c.id !== commentId) }
          : o,
      ),
    );
  };

  return (
    <div className="premium-card p-6 space-y-5">
      <h2 className="section-title flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-primary" />
        Change Orders & Notes
      </h2>

      <div className="space-y-2">
        <textarea
          placeholder="Add a note, change order, or contractor instruction…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[72px] focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background transition-shadow"
        />
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={add}
            disabled={!draft.trim()}
            className="rounded-xl"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Note
          </Button>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const replyOpen = openReplyId === order.id;
            const commentCount = order.comments?.length || 0;
            return (
              <div
                key={order.id}
                className="rounded-xl border border-l-2 border-l-primary/30 bg-background hover:shadow-sm transition-shadow duration-150"
              >
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <Meta
                      initials={order.authorInitials || initialsFrom(order.authorName)}
                      name={order.authorName || "Unknown"}
                      createdAt={order.createdAt}
                    />
                    <button
                      onClick={() => remove(order.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {order.text}
                  </p>
                  <div className="flex items-center pt-1">
                    <button
                      onClick={() => setOpenReplyId(replyOpen ? null : order.id)}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {commentCount > 0
                        ? `${commentCount} ${commentCount === 1 ? "reply" : "replies"}`
                        : "Reply"}
                    </button>
                  </div>
                </div>

                {(replyOpen || commentCount > 0) && (
                  <div className="border-t border-border/60 bg-muted/30 px-4 py-3 space-y-3 rounded-b-xl">
                    {commentCount > 0 && (
                      <ul className="space-y-3">
                        {order.comments.map((c) => (
                          <li key={c.id} className="space-y-1.5">
                            <div className="flex items-start justify-between gap-3">
                              <Meta
                                initials={c.authorInitials || initialsFrom(c.authorName)}
                                name={c.authorName || "Unknown"}
                                createdAt={c.createdAt}
                              />
                              {c.createdBy && c.createdBy === user?.id && (
                                <button
                                  onClick={() => deleteComment(order.id, c.id)}
                                  className="text-muted-foreground hover:text-destructive transition-colors p-0.5 shrink-0"
                                  aria-label="Delete reply"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pl-8">
                              {c.text}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}

                    {replyOpen && (
                      <div className="flex items-start gap-2 pt-1">
                        <Avatar initials={currentInitials} />
                        <div className="flex-1 space-y-2">
                          <textarea
                            placeholder="Write a reply…"
                            value={replyDrafts[order.id] || ""}
                            onChange={(e) =>
                              setReplyDrafts((d) => ({ ...d, [order.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                addReply(order.id);
                              }
                            }}
                            className="flex w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[56px] focus:ring-2 focus:ring-ring focus:ring-offset-1 ring-offset-background transition-shadow"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setOpenReplyId(null);
                                setReplyDrafts((d) => ({ ...d, [order.id]: "" }));
                              }}
                              className="h-7 text-xs rounded-lg"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => addReply(order.id)}
                              disabled={!(replyDrafts[order.id] || "").trim()}
                              className="h-7 text-xs rounded-lg"
                            >
                              Reply
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChangeOrdersSection;
