import { useProjects } from "@/hooks/useProjects.tsx";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const { projects, addProject, deleteProject, getSubProjects, getTopLevelProjects } = useProjects();
  return (
    <Dashboard
      projects={getTopLevelProjects()}
      allProjects={projects}
      onAdd={addProject}
      onDelete={deleteProject}
      getSubProjects={getSubProjects}
    />
  );
};

export default Index;
