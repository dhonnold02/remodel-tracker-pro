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
import { useBranding } from "@/hooks/useBranding";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  projectName?: string;
  projectAddress?: string;
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
  projectName,
  projectAddress,
}: PunchListProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { brand } = useBranding();
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
  const passPercent = total > 0 ? Math.round((passed / total) * 100) : 0;
  const allResolved =
    items.length > 0 &&
    items.every((i) => i.status === "pass" || i.status === "fail");
  const progressPercent = total > 0 ? (passed / total) * 100 : 0;
  const progressColor =
    progressPercent >= 100
      ? "bg-success"
      : progressPercent >= 50
      ? "bg-warning"
      : progressPercent > 0
      ? "bg-primary"
      : "bg-primary/30";

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

  const exportSignOffPdf = () => {
    const companyName = brand.brandName?.trim() || "Remodel Tracker Pro";
    const projName = projectName?.trim() || "Project";
    const projAddr = projectAddress?.trim() || "";
    const now = new Date();
    const dateLong = now.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const fileDate = now
      .toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
      .replace(/[\s,]+/g, "");
    const safeProj = projName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "Project";
    const fileName = `${safeProj}-PunchList-${fileDate}.pdf`;

    // A4 in mm: 210 x 297
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Colors
    const HEADER_BG: [number, number, number] = [15, 17, 23];
    const HEADER_SUB: [number, number, number] = [150, 150, 150];
    const ACCENT: [number, number, number] = [59, 130, 246];
    const SUCCESS: [number, number, number] = [34, 197, 94];
    const DANGER: [number, number, number] = [239, 68, 68];
    const TEXT_DARK: [number, number, number] = [40, 40, 40];
    const TEXT_BLACK: [number, number, number] = [0, 0, 0];
    const TEXT_60: [number, number, number] = [60, 60, 60];
    const TEXT_100: [number, number, number] = [100, 100, 100];
    const TEXT_120: [number, number, number] = [120, 120, 120];
    const DIVIDER: [number, number, number] = [220, 220, 220];
    const TABLE_HEAD_BG: [number, number, number] = [245, 245, 245];
    const TABLE_ALT_BG: [number, number, number] = [250, 250, 250];

    // Header band — full width, dark, height 28
    doc.setFillColor(...HEADER_BG);
    doc.rect(0, 0, pageWidth, 28, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(companyName, 15, 18);

    doc.setFontSize(9);
    doc.setTextColor(...HEADER_SUB);
    doc.text("Punch Out Report", 195, 18, { align: "right" });

    // Project title (y=44)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...TEXT_BLACK);
    doc.text(projName, 15, 44);

    // Address — gray RGB(120,120,120) at 9pt (y=52)
    if (projAddr) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...TEXT_120);
      const addr = projAddr.replace(/\n+/g, " · ");
      doc.text(addr, 15, 52);
    }

    // Completion badge — pill 45x8 at x=15, y=60
    {
      const bx = 15;
      const by = 60;
      const bw = 45;
      const bh = 8;
      doc.setFillColor(...SUCCESS);
      doc.roundedRect(bx, by, bw, bh, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.text("PROJECT COMPLETE", bx + bw / 2, by + bh / 2 + 1.1, {
        align: "center",
        baseline: "alphabetic",
      });
    }

    // Sign-off line (y=76)
    const signedBy = data.signedOffBy || "—";
    const signedDate = data.signedOffAt ? formatDate(data.signedOffAt) : dateLong;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_60);
    doc.text(`Signed off by: ${signedBy}  \u00B7  Date: ${signedDate}`, 15, 76);

    // First divider (y=83)
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.2);
    doc.line(15, 83, 195, 83);

    // Stats row — numbers y=95, labels y=101
    const stats: Array<{
      x: number;
      label: string;
      value: string;
      color: [number, number, number];
    }> = [
      { x: 15, label: "TOTAL ITEMS", value: String(total), color: TEXT_BLACK },
      { x: 80, label: "PASSED", value: String(passed), color: SUCCESS },
      { x: 145, label: "FAILED", value: String(failed), color: DANGER },
    ];
    stats.forEach((s) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...s.color);
      doc.text(s.value, s.x, 95);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...TEXT_120);
      doc.text(s.label, s.x, 101);
    });

    // Second divider (y=110)
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.2);
    doc.line(15, 110, 195, 110);

    // Section header (y=118)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...ACCENT);
    doc.text("PUNCH LIST ITEMS", 15, 118);

    // Table
    const rows = items.map((it) => [
      it.title,
      it.status === "pass" ? "PASS" : it.status === "fail" ? "FAIL" : "PENDING",
      it.assignee || "—",
      [it.notes, it.failReason ? `Failed: ${it.failReason}` : ""]
        .filter(Boolean)
        .join("\n") || "—",
    ]);

    autoTable(doc, {
      startY: 125,
      head: [["Item", "Status", "Assignee", "Notes"]],
      body: rows,
      margin: { left: 15, right: 15, bottom: 25 },
      styles: {
        font: "helvetica",
        fontSize: 8,
        textColor: TEXT_DARK,
        cellPadding: 2.2,
        lineColor: DIVIDER,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: TABLE_HEAD_BG,
        textColor: TEXT_60,
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: TABLE_ALT_BG,
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 30, halign: "center" },
        2: { cellWidth: 40 },
        3: { cellWidth: 45 },
      },
      didParseCell: (hookData) => {
        if (hookData.section === "body" && hookData.column.index === 1) {
          const v = String(hookData.cell.raw);
          if (v === "PASS") {
            hookData.cell.styles.textColor = SUCCESS;
            hookData.cell.styles.fontStyle = "bold";
          } else if (v === "FAIL") {
            hookData.cell.styles.textColor = DANGER;
            hookData.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    // Footer on every page
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...HEADER_SUB);
      const footer = `${companyName}  \u00B7  Remodel Tracker Pro  \u00B7  ${dateLong}`;
      doc.text(footer, pageWidth / 2, 285, { align: "center" });
      doc.text(`Page ${p} of ${pageCount}`, 195, 285, { align: "right" });
    }

    doc.save(fileName);

    toast({
      title: "PDF downloaded",
      description: "Ready to share with your homeowner",
    });
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
              onClick={exportSignOffPdf}
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
            style={{ width: `${Math.max(0, progressPercent)}%` }}
          />
        </div>
        {isEditor && (() => {
          const hasPending = items.some(
            (item) => item.status === "pending" || item.status === "fail"
          );
          const hasItems = items.length > 0;
          const isLocked = locked;

          if (!isLocked && hasItems && !hasPending) {
            return (
              <button
                onClick={() => setSignOffOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-success text-success-foreground hover:bg-success/90 transition-colors rounded-xl py-3 text-sm font-medium"
              >
                <Lock className="h-4 w-4" />
                Mark Complete & Sign Off
              </button>
            );
          }

          if (!isLocked && hasItems && hasPending) {
            return (
              <p className="text-xs text-muted-foreground text-center py-2">
                Resolve all pending items to sign off
              </p>
            );
          }

          return null;
        })()}
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
            Add items from your final inspection to track pass/fail before project punch out.
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

                {/* Notes input — auto-expanded for failed items, with red border */}
                {(isExpanded || it.notes || it.status === "fail") && (
                  <Textarea
                    placeholder={
                      it.status === "fail"
                        ? "Describe what needs to be fixed..."
                        : "Add notes..."
                    }
                    value={it.notes || ""}
                    onChange={(e) => setNotes(it.id, e.target.value)}
                    disabled={!canEdit}
                    className={cn(
                      "min-h-[60px] text-xs rounded-xl resize-none",
                      it.status === "fail" && "border-destructive/50 focus-visible:ring-destructive/30"
                    )}
                  />
                )}

                {/* Photo thumbnails — clickable, opens lightbox */}
                {it.photos && it.photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {it.photos.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setLightboxSrc(p)}
                        className="group relative w-20 h-20 rounded-lg overflow-hidden border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label={`Open photo ${idx + 1}`}
                      >
                        <img
                          src={p}
                          alt={`Punch item photo ${idx + 1}`}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="h-5 w-5 text-white" />
                        </div>
                      </button>
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

      {/* Photo lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxSrc(null);
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxSrc}
            alt="Punch list photo"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
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