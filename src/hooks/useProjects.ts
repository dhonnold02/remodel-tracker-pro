import { useLocalStorage } from "./useLocalStorage";
import { ProjectData, createProject } from "@/types/project";
import { useCallback } from "react";

export function useProjects() {
  const [projects, setProjects] = useLocalStorage<ProjectData[]>("remodel-projects", []);

  const addProject = useCallback((name: string) => {
    const p = createProject(name);
    setProjects((prev) => [...prev, p]);
    return p.id;
  }, [setProjects]);

  const updateProject = useCallback((id: string, partial: Partial<ProjectData>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...partial } : p))
    );
  }, [setProjects]);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, [setProjects]);

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects]
  );

  return { projects, addProject, updateProject, deleteProject, getProject };
}
