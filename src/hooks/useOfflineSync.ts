import { uuidv4 } from "@/lib/uuid";
import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const OFFLINE_QUEUE_KEY = "remodel_offline_queue";
const OFFLINE_CACHE_KEY = "remodel_offline_cache";

interface QueuedAction {
  id: string;
  table: string;
  type: "insert" | "update" | "delete";
  data: any;
  timestamp: number;
  attempts?: number;
}

// Save project data to local cache
export function cacheProjects(projects: any[]) {
  try {
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify({ projects, cachedAt: Date.now() }));
  } catch { /* storage full */ }
}

// Load cached projects
export function getCachedProjects(): { projects: any[]; cachedAt: number } | null {
  try {
    const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Queue an offline action
export function queueOfflineAction(action: Omit<QueuedAction, "id" | "timestamp">) {
  try {
    const queue = getOfflineQueue();
    queue.push({ ...action, id: uuidv4(), timestamp: Date.now() });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch { /* storage full */ }
}

function getOfflineQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function setOfflineQueue(queue: QueuedAction[]) {
  try {
    if (queue.length === 0) {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    } else {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch { /* storage full */ }
}

const MAX_RETRIES = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Hook to sync offline actions when back online
export function useOfflineSync() {
  const { user } = useAuth();
  const syncingRef = useRef(false);

  const syncQueue = useCallback(async () => {
    if (syncingRef.current || !user) return;
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    syncingRef.current = true;
    let synced = 0;
    const failed: QueuedAction[] = [];

    try {
      const { supabase } = await import("@/integrations/supabase/client");

      for (const action of queue) {
        const startingAttempts = action.attempts ?? 0;
        let success = false;
        let attempt = startingAttempts;

        while (attempt < MAX_RETRIES && !success) {
          try {
            let error: any = null;
            if (action.type === "insert") {
              ({ error } = await supabase.from(action.table as any).insert(action.data));
            } else if (action.type === "update") {
              const { id, ...rest } = action.data;
              ({ error } = await supabase.from(action.table as any).update(rest).eq("id", id));
            } else if (action.type === "delete") {
              ({ error } = await supabase.from(action.table as any).delete().eq("id", action.data.id));
            }
            if (error) throw error;
            success = true;
          } catch {
            attempt++;
            if (attempt < MAX_RETRIES) {
              // Exponential backoff: 500ms, 1000ms, 2000ms
              await sleep(500 * Math.pow(2, attempt - 1));
            }
          }
        }

        if (success) {
          synced++;
        } else {
          failed.push({ ...action, attempts: attempt });
        }
      }

      setOfflineQueue(failed);
      if (synced > 0) {
        toast.success(`Synced ${synced} offline change${synced !== 1 ? "s" : ""}`);
      }
      if (failed.length > 0) {
        toast.error("Some changes couldn't be saved — please check your connection");
      }
    } finally {
      syncingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    const handleOnline = () => {
      syncQueue();
    };

    window.addEventListener("online", handleOnline);

    // Try to sync on mount if online
    if (navigator.onLine) {
      syncQueue();
    }

    return () => window.removeEventListener("online", handleOnline);
  }, [syncQueue]);

  return { isOnline: typeof navigator !== "undefined" ? navigator.onLine : true };
}

// Hook to track online status reactively
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
