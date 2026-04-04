import { useState, useMemo } from "react";
import { toast } from "sonner";
import { ProjectData } from "@/hooks/useProjects";
import { getProjectStats, getAggregatedStats } from "@/types/project";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, X, CheckCircle2, Clock, BarChart3, FolderPlus } from "lucide-react";
import ProjectCard from "@/components/ProjectCard";
import ProjectTemplates from "@/components/ProjectTemplates";
import { ProjectTemplate } from "@/hooks/useTemplates";
import AppLayout from "@/components/AppLayout";

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

  const statsCards = [
    { label: "All Projects", value: projects.length, icon: BarChart3, view: "all" as const, active: view === "all" },
    { label: "In Progress", value: openProjects.length, icon: Clock, view: "open" as const, active: view === "open" },
    { label: "Completed", value: completedProjects.length, icon: CheckCircle2, view: "completed" as const, active: view === "completed" },
  ];

  return (
    <AppLayout title="Dashboard" subtitle="Manage your renovation projects">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Stats row */}
        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {statsCards.map((stat) => (
              <button
                key={stat.view}
                onClick={() => setView(stat.view)}
                className={`stat-card premium-card ${
                  stat.active
                    ? "border-primary/30 bg-accent shadow-sm"
                    : "hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <stat.icon className={`h-4 w-4 ${stat.active ? "text-accent-foreground" : "text-muted-foreground"}`} />
                </div>
                <p className="text-3xl font-heading font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </button>
            ))}
          </div>
        )}

        {/* Search + Create */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects, tasks, addresses…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-card border shadow-sm"
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
              className="flex-1 sm:w-56 h-11 rounded-xl"
            />
            <Button onClick={handleAdd} className="shrink-0 h-11 px-5 rounded-xl shadow-sm" disabled={creating}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create
            </Button>
          </div>
        </div>

        {/* Templates */}
        <ProjectTemplates onCreateFromTemplate={handleCreateFromTemplate} />

        {/* Project grid */}
        {loading ? (
          <div className="text-center py-24">
            <div className="inline-flex items-center gap-3 text-muted-foreground text-sm">
              <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Loading projects…
            </div>
          </div>
        ) : displayProjects.length === 0 ? (
          searchQuery ? (
            <p className="text-sm text-muted-foreground text-center py-12">No projects match "{searchQuery}"</p>
          ) : view !== "all" ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No {view === "completed" ? "completed" : "open"} projects.
            </p>
          ) : (
            <div className="text-center py-24 space-y-4">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-accent flex items-center justify-center">
                <FolderPlus className="h-10 w-10 text-accent-foreground/40" />
              </div>
              <div>
                <p className="text-foreground font-medium">No projects yet</p>
                <p className="text-muted-foreground text-sm mt-1">Create your first renovation project above</p>
              </div>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
      </div>
    </AppLayout>
  );
};

export default Dashboard;
