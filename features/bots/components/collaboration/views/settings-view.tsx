"use client";

import { Check, Crown, Eye, Pencil, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useCollaborationWorkspace } from "../collaboration-workspace-context";
import { ViewHeading } from "./activity-view";

const roleSummaries = [
  {
    icon: Eye,
    name: "Viewer",
    items: ["View workspace", "Discussion", "Activity & history"],
  },
  {
    icon: Pencil,
    name: "Editor",
    items: [
      "Edit content fields",
      "Direct save or submit review",
      "Cannot manage team",
    ],
  },
  {
    icon: Crown,
    name: "Co-owner",
    items: [
      "Direct editing",
      "Review Change Requests",
      "Manage Viewer/Editor members",
    ],
  },
];

export function SettingsView() {
  const { userRole, approvalRequired, setApprovalRequirement } =
    useCollaborationWorkspace();
  const isOwner = userRole === "owner";

  return (
    <div>
      <ViewHeading
        title="Settings"
        description="Workspace rules and collaboration behavior."
      />

      <div className="space-y-5">
        <section className="rounded-[1.4rem] border border-border/60 bg-card/65 p-5 shadow-sm transition-all duration-200 hover:border-border/80 hover:shadow-md">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">Review workflow</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Choose whether Editors save directly or submit a Change Request
                for Owner/Co-owner review.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-5 rounded-xl border border-border/50 bg-background/50 p-4 transition-colors duration-200 hover:bg-muted/[0.12]">
            <div>
              <p className="text-sm font-medium">
                Require approval for Editor changes
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Owners and Co-owners still edit directly.
              </p>
            </div>
            <Switch
              checked={approvalRequired}
              disabled={!isOwner}
              onCheckedChange={(checked) =>
                void setApprovalRequirement(checked)
              }
              className={isOwner ? "cursor-pointer" : "cursor-not-allowed"}
            />
          </div>

          {!isOwner && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Only the bot owner can change this setting.
            </p>
          )}
        </section>

        <section className="rounded-[1.4rem] border border-border/60 bg-card/65 p-5 shadow-sm transition-all duration-200 hover:border-border/80 hover:shadow-md">
          <h3 className="text-sm font-semibold">Permission model</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            The workspace uses fixed roles so permissions stay predictable.
          </p>

          <div className="mt-4 divide-y divide-border/40 overflow-hidden rounded-xl border border-border/50">
            {roleSummaries.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.name}
                  className="p-4 transition-colors duration-200 hover:bg-muted/[0.12]"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">{role.name}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {role.items.map((item) => (
                      <Badge
                        key={item}
                        variant="secondary"
                        className="gap-1 text-[10px] font-normal"
                      >
                        <Check className="h-3 w-3" />
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-border/60 bg-card/65 p-5 shadow-sm transition-all duration-200 hover:border-border/80 hover:shadow-md">
          <h3 className="text-sm font-semibold">Realtime behavior</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Field locks are temporary and released when focus leaves a field.
            Unsaved changes remain a local draft; live drafts from disconnected
            collaborators are discarded when their lock expires.
          </p>
        </section>
      </div>
    </div>
  );
}
