import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Users, Mail, Settings, Copy, Trash2, UserPlus, Building2, Shield, Eye, ClipboardList } from "lucide-react";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  auditor: "Auditor",
  user: "User",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-800",
  admin: "bg-orange-100 text-orange-800",
  auditor: "bg-yellow-100 text-yellow-800",
  user: "bg-green-100 text-green-800",
  viewer: "bg-gray-100 text-gray-700",
};

const PERMISSION_FLAG_LABELS: Record<string, string> = {
  canTriggerAlerts: "Can Trigger Alerts (RAS override)",
  canRunDrills: "Can Run Drills",
  canExportReports: "Can Export Reports",
  canViewIncidentLogs: "Can View Incident Logs",
  canSubmitAnonymousReports: "Can Submit Anonymous Reports",
  canAccessEap: "Can Access EAP",
  canManageSiteAssessments: "Can Manage Site Assessments",
};

export default function OrgAdmin({ orgId }: { orgId: number }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"super_admin" | "admin" | "auditor" | "user" | "viewer">("auditor");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const { data: memberships } = trpc.org.myMemberships.useQuery();
  const currentMembership = memberships?.find((m) => m.orgId === orgId);
  const isOrgSuperAdmin = currentMembership?.role === "super_admin";
  const isOrgAdmin = currentMembership?.role === "super_admin" || currentMembership?.role === "admin";
  const isPlatformAdmin = user?.role === "admin" || user?.role === "ultra_admin";
  const canManage = isOrgAdmin || isPlatformAdmin;
  const canManageFlags = isPlatformAdmin || isOrgAdmin;
  // Org admins (not super_admin) cannot invite or assign super_admin role
  const canAssignSuperAdmin = isOrgSuperAdmin || isPlatformAdmin;

  const [flagsMemberId, setFlagsMemberId] = useState<number | null>(null);
  const [flagsDialogOpen, setFlagsDialogOpen] = useState(false);
  const [pendingFlags, setPendingFlags] = useState<Record<string, boolean>>({});

  const updateFlagsMutation = trpc.adminUser.updatePermissionFlags.useMutation({
    onSuccess: () => { refetchMembers(); toast.success("Permission flags updated"); setFlagsDialogOpen(false); },
    onError: (err: any) => toast.error(err.message || "Failed to update flags"),
  });

  const { data: members, refetch: refetchMembers } = trpc.org.members.useQuery({ orgId });
  const { data: pendingInvites, refetch: refetchInvites } = trpc.org.pendingInvites.useQuery({ orgId });
  const { data: org } = trpc.org.listAll.useQuery(undefined, { enabled: !!isPlatformAdmin });
  const currentOrg = org?.find((o) => o.id === orgId);

  const inviteMutation = trpc.org.invite.useMutation({
    onSuccess: (data) => {
      setGeneratedLink(data.inviteUrl);
      setInviteEmail("");
      refetchInvites();
      toast.success("Invite created — copy the link below and send it to the invitee.");
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelInviteMutation = trpc.org.cancelInvite.useMutation({
    onSuccess: () => { refetchInvites(); toast.success("Invite cancelled"); },
  });

  const updateRoleMutation = trpc.org.updateMemberRole.useMutation({
    onSuccess: () => { refetchMembers(); toast.success("Role updated"); },
    onError: (err) => toast.error(err.message),
  });

  const removeMemberMutation = trpc.org.removeMember.useMutation({
    onSuccess: () => { refetchMembers(); toast.success("Member removed"); },
    onError: (err) => toast.error(err.message),
  });

  const handleInvite = () => {
    if (!inviteEmail) return;
    inviteMutation.mutate({ orgId, email: inviteEmail, role: inviteRole, origin: window.location.origin });
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Copied to clipboard");
  };

  if (!canManage) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You do not have permission to manage this organization.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Permission Flags Dialog */}
      <Dialog open={flagsDialogOpen} onOpenChange={setFlagsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Optional Permission Flags
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              These flags grant additional capabilities beyond the member's base role. Controlled by Super Admin and above.
            </p>
            {Object.entries(PERMISSION_FLAG_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between py-1">
                <Label className="text-sm">{label}</Label>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={pendingFlags[key] ?? false}
                  onChange={(e) => setPendingFlags((prev) => ({ ...prev, [key]: (e.target as HTMLInputElement).checked }))}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              size="sm"
              onClick={() => {
                if (flagsMemberId == null) return;
                updateFlagsMutation.mutate({ orgId, userId: flagsMemberId, flags: pendingFlags });
              }}
              disabled={updateFlagsMutation.isPending}
            >
              Save Flags
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setFlagsDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            {currentOrg?.name ?? "Organization Admin"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage members, roles, and organization settings
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/report/${currentOrg?.slug ?? ""}`)} className="gap-2">
          <Eye className="h-4 w-4" />
          View Incident Portal
        </Button>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members" className="gap-2"><Users className="h-4 w-4" />Members</TabsTrigger>
          <TabsTrigger value="invites" className="gap-2"><Mail className="h-4 w-4" />Pending Invites</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" />Settings</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2"><ClipboardList className="h-4 w-4" />Activity Log</TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{members?.length ?? 0} member{members?.length !== 1 ? "s" : ""}</p>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" size="sm">
                  <UserPlus className="h-4 w-4" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite a Team Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                      <SelectTrigger id="invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {canAssignSuperAdmin && <SelectItem value="super_admin">Super Admin — full org control</SelectItem>}
                        <SelectItem value="admin">Admin — operational owner</SelectItem>
                        <SelectItem value="auditor">Auditor — read + validate</SelectItem>
                        <SelectItem value="user">User — general staff</SelectItem>
                        <SelectItem value="viewer">Viewer — read-only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {generatedLink && (
                    <div className="rounded-md bg-muted p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Invite link (valid 7 days):</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs break-all flex-1">{generatedLink}</code>
                        <Button size="icon" variant="ghost" onClick={() => copyLink(generatedLink)} aria-label="Copy invite link">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <Button onClick={handleInvite} disabled={!inviteEmail || inviteMutation.isPending} className="w-full">
                    {inviteMutation.isPending ? "Generating…" : "Generate Invite Link"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {members?.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.userName ?? "Unknown"}</p>
                    <p className="text-sm text-muted-foreground truncate">{m.userEmail ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLORS[m.role]}`}>
                      {ROLE_LABELS[m.role]}
                    </span>
                    {canManage && m.userId !== user?.id && (
                      <>
                        <Select
                          value={m.role}
                          onValueChange={(v) => updateRoleMutation.mutate({ orgId, userId: m.userId, role: v as any })}
                        >
                          <SelectTrigger className="h-8 w-32 text-xs" aria-label="Change role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {canAssignSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="auditor">Auditor</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        {canManageFlags && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1"
                            onClick={() => {
                              setFlagsMemberId(m.userId);
                              setPendingFlags({});
                              setFlagsDialogOpen(true);
                            }}
                          >
                            <Settings className="h-3 w-3" />
                            Flags
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label={`Remove ${m.userName}`}
                          onClick={() => {
                            if (confirm(`Remove ${m.userName} from this organization?`)) {
                              removeMemberMutation.mutate({ orgId, userId: m.userId });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            {!members?.length && (
              <p className="text-center text-muted-foreground py-8">No members yet. Invite your first team member above.</p>
            )}
          </div>
        </TabsContent>

        {/* Pending Invites Tab */}
        <TabsContent value="invites" className="space-y-4">
          {pendingInvites?.length ? (
            <div className="space-y-2">
              {pendingInvites.map((inv) => (
                <Card key={inv.id} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Role: {ROLE_LABELS[inv.role]} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => copyLink(`${window.location.origin}/join?token=${inv.token}`)}
                      >
                        <Copy className="h-3 w-3" />
                        Copy Link
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        aria-label={`Cancel invite for ${inv.email}`}
                        onClick={() => cancelInviteMutation.mutate({ inviteId: inv.id, orgId })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No pending invites.</p>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Incident Report Portal</CardTitle>
              <CardDescription>
                Share this public link with employees so they can submit anonymous incident reports.
                Reports are only visible to organization admins.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentOrg?.slug ? (
                <div className="flex items-center gap-2 rounded-md bg-muted p-3">
                  <code className="text-sm flex-1 break-all">
                    {window.location.origin}/report/{currentOrg.slug}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Copy incident portal link"
                    onClick={() => copyLink(`${window.location.origin}/report/${currentOrg.slug}`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No slug configured for this organization.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Data Isolation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                All facilities, audits, and incident reports for this organization are fully isolated.
                Members of other organizations cannot access your data, and your members cannot access theirs.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Log Tab — ISO 27001 A.12.4 / SOC 2 CC7.2 */}
        <TabsContent value="logs" className="space-y-4">
          <AuditLogTab orgId={orgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Audit Log Tab Component ─────────────────────────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  login: "Logged in",
  logout: "Logged out",
  invite_sent: "Invite sent",
  invite_accepted: "Invite accepted",
  member_removed: "Member removed",
  role_changed: "Role changed",
  audit_completed: "Audit completed",
  audit_reopened: "Audit reopened",
  incident_submitted: "Incident submitted",
  incident_reviewed: "Incident reviewed",
  report_shared: "Report shared",
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  login: "bg-gray-100 text-gray-700",
  logout: "bg-gray-100 text-gray-700",
  invite_sent: "bg-purple-100 text-purple-800",
  invite_accepted: "bg-purple-100 text-purple-800",
  member_removed: "bg-orange-100 text-orange-800",
  role_changed: "bg-yellow-100 text-yellow-800",
  audit_completed: "bg-green-100 text-green-800",
  audit_reopened: "bg-yellow-100 text-yellow-800",
  incident_submitted: "bg-red-100 text-red-800",
  incident_reviewed: "bg-blue-100 text-blue-800",
  report_shared: "bg-indigo-100 text-indigo-800",
};

function AuditLogTab({ orgId }: { orgId: number }) {
  const { data: logs, isLoading } = trpc.org.logs.useQuery({ orgId, limit: 200 });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!logs?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No activity recorded yet</p>
        <p className="text-sm mt-1">Actions like creating facilities, completing audits, and managing members will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {logs.length} most recent events &mdash; retained indefinitely per ISO 27001 A.12.4
        </p>
      </div>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Time</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">User</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Action</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  {log.userName ?? <span className="italic text-muted-foreground">Anonymous</span>}
                </td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700"
                  }`}>
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                </td>
                <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">
                  {log.description ?? `${log.entityType}${log.entityId ? ` #${log.entityId}` : ""}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
