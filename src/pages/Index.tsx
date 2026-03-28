import { useProjects } from "@/hooks/useProjects";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const { projects, loading, addProject, deleteProject, updateProject, getSubProjects, getTopLevelProjects } = useProjects();
  useOfflineSync();

  return (
    <Dashboard
      projects={getTopLevelProjects()}
      loading={loading}
      onAdd={addProject}
      onDelete={deleteProject}
      getSubProjects={getSubProjects}
      onUpdateProject={updateProject}
    />
  );
};

export default Index;
