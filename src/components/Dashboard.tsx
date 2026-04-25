import { useState, useMemo } from "react";
import { toast } from "sonner";
import { ProjectData } from "@/hooks/useProjects";
import { getProjectStats, getAggregatedStats } from "@/types/project";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, X, CheckCircle2, Clock, BarChart3, FolderPlus, MapPin } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import ProjectCard from "@/components/ProjectCard";
import ProjectTemplates from "@/components/ProjectTemplates";
import { ProjectTemplate } from "@/hooks/useTemplates";
import AppLayout from "@/components/AppLayout";
import { cn } from "@/lib/utils";

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
  const [newAddress, setNewAddress] = useState("");
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
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
      if (newAddress.trim() && onUpdateProject) {
        try {
          await onUpdateProject(id, { address: newAddress.trim() });
        } catch {
          /* non-blocking */
        }
      }
      setNewName("");
      setNewAddress("");
      setCreateOpen(false);
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

  const newProjectButton = (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogTrigger asChild>
        <Button className="h-10 px-4 rounded-xl shadow-sm gap-1.5">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new project</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Project name</label>
            <Input
              autoFocus
              placeholder="e.g. Kitchen Remodel"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="rounded-xl h-11"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Address (optional)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="123 Main St, City"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="rounded-xl h-11 pl-9"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} className="rounded-xl" disabled={creating || !newName.trim()}>
            {creating ? "Creating…" : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <AppLayout
      title="Dashboard"
      subtitle="Manage your renovation projects"
      actions={newProjectButton}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Search */}
        <div className="relative max-w-2xl mx-auto w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects, tasks, addresses…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 rounded-xl bg-card border shadow-sm text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Stats row — secondary, lighter visual weight */}
        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {statsCards.map((stat) => (
              <button
                key={stat.view}
                onClick={() => setView(stat.view)}
                className={cn(
                  "group rounded-xl border px-4 py-3 text-left transition-all duration-200",
                  stat.active
                    ? "border-primary/40 bg-primary/10 shadow-sm"
                    : "border-border/60 bg-card/60 hover:bg-card hover:border-border hover:shadow-sm"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={cn(
                    "h-3.5 w-3.5",
                    stat.active ? "text-primary" : "text-muted-foreground"
                  )} />
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                </div>
                <p className="text-4xl font-heading font-bold text-foreground leading-none mt-2">{stat.value}</p>
              </button>
            ))}
          </div>
        )}

        {/* Templates — tertiary, muted */}
        <div id="templates" className="scroll-mt-20">
          <ProjectTemplates onCreateFromTemplate={handleCreateFromTemplate} />
        </div>

        {/* Projects — primary focus */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-heading text-xl font-bold text-foreground">Projects</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {displayProjects.length} {displayProjects.length === 1 ? "project" : "projects"}
                {view !== "all" && ` · ${view === "open" ? "in progress" : "completed"}`}
              </p>
            </div>
            {!loading && projects.length > 0 && (
              <div className="inline-flex items-center gap-1 rounded-xl border bg-card p-1 shadow-sm">
                {([
                  { key: "all", label: "All" },
                  { key: "open", label: "Active" },
                  { key: "completed", label: "Completed" },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setView(tab.key)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150",
                      view === tab.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

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
              <div className="text-center py-24 space-y-4 rounded-2xl border border-dashed bg-card/40">
                <div className="mx-auto w-20 h-20 rounded-2xl bg-accent flex items-center justify-center">
                  <FolderPlus className="h-10 w-10 text-accent-foreground/40" />
                </div>
                <div>
                  <p className="text-foreground font-medium">No projects yet</p>
                  <p className="text-muted-foreground text-sm mt-1">Create your first renovation project to get started</p>
                </div>
                <Button onClick={() => setCreateOpen(true)} className="rounded-xl mt-2">
                  <Plus className="h-4 w-4 mr-1.5" />
                  New Project
                </Button>
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
        </section>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
