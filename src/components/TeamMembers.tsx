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
}

const TeamMembers = ({ projectId, members, isEditor }: TeamMembersProps) => {
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
    <div className="space-y-3">
      {isEditor && (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => setShowInvite(!showInvite)} className="h-7 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Invite
          </Button>
        </div>
      )}

      {showInvite && (
        <div className="space-y-2 rounded-lg border bg-background p-3">
          <Input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleInvite()} className="h-8 text-sm" autoFocus />
          <div className="flex items-center gap-2">
            <select value={role} onChange={(e) => setRole(e.target.value as "editor" | "viewer")} className="flex-1 h-8 rounded-md border bg-background px-2 text-sm text-foreground">
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button onClick={handleInvite} size="sm" className="h-8 text-xs" disabled={inviting}>{inviting ? "…" : "Add"}</Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}

      <div className="space-y-1.5">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3 rounded-lg bg-background p-2.5">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(member.displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {member.displayName || "Unknown"}
                {member.userId === user?.id && <span className="text-[10px] text-muted-foreground ml-1">(you)</span>}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {member.role === "editor" ? (
                <span className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full"><Shield className="h-3 w-3" /> Editor</span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full"><Eye className="h-3 w-3" /> Viewer</span>
              )}
              {isEditor && member.userId !== user?.id && (
                <div className="flex items-center gap-1">
                  <button onClick={() => updateMemberRole(projectId, member.id, member.role === "editor" ? "viewer" : "editor")} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1" title="Toggle role">↕</button>
                  <button onClick={() => removeMember(projectId, member.id)} className="text-muted-foreground hover:text-destructive transition-colors p-0.5"><X className="h-3.5 w-3.5" /></button>
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
