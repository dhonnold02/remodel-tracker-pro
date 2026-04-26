import { supabase } from "@/integrations/supabase/client";

const INVITE_KEY = "sightline.pendingInviteToken";

export const stashInviteToken = (token: string | null) => {
  if (!token) return;
  try {
    sessionStorage.setItem(INVITE_KEY, token);
  } catch {
    /* ignore */
  }
};

export const consumeInviteToken = (): string | null => {
  try {
    const t = sessionStorage.getItem(INVITE_KEY);
    if (t) sessionStorage.removeItem(INVITE_KEY);
    return t;
  } catch {
    return null;
  }
};

export const peekInviteToken = (): string | null => {
  try {
    return sessionStorage.getItem(INVITE_KEY);
  } catch {
    return null;
  }
};

export interface AcceptInviteResult {
  ok: boolean;
  reason?: "not_found" | "expired" | "accepted" | "already_member" | "error";
  companyId?: string;
  role?: string;
}

/**
 * Accept a pending invitation for the currently authenticated user.
 * Idempotent: safe to call repeatedly.
 */
export const acceptInvitation = async (
  token: string,
  userId: string
): Promise<AcceptInviteResult> => {
  const { data: invite, error } = await supabase
    .from("company_invitations")
    .select("id, company_id, role, accepted_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !invite) return { ok: false, reason: "not_found" };
  if (invite.accepted_at) return { ok: false, reason: "accepted" };
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  // Already a member of this company? Just mark invite accepted.
  const { data: existing } = await supabase
    .from("company_members")
    .select("id")
    .eq("company_id", invite.company_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    const { error: insertErr } = await supabase.from("company_members").insert({
      company_id: invite.company_id,
      user_id: userId,
      role: invite.role,
    });
    if (insertErr) return { ok: false, reason: "error" };
  }

  await supabase
    .from("company_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return { ok: true, companyId: invite.company_id, role: invite.role };
};