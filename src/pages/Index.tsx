import { useProjects } from "@/hooks/useProjects";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const { projects, addProject, deleteProject } = useProjects();
  return <Dashboard projects={projects} onAdd={addProject} onDelete={deleteProject} />;
};

export default Index;
