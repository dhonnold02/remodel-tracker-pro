import { useState } from "react";
import { ProjectData, getProjectStats, createProject } from "@/types/project";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, HardHat, ChevronRight } from "lucide-react";
import ProgressBar from "@/components/ProgressBar";

interface DashboardProps {
  projects: ProjectData[];
  onAdd: (name: string) => string;
  onDelete: (id: string) => void;
}

const Dashboard = ({ projects, onAdd, onDelete }: DashboardProps) => {
  const navigate = useNavigate();
  const [newName, setNewName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const id = onAdd(newName.trim());
    setNewName("");
    navigate(`/project/${id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <HardHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-lg font-bold text-foreground">Remodel Tracker Pro</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-5 space-y-4 pb-20">
        {/* New project */}
        <div className="flex gap-2">
          <Input
            placeholder="New project name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1"
          />
          <Button onClick={handleAdd} className="shrink-0">
            <Plus className="h-4 w-4 mr-1.5" />
            Create
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <HardHat className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No projects yet. Create one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => {
              const stats = getProjectStats(project);
              return (
                <div
                  key={project.id}
                  className="rounded-xl border bg-card p-4 space-y-3 cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-semibold text-foreground truncate flex-1">
                      {project.name || "Untitled Project"}
                    </h3>
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

                  {/* Summary stats */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget</p>
                      <p className="text-xs font-heading font-bold text-foreground">${project.totalBudget.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Spent</p>
                      <p className="text-xs font-heading font-bold text-foreground">${stats.totalSpent.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Left</p>
                      <p className={`text-xs font-heading font-bold ${stats.remaining < 0 ? "text-destructive" : "text-foreground"}`}>
                        ${stats.remaining.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tasks</p>
                      <p className="text-xs font-heading font-bold text-foreground">
                        {stats.completedTasks}/{project.tasks.length}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ProgressBar label="Budget" value={stats.budgetPercent} variant="budget" />
                    <ProgressBar label="Tasks" value={stats.taskPercent} variant="completion" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
