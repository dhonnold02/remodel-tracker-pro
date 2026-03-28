import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectData } from "@/hooks/useProjects";
import { getProjectStats, getAggregatedStats } from "@/types/project";
import { Trash2, ChevronRight, ChevronDown, FolderOpen, MapPin, CheckCircle2 } from "lucide-react";
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
  const [expanded, setExpanded] = useState(false);

  const subs = getSubProjects(project.id);
  const hasSubs = subs.length > 0;

  const projectForStats = { ...project, tasks: project.tasks.map((t) => ({ ...t })) } as any;
  const subsForStats = subs.map((s) => ({ ...s, tasks: s.tasks.map((t) => ({ ...t })) })) as any[];
  const stats = hasSubs ? getAggregatedStats(projectForStats, subsForStats) : getProjectStats(projectForStats);
  const totalSpent = stats.totalSpent;
  const remaining = stats.remaining;
  const budgetPercent = stats.budgetPercent;
  const taskPercent = stats.taskPercent;
  const isCompleted = project.tasks.length > 0 && project.tasks.every(t => t.completed);

  return (
    <div className={isSubProject ? "ml-4 border-l-2 border-primary/15 pl-3" : ""}>
      <div
        className={`group rounded-xl border bg-card p-4 space-y-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20 ${
          isSubProject ? "bg-card/80" : ""
        } ${isCompleted ? "border-l-4 border-l-green-500" : ""}`}
        onClick={() => navigate(`/project/${project.id}`)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {hasSubs && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            )}
            {isSubProject && <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            <h3 className="font-heading font-semibold text-foreground truncate flex items-center gap-1.5">
              {project.name || "Untitled Project"}
              {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
            </h3>
            {hasSubs && (
              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full shrink-0">
                {subs.length} sub
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
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
              className={`p-1.5 rounded-lg transition-colors ${
                confirmDelete
                  ? "text-destructive bg-destructive/10"
                  : "text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
              }`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {project.address && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate -mt-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {project.address.split("\n")[0]}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-secondary/60 p-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Spent / Budget</p>
            <p className="text-sm font-heading font-bold text-foreground">
              ${totalSpent.toLocaleString()}
              <span className="text-muted-foreground font-normal text-xs"> / ${(hasSubs ? (stats as any).totalBudget : project.totalBudget).toLocaleString()}</span>
            </p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Remaining</p>
            <p className={`text-sm font-heading font-bold ${remaining < 0 ? "text-destructive" : "text-foreground"}`}>
              ${remaining.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <ProgressBar label="Budget" value={budgetPercent} variant="budget" />
          <ProgressBar label="Tasks" value={taskPercent} variant="completion" />
        </div>
      </div>

      {hasSubs && expanded && (
        <div className="mt-2 space-y-2">
          {subs.map((sub) => (
            <ProjectCard key={sub.id} project={sub} getSubProjects={getSubProjects} onDelete={onDelete} isSubProject />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectCard;
