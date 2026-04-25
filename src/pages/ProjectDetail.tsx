import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import { getAggregatedStats } from "@/types/project";
import AppLayout from "@/components/AppLayout";
import ProjectDetails from "@/components/ProjectDetails";
import BudgetSection from "@/components/BudgetSection";
import InvoicesSection from "@/components/InvoicesSection";
import TaskList from "@/components/TaskList";
import PhotoGallery from "@/components/PhotoGallery";
import BlueprintSection from "@/components/BlueprintSection";
import ChangeOrdersSection from "@/components/ChangeOrdersSection";
import EstimatedFinishDate from "@/components/EstimatedFinishDate";
import GanttTimeline from "@/components/GanttTimeline";
import CalendarView from "@/components/CalendarView";
import TeamMembers from "@/components/TeamMembers";
import ActivityLog from "@/components/ActivityLog";
import ProjectTemplates from "@/components/ProjectTemplates";
import ProgressBar from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus, FolderOpen, ChevronRight, ChevronDown, Users, Activity,
  Download, FileText, MapPin, Receipt, ClipboardList, ImageIcon, CalendarRange, Trash2,
} from "lucide-react";
import { Wallet, ListChecks, CalendarDays, FileImage, DollarSign, Target } from "lucide-react";
import { exportProjectCSV, exportProjectPDF } from "@/lib/exportProject";

const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, updateProject, addProject, deleteProject, getSubProjects, userRole, loading } = useProjects();
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
        <div className="inline-flex items-center gap-3 text-muted-foreground text-sm">
          <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
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
          <button onClick={() => navigate("/")} className="text-primary text-sm hover:underline">
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

  const totalSpent = project.laborCosts + project.materialCosts;
  const budgetPercent = project.totalBudget > 0 ? (totalSpent / project.totalBudget) * 100 : 0;
  const completedTasks = project.tasks.filter(t => t.completed).length;
  const taskPercent = project.tasks.length > 0 ? (completedTasks / project.tasks.length) * 100 : 0;
  const remainingBudget = project.totalBudget - totalSpent;
  const invoicesOutstanding = project.invoices
    .filter((i: any) => i.status !== "paid")
    .reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);

  const headerActions = (
    <div className="flex items-center gap-1">
      {!isEditor && (
        <span className="text-[10px] text-muted-foreground bg-secondary px-2.5 py-1 rounded-full font-medium">
          View only
        </span>
      )}
      <button
        onClick={() => exportProjectCSV(project, subProjects)}
        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        title="Export CSV"
      >
        <Download className="h-4 w-4" />
      </button>
      <button
        onClick={() => exportProjectPDF(project, subProjects)}
        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        title="Print Report"
      >
        <FileText className="h-4 w-4" />
      </button>
    </div>
  );

  const backTo = parentProject ? `/project/${parentProject.id}` : "/";

  return (
    <AppLayout
      title={project.name || "Untitled Project"}
      subtitle={project.address ? project.address.split("\n")[0] : undefined}
      backTo={backTo}
      actions={headerActions}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Command Center Header */}
        <section className="space-y-6">
          <div className="space-y-3">
            {parentProject && (
              <button
                onClick={() => navigate(`/project/${parentProject.id}`)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                {parentProject.name} <ChevronRight className="h-3 w-3" />
              </button>
            )}
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
              {project.name || "Untitled Project"}
            </h1>
            {project.address && (
              <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{project.address}</span>
              </p>
            )}
          </div>

          {/* Key stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border bg-card px-5 py-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Budget Used</p>
              <p className="text-2xl font-heading font-bold text-foreground mt-1">
                {Math.round(budgetPercent)}<span className="text-base text-muted-foreground font-medium">%</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">${totalSpent.toLocaleString()} of ${project.totalBudget.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border bg-card px-5 py-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Tasks Done</p>
              <p className="text-2xl font-heading font-bold text-foreground mt-1">
                {Math.round(taskPercent)}<span className="text-base text-muted-foreground font-medium">%</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{completedTasks} of {project.tasks.length} completed</p>
            </div>
            <div className="rounded-xl border bg-card px-5 py-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Remaining</p>
              <p className={`text-2xl font-heading font-bold mt-1 ${remainingBudget < 0 ? "text-destructive" : "text-foreground"}`}>
                ${Math.abs(remainingBudget).toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{remainingBudget < 0 ? "Over budget" : "Available"}</p>
            </div>
            <div className="rounded-xl border bg-card px-5 py-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Outstanding</p>
              <p className={`text-2xl font-heading font-bold mt-1 ${invoicesOutstanding > 0 ? "text-foreground" : "text-foreground"}`}>
                ${invoicesOutstanding.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{project.invoices.length} invoice{project.invoices.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </section>

        {/* Aggregated overview for sub-projects */}
        {hasSubs && aggregated && (
          <div className="premium-card p-6 space-y-4">
            <h3 className="section-title flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              Aggregated ({subProjects.length} sub-project{subProjects.length !== 1 ? "s" : ""})
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card bg-secondary rounded-xl">
                <p className="text-xs text-muted-foreground">Spent / Budget</p>
                <p className="text-sm font-heading font-bold text-foreground">
                  ${aggregated.totalSpent.toLocaleString()}
                  <span className="text-muted-foreground font-normal text-xs"> / ${aggregated.totalBudget.toLocaleString()}</span>
                </p>
              </div>
              <div className="stat-card bg-secondary rounded-xl">
                <p className="text-xs text-muted-foreground">Tasks</p>
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

        {/* Sub-projects */}
        {(hasSubs || !project.parentId) && (
          <Collapsible open={subProjectsOpen} onOpenChange={setSubProjectsOpen}>
            <div className="premium-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger className="flex items-center gap-2 section-title hover:text-primary transition-colors">
                  {subProjectsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <FolderOpen className="h-4 w-4 text-primary" />
                  Sub-Projects
                  {hasSubs && <span className="text-xs text-muted-foreground font-normal">({subProjects.length})</span>}
                </CollapsibleTrigger>
                {isEditor && (
                  <Button size="sm" variant="ghost" onClick={() => setShowSubForm(!showSubForm)} className="h-8 text-xs rounded-xl">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                )}
              </div>

              {showSubForm && (
                <div className="flex gap-2">
                  <Input placeholder="Sub-project name…" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddSub()} className="flex-1 h-9 text-sm rounded-xl" autoFocus />
                  <Button onClick={handleAddSub} size="sm" className="h-9 text-xs rounded-xl" disabled={creatingSubProject}>Create</Button>
                </div>
              )}

              <CollapsibleContent className="space-y-2">
                {subProjects.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3">No sub-projects yet.</p>
                ) : (
                  subProjects.map((sub) => (
                    <div
                      key={sub.id}
                      className="group w-full rounded-xl border bg-background p-4 hover:border-primary/20 hover:shadow-sm transition-all duration-150"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => navigate(`/project/${sub.id}`)}
                          className="flex-1 min-w-0 text-left space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-heading font-semibold text-foreground truncate">
                              {sub.name || "Untitled"}
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{sub.tasks.filter((t) => t.completed).length}/{sub.tasks.length} tasks</span>
                            <span>${(sub.laborCosts + sub.materialCosts).toLocaleString()} spent</span>
                          </div>
                        </button>
                        {isEditor && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Delete sub-project"
                                aria-label={`Delete sub-project ${sub.name || "Untitled"}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete sub-project?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete <span className="font-semibold text-foreground">{sub.name || "Untitled"}</span> and all of its tasks, invoices, photos, blueprints, and notes. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteProject(sub.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {/* Command Center: Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* PRIMARY column — Work + Planning + Documentation */}
          <div className="lg:col-span-2 space-y-8">
            {/* WORK MODULE */}
            <section className="space-y-3">
              <header className="flex items-center gap-2 px-1">
                <ListChecks className="h-4 w-4 text-primary" />
                <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">Work</h2>
              </header>
              <TaskList tasks={project.tasks} onChange={isEditor ? (tasks) => update({ tasks }) : () => {}} />
            </section>

            {/* FINANCIALS MODULE */}
            <section className="space-y-3">
              <header className="flex items-center gap-2 px-1">
                <Wallet className="h-4 w-4 text-primary" />
                <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">Financials</h2>
              </header>
              <div className="space-y-6">
                <BudgetSection data={project as any} onChange={isEditor ? update : () => {}} />
                <InvoicesSection
                  invoices={project.invoices}
                  onChange={isEditor ? (invoices) => update({ invoices }) : () => {}}
                  totalBudget={project.totalBudget}
                  totalSpent={project.laborCosts + project.materialCosts}
                  readOnly={!isEditor}
                />
              </div>
            </section>

            {/* PLANNING MODULE */}
            <section className="space-y-3">
              <header className="flex items-center gap-2 px-1">
                <CalendarDays className="h-4 w-4 text-primary" />
                <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">Planning</h2>
              </header>
              <div className="space-y-6">
                <EstimatedFinishDate tasks={project.tasks} startDate={project.startDate} endDate={project.endDate} />
                <GanttTimeline tasks={project.tasks} startDate={project.startDate} />
                <CalendarView tasks={project.tasks} projectName={project.name} />
              </div>
            </section>

            {/* DOCUMENTATION MODULE */}
            <section className="space-y-3">
              <header className="flex items-center gap-2 px-1">
                <FileImage className="h-4 w-4 text-primary" />
                <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">Documentation</h2>
              </header>
              <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <PhotoGallery photos={project.photos} onChange={isEditor ? (photos) => update({ photos }) : () => {}} />
                  <BlueprintSection blueprints={project.blueprints} onChange={isEditor ? (blueprints) => update({ blueprints }) : () => {}} />
                </div>
                <ChangeOrdersSection orders={project.changeOrders} onChange={isEditor ? (changeOrders) => update({ changeOrders }) : () => {}} />
              </div>
            </section>
          </div>

          {/* SECONDARY column — Sticky sidebar */}
          <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-6">
            {/* Project details */}
            <ProjectDetails data={project as any} onChange={isEditor ? update : () => {}} />

            {/* Quick financial snapshot */}
            <div className="premium-card p-5 space-y-4">
              <h3 className="section-title flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Snapshot
              </h3>
              <div className="space-y-3">
                <ProgressBar label="Budget" value={budgetPercent} variant="budget" />
                <ProgressBar label="Tasks" value={taskPercent} variant="completion" />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Spent</p>
                  <p className="text-sm font-heading font-semibold text-foreground">${totalSpent.toLocaleString()}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Remaining</p>
                  <p className={`text-sm font-heading font-semibold ${remainingBudget < 0 ? "text-destructive" : "text-foreground"}`}>
                    ${Math.abs(remainingBudget).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Labor</p>
                  <p className="text-sm font-heading font-semibold text-foreground">${project.laborCosts.toLocaleString()}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Materials</p>
                  <p className="text-sm font-heading font-semibold text-foreground">${project.materialCosts.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Key dates */}
            <div className="premium-card p-5 space-y-3">
              <h3 className="section-title flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Key Dates
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">Start</span>
                  <span className="font-medium text-foreground">
                    {project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-t">
                  <span className="text-xs text-muted-foreground">Target Finish</span>
                  <span className="font-medium text-foreground">
                    {project.endDate ? new Date(project.endDate).toLocaleDateString() : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-t">
                  <span className="text-xs text-muted-foreground">Tasks Open</span>
                  <span className="font-medium text-foreground">{project.tasks.length - completedTasks}</span>
                </div>
              </div>
            </div>

            {/* Team — collapsible */}
            <Collapsible open={teamOpen} onOpenChange={setTeamOpen}>
              <div className="premium-card p-5">
                <CollapsibleTrigger className="flex items-center gap-2 w-full section-title hover:text-primary transition-colors">
                  {teamOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <Users className="h-4 w-4 text-primary" />
                  Team
                  <span className="text-xs text-muted-foreground font-normal">({project.members.length})</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <TeamMembers projectId={project.id} members={project.members} isEditor={isEditor} />
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Activity — collapsible */}
            <Collapsible open={activityOpen} onOpenChange={setActivityOpen}>
              <div className="premium-card p-5">
                <CollapsibleTrigger className="flex items-center gap-2 w-full section-title hover:text-primary transition-colors">
                  {activityOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <Activity className="h-4 w-4 text-primary" />
                  Activity Log
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <ActivityLog projectId={project.id} />
                </CollapsibleContent>
              </div>
            </Collapsible>
          </aside>
        </div>

        {/* Templates — minimized tertiary */}
        {isEditor && (
          <ProjectTemplates
            currentProject={project}
            onCreateFromTemplate={async (template) => {
              const subId = await addProject(template.name, project.id);
              await updateProject(subId, {
                totalBudget: template.totalBudget,
                laborCosts: template.laborCosts,
                materialCosts: template.materialCosts,
                tasks: template.tasks.map((t) => ({ ...t, id: crypto.randomUUID(), completed: false })) as any,
              });
              navigate(`/project/${subId}`);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default ProjectDetailPage;
