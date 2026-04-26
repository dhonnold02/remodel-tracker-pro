import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type Role =
  | "owner"
  | "project_manager"
  | "field_supervisor"
  | "crew"
  | "subcontractor";

export interface RoleState {
  role: Role | null;
  companyId: string | null;
  loading: boolean;
  isOwner: boolean;
  canEditProjects: boolean;
  canViewFinancials: boolean;
  canEditTasks: boolean;
  canCompleteTasks: boolean;
  canAddPhotos: boolean;
  canAddNotes: boolean;
  canEditTimeline: boolean;
  canViewPunchOut: boolean;
  canEditPunchOut: boolean;
  canSignOffPunchOut: boolean;
  canViewChangeOrders: boolean;
  canInviteMembers: boolean;
  canAccessSettings: boolean;
  refresh: () => Promise<void>;
}

const has = (role: Role | null, ...roles: Role[]) =>
  !!role && roles.includes(role);

/**
 * useRole — fetches the signed-in user's role for their company and exposes
 * permission booleans matching the Sightline RBAC matrix.
 *
 * If the user has no membership row but does own a `company_settings` record,
 * we backfill an `owner` membership client-side (existing accounts).
 */
export const useRole = (): RoleState => {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setRole(null);
      setCompanyId(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    // 1. Try reading existing membership.
    const { data: membership } = await supabase
      .from("company_members")
      .select("role, company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership) {
      setRole(membership.role as Role);
      setCompanyId(membership.company_id);
      setLoading(false);
      return;
    }

    // 2. No membership — fall back to company_settings ownership and backfill.
    const { data: settings } = await supabase
      .from("company_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (settings?.id) {
      const { data: inserted } = await supabase
        .from("company_members")
        .insert({ company_id: settings.id, user_id: user.id, role: "owner" })
        .select("role, company_id")
        .maybeSingle();
      if (inserted) {
        setRole(inserted.role as Role);
        setCompanyId(inserted.company_id);
        setLoading(false);
        return;
      }
    }

    // 3. No company yet (signed up but didn't finish onboarding).
    setRole(null);
    setCompanyId(null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  return {
    role,
    companyId,
    loading: authLoading || loading,
    isOwner: role === "owner",
    canEditProjects: has(role, "owner", "project_manager"),
    canViewFinancials: has(role, "owner", "project_manager"),
    canEditTasks: has(role, "owner", "project_manager", "field_supervisor"),
    canCompleteTasks: has(role, "owner", "project_manager", "field_supervisor", "crew"),
    canAddPhotos: !!role,
    canAddNotes: !!role,
    canEditTimeline: has(role, "owner", "project_manager", "field_supervisor"),
    canViewPunchOut: !!role,
    canEditPunchOut: has(role, "owner", "project_manager", "field_supervisor"),
    canSignOffPunchOut: has(role, "owner", "project_manager"),
    canViewChangeOrders: has(role, "owner", "project_manager", "field_supervisor"),
    canInviteMembers: role === "owner",
    canAccessSettings: role === "owner",
    refresh: load,
  };
};