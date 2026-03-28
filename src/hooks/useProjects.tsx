import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cacheProjects, getCachedProjects } from "@/hooks/useOfflineSync";

const logActivity = async (
  userId: string,
  userName: string,
  projectId: string,
  actionType: string,
  description: string
) => {
  await supabase.from("activity_logs").insert({
    project_id: projectId,
    user_id: userId,
    user_name: userName,
    action_type: actionType,
    description,
  });
};

// Types matching the old ProjectData shape for component compatibility
export type TaskPriority = "high" | "medium" | "low";

export interface Task {
  id: string;
  title: string;
  notes: string;
  completed: boolean;
  parentTaskId?: string | null;
  dueDate?: string | null;
  priority: TaskPriority;
  tags: string[];
}

export interface FileAttachment {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: string;
}

export interface ChangeOrder {
  id: string;
  text: string;
  createdAt: string;
  createdByName?: string;
}

export interface ProjectMember {
  id: string;
  userId: string;
  role: "editor" | "viewer";
  displayName: string | null;
  avatarUrl: string | null;
  email?: string;
}

export interface ProjectData {
  id: string;
  name: string;
  parentId?: string;
  totalBudget: number;
  laborCosts: number;
  materialCosts: number;
  startDate: string;
  endDate: string;
  tasks: Task[];
  photos: FileAttachment[];
  blueprints: FileAttachment[];
  changeOrders: ChangeOrder[];
  members: ProjectMember[];
  createdBy: string | null;
  createdAt: string;
}

interface ProjectsContextType {
  projects: ProjectData[];
  loading: boolean;
  addProject: (name: string, parentId?: string) => Promise<string>;
  updateProject: (id: string, partial: Partial<ProjectData>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  getProject: (id: string) => ProjectData | undefined;
  getSubProjects: (parentId: string) => ProjectData[];
  getTopLevelProjects: () => ProjectData[];
  refreshProject: (id: string) => Promise<void>;
  addMember: (projectId: string, email: string, role: "editor" | "viewer") => Promise<{ error: string | null }>;
  removeMember: (projectId: string, memberId: string) => Promise<void>;
  updateMemberRole: (projectId: string, memberId: string, role: "editor" | "viewer") => Promise<void>;
  userRole: (projectId: string) => "editor" | "viewer" | null;
}

const ProjectsContext = createContext<ProjectsContextType | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const projectsRef = useRef<ProjectData[]>([]);
  // Keep ref in sync for stable callbacks
  projectsRef.current = projects;

  const initialLoadDone = useRef(false);

  // Fetch all projects the user is a member of
  const fetchProjects = useCallback(async () => {
    if (!user) { setProjects([]); setLoading(false); return; }

    // Load from cache first for instant display (only on first load)
    if (!initialLoadDone.current) {
      const cached = getCachedProjects();
      if (cached) {
        setProjects(cached.projects as ProjectData[]);
      }
    }
    
    if (!navigator.onLine) {
      setLoading(false);
      return;
    }
    
    // Get project IDs user is member of
    const { data: memberships } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", user.id);
    
    if (!memberships || memberships.length === 0) {
      setProjects([]);
      setLoading(false);
      return;
    }

    const projectIds = memberships.map((m) => m.project_id);

    // Fetch projects
    const { data: projectRows } = await supabase
      .from("projects")
      .select("*")
      .in("id", projectIds);

    if (!projectRows) { setProjects([]); setLoading(false); return; }

    // Fetch related data for all projects in parallel
    const [tasksRes, photosRes, blueprintsRes, ordersRes, membersRes] = await Promise.all([
      supabase.from("tasks").select("*").in("project_id", projectIds).order("sort_order"),
      supabase.from("photos").select("*").in("project_id", projectIds),
      supabase.from("blueprints").select("*").in("project_id", projectIds),
      supabase.from("change_orders").select("*").in("project_id", projectIds).order("created_at", { ascending: false }),
      supabase.from("project_members").select("id, project_id, user_id, role, profiles(display_name, avatar_url)").in("project_id", projectIds),
    ]);

    const tasks = tasksRes.data || [];
    const photos = photosRes.data || [];
    const blueprints = blueprintsRes.data || [];
    const orders = ordersRes.data || [];
    const members = membersRes.data || [];

    const assembled: ProjectData[] = projectRows.map((p) => ({
      id: p.id,
      name: p.name,
      parentId: p.parent_id || undefined,
      totalBudget: Number(p.total_budget),
      laborCosts: Number(p.labor_costs),
      materialCosts: Number(p.material_costs),
      startDate: p.start_date,
      endDate: p.end_date,
      createdBy: p.created_by,
      createdAt: p.created_at,
      tasks: tasks
        .filter((t) => t.project_id === p.id)
        .map((t) => ({ id: t.id, title: t.title, notes: t.notes, completed: t.completed, parentTaskId: (t as any).parent_task_id || null, dueDate: (t as any).due_date || null, priority: ((t as any).priority || "medium") as TaskPriority, tags: (t as any).tags || [] })),
      photos: photos
        .filter((ph) => ph.project_id === p.id)
        .map((ph) => ({ id: ph.id, name: ph.name, dataUrl: ph.data_url, createdAt: ph.created_at })),
      blueprints: blueprints
        .filter((b) => b.project_id === p.id)
        .map((b) => ({ id: b.id, name: b.name, dataUrl: b.data_url, createdAt: b.created_at })),
      changeOrders: orders
        .filter((o) => o.project_id === p.id)
        .map((o) => ({ id: o.id, text: o.text, createdAt: o.created_at })),
      members: members
        .filter((m) => m.project_id === p.id)
        .map((m) => {
          const profile = m.profiles as any;
          return {
            id: m.id,
            userId: m.user_id,
            role: m.role as "editor" | "viewer",
            displayName: profile?.display_name || null,
            avatarUrl: profile?.avatar_url || null,
          };
        }),
    }));

    // Cache for offline use
    cacheProjects(assembled);
    initialLoadDone.current = true;
    setProjects(assembled);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Debounced real-time subscriptions to avoid refetch storms
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedFetch = useCallback(() => {
    if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = setTimeout(() => fetchProjects(), 500);
  }, [fetchProjects]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("project-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "photos" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "blueprints" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "change_orders" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_members" }, debouncedFetch)
      .subscribe();

    return () => {
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [user, debouncedFetch]);

  const addProject = useCallback(async (name: string, parentId?: string) => {
    if (!user) throw new Error("Not authenticated");
    
    const { data, error } = await supabase
      .from("projects")
      .insert({ name, parent_id: parentId || null })
      .select()
      .single();
    
    if (error) throw error;

    // Add creator as editor
    await supabase.from("project_members").insert({
      project_id: data.id,
      user_id: user.id,
      role: "editor",
    });

    // If sub-project, inherit parent's members
    if (parentId) {
      const { data: parentMembers } = await supabase
        .from("project_members")
        .select("user_id, role")
        .eq("project_id", parentId)
        .neq("user_id", user.id);
      
      if (parentMembers && parentMembers.length > 0) {
        await supabase.from("project_members").insert(
          parentMembers.map((m) => ({
            project_id: data.id,
            user_id: m.user_id,
            role: m.role,
          }))
        );
      }
    }

    const displayName = user.user_metadata?.display_name || user.email || "Unknown";
    const actionType = parentId ? "sub_project_created" : "project_created";
    const desc = parentId ? `created sub-project "${name}"` : `created project "${name}"`;
    await logActivity(user.id, displayName, data.id, actionType, desc);

    await fetchProjects();
    return data.id;
  }, [user, fetchProjects]);

  const updateProject = useCallback(async (id: string, partial: Partial<ProjectData>) => {
    if (!user) return;
    const displayName = user.user_metadata?.display_name || user.email || "Unknown";

    // Update project fields
    const projectFields: Record<string, any> = {};
    if (partial.name !== undefined) projectFields.name = partial.name;
    if (partial.totalBudget !== undefined) projectFields.total_budget = partial.totalBudget;
    if (partial.laborCosts !== undefined) projectFields.labor_costs = partial.laborCosts;
    if (partial.materialCosts !== undefined) projectFields.material_costs = partial.materialCosts;
    if (partial.startDate !== undefined) projectFields.start_date = partial.startDate;
    if (partial.endDate !== undefined) projectFields.end_date = partial.endDate;

    if (Object.keys(projectFields).length > 0) {
      await supabase.from("projects").update(projectFields).eq("id", id);
      // Log budget changes
      if (partial.totalBudget !== undefined || partial.laborCosts !== undefined || partial.materialCosts !== undefined) {
        await logActivity(user.id, displayName, id, "budget_updated", "updated budget");
      }
      if (partial.name !== undefined) {
        await logActivity(user.id, displayName, id, "project_updated", `renamed project to "${partial.name}"`);
      }
      if (partial.startDate !== undefined || partial.endDate !== undefined) {
        await logActivity(user.id, displayName, id, "project_updated", "updated project dates");
      }
    }

    // Sync tasks if provided
    if (partial.tasks !== undefined) {
      const oldProject = projectsRef.current.find(p => p.id === id);
      const oldTasks = oldProject?.tasks || [];
      await syncTasks(id, partial.tasks);
      // Detect changes for logging
      const newCompleted = partial.tasks.filter(t => t.completed && !oldTasks.find(o => o.id === t.id && o.completed));
      const newTasks = partial.tasks.filter(t => !oldTasks.find(o => o.id === t.id));
      if (newTasks.length > 0) {
        for (const t of newTasks) {
          await logActivity(user.id, displayName, id, "task_created", `added task "${t.title}"`);
        }
      }
      if (newCompleted.length > 0) {
        for (const t of newCompleted) {
          await logActivity(user.id, displayName, id, "task_completed", `completed task "${t.title}"`);
        }
      }
    }

    // Sync photos if provided
    if (partial.photos !== undefined) {
      const oldPhotos = projectsRef.current.find(p => p.id === id)?.photos || [];
      await syncPhotos(id, partial.photos);
      const addedPhotos = partial.photos.filter(p => !oldPhotos.find(o => o.id === p.id));
      for (const p of addedPhotos) {
        await logActivity(user.id, displayName, id, "photo_uploaded", `uploaded photo "${p.name}"`);
      }
    }

    // Sync blueprints if provided
    if (partial.blueprints !== undefined) {
      const oldBlueprints = projectsRef.current.find(p => p.id === id)?.blueprints || [];
      await syncBlueprints(id, partial.blueprints);
      const addedBp = partial.blueprints.filter(b => !oldBlueprints.find(o => o.id === b.id));
      for (const b of addedBp) {
        await logActivity(user.id, displayName, id, "blueprint_uploaded", `uploaded blueprint "${b.name}"`);
      }
    }

    // Sync change orders if provided
    if (partial.changeOrders !== undefined) {
      const oldOrders = projectsRef.current.find(p => p.id === id)?.changeOrders || [];
      await syncChangeOrders(id, partial.changeOrders);
      const addedOrders = partial.changeOrders.filter(o => !oldOrders.find(old => old.id === o.id));
      for (const o of addedOrders) {
        await logActivity(user.id, displayName, id, "change_order_added", `added change order`);
      }
    }

    // Optimistic local update
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...partial } : p)));
  }, [user]);

  const syncTasks = async (projectId: string, tasks: Task[]) => {
    // Delete existing tasks and re-insert (simple sync)
    // Insert parent tasks first (no parentTaskId), then subtasks
    await supabase.from("tasks").delete().eq("project_id", projectId);
    if (tasks.length > 0) {
      const parentTasks = tasks.filter(t => !t.parentTaskId);
      const subTasks = tasks.filter(t => t.parentTaskId);
      if (parentTasks.length > 0) {
        await supabase.from("tasks").insert(
          parentTasks.map((t, i) => ({
            id: t.id,
            project_id: projectId,
            title: t.title,
            notes: t.notes,
            completed: t.completed,
            sort_order: i,
            parent_task_id: null,
            due_date: t.dueDate || null,
            priority: t.priority || "medium",
            tags: t.tags || [],
          }))
        );
      }
      if (subTasks.length > 0) {
        await supabase.from("tasks").insert(
          subTasks.map((t, i) => ({
            id: t.id,
            project_id: projectId,
            title: t.title,
            notes: t.notes,
            completed: t.completed,
            sort_order: i + parentTasks.length,
            parent_task_id: t.parentTaskId,
            due_date: t.dueDate || null,
            priority: t.priority || "medium",
            tags: t.tags || [],
          }))
        );
      }
    }
  };

  const syncPhotos = async (projectId: string, photos: FileAttachment[]) => {
    const existing = projectsRef.current.find((p) => p.id === projectId)?.photos || [];
    const existingIds = new Set(existing.map((p) => p.id));
    const newIds = new Set(photos.map((p) => p.id));

    // Delete removed
    const toDelete = existing.filter((p) => !newIds.has(p.id));
    for (const p of toDelete) {
      await supabase.from("photos").delete().eq("id", p.id);
    }

    // Insert new
    const toInsert = photos.filter((p) => !existingIds.has(p.id));
    if (toInsert.length > 0) {
      await supabase.from("photos").insert(
        toInsert.map((p) => ({
          id: p.id,
          project_id: projectId,
          name: p.name,
          data_url: p.dataUrl,
        }))
      );
    }
  };

  const syncBlueprints = async (projectId: string, blueprints: FileAttachment[]) => {
    const existing = projectsRef.current.find((p) => p.id === projectId)?.blueprints || [];
    const existingIds = new Set(existing.map((b) => b.id));
    const newIds = new Set(blueprints.map((b) => b.id));

    const toDelete = existing.filter((b) => !newIds.has(b.id));
    for (const b of toDelete) {
      await supabase.from("blueprints").delete().eq("id", b.id);
    }

    const toInsert = blueprints.filter((b) => !existingIds.has(b.id));
    if (toInsert.length > 0) {
      await supabase.from("blueprints").insert(
        toInsert.map((b) => ({
          id: b.id,
          project_id: projectId,
          name: b.name,
          data_url: b.dataUrl,
        }))
      );
    }
  };

  const syncChangeOrders = async (projectId: string, orders: ChangeOrder[]) => {
    const existing = projectsRef.current.find((p) => p.id === projectId)?.changeOrders || [];
    const existingIds = new Set(existing.map((o) => o.id));
    const newIds = new Set(orders.map((o) => o.id));

    const toDelete = existing.filter((o) => !newIds.has(o.id));
    for (const o of toDelete) {
      await supabase.from("change_orders").delete().eq("id", o.id);
    }

    const toInsert = orders.filter((o) => !existingIds.has(o.id));
    if (toInsert.length > 0) {
      await supabase.from("change_orders").insert(
        toInsert.map((o) => ({
          id: o.id,
          project_id: projectId,
          text: o.text,
        }))
      );
    }
  };

  const deleteProject = useCallback(async (id: string) => {
    await supabase.from("projects").delete().eq("id", id);
    setProjects((prev) => prev.filter((p) => p.id !== id && p.parentId !== id));
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

  const refreshProject = useCallback(async (id: string) => {
    await fetchProjects();
  }, [fetchProjects]);

  const addMember = useCallback(async (projectId: string, email: string, role: "editor" | "viewer") => {
    if (!user) return { error: "Not authenticated" };
    const displayName = user.user_metadata?.display_name || user.email || "Unknown";

    const { data, error } = await supabase.rpc("find_user_by_email", { _email: email });
    
    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      return { error: "User not found. They must have an account first." };
    }

    const userId = Array.isArray(data) ? data[0]?.id : (data as any)?.id;

    const { error: insertError } = await supabase.from("project_members").insert({
      project_id: projectId,
      user_id: userId,
      role,
    });

    if (insertError) {
      if (insertError.message.includes("duplicate")) {
        return { error: "User is already a member of this project." };
      }
      return { error: insertError.message };
    }

    await logActivity(user.id, displayName, projectId, "member_added", `invited ${email} as ${role}`);
    await fetchProjects();
    return { error: null };
  }, [user, fetchProjects]);

  const removeMember = useCallback(async (projectId: string, memberId: string) => {
    if (!user) return;
    const displayName = user.user_metadata?.display_name || user.email || "Unknown";
    const project = projectsRef.current.find(p => p.id === projectId);
    const member = project?.members.find(m => m.id === memberId);
    await supabase.from("project_members").delete().eq("id", memberId);
    await logActivity(user.id, displayName, projectId, "member_removed", `removed ${member?.displayName || "a member"}`);
    await fetchProjects();
  }, [user, fetchProjects]);

  const updateMemberRole = useCallback(async (projectId: string, memberId: string, role: "editor" | "viewer") => {
    if (!user) return;
    const displayName = user.user_metadata?.display_name || user.email || "Unknown";
    const project = projectsRef.current.find(p => p.id === projectId);
    const member = project?.members.find(m => m.id === memberId);
    await supabase.from("project_members").update({ role }).eq("id", memberId);
    await logActivity(user.id, displayName, projectId, "member_updated", `changed ${member?.displayName || "a member"} role to ${role}`);
    await fetchProjects();
  }, [user, fetchProjects]);

  const userRole = useCallback((projectId: string): "editor" | "viewer" | null => {
    if (!user) return null;
    const project = projects.find((p) => p.id === projectId);
    const member = project?.members.find((m) => m.userId === user.id);
    return member?.role || null;
  }, [user, projects]);

  return (
    <ProjectsContext.Provider value={{
      projects, loading, addProject, updateProject, deleteProject,
      getProject, getSubProjects, getTopLevelProjects, refreshProject,
      addMember, removeMember, updateMemberRole, userRole,
    }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be inside ProjectsProvider");
  return ctx;
}
