import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  Camera,
  Trash2,
  Plus,
  XCircle,
  Check,
  Share2,
  Lock,
  X,
  ZoomIn,
  ClipboardCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ProjectMember } from "@/hooks/useProjects";

export type PunchStatus = "pending" | "pass" | "fail";

export interface PunchListItem {
  id: string;
  title: string;
  description?: string;
  status: PunchStatus;
  assignee?: string;
  photos?: string[];
  notes?: string;
  failReason?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface PunchListData {
  items: PunchListItem[];
  signedOffAt?: string;
  signedOffBy?: string;
  isLocked: boolean;
}

interface PunchListProps {
  projectId: string;
  data: PunchListData;
  onChange: (next: PunchListData) => void;
  isEditor: boolean;
  members: ProjectMember[];
  readOnlyShare?: boolean;
}

const initialsFor = (name?: string | null) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatDate = (iso?: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
};

const PunchList = ({
  projectId,
  data,
  onChange,
  isEditor,
  members,
  readOnlyShare = false,
}: PunchListProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoTargetId, setPhotoTargetId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState<string>("__none__");
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [failPromptId, setFailPromptId] = useState<string | null>(null);
  const [failReason, setFailReason] = useState("");
  const [signOffOpen, setSignOffOpen] = useState(false);
  const [signOffName, setSignOffName] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const items = data.items || [];
  const locked = data.isLocked || readOnlyShare;
  const canEdit = isEditor && !locked;

  const total = items.length;
  const passed = items.filter((i) => i.status === "pass").length;
  const failed = items.filter((i) => i.status === "fail").length;
  const pending = items.filter((i) => i.status === "pending").length;
  const completedCount = passed + failed;
  const passPercent = total > 0 ? Math.round((passed / total) * 100) : 0;
  const allResolved = total > 0 && pending === 0;
  const completionPercent = total > 0 ? (completedCount / total) * 100 : 0;
  const progressColor =
    completionPercent >= 100
      ? "bg-success"
      : completionPercent >= 50
      ? "bg-warning"
      : "bg-primary";

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxSrc(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxSrc]);

  // Pre-fill sign-off name with user display name
  useEffect(() => {
    if (!signOffOpen) return;
    const name =
      (user?.user_metadata?.display_name as string | undefined) ||
      user?.email ||
      "";
    setSignOffName(name);
  }, [signOffOpen, user]);

  const updateItems = useCallback(
    (next: PunchListItem[]) => {
      onChange({ ...data, items: next });
    },
    [data, onChange]
  );

  const addItem = () => {
    const title = newTitle.trim();
    if (!title) return;
    const item: PunchListItem = {
      id: crypto.randomUUID(),
      title,
      status: "pending",
      assignee: newAssignee && newAssignee !== "__none__" ? newAssignee : undefined,
      createdAt: new Date().toISOString(),
      photos: [],
    };
    updateItems([...items, item]);
    setNewTitle("");
    setNewAssignee("__none__");
  };

  const setStatus = (id: string, status: PunchStatus, reason?: string) => {
    updateItems(
      items.map((it) =>
        it.id === id
          ? {
              ...it,
              status,
              resolvedAt: status === "pending" ? undefined : new Date().toISOString(),
              failReason: status === "fail" ? reason || it.failReason : undefined,
            }
          : it
      )
    );
    if (status === "fail") {
      setExpandedNotes((s) => ({ ...s, [id]: true }));
    }
  };

  const setNotes = (id: string, notes: string) => {
    updateItems(items.map((it) => (it.id === id ? { ...it, notes } : it)));
  };

  const removeItem = (id: string) => {
    updateItems(items.filter((it) => it.id !== id));
  };

  const triggerPhotoUpload = (id: string) => {
    setPhotoTargetId(id);
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = photoTargetId;
    if (!file || !targetId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateItems(
        items.map((it) =>
          it.id === targetId ? { ...it, photos: [...(it.photos || []), dataUrl] } : it
        )
      );
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPhotoTargetId(null);
  };

  const confirmFail = () => {
    if (!failPromptId) return;
    setStatus(failPromptId, "fail", failReason.trim() || undefined);
    setFailPromptId(null);
    setFailReason("");
  };

  const handleSignOff = () => {
    const name = signOffName.trim() || "Contractor";
    onChange({
      ...data,
      isLocked: true,
      signedOffAt: new Date().toISOString(),
      signedOffBy: name,
    });
    setSignOffOpen(false);
    toast({ title: "Punch list signed off", description: `Locked by ${name}` });
  };

  const copyShareLink = async () => {
    const url = `${window.location.origin}/punch-list/${projectId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Share with your homeowner",
      });
    } catch {
      toast({
        title: "Could not copy link",
        description: url,
        variant: "destructive",
      });
    }
  };

  const memberOptions = members.map((m) => ({
    value: m.displayName || m.userId,
    label: m.displayName || "Unnamed",
  }));

  return (
    <div className="space-y-4">
      {/* Sign-off banner */}
      {locked && data.signedOffAt && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Project punch list signed off by {data.signedOffBy || "—"} on{" "}
              {formatDate(data.signedOffAt)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {passed} passed · {failed} failed · list is locked
            </p>
          </div>
          {!readOnlyShare && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-xs"
              onClick={copyShareLink}
            >
              <Share2 className="h-3.5 w-3.5 mr-1.5" />
              Share with Homeowner
            </Button>
          )}
        </div>
      )}

      {/* Header / progress */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Progress
            </p>
            <p className="font-heading text-sm font-bold text-foreground mt-0.5">
              {passed} of {total} passed
              {failed > 0 && (
                <span className="text-destructive font-medium ml-2">
                  · {failed} failed
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="font-heading text-lg font-bold text-success">{passPercent}%</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              complete
            </p>
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300", progressColor)}
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        {!locked && allResolved && isEditor && (
          <Button
            size="sm"
            className="w-full rounded-xl text-xs mt-1 bg-success text-success-foreground hover:bg-success/90"
            onClick={() => setSignOffOpen(true)}
          >
            <Lock className="h-3.5 w-3.5 mr-1.5" />
            Mark Complete & Sign Off
          </Button>
        )}
      </div>

      {/* Add item row */}
      {canEdit && (
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="e.g. Touch up paint in hallway, Fix cabinet hinge, Caulk master bath..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
            className="flex-1 min-w-[180px] h-9 text-sm rounded-xl"
          />
          <Select value={newAssignee} onValueChange={setNewAssignee}>
            <SelectTrigger className="w-[150px] h-9 text-xs rounded-xl">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Unassigned</SelectItem>
              {memberOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-9 rounded-xl text-xs"
            onClick={addItem}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
      )}

      {/* Items */}
      {total === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-10 px-4 rounded-xl border border-dashed border-border bg-secondary/20">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Ready for final walkthrough?
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Add items from your final inspection to track pass/fail before project closeout.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => {
            const sideClass =
              it.status === "pass"
                ? "border-l-2 border-l-success bg-success/5"
                : it.status === "fail"
                ? "border-l-2 border-l-destructive bg-destructive/5"
                : "border-l-2 border-l-border";
            const isExpanded = !!expandedNotes[it.id];
            return (
              <div
                key={it.id}
                className={cn(
                  "rounded-xl border border-border p-3 space-y-2 transition-colors",
                  sideClass
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider",
                          it.status === "pass" && "bg-success/15 text-success",
                          it.status === "fail" && "bg-destructive/15 text-destructive",
                          it.status === "pending" &&
                            "bg-secondary text-muted-foreground"
                        )}
                      >
                        {it.status}
                      </span>
                      <p className="text-sm font-medium text-foreground truncate">
                        {it.title}
                      </p>
                    </div>
                    {it.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {it.description}
                      </p>
                    )}
                    {it.failReason && it.status === "fail" && (
                      <p className="text-xs text-destructive mt-1 italic">
                        Failed: {it.failReason}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {it.assignee && (
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
                            {initialsFor(it.assignee)}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {it.assignee}
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedNotes((s) => ({ ...s, [it.id]: !s[it.id] }))
                        }
                        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isExpanded || it.notes ? "Notes" : "+ Add notes"}
                      </button>
                      {it.photos && it.photos.length > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          · {it.photos.length} photo{it.photos.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          title="Attach photo"
                          onClick={() => triggerPhotoUpload(it.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                          <Camera className="h-3.5 w-3.5" />
                        </button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={cn(
                            "h-7 px-2 rounded-lg text-[11px] border-border",
                            "hover:text-success hover:border-success",
                            it.status === "pass" && "text-success border-success/40"
                          )}
                          onClick={() => setStatus(it.id, "pass")}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Pass
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={cn(
                            "h-7 px-2 rounded-lg text-[11px] border-border",
                            "hover:text-destructive hover:border-destructive",
                            it.status === "fail" &&
                              "text-destructive border-destructive/40"
                          )}
                          onClick={() => {
                            setFailPromptId(it.id);
                            setFailReason(it.failReason || "");
                          }}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Fail
                        </Button>
                        <button
                          type="button"
                          title="Delete item"
                          onClick={() => removeItem(it.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Notes input */}
                {(isExpanded || it.notes) && (
                  <Textarea
                    placeholder="Add notes..."
                    value={it.notes || ""}
                    onChange={(e) => setNotes(it.id, e.target.value)}
                    disabled={!canEdit}
                    className="min-h-[60px] text-xs rounded-xl resize-none"
                  />
                )}

                {/* Photo thumbnails */}
                {it.photos && it.photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {it.photos.map((p, idx) => (
                      <img
                        key={idx}
                        src={p}
                        alt={`Punch item photo ${idx + 1}`}
                        className="h-16 w-16 rounded-lg object-cover border border-border"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoChange}
      />

      {/* Fail reason dialog */}
      <AlertDialog
        open={!!failPromptId}
        onOpenChange={(open) => {
          if (!open) {
            setFailPromptId(null);
            setFailReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Why did this item fail?</AlertDialogTitle>
            <AlertDialogDescription>
              Add a short note explaining the issue. The team can address it before
              sign-off.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="e.g. Paint drip near baseboard"
            value={failReason}
            onChange={(e) => setFailReason(e.target.value)}
            className="min-h-[80px] rounded-xl"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFail}>Mark as Fail</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sign-off dialog */}
      <AlertDialog open={signOffOpen} onOpenChange={setSignOffOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign off punch list?</AlertDialogTitle>
            <AlertDialogDescription>
              This will lock the punch list and generate a completion record. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Contractor name</label>
              <Input
                value={signOffName}
                onChange={(e) => setSignOffName(e.target.value)}
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Date</label>
              <Input
                value={new Date().toLocaleDateString()}
                disabled
                className="rounded-xl mt-1"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOff}>Sign Off</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/**
 * Hook that fetches & persists a project's punch list directly to the
 * `punch_lists` table. Returns the data, a setter, and loading state.
 */
export function usePunchList(projectId: string | undefined) {
  const [data, setData] = useState<PunchListData>({ items: [], isLocked: false });
  const [loading, setLoading] = useState(true);
  const [rowId, setRowId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!projectId) return;
    setLoading(true);
    (async () => {
      const { data: row } = await supabase
        .from("punch_lists")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (cancelled) return;
      if (row) {
        setRowId(row.id);
        setData({
          items: (row.items as unknown as PunchListItem[]) || [],
          isLocked: row.is_locked,
          signedOffAt: row.signed_off_at || undefined,
          signedOffBy: row.signed_off_by_name || undefined,
        });
      } else {
        setRowId(null);
        setData({ items: [], isLocked: false });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const save = useCallback(
    async (next: PunchListData) => {
      if (!projectId) return;
      setData(next);
      const payload = {
        project_id: projectId,
        items: next.items as any,
        is_locked: next.isLocked,
        signed_off_at: next.signedOffAt || null,
        signed_off_by_name: next.signedOffBy || null,
      };
      if (rowId) {
        await supabase.from("punch_lists").update(payload).eq("id", rowId);
      } else {
        const { data: inserted } = await supabase
          .from("punch_lists")
          .insert(payload)
          .select()
          .single();
        if (inserted) setRowId(inserted.id);
      }
    },
    [projectId, rowId]
  );

  return { data, save, loading };
}

export default PunchList;