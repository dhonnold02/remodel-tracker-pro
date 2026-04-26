import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckSquare, DollarSign, Camera, FileText, FolderPlus, ClipboardList, Activity } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ActivityEntry {
  id: string;
  user_name: string;
  action_type: string;
  description: string;
  created_at: string;
}

const ACTION_CATEGORIES = {
  all: { label: "All" },
  task: { label: "Tasks" },
  budget: { label: "Budget" },
  photo: { label: "Photos" },
  blueprint: { label: "Blueprints" },
  change_order: { label: "Notes" },
  project: { label: "Project" },
  member: { label: "Team" },
} as const;

type CategoryKey = keyof typeof ACTION_CATEGORIES;

const getActionIcon = (type: string) => {
  if (type.startsWith("task")) return CheckSquare;
  if (type.startsWith("budget")) return DollarSign;
  if (type.startsWith("photo")) return Camera;
  if (type.startsWith("blueprint")) return FileText;
  if (type.startsWith("change_order")) return ClipboardList;
  if (type.startsWith("project") || type.startsWith("sub_project")) return FolderPlus;
  if (type.startsWith("member")) return Activity;
  return Activity;
};

const matchesFilter = (actionType: string, filter: CategoryKey): boolean => {
  if (filter === "all") return true;
  if (filter === "project") return actionType.startsWith("project") || actionType.startsWith("sub_project");
  return actionType.startsWith(filter);
};

interface ActivityLogProps {
  projectId: string;
}

const ActivityLog = ({ projectId }: ActivityLogProps) => {
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [filter, setFilter] = useState<CategoryKey>("all");
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error("Failed to load activity log — please refresh");
      setLoading(false);
      return;
    }
    setLogs((data as ActivityEntry[]) || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchLogs();
    const channel = supabase
      .channel(`activity-${projectId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs", filter: `project_id=eq.${projectId}` }, () => fetchLogs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, fetchLogs]);

  const filtered = logs.filter((l) => matchesFilter(l.action_type, filter));

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(ACTION_CATEGORIES) as CategoryKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-[10px] px-3 py-1.5 rounded-full transition-all duration-150 font-medium ${
              filter === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {ACTION_CATEGORIES[key].label}
          </button>
        ))}
      </div>

      {/* Timeline-style log entries */}
      <div className="relative max-h-80 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No activity yet.</p>
        ) : (
          <div className="relative pl-6">
            {/* Vertical timeline line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

            {filtered.map((log) => {
              const Icon = getActionIcon(log.action_type);
              return (
                <div key={log.id} className="relative flex items-start gap-3 pb-4 last:pb-0">
                  <div className="absolute -left-6 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card border shadow-sm z-10">
                    <Icon className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-xs text-foreground leading-relaxed">
                      <span className="font-medium">{log.user_name}</span>{" "}
                      <span className="text-muted-foreground">{log.description}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(new Date(log.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
