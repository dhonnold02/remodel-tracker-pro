import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { ProjectData, createProject } from "@/types/project";

interface ProjectsContextType {
  projects: ProjectData[];
  addProject: (name: string, parentId?: string) => string;
  updateProject: (id: string, partial: Partial<ProjectData>) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => ProjectData | undefined;
  getSubProjects: (parentId: string) => ProjectData[];
  getTopLevelProjects: () => ProjectData[];
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

  const addProject = useCallback((name: string, parentId?: string) => {
    const p = createProject(name, parentId);
    setProjects((prev) => [...prev, p]);
    return p.id;
  }, []);

  const updateProject = useCallback((id: string, partial: Partial<ProjectData>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...partial } : p))
    );
  }, []);

  const deleteProject = useCallback((id: string) => {
    // Delete project and all its sub-projects
    setProjects((prev) => {
      const idsToDelete = new Set<string>();
      const collectIds = (pid: string) => {
        idsToDelete.add(pid);
        prev.filter((p) => p.parentId === pid).forEach((p) => collectIds(p.id));
      };
      collectIds(id);
      return prev.filter((p) => !idsToDelete.has(p.id));
    });
  }, []);

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects]
  );

  const getSubProjects = useCallback(
    (parentId: string) => projects.filter((p) => p.parentId === parentId),
    [projects]
  );

  const getTopLevelProjects = useCallback(
    () => projects.filter((p) => !p.parentId),
    [projects]
  );

  return (
    <ProjectsContext.Provider value={{ projects, addProject, updateProject, deleteProject, getProject, getSubProjects, getTopLevelProjects }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be inside ProjectsProvider");
  return ctx;
}
