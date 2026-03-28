import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckSquare, DollarSign, Camera, FileText, FolderPlus, ClipboardList, Activity } from "lucide-react";
import { format } from "date-fns";

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

  const fetchLogs = async () => {
    const { data } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(100);
    setLogs((data as ActivityEntry[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const channel = supabase
      .channel(`activity-${projectId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs", filter: `project_id=eq.${projectId}` }, () => fetchLogs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  const filtered = logs.filter((l) => matchesFilter(l.action_type, filter));

  return (
    <div className="space-y-3">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(ACTION_CATEGORIES) as CategoryKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-[10px] px-2.5 py-1 rounded-full transition-all duration-150 ${
              filter === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {ACTION_CATEGORIES[key].label}
          </button>
        ))}
      </div>

      {/* Log entries */}
      <div className="space-y-0.5 max-h-72 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No activity yet.</p>
        ) : (
          filtered.map((log) => {
            const Icon = getActionIcon(log.action_type);
            return (
              <div key={log.id} className="flex items-start gap-2.5 py-2 border-b border-border/40 last:border-0">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
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
          })
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
