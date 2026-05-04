import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectData } from "@/hooks/useProjects";
import { getProjectStats, getAggregatedStats } from "@/types/project";
import { MapPin, CheckCircle2, MoreHorizontal, ExternalLink, Navigation, Trash2 } from "lucide-react";
import ProgressBar from "@/components/ProgressBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ProjectCardProps {
  project: ProjectData;
  getSubProjects: (parentId: string) => ProjectData[];
  onDelete: (id: string) => Promise<void>;
  isSubProject?: boolean;
  sortable?: boolean;
}

const ProjectCard = ({ project, getSubProjects, onDelete, isSubProject = false, sortable = false }: ProjectCardProps) => {
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
    disabled: !sortable,
  });

  const dragStyle = sortable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : "auto",
      }
    : undefined;

  const subs = getSubProjects(project.id);
  const hasSubs = subs.length > 0;

  const projectForStats = { ...project, tasks: project.tasks.map((t) => ({ ...t })) } as any;
  const subsForStats = subs.map((s) => ({ ...s, tasks: s.tasks.map((t) => ({ ...t })) })) as any[];
  const stats = hasSubs ? getAggregatedStats(projectForStats, subsForStats) : getProjectStats(projectForStats);
  const totalSpent = stats.totalSpent;
  const budgetPercent = stats.budgetPercent;
  const taskPercent = stats.taskPercent;
  const isCompleted = project.tasks.length > 0 && project.tasks.every(t => t.completed);
  const hasTasks = project.tasks.length > 0;
  const status: "Active" | "Planning" | "Completed" = isCompleted
    ? "Completed"
    : hasTasks
      ? "Active"
      : "Planning";
  const statusClass =
    status === "Completed"
      ? "bg-success/10 text-success"
      : status === "Active"
        ? "bg-primary/10 text-primary"
        : "bg-muted text-muted-foreground";

  const fmtMoney = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`;
    return `$${n.toLocaleString()}`;
  };
  const totalBudget = hasSubs ? (stats as any).totalBudget : project.totalBudget;

  const projectName = project.name || "Untitled Project";
  const canDelete = confirmText.trim() === projectName;

  const handleOpen = () => navigate(`/project/${project.id}`);
  const handleDirections = () => {
    if (!project.address) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(project.address)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const handleConfirmDelete = async () => {
    if (!canDelete) return;
    await onDelete(project.id);
    setDeleteOpen(false);
    setConfirmText("");
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...(sortable ? attributes : {})}
      className={`bg-card rounded-xl border border-border p-5 space-y-4 cursor-pointer group relative overflow-hidden transition-all duration-150 hover:shadow-md hover:border-border ${
        isCompleted ? "border-l-4 border-l-success" : ""
      }`}
      onClick={handleOpen}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-semibold text-foreground truncate">
              {projectName}
            </h3>
          </div>
          {project.address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {project.address.split("\n")[0]}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-full ${statusClass}`}>
            {status}
          </span>
          {hasSubs && (
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {subs.length} sub
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                aria-label="Project actions"
                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-xl shadow-lg w-48 p-1"
            >
              <DropdownMenuItem
                onSelect={handleOpen}
                className="text-sm text-foreground hover:bg-secondary focus:bg-secondary rounded-xl cursor-pointer gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open project
              </DropdownMenuItem>
              {project.address && (
                <DropdownMenuItem
                  onSelect={handleDirections}
                  className="text-sm text-foreground hover:bg-secondary focus:bg-secondary rounded-xl cursor-pointer gap-2"
                >
                  <Navigation className="h-4 w-4" />
                  Get directions
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setDeleteOpen(true);
                }}
                className="text-sm text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive rounded-xl cursor-pointer gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-heading font-semibold text-foreground text-sm">
          {fmtMoney(totalSpent)}
          <span className="text-muted-foreground font-normal text-xs"> / {fmtMoney(totalBudget)}</span>
        </span>
      </div>

      {/* Progress bars */}
      <div className="space-y-2.5">
        <ProgressBar label="Budget" value={budgetPercent} variant="budget" />
        <ProgressBar label="Tasks" value={taskPercent} variant="completion" />
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setConfirmText(""); }}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-semibold text-foreground">{projectName}</span> including all tasks, invoices, photos, blueprints, notes, and punch out items. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Type the project name to confirm
            </label>
            <Input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={projectName}
              className="rounded-xl"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={!canDelete}
              >
                Delete Project
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectCard;
