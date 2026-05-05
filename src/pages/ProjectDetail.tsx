import { uuidv4 } from "@/lib/uuid";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import { useRole } from "@/hooks/useRole";
import { getAggregatedStats } from "@/types/project";
import AppLayout from "@/components/AppLayout";
import SkeletonCard from "@/components/SkeletonCard";
import { Skeleton } from "@/components/ui/skeleton";
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
import LocalFileUploads from "@/components/LocalFileUploads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft, Plus, FolderOpen, ChevronRight, Users, Trash2, Download, FileText,
  LayoutDashboard, ListChecks, CalendarDays, Camera, FileImage, ClipboardList,
  Wallet, Receipt, ClipboardCheck,
} from "lucide-react";
import { exportProjectCSV, exportProjectPDF } from "@/lib/exportProject";
import { cn } from "@/lib/utils";
import PunchList, { usePunchList } from "@/components/PunchList";
import { estimateFinishDate } from "@/lib/estimateFinishDate";
import { format } from "date-fns";

type Section =
  | "overview" | "tasks" | "timeline" | "photos" | "plansfiles" | "notes"
  | "budget" | "invoices" | "punchout" | "team";

const NAV_GROUPS: { label: string; items: { id: Section; label: string; icon: any; financial?: boolean }[] }[] = [
  {
    label: "Project",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "tasks", label: "Tasks", icon: ListChecks },
      { id: "timeline", label: "Timeline", icon: CalendarDays },
      { id: "photos", label: "Photos", icon: Camera },
      { id: "plansfiles", label: "Plans & Files", icon: FileImage },
      { id: "notes", label: "Notes", icon: ClipboardList },
    ],
  },
  {
    label: "Finance",
    items: [
      { id: "budget", label: "Budget", icon: Wallet, financial: true },
      { id: "invoices", label: "Invoices", icon: Receipt, financial: true },
    ],
  },
  {
    label: "Closeout",
    items: [
      { id: "punchout", label: "Punch Out", icon: ClipboardCheck },
      { id: "team", label: "Team", icon: Users },
    ],
  },
];

const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, updateProject, addProject, deleteProject, getSubProjects, userRole, loading } = useProjects();
  const {
    canViewFinancials, canEditProjects, canEditTasks, canCompleteTasks,
    canEditTimeline, canEditPunchOut, canSignOffPunchOut,
  } = useRole();
  const project = getProject(id || "");
  const [newSubName, setNewSubName] = useState("");
  const [showSubForm, setShowSubForm] = useState(false);
  const [creatingSubProject, setCreatingSubProject] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const { data: punchData, save: savePunch } = usePunchList(id);

  if (loading) {
    return (
      <AppLayout title="Loading…">
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/3 rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <SkeletonCard lines={6} />
        </div>
      </AppLayout>
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
  const projectEditor = role === "editor";
  const isEditor = projectEditor && canEditProjects;
  const isTaskEditor = projectEditor && canEditTasks;
  const canTickTasks = projectEditor && canCompleteTasks;
  const isPunchEditor = projectEditor && canEditPunchOut;
  const isPunchSigner = projectEditor && canSignOffPunchOut;
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

  // Section-specific stat metrics
  const finishEstimate = estimateFinishDate(project.tasks, project.startDate);
  const activePhases = (project.taskPhases || []).filter((p: string) => {
    const norm = p.trim().toLowerCase();
    if (["general", "misc", "other"].includes(norm)) return false;
    const phaseTasks = project.tasks.filter((t: any) => (t.phase || "General") === p && !t.parentTaskId);
    return phaseTasks.length > 0 && phaseTasks.some((t: any) => !t.completed);
  }).length;
  const now = new Date();
  const eventsThisMonth = (project.events || []).filter((e: any) => {
    const d = new Date(e.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const punchTotal = punchData.items.length;
  const punchPassed = punchData.items.filter((i: any) => i.status === "pass").length;
  const punchFailed = punchData.items.filter((i: any) => i.status === "fail").length;
  const punchPending = punchData.items.filter((i: any) => i.status === "pending").length;

  const projectStatus: { label: string; tone: "active" | "complete" | "planning" } =
    project.tasks.length === 0
      ? { label: "Planning", tone: "planning" }
      : completedTasks === project.tasks.length
        ? { label: "Completed", tone: "complete" }
        : { label: "Active", tone: "active" };
  const statusToneCls =
    projectStatus.tone === "complete"
      ? "text-success bg-success/10"
      : projectStatus.tone === "planning"
        ? "text-muted-foreground bg-secondary"
        : "text-primary bg-primary/10";

  const headerActions = (
    <div className="flex items-center gap-1">
      {!isEditor && (
        <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full font-medium">
          View only
        </span>
      )}
      <button
        onClick={() => exportProjectCSV(project, subProjects)}
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        title="Export CSV"
      >
        <Download className="h-4 w-4" />
      </button>
      <button
        onClick={() => exportProjectPDF(project, subProjects)}
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        title="Print Report"
      >
        <FileText className="h-4 w-4" />
      </button>
    </div>
  );

  // Topbar: back to Projects + project name as breadcrumb
  const topbarTitle = (
    <div className="flex items-center gap-1.5 min-w-0">
      <button
        onClick={() => navigate(parentProject ? `/project/${parentProject.id}` : "/")}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {parentProject ? parentProject.name : "Projects"}
      </button>
      <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
      <span className="text-sm font-medium text-foreground truncate">{project.name || "Untitled Project"}</span>
    </div>
  );

  // Visible nav items (filter out finance for non-financial roles)
  const navGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.financial || canViewFinancials),
  })).filter((g) => g.items.length > 0);

  // Section renderers
  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div className="space-y-6">
            <ProjectDetails data={project as any} onChange={isEditor ? update : () => {}} />
            {!project.parentId && (
              <div className="rounded-xl bg-card border border-[hsl(214_13%_90%)] p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-primary" /> Sub-Projects
                    {hasSubs && <span className="text-xs text-muted-foreground font-normal">({subProjects.length})</span>}
                  </h3>
                  {isEditor && (
                    <Button size="sm" variant="ghost" onClick={() => setShowSubForm(!showSubForm)} className="h-8 text-xs rounded-lg">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  )}
                </div>
                {showSubForm && (
                  <div className="flex gap-2">
                    <Input placeholder="Sub-project name…" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddSub()} className="flex-1 h-9 text-sm rounded-lg" autoFocus />
                    <Button onClick={handleAddSub} size="sm" className="h-9 text-xs rounded-lg" disabled={creatingSubProject}>Create</Button>
                  </div>
                )}
                <div className="space-y-2">
                  {subProjects.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No sub-projects yet.</p>
                  ) : subProjects.map((sub) => (
                    <div key={sub.id} className="group flex items-start gap-2 rounded-lg border bg-background p-3 hover:border-primary/30 transition-colors">
                      <button onClick={() => navigate(`/project/${sub.id}`)} className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{sub.name || "Untitled"}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{sub.tasks.filter((t) => t.completed).length}/{sub.tasks.length} tasks</span>
                          <span>${(sub.laborCosts + sub.materialCosts).toLocaleString()} spent</span>
                        </div>
                      </button>
                      {isEditor && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={`Delete ${sub.name}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete sub-project?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete <span className="font-semibold text-foreground">{sub.name || "Untitled"}</span> and all of its content.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteProject(sub.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case "tasks":
        return (
          <TaskBoard
            tasks={project.tasks}
            phases={(project as any).taskPhases || []}
            onChangeTasks={(isTaskEditor || canTickTasks) ? (tasks) => update({ tasks }) : () => {}}
            onChangePhases={isTaskEditor ? (taskPhases) => update({ taskPhases } as any) : () => {}}
            isEditor={isTaskEditor}
            canComplete={canTickTasks}
            projectName={project.name}
            projectAddress={project.address}
          />
        );
      case "timeline":
        return (
          <div className="space-y-6">
            <EstimatedFinishDate tasks={project.tasks} startDate={project.startDate} endDate={project.endDate} phases={project.taskPhases} />
            <GanttTimeline tasks={project.tasks} startDate={project.startDate} phases={project.taskPhases} />
            <CalendarView
              tasks={project.tasks}
              projectName={project.name}
              projectId={project.id}
              phases={project.taskPhases}
              events={project.events || []}
              onEventsChange={isEditor ? (events) => update({ events } as any) : undefined}
              canEdit={isEditor}
            />
          </div>
        );
      case "photos":
        return <PhotoGallery photos={project.photos} onChange={isEditor ? (photos) => update({ photos }) : () => {}} />;
      case "plansfiles":
        return (
          <div className="space-y-6">
            <BlueprintSection blueprints={project.blueprints} onChange={isEditor ? (blueprints) => update({ blueprints }) : () => {}} />
            <LocalFileUploads projectId={project.id} isEditor={isEditor} />
            {isEditor ? (
              <ProjectTemplates
                currentProject={project}
                onCreateFromTemplate={async (template) => {
                  const subId = await addProject(template.name, project.id);
                  await updateProject(subId, {
                    totalBudget: template.totalBudget,
                    laborCosts: template.laborCosts,
                    materialCosts: template.materialCosts,
                    tasks: template.tasks.map((t) => ({ ...t, id: uuidv4(), completed: false })) as any,
                  });
                  navigate(`/project/${subId}`);
                }}
              />
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Templates and reusable files are available to editors.</div>
            )}
          </div>
        );
      case "notes":
        return (
          <div className="space-y-6">
            <ChangeOrdersSection orders={project.changeOrders} onChange={isEditor ? (changeOrders) => update({ changeOrders }) : () => {}} />
            <div className="rounded-xl bg-card border border-[hsl(214_13%_90%)] p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Activity Log</h3>
              <ActivityLog projectId={project.id} />
            </div>
          </div>
        );
      case "budget":
        return canViewFinancials ? <BudgetSection data={project as any} onChange={isEditor ? update : () => {}} /> : null;
      case "invoices":
        return canViewFinancials ? (
          <InvoicesSection
            invoices={project.invoices}
            onChange={isEditor ? (invoices) => update({ invoices }) : () => {}}
            totalBudget={project.totalBudget}
            totalSpent={project.laborCosts + project.materialCosts}
            readOnly={!isEditor}
          />
        ) : null;
      case "punchout":
        return (
          <PunchList
            projectId={project.id}
            data={punchData}
            onChange={savePunch}
            isEditor={isPunchEditor}
            canSignOff={isPunchSigner}
            members={project.members}
            projectName={project.name}
            projectAddress={project.address}
          />
        );
      case "team":
        return (
          <TeamMembers projectId={project.id} members={project.members} isEditor={isEditor} ownerUserId={project.createdBy} />
        );
    }
  };

  const fmtMoney = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`;
    return `$${n.toLocaleString()}`;
  };

  return (
    <AppLayout title={topbarTitle as any} actions={headerActions}>
      {/* Stat strip */}
      <div className="-mx-4 lg:-mx-8 -mt-4 lg:-mt-8 mb-4 bg-white border-b border-[hsl(214_13%_90%)]">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {(activeSection === "timeline" ? [
            { label: "Est. Finish", value: finishEstimate ? format(finishEstimate.date, "MMM d, yyyy") : "—" },
            { label: "Start Date", value: project.startDate ? format(new Date(project.startDate), "MMM d, yyyy") : "—" },
            { label: "Active Phases", value: String(activePhases) },
            { label: "Events This Month", value: String(eventsThisMonth) },
          ] : activeSection === "punchout" ? [
            { label: "Total Items", value: String(punchTotal) },
            { label: "Passed", value: String(punchPassed), tone: "success" as const },
            { label: "Failed", value: String(punchFailed), tone: "destructive" as const },
            { label: "Pending", value: String(punchPending), tone: "warning" as const },
          ] : activeSection === "budget" ? [
            { label: "Total Budget", value: fmtMoney(project.totalBudget) },
            { label: "Spent", value: fmtMoney(totalSpent) },
            { label: "Remaining", value: fmtMoney(Math.abs(remainingBudget)), tone: remainingBudget < 0 ? "destructive" as const : undefined },
            { label: "Used %", value: `${Math.round(budgetPercent)}%`, tone: budgetPercent > 100 ? "destructive" as const : undefined },
          ] : activeSection === "invoices" ? [
            { label: "Budget", value: fmtMoney(project.totalBudget) },
            { label: "Spent", value: fmtMoney(totalSpent) },
            { label: "Remaining", value: fmtMoney(Math.abs(remainingBudget)), tone: remainingBudget < 0 ? "destructive" as const : undefined },
            { label: "Owed by HO", value: fmtMoney(project.invoices.filter((i: any) => i.type === "homeowner" && !i.paid).reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0)) },
            { label: "Owed to Subs", value: fmtMoney(project.invoices.filter((i: any) => i.type === "subcontractor" && !i.paid).reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0)) },
          ] : [
            { label: "Budget Used", value: `${Math.round(budgetPercent)}%`, tone: budgetPercent > 100 ? "destructive" as const : undefined },
            { label: "Tasks Done", value: `${completedTasks}/${project.tasks.length}` },
            { label: "Remaining", value: fmtMoney(Math.abs(remainingBudget)), tone: remainingBudget < 0 ? "destructive" as const : undefined },
            { label: "Outstanding", value: fmtMoney(invoicesOutstanding) },
          ]).map((stat, idx, arr) => (
            <div key={stat.label} className={cn("px-4 py-3", idx < arr.length - 1 && "border-r border-[hsl(214_13%_90%)]")}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</p>
              <p className={cn(
                "text-xl font-semibold tabular-nums mt-0.5",
                (stat as any).tone === "destructive" && "text-destructive",
                (stat as any).tone === "success" && "text-success",
                (stat as any).tone === "warning" && "text-warning",
                !(stat as any).tone && "text-foreground"
              )}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {hasSubs && aggregated && (
        <div className="mb-4 rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Aggregated:</span> {fmtMoney(aggregated.totalSpent)} / {fmtMoney(aggregated.totalBudget)} · {aggregated.completedTasks}/{aggregated.totalTasks} tasks across {subProjects.length} sub-project{subProjects.length !== 1 ? "s" : ""}
        </div>
      )}

      <div className="flex gap-0 -mx-4 lg:-mx-8 -mb-4 lg:-mb-8 min-h-[calc(100vh-9rem)]">
        {/* Project sidebar (desktop) */}
        <aside className="hidden md:flex w-48 shrink-0 bg-white border-r border-[hsl(214_13%_90%)] flex-col">
          <div className="px-4 py-4 border-b border-[hsl(214_13%_90%)] space-y-1.5">
            <h2 className="text-sm font-semibold text-foreground truncate">{project.name || "Untitled"}</h2>
            {project.address && (
              <p className="text-xs text-muted-foreground line-clamp-2">{project.address.split("\n")[0]}</p>
            )}
            <span className={cn("inline-block text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full", statusToneCls)}>
              {projectStatus.label}
            </span>
          </div>
          <nav className="flex-1 overflow-y-auto py-3 space-y-4">
            {navGroups.map((group) => (
              <div key={group.label}>
                <div className="px-4 mb-1.5 text-[10px] tracking-widest text-muted-foreground uppercase font-medium">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = activeSection === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors",
                          active
                            ? "bg-[#eff6ff] text-primary font-medium border-r-2 border-primary"
                            : "text-slate-700 hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main section content */}
        <main className="flex-1 min-w-0 bg-page-bg overflow-y-auto p-5">
          {/* Mobile section selector */}
          <div className="md:hidden mb-4 -mx-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-1.5 px-1 pb-1 w-max">
              {navGroups.flatMap((g) => g.items).map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                      active
                        ? "bg-[#eff6ff] text-primary"
                        : "bg-card text-muted-foreground border border-border"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
          {renderSection()}
        </main>
      </div>
    </AppLayout>
  );
};

export default ProjectDetailPage;
