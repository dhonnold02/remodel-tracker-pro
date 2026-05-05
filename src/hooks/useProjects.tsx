import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cacheProjects, getCachedProjects } from "@/hooks/useOfflineSync";
import { toast } from "sonner";
import { showSuccess, showError } from "@/lib/toast";

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

/** Build initials from a display name (max 2 chars). */
export const getInitials = (name?: string | null): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
  phase?: string;
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
  authorName: string;
  authorInitials: string;
  createdBy?: string | null;
  comments: ChangeOrderComment[];
}

export interface ChangeOrderComment {
  id: string;
  changeOrderId: string;
  text: string;
  authorName: string;
  authorInitials: string;
  createdBy?: string | null;
  createdAt: string;
}

export interface ProjectMember {
  id: string;
  userId: string;
  role: "editor" | "viewer";
  displayName: string | null;
  avatarUrl: string | null;
  email?: string;
}

export interface Invoice {
  id: string;
  type: "homeowner" | "subcontractor";
  description: string;
  amount: number;
  paid: boolean;
}

export type ProjectEventType = "inspection" | "walkthrough" | "delivery" | "meeting" | "milestone" | "other";

export interface ProjectEvent {
  id: string;
  title: string;
  type: ProjectEventType;
  date: string; // yyyy-MM-dd
  time?: string | null;
}

export interface ProjectData {
  id: string;
  name: string;
  address: string;
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
  invoices: Invoice[];
  members: ProjectMember[];
  createdBy: string | null;
  createdAt: string;
  taskPhases: string[];
  events: ProjectEvent[];
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
  secondaryContactName: string;
  secondaryContactPhone: string;
  secondaryContactEmail: string;
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

  // Stable refs to sync helpers (declared below) so updateProject's
  // useCallback deps stay correct without recreating on every render.
  const syncRef = useRef({
    syncTasks: null as null | ((projectId: string, tasks: Task[]) => Promise<void>),
    syncPhotos: null as null | ((projectId: string, photos: FileAttachment[]) => Promise<void>),
    syncBlueprints: null as null | ((projectId: string, blueprints: FileAttachment[]) => Promise<void>),
    syncChangeOrders: null as null | ((projectId: string, orders: ChangeOrder[]) => Promise<void>),
    syncInvoices: null as null | ((projectId: string, invoices: Invoice[]) => Promise<void>),
    syncEvents: null as null | ((projectId: string, events: ProjectEvent[]) => Promise<void>),
  });

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
    const { data: memberships, error: membershipsError } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", user.id);

    if (membershipsError) {
      showError("Failed to load projects — please refresh");
      setLoading(false);
      return;
    }

    if (!memberships || memberships.length === 0) {
      setProjects([]);
      setLoading(false);
      return;
    }

    const projectIds = memberships.map((m) => m.project_id);

    // Fetch projects
    const { data: projectRows, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .in("id", projectIds);

    if (projectsError) {
      showError("Failed to load projects — please refresh");
      setLoading(false);
      return;
    }
    if (!projectRows) { setProjects([]); setLoading(false); return; }

    // Fetch related data for all projects in parallel
    const [tasksRes, photosRes, blueprintsRes, ordersRes, membersRes, invoicesRes, commentsRes, eventsRes] = await Promise.all([
      supabase.from("tasks").select("*").in("project_id", projectIds).order("sort_order"),
      supabase.from("photos").select("*").in("project_id", projectIds),
      supabase.from("blueprints").select("*").in("project_id", projectIds),
      supabase.from("change_orders").select("*").in("project_id", projectIds).order("created_at", { ascending: false }),
      supabase.from("project_members").select("id, project_id, user_id, role, profiles(display_name, avatar_url)").in("project_id", projectIds),
      supabase.from("invoices").select("*").in("project_id", projectIds).order("created_at"),
      supabase.from("change_order_comments").select("*").in("project_id", projectIds).order("created_at"),
      supabase.from("project_events").select("*").in("project_id", projectIds).order("date"),
    ]);

    const relatedErrors: { res: { error: any }; label: string }[] = [
      { res: tasksRes, label: "tasks" },
      { res: photosRes, label: "photos" },
      { res: blueprintsRes, label: "blueprints" },
      { res: ordersRes, label: "change orders" },
      { res: membersRes, label: "team members" },
      { res: invoicesRes, label: "invoices" },
      { res: commentsRes, label: "comments" },
      { res: eventsRes, label: "events" },
    ];
    for (const { res, label } of relatedErrors) {
      if (res.error) {
        showError(`Failed to load ${label} — please refresh`);
      }
    }

    const tasks = tasksRes.data || [];
    const photos = photosRes.data || [];
    const blueprints = blueprintsRes.data || [];
    const orders = ordersRes.data || [];
    const members = membersRes.data || [];
    const invoicesData = invoicesRes.data || [];
    const commentsData = commentsRes.data || [];
    const eventsData = eventsRes.data || [];

    const assembled: ProjectData[] = projectRows.map((p) => ({
      id: p.id,
      name: p.name,
      address: (p as any).address || "",
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
        .map((t) => ({ id: t.id, title: t.title, notes: t.notes, completed: t.completed, parentTaskId: (t as any).parent_task_id || null, dueDate: (t as any).due_date || null, priority: ((t as any).priority || "medium") as TaskPriority, tags: (t as any).tags || [], phase: (t as any).phase || "General" })),
      photos: photos
        .filter((ph) => ph.project_id === p.id)
        .map((ph) => ({ id: ph.id, name: ph.name, dataUrl: ph.data_url, createdAt: ph.created_at })),
      blueprints: blueprints
        .filter((b) => b.project_id === p.id)
        .map((b) => ({ id: b.id, name: b.name, dataUrl: b.data_url, createdAt: b.created_at })),
      changeOrders: orders
        .filter((o) => o.project_id === p.id)
        .map((o) => ({
          id: o.id,
          text: o.text,
          createdAt: o.created_at,
          authorName: (o as any).created_by_name || "Unknown",
          authorInitials: getInitials((o as any).created_by_name),
          createdBy: (o as any).created_by || null,
          comments: commentsData
            .filter((c) => c.change_order_id === o.id)
            .map((c) => ({
              id: c.id,
              changeOrderId: c.change_order_id,
              text: c.text,
              authorName: c.created_by_name || "Unknown",
              authorInitials: getInitials(c.created_by_name),
              createdBy: c.created_by,
              createdAt: c.created_at,
            })),
        })),
      invoices: invoicesData
        .filter((inv) => inv.project_id === p.id)
        .map((inv) => ({ id: inv.id, type: inv.type as "homeowner" | "subcontractor", description: inv.description, amount: Number(inv.amount), paid: inv.paid })),
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
      taskPhases: ((p as any).task_phases as string[]) || ["Demo", "Framing", "Electrical", "Plumbing", "Finish"],
      events: eventsData
        .filter((e) => e.project_id === p.id)
        .map((e) => ({
          id: e.id,
          title: e.title,
          type: (e.type || "other") as ProjectEventType,
          date: e.date,
          time: e.time || null,
        })),
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
      .on("postgres_changes", { event: "*", schema: "public", table: "change_order_comments" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_members" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_events" }, debouncedFetch)
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
    if ((partial as any).address !== undefined) projectFields.address = (partial as any).address;
    if (partial.totalBudget !== undefined) projectFields.total_budget = partial.totalBudget;
    if (partial.laborCosts !== undefined) projectFields.labor_costs = partial.laborCosts;
    if (partial.materialCosts !== undefined) projectFields.material_costs = partial.materialCosts;
    if (partial.startDate !== undefined) projectFields.start_date = partial.startDate;
    if (partial.endDate !== undefined) projectFields.end_date = partial.endDate;
    if ((partial as any).taskPhases !== undefined) projectFields.task_phases = (partial as any).taskPhases;

    if (Object.keys(projectFields).length > 0) {
      await supabase.from("projects").update(projectFields as any).eq("id", id);
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
      await syncRef.current.syncTasks?.(id, partial.tasks);
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
      await syncRef.current.syncPhotos?.(id, partial.photos);
      const addedPhotos = partial.photos.filter(p => !oldPhotos.find(o => o.id === p.id));
      for (const p of addedPhotos) {
        await logActivity(user.id, displayName, id, "photo_uploaded", `uploaded photo "${p.name}"`);
      }
    }

    // Sync blueprints if provided
    if (partial.blueprints !== undefined) {
      const oldBlueprints = projectsRef.current.find(p => p.id === id)?.blueprints || [];
      await syncRef.current.syncBlueprints?.(id, partial.blueprints);
      const addedBp = partial.blueprints.filter(b => !oldBlueprints.find(o => o.id === b.id));
      for (const b of addedBp) {
        await logActivity(user.id, displayName, id, "blueprint_uploaded", `uploaded blueprint "${b.name}"`);
      }
    }

    // Sync change orders if provided
    if (partial.changeOrders !== undefined) {
      const oldOrders = projectsRef.current.find(p => p.id === id)?.changeOrders || [];
      await syncRef.current.syncChangeOrders?.(id, partial.changeOrders);
      const addedOrders = partial.changeOrders.filter(o => !oldOrders.find(old => old.id === o.id));
      for (const o of addedOrders) {
        await logActivity(user.id, displayName, id, "change_order_added", `added change order`);
      }
    }

    // Sync invoices if provided
    if (partial.invoices !== undefined) {
      await syncRef.current.syncInvoices?.(id, partial.invoices);
    }

    // Sync events if provided
    if ((partial as any).events !== undefined) {
      await syncRef.current.syncEvents?.(id, (partial as any).events as ProjectEvent[]);
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
            phase: t.phase || "General",
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
            phase: t.phase || "General",
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
          created_by: o.createdBy ?? null,
          created_by_name: o.authorName || "",
        }))
      );
    }

    // Sync comments per change order (insert new only; deletions are handled on the parent order via cascade)
    const existingCommentIds = new Set(
      existing.flatMap((o) => (o.comments || []).map((c) => c.id))
    );
    const newComments = orders.flatMap((o) =>
      (o.comments || [])
        .filter((c) => !existingCommentIds.has(c.id))
        .map((c) => ({
          id: c.id,
          change_order_id: o.id,
          project_id: projectId,
          text: c.text,
          created_by: c.createdBy ?? null,
          created_by_name: c.authorName || "",
        }))
    );
    if (newComments.length > 0) {
      await supabase.from("change_order_comments").insert(newComments);
    }

    // Delete removed comments (within still-existing orders)
    const stillExistingOrderIds = new Set(orders.map((o) => o.id));
    const newCommentIds = new Set(orders.flatMap((o) => (o.comments || []).map((c) => c.id)));
    const commentsToDelete = existing
      .filter((o) => stillExistingOrderIds.has(o.id))
      .flatMap((o) => (o.comments || []))
      .filter((c) => !newCommentIds.has(c.id));
    for (const c of commentsToDelete) {
      await supabase.from("change_order_comments").delete().eq("id", c.id);
    }
  };

  const syncInvoices = async (projectId: string, invoices: Invoice[]) => {
    const existing = projectsRef.current.find((p) => p.id === projectId)?.invoices || [];
    const existingIds = new Set(existing.map((i) => i.id));
    const newIds = new Set(invoices.map((i) => i.id));

    // Delete removed
    const toDelete = existing.filter((i) => !newIds.has(i.id));
    for (const i of toDelete) {
      await supabase.from("invoices").delete().eq("id", i.id);
    }

    // Insert new
    const toInsert = invoices.filter((i) => !existingIds.has(i.id));
    if (toInsert.length > 0) {
      await supabase.from("invoices").insert(
        toInsert.map((i) => ({
          id: i.id,
          project_id: projectId,
          type: i.type,
          description: i.description,
          amount: i.amount,
          paid: i.paid,
        }))
      );
    }

    // Update existing (paid status changes)
    const toUpdate = invoices.filter((i) => {
      const old = existing.find((e) => e.id === i.id);
      return old && old.paid !== i.paid;
    });
    for (const i of toUpdate) {
      await supabase.from("invoices").update({ paid: i.paid }).eq("id", i.id);
    }
  };

  const syncEvents = async (projectId: string, events: ProjectEvent[]) => {
    const existing = projectsRef.current.find((p) => p.id === projectId)?.events || [];
    const existingIds = new Set(existing.map((e) => e.id));
    const newIds = new Set(events.map((e) => e.id));

    const toDelete = existing.filter((e) => !newIds.has(e.id));
    for (const e of toDelete) {
      await supabase.from("project_events").delete().eq("id", e.id);
    }

    const toInsert = events.filter((e) => !existingIds.has(e.id));
    if (toInsert.length > 0) {
      await supabase.from("project_events").insert(
        toInsert.map((e) => ({
          id: e.id,
          project_id: projectId,
          title: e.title,
          type: e.type,
          date: e.date,
          time: e.time || null,
          created_by: user?.id ?? null,
        }))
      );
    }
  };

  const deleteProject = useCallback(async (id: string) => {
    await supabase.from("projects").delete().eq("id", id);
    setProjects((prev) => prev.filter((p) => p.id !== id && p.parentId !== id));
  }, []);

  // Keep syncRef pointing at the latest closures (they capture `user` etc.)
  syncRef.current.syncTasks = syncTasks;
  syncRef.current.syncPhotos = syncPhotos;
  syncRef.current.syncBlueprints = syncBlueprints;
  syncRef.current.syncChangeOrders = syncChangeOrders;
  syncRef.current.syncInvoices = syncInvoices;
  syncRef.current.syncEvents = syncEvents;

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
