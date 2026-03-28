import { useParams, useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import ProjectDetails from "@/components/ProjectDetails";
import BudgetSection from "@/components/BudgetSection";
import TaskList from "@/components/TaskList";
import PhotoGallery from "@/components/PhotoGallery";
import BlueprintSection from "@/components/BlueprintSection";
import ChangeOrdersSection from "@/components/ChangeOrdersSection";
import { ArrowLeft, HardHat } from "lucide-react";

const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProject, updateProject } = useProjects();
  const project = getProject(id || "");

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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shrink-0">
            <HardHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-base font-bold text-foreground truncate">
              {project.name || "Untitled Project"}
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-5 space-y-4 pb-20">
        <ProjectDetails data={project} onChange={update} />
        <BudgetSection data={project} onChange={update} />
        <TaskList tasks={project.tasks} onChange={(tasks) => update({ tasks })} />
        <PhotoGallery photos={project.photos} onChange={(photos) => update({ photos })} />
        <BlueprintSection blueprints={project.blueprints} onChange={(blueprints) => update({ blueprints })} />
        <ChangeOrdersSection orders={project.changeOrders} onChange={(changeOrders) => update({ changeOrders })} />
      </main>
    </div>
  );
};

export default ProjectDetailPage;
