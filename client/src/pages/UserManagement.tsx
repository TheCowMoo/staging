import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  UserCog, ShieldCheck, Eye, Pencil, Crown, Shield, User, Users, Settings, ArrowLeft, Radio, Mail, Plus, X, Building2, Trash2, FlaskConical,
} from "lucide-react";
import { ROLE_META, type PlatformRole } from "@shared/permissions";

const PLATFORM_ROLES: PlatformRole[] = [
  "ultra_admin",
  "super_admin",
  "admin",
  "auditor",
  "user",
  "viewer",
  "sandbox",
];

const ROLE_ICONS: Record<PlatformRole, React.ComponentType<{ size?: number }>> = {
  ultra_admin: Crown,
  super_admin: ShieldCheck,
  admin: Shield,
  auditor: Pencil,
  user: User,
  viewer: Eye,
  sandbox: FlaskConical,
};

const RAS_ROLE_OPTIONS = [
  { value: "none",     label: "Not enrolled",    color: "bg-gray-100 text-gray-500" },
  { value: "admin",     label: "Admin",     color: "bg-red-100 text-red-700" },
  { value: "responder", label: "Responder", color: "bg-amber-100 text-amber-700" },
  { value: "staff",     label: "Staff",     color: "bg-blue-100 text-blue-700" },
];

const PERMISSION_FLAG_LABELS: Record<string, string> = {
  canTriggerAlerts: "Can Trigger Alerts (RAS override)",
  canRunDrills: "Can Run Drills",
  canExportReports: "Can Export Reports",
  canViewIncidentLogs: "Can View Incident Logs",
  canSubmitAnonymousReports: "Can Submit Anonymous Reports",
  canAccessEap: "Can Access EAP",
  canManageSiteAssessments: "Can Manage Site Assessments",
};

export default function UserManagement() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [flagsDialogOpen, setFlagsDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<PlatformRole>("user");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Guard: only platform admins (ultra_admin or admin) can access this page
  if (user && user.role !== "ultra_admin" && user.role !== "admin") {
    navigate("/dashboard");
    return null;
  }

  const isUltraAdmin = user?.role === "ultra_admin";
  // _isImpersonated is set by the backend when impersonation is active
  const isImpersonating = !!(user as any)?._isImpersonated;
  // When not impersonating, check if this ultra_admin has an active impersonation stored
  const isUltraAdminWithImpersonation = isUltraAdmin && !isImpersonating;

  const { data: allUsers, isLoading } = trpc.adminUser.listAll.useQuery();
  const { data: rasUsers } = trpc.ras.listRasUsers.useQuery();
  const { data: pendingInvites, isLoading: invitesLoading } = trpc.adminUser.listInvites.useQuery(undefined, {
    enabled: isUltraAdmin,
  });

  const updateRole = trpc.adminUser.updateRole.useMutation({
    onSuccess: (_, vars) => {
      const label = ROLE_META[vars.role as PlatformRole]?.label ?? vars.role;
      toast.success(`Role updated to ${label}`);
      utils.adminUser.listAll.invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update role"),
  });

  const setRasRole = trpc.ras.setRasRole.useMutation({
    onSuccess: () => {
      toast.success("RAS role updated");
      utils.adminUser.listAll.invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to set RAS role"),
  });

  const impersonateUser = trpc.adminUser.impersonateUser.useMutation({
    onSuccess: async (_, vars) => {
      toast.success(`Now acting as user #${vars.targetUserId}. Redirecting to their dashboard\u2026`);
      await utils.auth.me.invalidate();
      // Navigate to dashboard as the impersonated user
      window.location.href = "/";
    },
    onError: (err: any) => toast.error(err?.message || "Failed to impersonate user"),
  });

  const stopImpersonation = trpc.adminUser.stopImpersonation.useMutation({
    onSuccess: async () => {
      toast.success("Impersonation ended. Returning to your account\u2026");
      await utils.auth.me.invalidate();
      window.location.href = "/admin/users";
    },
    onError: (err: any) => toast.error(err?.message || "Failed to stop impersonation"),
  });

  const inviteUser = trpc.adminUser.inviteUser.useMutation({
    onSuccess: (data) => {
      toast.success(`Invite sent! Link: ${data.inviteUrl}`);
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("user");
      utils.adminUser.listInvites.invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to send invite"),
  });

  const cancelInvite = trpc.adminUser.cancelInvite.useMutation({
    onSuccess: () => {
      toast.success("Invite cancelled");
      utils.adminUser.listInvites.invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to cancel invite"),
  });

  // ── Org Assignment State ──
  const [orgDialogUser, setOrgDialogUser] = useState<any>(null);
  const [assignOrgId, setAssignOrgId] = useState<number | "">("");
  const [assignOrgRole, setAssignOrgRole] = useState<string>("auditor");
  const { data: allOrgs } = trpc.org.listAll.useQuery(undefined, { enabled: !!orgDialogUser });
  const { data: userOrgs, refetch: refetchUserOrgs } = trpc.adminUser.getUserOrgs.useQuery(
    { userId: orgDialogUser?.id ?? 0 },
    { enabled: !!orgDialogUser, initialData: [] }
  );

  const assignToOrg = trpc.adminUser.assignToOrg.useMutation({
    onSuccess: () => {
      toast.success("User assigned to organization");
      setAssignOrgId("");
      setAssignOrgRole("auditor");
      refetchUserOrgs();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to assign to org"),
  });

  const removeFromOrg = trpc.adminUser.removeFromOrg.useMutation({
    onSuccess: () => {
      toast.success("User removed from organization");
      refetchUserOrgs();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to remove from org"),
  });

  const updateOrgRole = trpc.adminUser.updateOrgRole.useMutation({
    onSuccess: () => {
      toast.success("Org role updated");
      refetchUserOrgs();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update org role"),
  });

  function getRoleIcon(role: string) {
    const Icon = ROLE_ICONS[role as PlatformRole] ?? User;
    return <Icon size={13} />;
  }

  function getRoleColor(role: string) {
    return ROLE_META[role as PlatformRole]?.color ?? "bg-slate-100 text-slate-700";
  }

  function getRasRoleBadge(rasRole: string | null) {
    const opt = RAS_ROLE_OPTIONS.find((o) => o.value === (rasRole ?? ""));
    if (!opt || !rasRole) return null;
    return (
      <Badge variant="outline" className={`text-[10px] h-5 px-1.5 border-current ${opt.color}`}>
        <Radio size={9} className="mr-0.5" />
        {opt.label}
      </Badge>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Back nav */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/dashboard")}
        className="text-muted-foreground hover:text-foreground -ml-1"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
        Return to Dashboard
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <UserCog size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage platform roles, permissions, and RAS alert enrollment
            </p>
          </div>
        </div>
        {isImpersonating && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => stopImpersonation.mutate()}
            disabled={stopImpersonation.isPending}
          >
            Stop Impersonation
          </Button>
        )}
        {isUltraAdmin && (
          <Button variant="default" size="sm" onClick={() => setInviteDialogOpen(true)}>
            <Plus size={14} className="mr-1" />
            Invite User
          </Button>
        )}
      </div>

      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="rounded-lg border border-purple-300 bg-purple-50 dark:bg-purple-950/20 px-4 py-3 text-sm text-purple-700 dark:text-purple-300 flex items-center gap-2">
          <Crown size={15} />
          <span>
            You are acting as <strong>{user?.name ?? user?.email ?? `user #${(user as any)._realAdminId}`}</strong>. All actions are attributed to this user. Your real account: <strong>{(user as any)._realAdminName ?? (user as any)._realAdminEmail ?? "Ultra Admin"}</strong>.
          </span>
        </div>
      )}

      {/* Role Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {PLATFORM_ROLES.map((role) => {
          const meta = ROLE_META[role];
          const Icon = ROLE_ICONS[role];
          return (
            <Card key={role} className={`border ${meta.color}`}>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <Icon size={13} />
                  {meta.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-xs text-muted-foreground leading-tight">{meta.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* RAS Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-4 pb-3 px-4 flex items-start gap-3">
          <Radio className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <strong>RAS Roles &mdash; Response Activation System</strong>
            <p className="mt-0.5 text-blue-700 dark:text-blue-300">
              Assign RAS roles to enable users for emergency alerts. <strong>Admin</strong> can activate/resolve alerts.{" "}
              <strong>Responder</strong> can acknowledge and respond. <strong>Staff</strong> receives alerts and acknowledges. Set to &ldquo;Not enrolled&rdquo; to remove RAS access.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Invite Users Section - Ultra Admin Only */}
      {isUltraAdmin && (
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail size={18} />
              Platform Invitations
            </CardTitle>
            <CardDescription>
              Invite new users to the platform. Invited users will receive a link to set up their account with the assigned role. Invites expire after 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {invitesLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                Loading invites&hellip;
              </div>
            ) : !pendingInvites || pendingInvites.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                No pending invitations.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvites.map((invite: any) => (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{invite.email}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(invite.role)}`}>
                          {getRoleIcon(invite.role)}
                          {ROLE_META[invite.role as PlatformRole]?.label ?? invite.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-yellow-50 text-yellow-700 border-yellow-300">
                          Pending
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : "\u2014"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => cancelInvite.mutate({ id: invite.id })}
                          disabled={cancelInvite.isPending}
                        >
                          <X size={12} className="mr-1" />
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={18} />
            All Users
          </CardTitle>
          <CardDescription>
            {isUltraAdmin
              ? "Ultra Admin: you can assign any role including Ultra Admin, and impersonate any user."
              : "Platform Admin: you can assign roles up to Super Admin."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              Loading users&hellip;
            </div>
          ) : !allUsers || allUsers.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              No users found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name / Email</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>RAS Role</TableHead>
                  <TableHead>Last Signed In</TableHead>
                  <TableHead>Change Role</TableHead>
                  <TableHead>Set RAS Role</TableHead>
                  {isUltraAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUsers.map((u: any) => {
                  const isSelf = u.id === user?.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-medium text-sm flex items-center gap-1.5">
                          {u.name ?? "\u2014"}
                          {isSelf && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1">You</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{u.email ?? "\u2014"}</div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(u.role)}`}
                        >
                          {getRoleIcon(u.role)}
                          {ROLE_META[u.role as PlatformRole]?.label ?? u.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        {u.rasRole ? (
                          getRasRoleBadge(u.rasRole)
                        ) : (
                          <span className="text-xs text-muted-foreground italic">\u2014</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.lastSignedIn
                          ? new Date(u.lastSignedIn).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        {isSelf ? (
                          <span className="text-xs text-muted-foreground italic">
                            Cannot change own role
                          </span>
                        ) : (
                          <Select
                            value={u.role}
                            onValueChange={(newRole) => {
                              if (newRole === u.role) return;
                              updateRole.mutate({ userId: u.id, role: newRole as PlatformRole });
                            }}
                            disabled={
                              updateRole.isPending ||
                              (!isUltraAdmin && u.role === "ultra_admin")
                            }
                          >
                            <SelectTrigger className="w-40 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PLATFORM_ROLES.filter(
                                (r) => r !== "ultra_admin" || isUltraAdmin
                              ).map((r) => (
                                <SelectItem key={r} value={r} className="text-xs">
                                  {ROLE_META[r].label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.rasRole ?? "none"}
                          onValueChange={(val) => {
                            setRasRole.mutate({
                              targetUserId: u.id,
                              rasRole: val === "none" ? null : (val as "admin" | "responder" | "staff"),
                            });
                          }}
                          disabled={setRasRole.isPending}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue placeholder="Not enrolled" />
                          </SelectTrigger>
                          <SelectContent>
                            {RAS_ROLE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {isUltraAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => {
                                setSelectedUser(u);
                                setFlagsDialogOpen(true);
                              }}
                            >
                              <Settings size={12} className="mr-1" />
                              Flags
                            </Button>
                            {!isSelf && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 text-purple-600 border-purple-300 hover:bg-purple-50"
                                onClick={() =>
                                  impersonateUser.mutate({ targetUserId: u.id })
                                }
                                disabled={impersonateUser.isPending}
                              >
                                <Crown size={12} className="mr-1" />
                                Login As
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => setOrgDialogUser(u)}
                            >
                              <Building2 size={12} className="mr-1" />
                              Orgs
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* RAS Enrollment Panel - Separate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio size={18} />
            RAS Alert Enrollment
          </CardTitle>
          <CardDescription>
            Assign or remove RAS (Response Activation System) roles for users.
            Only users with a RAS role receive emergency alerts via the Desktop Alert app.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Current RAS Role</TableHead>
                <TableHead>Push Subscriptions</TableHead>
                <TableHead>Set RAS Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rasUsers ?? allUsers ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                    Loading&hellip;
                  </TableCell>
                </TableRow>
              ) : (rasUsers ?? []).map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{u.name ?? "\u2014"}</div>
                    <div className="text-xs text-muted-foreground">{u.email ?? "\u2014"}</div>
                  </TableCell>
                  <TableCell>
                    {u.rasRole ? (
                      (() => {
                        const opt = RAS_ROLE_OPTIONS.find((o) => o.value === u.rasRole);
                        return opt ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${opt.color}`}>
                            <Radio size={9} />
                            {opt.label}
                          </span>
                        ) : u.rasRole;
                      })()
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Not enrolled</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.pushSubscriptionCount ?? 0} device(s)
                  </TableCell>
                  <TableCell>
                    {u.id === user?.id ? (
                      <span className="text-xs text-muted-foreground italic">Cannot change self</span>
                    ) : (
                      <Select
                        value={u.rasRole ?? "none"}
                        onValueChange={(val) => {
                          setRasRole.mutate({
                            targetUserId: u.id,
                            rasRole: val === "none" ? null : (val as "admin" | "responder" | "staff"),
                          });
                        }}
                        disabled={setRasRole.isPending}
                      >
                        <SelectTrigger className="w-44 h-8 text-xs">
                          <SelectValue placeholder="Not enrolled" />
                        </SelectTrigger>
                        <SelectContent>
                          {RAS_ROLE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite User Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail size={16} />
              Invite a New User
            </DialogTitle>
            <DialogDescription>
              Send a platform invitation to a new user. They will receive a link to set up their account and will be assigned the selected role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email address</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteRole">Platform Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as PlatformRole)}>
                <SelectTrigger id="inviteRole" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      <span className="flex items-center gap-2">
                        {getRoleIcon(r)}
                        {ROLE_META[r].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (!inviteEmail.trim()) {
                  toast.error("Please enter an email address");
                  return;
                }
                inviteUser.mutate({ email: inviteEmail.trim(), role: inviteRole, origin });
              }}
              disabled={inviteUser.isPending || !inviteEmail.trim()}
            >
              {inviteUser.isPending ? "Sending invite\u2026" : "Send Invitation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permission Flags Info Dialog */}
      <Dialog open={flagsDialogOpen} onOpenChange={setFlagsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings size={16} />
              Optional Permission Flags
            </DialogTitle>
            <DialogDescription>
              {selectedUser
                ? `Override permissions for ${selectedUser.name ?? selectedUser.email ?? `User #${selectedUser.id}`}.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <p>
              Permission flags are scoped to an <strong>organization membership</strong>. They grant
              additional capabilities beyond a user's base role without changing the role itself.
            </p>
            <ul className="space-y-1 pl-4 list-disc text-xs">
              {Object.values(PERMISSION_FLAG_LABELS).map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
            <p className="text-xs">
              To manage flags, navigate to the relevant{" "}
              <strong>Organization Admin page</strong> and open the member settings for this user.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setFlagsDialogOpen(false)}
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>

      {/* ── Org Assignment Dialog ── */}
      <Dialog open={!!orgDialogUser} onOpenChange={(open) => { if (!open) setOrgDialogUser(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 size={16} />
              Organization Memberships
            </DialogTitle>
            <DialogDescription>
              {orgDialogUser
                ? `Manage org assignments for ${orgDialogUser.name ?? orgDialogUser.email ?? `User #${orgDialogUser.id}`}.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Current Memberships */}
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2 block">
                Current Organizations
              </Label>
              {(!userOrgs || userOrgs.length === 0) ? (
                <p className="text-sm text-muted-foreground italic">Not assigned to any organization.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userOrgs.map((m: any) => (
                      <TableRow key={m.orgId}>
                        <TableCell className="font-medium text-sm">{m.orgName ?? `Org #${m.orgId}`}</TableCell>
                        <TableCell>
                          <Select
                            value={m.role}
                            onValueChange={(newRole) => {
                              updateOrgRole.mutate({ userId: orgDialogUser.id, orgId: m.orgId, role: newRole as any });
                            }}
                            disabled={updateOrgRole.isPending}
                          >
                            <SelectTrigger className="w-32 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["super_admin", "admin", "auditor", "user", "viewer"].map((r) => (
                                <SelectItem key={r} value={r} className="text-xs">{r.replace(/_/g, " ")}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 text-red-600 hover:bg-red-50"
                            onClick={() => removeFromOrg.mutate({ userId: orgDialogUser.id, orgId: m.orgId })}
                            disabled={removeFromOrg.isPending}
                          >
                            <Trash2 size={12} className="mr-1" />
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Assign to New Org */}
            <div className="border-t pt-4">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2 block">
                Assign to Organization
              </Label>
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Organization</Label>
                  <Select
                    value={String(assignOrgId)}
                    onValueChange={(v) => setAssignOrgId(Number(v))}
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Select org..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(allOrgs ?? []).map((o: any) => (
                        <SelectItem key={o.id} value={String(o.id)} className="text-xs">
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32 space-y-1">
                  <Label className="text-xs">Role</Label>
                  <Select value={assignOrgRole} onValueChange={setAssignOrgRole}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["super_admin", "admin", "auditor", "user", "viewer"].map((r) => (
                        <SelectItem key={r} value={r} className="text-xs">{r.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  className="h-8 shrink-0"
                  disabled={!assignOrgId || assignToOrg.isPending}
                  onClick={() => {
                    if (!assignOrgId) return;
                    assignToOrg.mutate({
                      userId: orgDialogUser.id,
                      orgId: assignOrgId as number,
                      role: assignOrgRole as any,
                    });
                  }}
                >
                  <Plus size={14} className="mr-1" />
                  Assign
                </Button>
              </div>
            </div>
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={() => setOrgDialogUser(null)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}