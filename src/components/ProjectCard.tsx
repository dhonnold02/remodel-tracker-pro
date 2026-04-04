import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectData } from "@/hooks/useProjects";
import { getProjectStats, getAggregatedStats } from "@/types/project";
import { Trash2, ChevronRight, FolderOpen, MapPin, CheckCircle2 } from "lucide-react";
import ProgressBar from "@/components/ProgressBar";

interface ProjectCardProps {
  project: ProjectData;
  getSubProjects: (parentId: string) => ProjectData[];
  onDelete: (id: string) => Promise<void>;
  isSubProject?: boolean;
}

const ProjectCard = ({ project, getSubProjects, onDelete, isSubProject = false }: ProjectCardProps) => {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const subs = getSubProjects(project.id);
  const hasSubs = subs.length > 0;

  const projectForStats = { ...project, tasks: project.tasks.map((t) => ({ ...t })) } as any;
  const subsForStats = subs.map((s) => ({ ...s, tasks: s.tasks.map((t) => ({ ...t })) })) as any[];
  const stats = hasSubs ? getAggregatedStats(projectForStats, subsForStats) : getProjectStats(projectForStats);
  const totalSpent = stats.totalSpent;
  const budgetPercent = stats.budgetPercent;
  const taskPercent = stats.taskPercent;
  const isCompleted = project.tasks.length > 0 && project.tasks.every(t => t.completed);

  return (
    <div
      className={`premium-card-hover p-5 space-y-4 cursor-pointer group ${
        isCompleted ? "border-l-4 border-l-success" : ""
      }`}
      onClick={() => navigate(`/project/${project.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-semibold text-foreground truncate">
              {project.name || "Untitled Project"}
            </h3>
            {isCompleted && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
          </div>
          {project.address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {project.address.split("\n")[0]}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasSubs && (
            <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {subs.length} sub
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirmDelete) {
                onDelete(project.id);
                setConfirmDelete(false);
              } else {
                setConfirmDelete(true);
                setTimeout(() => setConfirmDelete(false), 3000);
              }
            }}
            className={`p-1.5 rounded-lg transition-all duration-150 ${
              confirmDelete
                ? "text-destructive bg-destructive/10"
                : "text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-heading font-semibold text-foreground text-sm">
          ${totalSpent.toLocaleString()}
          <span className="text-muted-foreground font-normal text-xs"> / ${(hasSubs ? (stats as any).totalBudget : project.totalBudget).toLocaleString()}</span>
        </span>
      </div>

      {/* Progress bars */}
      <div className="space-y-2.5">
        <ProgressBar label="Budget" value={budgetPercent} variant="budget" />
        <ProgressBar label="Tasks" value={taskPercent} variant="completion" />
      </div>

      {/* Footer action hint */}
      <div className="flex items-center justify-end text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <span className="flex items-center gap-1">
          View details <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
};

export default ProjectCard;
