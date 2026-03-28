import { useState } from "react";
import { toast } from "sonner";
import { ProjectData } from "@/hooks/useProjects";
import { getProjectStats, getAggregatedStats } from "@/types/project";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, HardHat, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ProjectCard from "@/components/ProjectCard";

interface DashboardProps {
  projects: ProjectData[];
  loading: boolean;
  onAdd: (name: string, parentId?: string) => Promise<string>;
  onDelete: (id: string) => Promise<void>;
  getSubProjects: (parentId: string) => ProjectData[];
}

const Dashboard = ({ projects, loading, onAdd, onDelete, getSubProjects }: DashboardProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const id = await onAdd(newName.trim());
      setNewName("");
      navigate(`/project/${id}`);
    } catch (err: any) {
      console.error("Failed to create project:", err);
      toast.error(err?.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
            <HardHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="font-heading text-lg font-bold text-foreground">Remodel Tracker</h1>
            <p className="text-xs text-muted-foreground">Manage your renovation projects</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-5 pb-24">
        <div className="flex gap-2">
          <Input
            placeholder="New project name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1 h-11"
          />
          <Button onClick={handleAdd} className="shrink-0 h-11 px-5" disabled={creating}>
            <Plus className="h-4 w-4 mr-1.5" />
            Create
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center gap-2 text-muted-foreground text-sm">
              <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Loading projects…
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
              <HardHat className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm">No projects yet. Create one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                getSubProjects={getSubProjects}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
