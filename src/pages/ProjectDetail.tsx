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
  Plus, FolderOpen, ChevronRight, ChevronDown, Users, Activity,
  Download, FileText, MapPin, Receipt, ClipboardList, ImageIcon, CalendarRange,
} from "lucide-react";
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
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Project stats header */}
        <div className="premium-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              {parentProject && (
                <button
                  onClick={() => navigate(`/project/${parentProject.id}`)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mb-1"
                >
                  {parentProject.name} <ChevronRight className="h-3 w-3" />
                </button>
              )}
              <h2 className="font-heading text-2xl font-bold text-foreground">
                {project.name || "Untitled Project"}
              </h2>
              {project.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {project.address}
                </p>
              )}
            </div>

            {/* Quick stats */}
            <div className="flex gap-3 shrink-0">
              <div className="stat-card bg-accent rounded-xl px-5 py-3">
                <p className="text-xs text-muted-foreground">Budget Used</p>
                <p className="text-xl font-heading font-bold text-foreground">{Math.round(budgetPercent)}%</p>
              </div>
              <div className="stat-card bg-accent rounded-xl px-5 py-3">
                <p className="text-xs text-muted-foreground">Tasks Done</p>
                <p className="text-xl font-heading font-bold text-foreground">{Math.round(taskPercent)}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ProgressBar label="Budget" value={budgetPercent} variant="budget" />
            <ProgressBar label="Tasks" value={taskPercent} variant="completion" />
          </div>
        </div>

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
                    <button
                      key={sub.id}
                      onClick={() => navigate(`/project/${sub.id}`)}
                      className="w-full text-left rounded-xl border bg-background p-4 hover:border-primary/20 hover:shadow-sm transition-all duration-150 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-heading font-semibold text-foreground truncate">{sub.name || "Untitled"}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
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

        {/* Two-column layout for main sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <ProjectDetails data={project as any} onChange={isEditor ? update : () => {}} />
            <BudgetSection data={project as any} onChange={isEditor ? update : () => {}} />
            <InvoicesSection
              invoices={project.invoices}
              onChange={isEditor ? (invoices) => update({ invoices }) : () => {}}
              totalBudget={project.totalBudget}
              totalSpent={project.laborCosts + project.materialCosts}
              readOnly={!isEditor}
            />
          </div>
          <div className="space-y-6">
            <TaskList tasks={project.tasks} onChange={isEditor ? (tasks) => update({ tasks }) : () => {}} />
          </div>
        </div>

        {/* Full-width sections */}
        <EstimatedFinishDate tasks={project.tasks} startDate={project.startDate} endDate={project.endDate} />
        <GanttTimeline tasks={project.tasks} startDate={project.startDate} />
        <CalendarView tasks={project.tasks} projectName={project.name} />

        {/* Media grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PhotoGallery photos={project.photos} onChange={isEditor ? (photos) => update({ photos }) : () => {}} />
          <BlueprintSection blueprints={project.blueprints} onChange={isEditor ? (blueprints) => update({ blueprints }) : () => {}} />
        </div>

        <ChangeOrdersSection orders={project.changeOrders} onChange={isEditor ? (changeOrders) => update({ changeOrders }) : () => {}} />

        {/* Templates */}
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

        {/* Team & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Collapsible open={teamOpen} onOpenChange={setTeamOpen}>
            <div className="premium-card p-6">
              <CollapsibleTrigger className="flex items-center gap-2 w-full section-title hover:text-primary transition-colors">
                {teamOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Users className="h-4 w-4 text-primary" />
                Team Members
                <span className="text-xs text-muted-foreground font-normal">({project.members.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <TeamMembers projectId={project.id} members={project.members} isEditor={isEditor} />
              </CollapsibleContent>
            </div>
          </Collapsible>

          <Collapsible open={activityOpen} onOpenChange={setActivityOpen}>
            <div className="premium-card p-6">
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
        </div>
      </div>
    </AppLayout>
  );
};

export default ProjectDetailPage;
