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
import { toast } from "sonner";
import {
  UserCog, ShieldCheck, Eye, Pencil, Crown, Shield, User, Users, Settings, ArrowLeft,
} from "lucide-react";
import { ROLE_META, type PlatformRole } from "@shared/permissions";

const PLATFORM_ROLES: PlatformRole[] = [
  "ultra_admin",
  "super_admin",
  "admin",
  "auditor",
  "user",
  "viewer",
];

const ROLE_ICONS: Record<PlatformRole, React.ComponentType<{ size?: number }>> = {
  ultra_admin: Crown,
  super_admin: ShieldCheck,
  admin: Shield,
  auditor: Pencil,
  user: User,
  viewer: Eye,
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

export default function UserManagement() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [flagsDialogOpen, setFlagsDialogOpen] = useState(false);

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

  const updateRole = trpc.adminUser.updateRole.useMutation({
    onSuccess: (_, vars) => {
      const label = ROLE_META[vars.role as PlatformRole]?.label ?? vars.role;
      toast.success(`Role updated to ${label}`);
      utils.adminUser.listAll.invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update role"),
  });

  const impersonateUser = trpc.adminUser.impersonateUser.useMutation({
    onSuccess: async (_, vars) => {
      toast.success(`Now acting as user #${vars.targetUserId}. Redirecting to their dashboard…`);
      await utils.auth.me.invalidate();
      // Navigate to dashboard as the impersonated user
      window.location.href = "/";
    },
    onError: (err: any) => toast.error(err?.message || "Failed to impersonate user"),
  });

  const stopImpersonation = trpc.adminUser.stopImpersonation.useMutation({
    onSuccess: async () => {
      toast.success("Impersonation ended. Returning to your account…");
      await utils.auth.me.invalidate();
      window.location.href = "/admin/users";
    },
    onError: (err: any) => toast.error(err?.message || "Failed to stop impersonation"),
  });

  function getRoleIcon(role: string) {
    const Icon = ROLE_ICONS[role as PlatformRole] ?? User;
    return <Icon size={13} />;
  }

  function getRoleColor(role: string) {
    return ROLE_META[role as PlatformRole]?.color ?? "bg-slate-100 text-slate-700";
  }

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
              Manage platform roles and permissions for all registered users
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
              Loading users…
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
                  <TableHead>Last Signed In</TableHead>
                  <TableHead>Change Role</TableHead>
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
                          {u.name ?? "—"}
                          {isSelf && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1">You</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{u.email ?? "—"}</div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(u.role)}`}
                        >
                          {getRoleIcon(u.role)}
                          {ROLE_META[u.role as PlatformRole]?.label ?? u.role}
                        </span>
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
    </div>
  );
}
