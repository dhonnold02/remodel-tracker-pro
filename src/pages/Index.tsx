import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ProjectData, defaultProject } from "@/types/project";
import ProjectDetails from "@/components/ProjectDetails";
import BudgetSection from "@/components/BudgetSection";
import TaskList from "@/components/TaskList";
import { HardHat } from "lucide-react";

const Index = () => {
  const [project, setProject] = useLocalStorage<ProjectData>("remodel-project", defaultProject);

  const update = (partial: Partial<ProjectData>) => {
    setProject((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <HardHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold text-foreground leading-tight">
              Remodel Tracker Pro
            </h1>
            {project.name && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {project.name}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-lg px-4 py-5 space-y-4 pb-20">
        <ProjectDetails data={project} onChange={update} />
        <BudgetSection data={project} onChange={update} />
        <TaskList tasks={project.tasks} onChange={(tasks) => update({ tasks })} />
      </main>
    </div>
  );
};

export default Index;
