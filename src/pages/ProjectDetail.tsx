import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import { getAggregatedStats } from "@/types/project";
import ProjectDetails from "@/components/ProjectDetails";
import BudgetSection from "@/components/BudgetSection";
import TaskList from "@/components/TaskList";
import PhotoGallery from "@/components/PhotoGallery";
import BlueprintSection from "@/components/BlueprintSection";
import ChangeOrdersSection from "@/components/ChangeOrdersSection";
import EstimatedFinishDate from "@/components/EstimatedFinishDate";
import GanttTimeline from "@/components/GanttTimeline";
import TeamMembers from "@/components/TeamMembers";
import ActivityLog from "@/components/ActivityLog";
import ProgressBar from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, HardHat, Plus, FolderOpen, ChevronRight, ChevronDown, Users, Activity, Download, FileText } from "lucide-react";
import { exportProjectCSV, exportProjectPDF } from "@/lib/exportProject";

const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, updateProject, addProject, getSubProjects, userRole, loading } = useProjects();
  const project = getProject(id || "");
  const [newSubName, setNewSubName] = useState("");
  const [showSubForm, setShowSubForm] = useState(false);
  const [creatingSubProject, setCreatingSubProject] = useState(false);
  const [subProjectsOpen, setSubProjectsOpen] = useState(true);
  const [teamOpen, setTeamOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="inline-flex items-center gap-2 text-muted-foreground text-sm">
          <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

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

  const role = userRole(project.id);
  const isEditor = role === "editor";
  const update = (partial: Partial<typeof project>) => updateProject(project.id, partial);
  const subProjects = getSubProjects(project.id);
  const parentProject = project.parentId ? getProject(project.parentId) : undefined;
  const hasSubs = subProjects.length > 0;

  const handleAddSub = async () => {
    if (!newSubName.trim() || creatingSubProject) return;
    setCreatingSubProject(true);
    try {
      const subId = await addProject(newSubName.trim(), project.id);
      setNewSubName("");
      setShowSubForm(false);
      navigate(`/project/${subId}`);
    } finally {
      setCreatingSubProject(false);
    }
  };

  const projectForStats = { ...project, tasks: project.tasks } as any;
  const subsForStats = subProjects.map((s) => ({ ...s })) as any[];
  const aggregated = hasSubs ? getAggregatedStats(projectForStats, subsForStats) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => parentProject ? navigate(`/project/${parentProject.id}`) : navigate("/")}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm shrink-0">
            <HardHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
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
          {!isEditor && (
            <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              View only
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => exportProjectCSV(project, subProjects)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors"
              title="Export CSV"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={() => exportProjectPDF(project, subProjects)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors"
              title="Print Report"
            >
              <FileText className="h-4 w-4" />
            </button>
          </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5 space-y-4 pb-20">
        {/* Aggregated overview */}
        {hasSubs && aggregated && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h2 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              Aggregated ({subProjects.length} sub-project{subProjects.length !== 1 ? "s" : ""})
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-secondary/60 p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Spent / Budget</p>
                <p className="text-sm font-heading font-bold text-foreground">
                  ${aggregated.totalSpent.toLocaleString()}
                  <span className="text-muted-foreground font-normal text-xs"> / ${aggregated.totalBudget.toLocaleString()}</span>
                </p>
              </div>
              <div className="rounded-lg bg-secondary/60 p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Tasks</p>
                <p className="text-sm font-heading font-bold text-foreground">
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

        {/* Sub-projects — collapsible */}
        {(hasSubs || !project.parentId) && (
          <Collapsible open={subProjectsOpen} onOpenChange={setSubProjectsOpen}>
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger className="flex items-center gap-2 font-heading text-sm font-semibold text-foreground hover:text-primary transition-colors">
                  {subProjectsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <FolderOpen className="h-4 w-4 text-primary" />
                  Sub-Projects
                  {hasSubs && <span className="text-[10px] text-muted-foreground font-normal">({subProjects.length})</span>}
                </CollapsibleTrigger>
                {isEditor && (
                  <Button size="sm" variant="ghost" onClick={() => setShowSubForm(!showSubForm)} className="h-7 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                )}
              </div>

              {showSubForm && (
                <div className="flex gap-2">
                  <Input placeholder="Sub-project name…" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddSub()} className="flex-1 h-8 text-sm" autoFocus />
                  <Button onClick={handleAddSub} size="sm" className="h-8 text-xs" disabled={creatingSubProject}>Create</Button>
                </div>
              )}

              <CollapsibleContent className="space-y-2">
                {subProjects.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No sub-projects yet.</p>
                ) : (
                  subProjects.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => navigate(`/project/${sub.id}`)}
                      className="w-full text-left rounded-lg border bg-background p-3 hover:border-primary/20 hover:shadow-sm transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-heading font-semibold text-foreground truncate">{sub.name || "Untitled"}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                        <span>{sub.tasks.filter((t) => t.completed).length}/{sub.tasks.length} tasks</span>
                        <span>${(sub.laborCosts + sub.materialCosts).toLocaleString()} spent</span>
                      </div>
                    </button>
                  ))
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {/* Core sections */}
        <ProjectDetails data={project as any} onChange={isEditor ? update : () => {}} />
        <BudgetSection data={project as any} onChange={isEditor ? update : () => {}} />
        <TaskList tasks={project.tasks} onChange={isEditor ? (tasks) => update({ tasks }) : () => {}} />
        <EstimatedFinishDate tasks={project.tasks} startDate={project.startDate} endDate={project.endDate} />
        <GanttTimeline tasks={project.tasks} startDate={project.startDate} />
        <PhotoGallery photos={project.photos} onChange={isEditor ? (photos) => update({ photos }) : () => {}} />
        <BlueprintSection blueprints={project.blueprints} onChange={isEditor ? (blueprints) => update({ blueprints }) : () => {}} />
        <ChangeOrdersSection orders={project.changeOrders} onChange={isEditor ? (changeOrders) => update({ changeOrders }) : () => {}} />

        {/* Team Members — collapsible */}
        <Collapsible open={teamOpen} onOpenChange={setTeamOpen}>
          <div className="rounded-xl border bg-card p-4">
            <CollapsibleTrigger className="flex items-center gap-2 w-full font-heading text-sm font-semibold text-foreground hover:text-primary transition-colors">
              {teamOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Users className="h-4 w-4 text-primary" />
              Team Members
              <span className="text-[10px] text-muted-foreground font-normal">({project.members.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <TeamMembers projectId={project.id} members={project.members} isEditor={isEditor} />
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Activity Log — collapsible */}
        <Collapsible open={activityOpen} onOpenChange={setActivityOpen}>
          <div className="rounded-xl border bg-card p-4">
            <CollapsibleTrigger className="flex items-center gap-2 w-full font-heading text-sm font-semibold text-foreground hover:text-primary transition-colors">
              {activityOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Activity className="h-4 w-4 text-primary" />
              Activity Log
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <ActivityLog projectId={project.id} />
            </CollapsibleContent>
          </div>
        </Collapsible>
      </main>
    </div>
  );
};

export default ProjectDetailPage;
