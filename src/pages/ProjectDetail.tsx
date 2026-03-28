import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects.tsx";
import { getAggregatedStats } from "@/types/project";
import ProjectDetails from "@/components/ProjectDetails";
import BudgetSection from "@/components/BudgetSection";
import TaskList from "@/components/TaskList";
import PhotoGallery from "@/components/PhotoGallery";
import BlueprintSection from "@/components/BlueprintSection";
import ChangeOrdersSection from "@/components/ChangeOrdersSection";
import EstimatedFinishDate from "@/components/EstimatedFinishDate";
import GanttTimeline from "@/components/GanttTimeline";
import ProgressBar from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, HardHat, Plus, FolderOpen, ChevronRight } from "lucide-react";

const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, updateProject, addProject, getSubProjects } = useProjects();
  const project = getProject(id || "");
  const [newSubName, setNewSubName] = useState("");
  const [showSubForm, setShowSubForm] = useState(false);

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Project not found.</p>
          <button onClick={() => navigate("/")} className="text-primary text-sm underline">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const update = (partial: Partial<typeof project>) => updateProject(project.id, partial);
  const subProjects = getSubProjects(project.id);
  const parentProject = project.parentId ? getProject(project.parentId) : undefined;
  const hasSubs = subProjects.length > 0;

  const handleAddSub = () => {
    if (!newSubName.trim()) return;
    const subId = addProject(newSubName.trim(), project.id);
    setNewSubName("");
    setShowSubForm(false);
    navigate(`/project/${subId}`);
  };

  // Aggregated stats for display
  const aggregated = hasSubs ? getAggregatedStats(project, subProjects) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => {
              if (parentProject) navigate(`/project/${parentProject.id}`);
              else navigate("/");
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shrink-0">
            <HardHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            {parentProject && (
              <button
                onClick={() => navigate(`/project/${parentProject.id}`)}
                className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
              >
                {parentProject.name} <ChevronRight className="h-3 w-3" />
              </button>
            )}
            <h1 className="font-heading text-base font-bold text-foreground truncate">
              {project.name || "Untitled Project"}
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-5 space-y-4 pb-20">
        {/* Aggregated overview when sub-projects exist */}
        {hasSubs && aggregated && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h2 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              Aggregated Totals ({subProjects.length} sub-project{subProjects.length !== 1 ? "s" : ""})
            </h2>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget</p>
                <p className="text-xs font-heading font-bold text-foreground">${aggregated.totalBudget.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Spent</p>
                <p className="text-xs font-heading font-bold text-foreground">${aggregated.totalSpent.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Left</p>
                <p className={`text-xs font-heading font-bold ${aggregated.remaining < 0 ? "text-destructive" : "text-foreground"}`}>
                  ${aggregated.remaining.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tasks</p>
                <p className="text-xs font-heading font-bold text-foreground">
                  {aggregated.completedTasks}/{aggregated.totalTasks}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <ProgressBar label="Budget" value={aggregated.budgetPercent} variant="budget" />
              <ProgressBar label="Tasks" value={aggregated.taskPercent} variant="completion" />
            </div>
          </div>
        )}

        {/* Sub-projects list */}
        {(hasSubs || !project.parentId) && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                Sub-Projects
              </h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSubForm(!showSubForm)}
                className="h-7 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>

            {showSubForm && (
              <div className="flex gap-2">
                <Input
                  placeholder="Sub-project name…"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSub()}
                  className="flex-1 h-8 text-sm"
                  autoFocus
                />
                <Button onClick={handleAddSub} size="sm" className="h-8 text-xs">
                  Create
                </Button>
              </div>
            )}

            {subProjects.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No sub-projects yet. Break this project into smaller parts.
              </p>
            ) : (
              <div className="space-y-2">
                {subProjects.map((sub) => {
                  const stats = getAggregatedStats(sub, getSubProjects(sub.id));
                  return (
                    <button
                      key={sub.id}
                      onClick={() => navigate(`/project/${sub.id}`)}
                      className="w-full text-left rounded-lg border bg-background p-3 hover:border-primary/30 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-heading font-semibold text-foreground truncate">
                          {sub.name || "Untitled"}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                        <span>{sub.tasks.filter((t) => t.completed).length}/{sub.tasks.length} tasks</span>
                        <span>${(sub.laborCosts + sub.materialCosts).toLocaleString()} spent</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <ProjectDetails data={project} onChange={update} />
        <BudgetSection data={project} onChange={update} />
        <TaskList tasks={project.tasks} onChange={(tasks) => update({ tasks })} />
        <EstimatedFinishDate tasks={project.tasks} startDate={project.startDate} endDate={project.endDate} />
        <GanttTimeline tasks={project.tasks} startDate={project.startDate} />
        <PhotoGallery photos={project.photos} onChange={(photos) => update({ photos })} />
        <BlueprintSection blueprints={project.blueprints} onChange={(blueprints) => update({ blueprints })} />
        <ChangeOrdersSection orders={project.changeOrders} onChange={(changeOrders) => update({ changeOrders })} />
      </main>
    </div>
  );
};

export default ProjectDetailPage;
