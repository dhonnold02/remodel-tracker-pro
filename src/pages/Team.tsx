import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole, type Role } from "@/hooks/useRole";
import AppLayout from "@/components/AppLayout";
import PageLoader from "@/components/PageLoader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Copy, Info, Loader2, Mail, Trash2, UserPlus, X, Check, MoreHorizontal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type InvitableRole = Exclude<Role, "owner">;

interface MemberRow {
  id: string;
  user_id: string;
  role: Role;
  joined_at: string;
  display_name: string | null;
  email: string | null;
}

interface InvitationRow {
  id: string;
  invited_email: string;
  role: InvitableRole;
  token: string;
  expires_at: string;
  accepted_at: string | null;
}

const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  project_manager: "Project Manager",
  field_supervisor: "Field Supervisor",
  crew: "Crew",
  subcontractor: "Subcontractor",
};

const ROLE_BADGE: Record<Role, string> = {
  owner: "bg-primary/15 text-primary ring-1 ring-primary/30",
  project_manager: "bg-accent/60 text-accent-foreground ring-1 ring-border",
  field_supervisor: "bg-accent/40 text-accent-foreground ring-1 ring-border",
  crew: "bg-secondary text-foreground ring-1 ring-border",
  subcontractor: "bg-muted text-muted-foreground ring-1 ring-border",
};

const INVITABLE_ROLES: InvitableRole[] = [
  "project_manager",
  "field_supervisor",
  "crew",
  "subcontractor",
];

const PERMISSION_ROLES: Role[] = [
  "owner",
  "project_manager",
  "field_supervisor",
  "crew",
  "subcontractor",
];

const PERMISSIONS: { feature: string; allowed: Role[] }[] = [
  { feature: "Create / delete projects", allowed: ["owner", "project_manager"] },
  { feature: "Edit project details", allowed: ["owner", "project_manager"] },
  { feature: "View financials & budget", allowed: ["owner", "project_manager"] },
  { feature: "View invoices", allowed: ["owner", "project_manager"] },
  { feature: "Edit tasks", allowed: ["owner", "project_manager", "field_supervisor"] },
  { feature: "Complete tasks", allowed: ["owner", "project_manager", "field_supervisor", "crew"] },
  { feature: "View tasks", allowed: ["owner", "project_manager", "field_supervisor", "crew", "subcontractor"] },
  { feature: "Add photos", allowed: ["owner", "project_manager", "field_supervisor", "crew", "subcontractor"] },
  { feature: "Add notes & comments", allowed: ["owner", "project_manager", "field_supervisor", "crew", "subcontractor"] },
  { feature: "Edit timeline", allowed: ["owner", "project_manager", "field_supervisor"] },
  { feature: "View punch out", allowed: ["owner", "project_manager", "field_supervisor", "crew", "subcontractor"] },
  { feature: "Edit punch out items", allowed: ["owner", "project_manager", "field_supervisor"] },
  { feature: "Sign off punch out", allowed: ["owner", "project_manager"] },
  { feature: "Invite team members", allowed: ["owner"] },
  { feature: "Access settings", allowed: ["owner"] },
  { feature: "View change orders", allowed: ["owner", "project_manager", "field_supervisor"] },
];

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
};

const daysUntil = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const days = Math.ceil(ms / 86400000);
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
};

const Team = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOwner, companyId, loading: roleLoading } = useRole();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InvitableRole>("crew");
  const [inviting, setInviting] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [fallbackInviteLink, setFallbackInviteLink] = useState<string | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  // Owner-only — kick others out.
  useEffect(() => {
    if (roleLoading) return;
    if (!isOwner) navigate("/", { replace: true });
  }, [roleLoading, isOwner, navigate]);

  const loadAll = async () => {
    if (!companyId) return;
    setLoading(true);

    // 1. Members.
    const { data: rawMembers } = await supabase
      .from("company_members")
      .select("id, user_id, role, joined_at")
      .eq("company_id", companyId)
      .order("joined_at", { ascending: true });

    const userIds = (rawMembers || []).map((m) => m.user_id);
    const profileMap = new Map<string, { display_name: string | null; email: string | null }>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds);
      (profiles || []).forEach((p: any) =>
        profileMap.set(p.id, { display_name: p.display_name, email: p.email })
      );
    }

    const enriched: MemberRow[] = (rawMembers || []).map((m) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role as Role,
      joined_at: m.joined_at,
      display_name: profileMap.get(m.user_id)?.display_name ?? null,
      email:
        profileMap.get(m.user_id)?.email ??
        (m.user_id === user?.id ? user?.email ?? null : null),
    }));
    setMembers(enriched);

    // 2. Pending invitations.
    const { data: invs } = await supabase
      .from("company_invitations")
      .select("id, invited_email, role, token, expires_at, accepted_at")
      .eq("company_id", companyId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    setInvitations(((invs || []) as any) as InvitationRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (companyId) void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const sendInvite = async () => {
    if (!companyId || !user) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Enter a valid email");
      return;
    }
    setInviting(true);
    const { data, error } = await supabase
      .from("company_invitations")
      .insert({
        company_id: companyId,
        invited_email: email,
        role: inviteRole,
        invited_by: user.id,
      })
      .select("token")
      .maybeSingle();
    setInviting(false);

    if (error || !data) {
      toast.error(error?.message || "Could not create invitation");
      return;
    }

    const link = `${window.location.origin}/auth?token=${data.token}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied to clipboard");
      setFallbackInviteLink(null);
    } catch {
      toast.success("Invite created — copy the link below manually");
      setFallbackInviteLink(link);
    }
    setInviteEmail("");
    void loadAll();
  };

  const copyInviteLink = async (token: string) => {
    const link = `${window.location.origin}/auth?token=${token}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied");
    } catch {
      toast.error("Couldn't copy — copy the link manually below");
      setFallbackInviteLink(link);
    }
  };

  const revokeInvite = async (id: string) => {
    const { error } = await supabase.from("company_invitations").delete().eq("id", id);
    if (error) {
      toast.error("Could not revoke invitation");
      return;
    }
    toast.success("Invitation revoked");
    void loadAll();
  };

  const changeRole = async (memberId: string, role: Role) => {
    const { error } = await supabase
      .from("company_members")
      .update({ role })
      .eq("id", memberId);
    if (error) {
      toast.error("Could not change role");
      return;
    }
    toast.success("Role updated");
    void loadAll();
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase.from("company_members").delete().eq("id", memberId);
    if (error) {
      toast.error("Could not remove member");
      return;
    }
    toast.success("Member removed");
    void loadAll();
  };

  const sortedMembers = useMemo(() => {
    const order: Role[] = ["owner", "project_manager", "field_supervisor", "crew", "subcontractor"];
    return [...members].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
  }, [members]);

  if (roleLoading || !isOwner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  return (
    <AppLayout title="Team" subtitle="Invite and manage your company members">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Invite form */}
        <section className="rounded-2xl border bg-card shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-foreground">Invite a member</h2>
              <p className="text-xs text-muted-foreground">
                Generate an invite link — share it however you like (text, Slack, email).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px_auto] gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">Role</Label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPermissionsOpen(true);
                  }}
                  className="p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="View role permissions"
                  aria-label="View role permissions"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as InvitableRole)}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end sm:col-auto">
              <Button
                onClick={sendInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="h-10 rounded-xl px-5 w-full sm:w-auto"
              >
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invite"}
              </Button>
            </div>
          </div>
          {fallbackInviteLink && (
            <div className="space-y-1.5 border-t pt-3">
              <Label className="text-xs">Copy invite link manually</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={fallbackInviteLink}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-10 rounded-xl text-xs font-mono"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFallbackInviteLink(null)}
                  className="h-10 w-10 rounded-xl"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Your browser blocked clipboard access. Tap the link to select it, then copy.
              </p>
            </div>
          )}
        </section>

        {/* Members table */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-heading text-lg font-bold text-foreground">Members</h2>
            <p className="text-xs text-muted-foreground">{members.length} total</p>
          </div>
          <div className="rounded-2xl border bg-card overflow-hidden">
            {loading ? (
              <PageLoader variant="inline" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name / Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMembers.map((m) => {
                    const isSelf = m.user_id === user?.id;
                    const canRemove = !isSelf && m.role !== "owner";
                    const isExpanded = expandedMemberId === m.id;
                    return (
                      <Fragment key={m.id}>
                      <TableRow>
                        <TableCell className="max-w-[160px] md:max-w-none">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-foreground truncate">
                                {m.display_name || m.email || "Unknown"}
                                {isSelf && (
                                  <span className="text-[10px] text-muted-foreground ml-2">(you)</span>
                                )}
                              </div>
                              {m.email && m.email !== m.display_name && (
                                <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                              )}
                            </div>
                            {canRemove && (
                              <button
                                type="button"
                                onClick={() => setExpandedMemberId(isExpanded ? null : m.id)}
                                className="md:hidden p-1.5 -mr-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                                aria-label={isExpanded ? "Hide actions" : "Show actions"}
                                aria-expanded={isExpanded}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {m.role === "owner" || isSelf ? (
                            <span
                              className={cn(
                                "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium",
                                ROLE_BADGE[m.role]
                              )}
                            >
                              {ROLE_LABEL[m.role]}
                            </span>
                          ) : (
                            <Select
                              value={m.role}
                              onValueChange={(v) => changeRole(m.id, v as Role)}
                            >
                              <SelectTrigger className="h-9 w-[180px] rounded-xl text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {INVITABLE_ROLES.map((r) => (
                                  <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(m.joined_at)}
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell">
                          {!isSelf && m.role !== "owner" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  title="Remove member"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove member?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {m.display_name || m.email || "This member"} will lose access
                                    to all company projects immediately. They can rejoin if you
                                    invite them again.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => removeMember(m.id)}
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                      {canRemove && isExpanded && (
                        <TableRow className="md:hidden">
                          <TableCell colSpan={3} className="bg-muted/30">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="rounded-lg"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove member
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove member?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {m.display_name || m.email || "This member"} will lose access
                                    to all company projects immediately. They can rejoin if you
                                    invite them again.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => removeMember(m.id)}
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </section>

        {/* Pending invitations */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-heading text-lg font-bold text-foreground">Pending invitations</h2>
            <p className="text-xs text-muted-foreground">{invitations.length} pending</p>
          </div>
          <div className="rounded-2xl border bg-card overflow-hidden">
            {invitations.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="No pending invitations"
                description="Invite teammates above to get started."
                className="border-0 bg-transparent"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-sm text-foreground">{inv.invited_email}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium",
                            ROLE_BADGE[inv.role as Role]
                          )}
                        >
                          {ROLE_LABEL[inv.role as Role]}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {daysUntil(inv.expires_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => copyInviteLink(inv.token)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Copy invite link"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => revokeInvite(inv.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Revoke invitation"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      </div>

      {/* Role permissions modal */}
      <Dialog open={permissionsOpen} onOpenChange={setPermissionsOpen}>
        <DialogContent className="max-w-3xl bg-card border border-border rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="font-heading text-lg font-bold text-foreground">
              Role Permissions
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Feature</TableHead>
                  {PERMISSION_ROLES.map((r) => (
                    <TableHead key={r} className="text-center">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap",
                          ROLE_BADGE[r]
                        )}
                      >
                        {ROLE_LABEL[r]}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERMISSIONS.map((p, i) => (
                  <TableRow
                    key={p.feature}
                    className={cn(i % 2 === 1 && "bg-secondary/30")}
                  >
                    <TableCell className="text-foreground">{p.feature}</TableCell>
                    {PERMISSION_ROLES.map((r) => {
                      const ok = p.allowed.includes(r);
                      return (
                        <TableCell key={r} className="text-center">
                          {ok ? (
                            <Check className="h-4 w-4 text-success inline-block" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground inline-block" />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Team;