import { useProjects } from "@/hooks/useProjects.tsx";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const { projects, addProject, deleteProject } = useProjects();
  return <Dashboard projects={projects} onAdd={addProject} onDelete={deleteProject} />;
};

export default Index;
