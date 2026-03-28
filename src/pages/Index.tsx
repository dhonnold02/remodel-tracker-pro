import { useProjects } from "@/hooks/useProjects";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const { projects, loading, addProject, deleteProject, getSubProjects, getTopLevelProjects } = useProjects();
  return (
    <Dashboard
      projects={getTopLevelProjects()}
      loading={loading}
      onAdd={addProject}
      onDelete={deleteProject}
      getSubProjects={getSubProjects}
    />
  );
};

export default Index;
