import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useActivityLog() {
  const { user } = useAuth();

  const logActivity = useCallback(
    async (projectId: string, actionType: string, description: string) => {
      if (!user) return;
      const displayName =
        user.user_metadata?.display_name || user.email || "Unknown";
      await supabase.from("activity_logs").insert({
        project_id: projectId,
        user_id: user.id,
        user_name: displayName,
        action_type: actionType,
        description: description,
      });
    },
    [user]
  );

  return { logActivity };
}
