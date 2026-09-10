"use client";
import { useState } from "react";
import {
  Crown,
  Eye,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  roleConfig,
  type CollaboratorRole,
} from "@/features/bots/types/bot-types";
import { useCollaborationWorkspace } from "../collaboration-workspace-context";
import { ViewHeading } from "./activity-view";

const roleIcons = { viewer: Eye, editor: Pencil, co_owner: Crown };
export function TeamView() {
  const {
    collaborators,
    canManageMembers,
    canManageCoOwners,
    inviteMember,
    removeMember,
    changeMemberRole,
    realtime,
  } = useCollaborationWorkspace();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("editor");
  const [message, setMessage] = useState("");
  const submit = async () => {
    if (await inviteMember(username, role, message)) {
      setOpen(false);
      setUsername("");
      setMessage("");
      setRole("editor");
    }
  };
  return (
    <div>
      <ViewHeading
        title="Team"
        description="Manage who can view, edit and review this bot."
        action={
          canManageMembers ? (
            <Button
              onClick={() => setOpen(true)}
              className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Invite member
            </Button>
          ) : undefined
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {(["viewer", "editor", "co_owner"] as CollaboratorRole[]).map(
          (item) => {
            const Icon = roleIcons[item];
            return (
              <div
                key={item}
                className="rounded-2xl border border-border/60 bg-card/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border/80 hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">
                    {roleConfig[item].label}
                  </p>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {roleConfig[item].description}
                </p>
              </div>
            );
          },
        )}
      </div>
      <div className="overflow-hidden rounded-[1.4rem] border border-border/60 bg-card/65">
        {collaborators.length === 0 ? (
          <div className="p-10 text-center">
            <UsersRound className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No collaborators yet.
            </p>
          </div>
        ) : (
          collaborators.map((member) => {
            const live = realtime.presenceUsers.find(
              (user) => user.userId === member.user_id,
            );
            const Icon = roleIcons[member.role];
            const canTouch =
              canManageMembers &&
              (member.role !== "co_owner" || canManageCoOwners);
            return (
              <div
                key={member.id}
                className="flex flex-col gap-3 border-b border-border/40 p-4 transition-colors duration-200 last:border-b-0 hover:bg-muted/[0.12] sm:flex-row sm:items-center"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                  {member.profile?.avatar_url ? (
                    <img
                      src={member.profile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {member.profile?.display_name ||
                        member.profile?.username ||
                        "Forge user"}
                    </p>
                    <Badge variant="outline" className="text-[9px] capitalize">
                      {member.status}
                    </Badge>
                    {live && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Live
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    @{member.profile?.username || "unknown"}
                    {live?.activeField
                      ? ` · Editing ${live.activeField.replaceAll("_", " ")}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={member.role}
                    disabled={!canTouch}
                    onValueChange={(value) =>
                      void changeMemberRole(
                        member.id,
                        value as CollaboratorRole,
                      )
                    }
                  >
                    <SelectTrigger className="h-9 w-36 cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer" className="cursor-pointer">
                        Viewer
                      </SelectItem>
                      <SelectItem value="editor" className="cursor-pointer">
                        Editor
                      </SelectItem>
                      {canManageCoOwners && (
                        <SelectItem value="co_owner" className="cursor-pointer">
                          Co-owner
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {canTouch && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="cursor-pointer text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive active:scale-[0.95]"
                      onClick={() => void removeMember(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite collaborator</DialogTitle>
            <DialogDescription>
              Invite a Forgeworks user and choose their starting role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Username
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">Role</label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as CollaboratorRole)}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer" className="cursor-pointer">
                    Viewer
                  </SelectItem>
                  <SelectItem value="editor" className="cursor-pointer">
                    Editor
                  </SelectItem>
                  {canManageCoOwners && (
                    <SelectItem value="co_owner" className="cursor-pointer">
                      Co-owner
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Message{" "}
                <span className="font-normal text-muted-foreground">
                  optional
                </span>
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                placeholder="Tell them what you would like help with…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer transition-all duration-200 active:scale-[0.98]"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!username.trim()}
              className="cursor-pointer transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed"
              onClick={() => void submit()}
            >
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
