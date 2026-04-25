import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import { getAggregatedStats } from "@/types/project";
import AppLayout from "@/components/AppLayout";
import ProjectDetails from "@/components/ProjectDetails";
import BudgetSection from "@/components/BudgetSection";
import InvoicesSection from "@/components/InvoicesSection";
import TaskBoard from "@/components/TaskBoard";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { Wallet, ListChecks, CalendarDays, FileImage, DollarSign, Target, TrendingUp, CheckCircle2, Camera, FilePlus2, BookTemplate, Circle } from "lucide-react";
import { exportProjectCSV, exportProjectPDF } from "@/lib/exportProject";
import { cn } from "@/lib/utils";

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

  // Project status — derived from task progress
  const projectStatus: { label: string; tone: "active" | "complete" | "planning" } =
    project.tasks.length === 0
      ? { label: "Planning", tone: "planning" }
      : completedTasks === project.tasks.length
        ? { label: "Completed", tone: "complete" }
        : { label: "Active", tone: "active" };
  const statusToneCls =
    projectStatus.tone === "complete"
      ? "text-success bg-success/10 ring-success/20"
      : projectStatus.tone === "planning"
        ? "text-muted-foreground bg-secondary ring-border"
        : "text-primary bg-primary/10 ring-primary/20";

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
        {/* Status Strip — Command Center Header */}
        <section className="space-y-5">
          <div className="space-y-2">
            {parentProject && (
              <button
                onClick={() => navigate(`/project/${parentProject.id}`)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                {parentProject.name} <ChevronRight className="h-3 w-3" />
              </button>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-[1.1]">
                {project.name || "Untitled Project"}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium ring-1",
                  statusToneCls,
                )}
              >
                <Circle className="h-2 w-2 fill-current" />
                {projectStatus.label}
              </span>
            </div>
            {project.address && (
              <p className="text-sm text-muted-foreground flex items-start gap-1.5 max-w-2xl">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-[3px]" />
                <span className="leading-relaxed">{project.address}</span>
              </p>
            )}
          </div>

          {/* Compact stat pills with inline progress */}
          <div className="rounded-2xl border bg-card/50 backdrop-blur-sm px-5 py-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 lg:divide-x lg:divide-border/60">
              {/* Budget Used */}
              <div className="lg:pl-0 lg:pr-6 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  <TrendingUp className="h-3 w-3" /> Budget Used
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl sm:text-3xl font-heading font-bold tabular-nums ${budgetPercent > 100 ? "text-destructive" : "text-foreground"}`}>
                    {Math.round(budgetPercent)}%
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">${totalSpent.toLocaleString()}</span>
                </div>
                <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${budgetPercent > 100 ? "bg-destructive" : "bg-primary"}`}
                    style={{ width: `${Math.min(100, budgetPercent)}%` }}
                  />
                </div>
              </div>

              {/* Tasks Done */}
              <div className="lg:px-6 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Tasks Done
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-heading font-bold text-foreground tabular-nums">{Math.round(taskPercent)}%</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{completedTasks}/{project.tasks.length}</span>
                </div>
                <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-success transition-all duration-500"
                    style={{ width: `${Math.min(100, taskPercent)}%` }}
                  />
                </div>
              </div>

              {/* Remaining */}
              <div className="lg:px-6 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  <Wallet className="h-3 w-3" /> Remaining
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl sm:text-3xl font-heading font-bold tabular-nums ${remainingBudget < 0 ? "text-destructive" : "text-foreground"}`}>
                    ${Math.abs(remainingBudget).toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {remainingBudget < 0 ? "Over budget" : "of $" + project.totalBudget.toLocaleString()}
                </p>
              </div>

              {/* Outstanding */}
              <div className="lg:pl-6 lg:pr-0 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  <Receipt className="h-3 w-3" /> Outstanding
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-heading font-bold text-foreground tabular-nums">
                    ${invoicesOutstanding.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {project.invoices.length} invoice{project.invoices.length !== 1 ? "s" : ""}
                </p>
              </div>
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
            <div className={cn("premium-card space-y-4", subProjects.length === 0 ? "p-4" : "p-6")}>
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

        {/* Command Center: 2-column layout — primary 65-70%, sidebar 30-35%
            Each column scrolls independently on desktop based on cursor position. */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* PRIMARY column (Work-first) — independent scroll on desktop */}
          <div className="lg:col-span-8 space-y-10">
            {/* WORK MODULE — elevated, primary focus */}
            <section className="space-y-4">
              <header className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ListChecks className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-heading text-lg font-bold text-foreground tracking-tight">Tasks</h2>
                    <p className="text-xs text-muted-foreground">{completedTasks} of {project.tasks.length} complete</p>
                  </div>
                </div>
              </header>
              <TaskBoard
                tasks={project.tasks}
                phases={(project as any).taskPhases || []}
                onChangeTasks={isEditor ? (tasks) => update({ tasks }) : () => {}}
                onChangePhases={isEditor ? (taskPhases) => update({ taskPhases } as any) : () => {}}
                isEditor={isEditor}
                projectName={project.name}
                projectAddress={project.address}
              />
            </section>
          </div>

          {/* SECONDARY column — Control sidebar (independent scroll on desktop) */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-2 scroll-pane scroll-smooth self-start">
            {/* FINANCIALS MODULE — moved to sidebar for control-panel feel */}
            <section className="space-y-3">
              <header className="flex items-center gap-2 px-1">
                <Wallet className="h-3.5 w-3.5 text-primary" />
                <h3 className="font-heading text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Financials</h3>
              </header>
              <div className="space-y-4">
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

            {/* Key Dates */}
            <div className="rounded-2xl bg-card/70 ring-1 ring-border/60 p-5 space-y-3 shadow-none">
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

            {/* Project details (status, dates inputs) */}
            <ProjectDetails data={project as any} onChange={isEditor ? update : () => {}} />

            {/* Team — collapsible */}
            <Collapsible open={teamOpen} onOpenChange={setTeamOpen}>
              <div className="rounded-2xl bg-card/70 ring-1 ring-border/60 p-5 shadow-none">
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
              <div className="rounded-2xl bg-card/70 ring-1 ring-border/60 p-5 shadow-none">
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

        {/* TERTIARY — Tabbed workspace (Timeline, Photos, Plans, Notes, Files) */}
        <section className="space-y-4">
          <header className="flex items-center gap-2.5 px-1">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileImage className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground tracking-tight">Project Workspace</h2>
              <p className="text-xs text-muted-foreground">Timeline, photos, plans, notes & files</p>
            </div>
          </header>

          <div className="rounded-2xl bg-card/70 ring-1 ring-border/60 p-4 sm:p-6 shadow-sm">
            <Tabs defaultValue="timeline" className="space-y-5">
              <TabsList className="bg-muted/60 h-10 p-1 rounded-xl">
                <TabsTrigger value="timeline" className="text-xs sm:text-sm rounded-lg gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> Timeline
                </TabsTrigger>
                <TabsTrigger value="photos" className="text-xs sm:text-sm rounded-lg gap-1.5">
                  <Camera className="h-3.5 w-3.5" /> Photos
                </TabsTrigger>
                <TabsTrigger value="plans" className="text-xs sm:text-sm rounded-lg gap-1.5">
                  <FileImage className="h-3.5 w-3.5" /> Plans
                </TabsTrigger>
                <TabsTrigger value="notes" className="text-xs sm:text-sm rounded-lg gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" /> Notes
                </TabsTrigger>
                <TabsTrigger value="files" className="text-xs sm:text-sm rounded-lg gap-1.5">
                  <BookTemplate className="h-3.5 w-3.5" /> Files
                </TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="space-y-6 mt-0 focus-visible:outline-none">
                <EstimatedFinishDate tasks={project.tasks} startDate={project.startDate} endDate={project.endDate} />
                <GanttTimeline tasks={project.tasks} startDate={project.startDate} phases={project.taskPhases} />
                <CalendarView tasks={project.tasks} projectName={project.name} phases={project.taskPhases} />
              </TabsContent>

              <TabsContent value="photos" className="mt-0 focus-visible:outline-none">
                <PhotoGallery photos={project.photos} onChange={isEditor ? (photos) => update({ photos }) : () => {}} />
              </TabsContent>

              <TabsContent value="plans" className="mt-0 focus-visible:outline-none">
                <BlueprintSection blueprints={project.blueprints} onChange={isEditor ? (blueprints) => update({ blueprints }) : () => {}} />
              </TabsContent>

              <TabsContent value="notes" className="mt-0 focus-visible:outline-none">
                <ChangeOrdersSection orders={project.changeOrders} onChange={isEditor ? (changeOrders) => update({ changeOrders }) : () => {}} />
              </TabsContent>

              <TabsContent value="files" className="mt-0 focus-visible:outline-none">
                {isEditor ? (
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
                ) : (
                  <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Templates and reusable files are available to editors.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default ProjectDetailPage;
