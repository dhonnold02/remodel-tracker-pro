import { useState, useMemo } from "react";
import { toast } from "sonner";
import { ProjectData } from "@/hooks/useProjects";
import { getProjectStats, getAggregatedStats } from "@/types/project";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, HardHat, LogOut, Search, X, WifiOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ProjectCard from "@/components/ProjectCard";
import ProjectTemplates from "@/components/ProjectTemplates";
import BrandingSettings from "@/components/BrandingSettings";
import { useBranding } from "@/hooks/useBranding";
import { useOnlineStatus } from "@/hooks/useOfflineSync";
import { ProjectTemplate } from "@/hooks/useTemplates";

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

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter((p) => {
      if (p.name.toLowerCase().includes(q)) return true;
      if (p.tasks.some(t => t.title.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [projects, searchQuery]);

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
      // Apply template settings
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
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects and tasks…"
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
        ) : projects.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
              <HardHat className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm">No projects yet. Create one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProjects.length === 0 && searchQuery ? (
              <p className="text-sm text-muted-foreground text-center py-8">No projects match "{searchQuery}"</p>
            ) : (
              filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  getSubProjects={getSubProjects}
                  onDelete={onDelete}
                />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
