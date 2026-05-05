import { useState } from "react";
import { useProjects, ProjectMember } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, X, Shield, Eye } from "lucide-react";

interface TeamMembersProps {
  projectId: string;
  members: ProjectMember[];
  isEditor: boolean;
  ownerUserId?: string | null;
}

const TeamMembers = ({ projectId, members, isEditor, ownerUserId }: TeamMembersProps) => {
  const { addMember, removeMember, updateMemberRole } = useProjects();
  const { user } = useAuth();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [error, setError] = useState("");
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setError("");
    setInviting(true);
    const { error } = await addMember(projectId, email.trim(), role);
    if (error) setError(error);
    else { setEmail(""); setShowInvite(false); }
    setInviting(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="bg-white border border-[hsl(214_13%_90%)] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Team Members <span className="text-muted-foreground font-normal">({members.length})</span></h2>
        {isEditor && (
          <Button size="sm" onClick={() => setShowInvite(!showInvite)} className="h-9 text-xs rounded-lg">
            <Plus className="h-3.5 w-3.5 mr-1" /> Invite Member
          </Button>
        )}
      </div>

      {showInvite && (
        <div className="space-y-2 rounded-lg border border-[hsl(214_13%_90%)] bg-[hsl(210_20%_98%)] p-3">
          <Input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleInvite()} className="h-9 text-sm rounded-lg" autoFocus />
          <div className="flex items-center gap-2">
            <select value={role} onChange={(e) => setRole(e.target.value as "editor" | "viewer")} className="flex-1 h-9 rounded-lg border bg-white px-3 text-sm text-foreground">
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button onClick={handleInvite} size="sm" className="h-9 text-xs rounded-lg" disabled={inviting}>{inviting ? "…" : "Add"}</Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}

      <div className="divide-y divide-[hsl(214_13%_90%)]">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs bg-accent text-accent-foreground font-medium">{getInitials(member.displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {member.displayName || "Unknown"}
                {member.userId === user?.id && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
              </p>
              <p className="text-xs text-muted-foreground">Joined recently</p>
            </div>
            <div className="flex items-center gap-1.5">
              {ownerUserId && member.userId === ownerUserId ? (
                <span className="inline-flex items-center gap-1 text-xs bg-role-owner/15 text-role-owner px-2.5 py-1 rounded-full font-medium"><Shield className="h-3 w-3" /> Owner</span>
              ) : member.role === "editor" ? (
                <span className="inline-flex items-center gap-1 text-xs bg-role-pm/15 text-role-pm px-2.5 py-1 rounded-full font-medium"><Shield className="h-3 w-3" /> Project Manager</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs bg-role-supervisor/15 text-role-supervisor px-2.5 py-1 rounded-full font-medium"><Eye className="h-3 w-3" /> Field Supervisor</span>
              )}
              {isEditor && member.userId !== user?.id && (
                <div className="flex items-center gap-1">
                  <button onClick={() => updateMemberRole(projectId, member.id, member.role === "editor" ? "viewer" : "editor")} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1" title="Toggle role">↕</button>
                  <button onClick={() => removeMember(projectId, member.id)} aria-label="Remove member" className="text-muted-foreground hover:text-destructive transition-colors p-2.5 rounded-xl min-h-[44px] min-w-[44px] inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"><X className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamMembers;
