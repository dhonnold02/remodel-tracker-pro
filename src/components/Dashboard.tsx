import { useState } from "react";
import { toast } from "sonner";
import { ProjectData } from "@/hooks/useProjects";
import { getProjectStats, getAggregatedStats } from "@/types/project";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, HardHat, ChevronRight, ChevronDown, FolderOpen, LogOut } from "lucide-react";
import ProgressBar from "@/components/ProgressBar";
import { useAuth } from "@/hooks/useAuth";

interface DashboardProps {
  projects: ProjectData[];
  loading: boolean;
  onAdd: (name: string, parentId?: string) => Promise<string>;
  onDelete: (id: string) => Promise<void>;
  getSubProjects: (parentId: string) => ProjectData[];
}

const Dashboard = ({ projects, loading, onAdd, onDelete, getSubProjects }: DashboardProps) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [newName, setNewName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const id = await onAdd(newName.trim());
      setNewName("");
      navigate(`/project/${id}`);
    } finally {
      setCreating(false);
    }
  };

  const toggleExpanded = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderProjectCard = (project: ProjectData, isSubProject = false) => {
    const subs = getSubProjects(project.id);
    const hasSubs = subs.length > 0;
    const isExpanded = expanded[project.id];

    const projectForStats = {
      ...project,
      tasks: project.tasks.map((t) => ({ ...t })),
    } as any;

    const subsForStats = subs.map((s) => ({
      ...s,
      tasks: s.tasks.map((t) => ({ ...t })),
    })) as any[];

    const rawStats = hasSubs ? getAggregatedStats(projectForStats, subsForStats) : getProjectStats(projectForStats);
    const displayBudget = hasSubs ? (rawStats as any).totalBudget : project.totalBudget;
    const displayTotalTasks = hasSubs ? (rawStats as any).totalTasks : project.tasks.length;

    return (
      <div key={project.id} className={isSubProject ? "ml-4 border-l-2 border-primary/20 pl-3" : ""}>
        <div
          className={`rounded-xl border bg-card p-4 space-y-3 cursor-pointer hover:border-primary/30 transition-colors ${
            isSubProject ? "bg-card/60" : ""
          }`}
          onClick={() => navigate(`/project/${project.id}`)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {hasSubs && (
                <button
                  onClick={(e) => toggleExpanded(project.id, e)}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              )}
              {isSubProject && <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              <h3 className="font-heading font-semibold text-foreground truncate">
                {project.name || "Untitled Project"}
              </h3>
              {hasSubs && (
                <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full shrink-0">
                  {subs.length} sub
                </span>
              )}
              {project.members.length > 1 && (
                <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full shrink-0">
                  {project.members.length} members
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirmDelete === project.id) {
                    onDelete(project.id);
                    setConfirmDelete(null);
                  } else {
                    setConfirmDelete(project.id);
                    setTimeout(() => setConfirmDelete(null), 3000);
                  }
                }}
                className={`p-1.5 rounded transition-colors ${
                  confirmDelete === project.id
                    ? "text-destructive bg-destructive/10"
                    : "text-muted-foreground hover:text-destructive"
                }`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget</p>
              <p className="text-xs font-heading font-bold text-foreground">${displayBudget.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Spent</p>
              <p className="text-xs font-heading font-bold text-foreground">${rawStats.totalSpent.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Left</p>
              <p className={`text-xs font-heading font-bold ${rawStats.remaining < 0 ? "text-destructive" : "text-foreground"}`}>
                ${rawStats.remaining.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tasks</p>
              <p className="text-xs font-heading font-bold text-foreground">
                {rawStats.completedTasks}/{displayTotalTasks}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <ProgressBar label="Budget" value={rawStats.budgetPercent} variant="budget" />
            <ProgressBar label="Tasks" value={rawStats.taskPercent} variant="completion" />
          </div>
        </div>

        {hasSubs && isExpanded && (
          <div className="mt-2 space-y-2">
            {subs.map((sub) => renderProjectCard(sub, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <HardHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-lg font-bold text-foreground flex-1">Remodel Tracker Pro</h1>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-5 space-y-4 pb-20">
        <div className="flex gap-2">
          <Input
            placeholder="New project name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1"
          />
          <Button onClick={handleAdd} className="shrink-0" disabled={creating}>
            <Plus className="h-4 w-4 mr-1.5" />
            Create
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">Loading projects…</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <HardHat className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No projects yet. Create one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => renderProjectCard(project))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
