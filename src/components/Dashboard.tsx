import { useState, useMemo } from "react";
import { toast } from "sonner";
import { ProjectData } from "@/hooks/useProjects";
import { getProjectStats, getAggregatedStats } from "@/types/project";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, HardHat, LogOut, Search, X, WifiOff, MapPin, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ProjectCard from "@/components/ProjectCard";
import ProjectTemplates from "@/components/ProjectTemplates";
import BrandingSettings from "@/components/BrandingSettings";
import { useBranding } from "@/hooks/useBranding";
import { useOnlineStatus } from "@/hooks/useOfflineSync";
import { ProjectTemplate } from "@/hooks/useTemplates";
import ProgressBar from "@/components/ProgressBar";

interface DashboardProps {
  projects: ProjectData[];
  loading: boolean;
  onAdd: (name: string, parentId?: string) => Promise<string>;
  onDelete: (id: string) => Promise<void>;
  getSubProjects: (parentId: string) => ProjectData[];
  onUpdateProject?: (id: string, partial: Partial<ProjectData>) => Promise<void>;
}

const Dashboard = ({ projects, loading, onAdd, onDelete, getSubProjects, onUpdateProject }: DashboardProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { brand } = useBranding();
  const isOnline = useOnlineStatus();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"all" | "open" | "completed">("all");

  const filteredProjects = useMemo(() => {
    let list = projects;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q) ||
        p.tasks.some(t => t.title.toLowerCase().includes(q))
      );
    }
    return list;
  }, [projects, searchQuery]);

  const isProjectCompleted = (p: ProjectData) => {
    if (p.tasks.length === 0) return false;
    return p.tasks.every(t => t.completed);
  };

  const openProjects = useMemo(() => filteredProjects.filter(p => !isProjectCompleted(p)), [filteredProjects]);
  const completedProjects = useMemo(() => filteredProjects.filter(p => isProjectCompleted(p)), [filteredProjects]);

  const displayProjects = view === "open" ? openProjects : view === "completed" ? completedProjects : filteredProjects;

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

  const handleCreateFromTemplate = async (template: ProjectTemplate) => {
    setCreating(true);
    try {
      const id = await onAdd(template.name);
      if (onUpdateProject) {
        await onUpdateProject(id, {
          totalBudget: template.totalBudget,
          laborCosts: template.laborCosts,
          materialCosts: template.materialCosts,
          tasks: template.tasks.map((t) => ({
            ...t,
            id: crypto.randomUUID(),
            completed: false,
          })) as any,
        });
      }
      toast.success(`Created project from "${template.name}" template`);
      navigate(`/project/${id}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create from template");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-3">
          {brand.brandLogoUrl ? (
            <img src={brand.brandLogoUrl} alt="Logo" className="h-10 w-10 rounded-xl object-contain" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
              <HardHat className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="font-heading text-lg font-bold text-foreground">
              {brand.brandName || "Remodel Tracker"}
            </h1>
            <p className="text-xs text-muted-foreground">Manage your renovation projects</p>
          </div>
          <div className="flex items-center gap-1">
            {!isOnline && (
              <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-500/10 px-2 py-1 rounded-md font-medium">
                <WifiOff className="h-3 w-3" />
                Offline
              </span>
            )}
            <BrandingSettings />
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-5 pb-24">
        {/* Stats summary */}
        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setView("all")}
              className={`rounded-xl border p-3 text-center transition-all ${view === "all" ? "border-primary bg-primary/5" : "bg-card hover:border-primary/20"}`}
            >
              <p className="text-2xl font-heading font-bold text-foreground">{projects.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">All</p>
            </button>
            <button
              onClick={() => setView("open")}
              className={`rounded-xl border p-3 text-center transition-all ${view === "open" ? "border-primary bg-primary/5" : "bg-card hover:border-primary/20"}`}
            >
              <p className="text-2xl font-heading font-bold text-foreground">{openProjects.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" /> Open
              </p>
            </button>
            <button
              onClick={() => setView("completed")}
              className={`rounded-xl border p-3 text-center transition-all ${view === "completed" ? "border-primary bg-primary/5" : "bg-card hover:border-primary/20"}`}
            >
              <p className="text-2xl font-heading font-bold text-foreground">{completedProjects.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Done
              </p>
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects, tasks, addresses…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

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

        {/* Templates */}
        <ProjectTemplates onCreateFromTemplate={handleCreateFromTemplate} />

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center gap-2 text-muted-foreground text-sm">
              <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Loading projects…
            </div>
          </div>
        ) : displayProjects.length === 0 ? (
          searchQuery ? (
            <p className="text-sm text-muted-foreground text-center py-8">No projects match "{searchQuery}"</p>
          ) : view !== "all" ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No {view === "completed" ? "completed" : "open"} projects.
            </p>
          ) : (
            <div className="text-center py-20 space-y-3">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                <HardHat className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm">No projects yet. Create one above.</p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {displayProjects.map((project) => (
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
