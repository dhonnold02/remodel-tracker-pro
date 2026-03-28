import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { ProjectData, createProject } from "@/types/project";

interface ProjectsContextType {
  projects: ProjectData[];
  addProject: (name: string) => string;
  updateProject: (id: string, partial: Partial<ProjectData>) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => ProjectData | undefined;
}

const ProjectsContext = createContext<ProjectsContextType | null>(null);

const STORAGE_KEY = "remodel-projects";

function loadProjects(): ProjectData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectData[]>(loadProjects);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch {
      // ignore
    }
  }, [projects]);

  const addProject = useCallback((name: string) => {
    const p = createProject(name);
    setProjects((prev) => [...prev, p]);
    return p.id;
  }, []);

  const updateProject = useCallback((id: string, partial: Partial<ProjectData>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...partial } : p))
    );
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects]
  );

  return (
    <ProjectsContext.Provider value={{ projects, addProject, updateProject, deleteProject, getProject }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be inside ProjectsProvider");
  return ctx;
}
