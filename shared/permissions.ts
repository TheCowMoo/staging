/**
 * Five Stones User Roles and Permissions
 *
 * Role hierarchy (highest to lowest):
 *   ultra_admin > super_admin > admin > auditor > user > viewer
 *
 * Permissions are role-based with optional override toggles.
 * Toggles are stored on the org_members record and controlled by Super Admin / Ultra Admin.
 */

// ─── Role Types ───────────────────────────────────────────────────────────────

/** Platform-level roles stored on the users table */
export type PlatformRole =
  | "ultra_admin"   // Pursuit Pathways staff — full god-mode + impersonation
  | "super_admin"   // Full org control
  | "admin"         // Operational owner
  | "auditor"       // Read + validate (with optional write)
  | "user"          // General staff / end-user
  | "viewer";       // Legacy read-only

/** Org-level roles stored on the org_members table */
export type OrgRole =
  | "super_admin"
  | "admin"
  | "auditor"
  | "user"
  | "viewer";

// ─── Optional Permission Flags ────────────────────────────────────────────────

export interface PermissionFlags {
  canTriggerAlerts: boolean;
  canRunDrills: boolean;
  canExportReports: boolean;
  canViewIncidentLogs: boolean;
  canSubmitAnonymousReports: boolean;
  canAccessEap: boolean;
  canManageSiteAssessments: boolean;
}

export const DEFAULT_PERMISSION_FLAGS: PermissionFlags = {
  canTriggerAlerts: false,
  canRunDrills: false,
  canExportReports: false,
  canViewIncidentLogs: false,
  canSubmitAnonymousReports: false,
  canAccessEap: false,
  canManageSiteAssessments: false,
};

// ─── Base Role Permissions ────────────────────────────────────────────────────

export interface RolePermissions {
  // Org / User Management
  canManageOrganization: boolean;
  canManageAllUsers: boolean;       // Create/edit/delete any user
  canManageAdminsAndBelow: boolean; // Create/edit admins, auditors, users
  canManageAuditorsAndBelow: boolean;
  canManageUsersOnly: boolean;
  canAssignRoles: boolean;
  canViewAuditLogs: boolean;
  canOverrideSystemSettings: boolean;
  canManageIntegrations: boolean;
  canViewSystemAnalytics: boolean;

  // Liability Scans
  canViewLiabilityScans: boolean;
  canEditLiabilityScans: boolean;
  canDeleteLiabilityScans: boolean;
  canRunLiabilityScans: boolean;

  // EAPs
  canViewEaps: boolean;
  canCreateEaps: boolean;
  canEditEaps: boolean;
  canDeleteEaps: boolean;
  canExportEaps: boolean;

  // Site Assessments
  canViewSiteAssessments: boolean;
  canCreateSiteAssessments: boolean;
  canEditSiteAssessments: boolean;
  canDeleteSiteAssessments: boolean;

  // Drills
  canViewDrills: boolean;
  canCreateDrills: boolean;
  canEditDrills: boolean;
  canDeleteDrills: boolean;
  canLaunchDrills: boolean;
  canScheduleDrills: boolean;
  canViewDrillResults: boolean;

  // RAS Alerts
  canTriggerRasAlerts: boolean;
  canViewRasAlertHistory: boolean;
  canGetAlertResponses: boolean;

  // Incidents
  canViewIncidents: boolean;
  canLogIncidents: boolean;
  canEditIncidents: boolean;
  canDeleteIncidents: boolean;
  canReviewIncidentReports: boolean;
  canSubmitIncidentReports: boolean;

  // Reports
  canViewReports: boolean;
  canExportReports: boolean;

  // Ultra Admin
  canImpersonateUsers: boolean;
}

// ─── Base Permissions Per Role ────────────────────────────────────────────────

const ULTRA_ADMIN_PERMISSIONS: RolePermissions = {
  canManageOrganization: true,
  canManageAllUsers: true,
  canManageAdminsAndBelow: true,
  canManageAuditorsAndBelow: true,
  canManageUsersOnly: true,
  canAssignRoles: true,
  canViewAuditLogs: true,
  canOverrideSystemSettings: true,
  canManageIntegrations: true,
  canViewSystemAnalytics: true,
  canViewLiabilityScans: true,
  canEditLiabilityScans: true,
  canDeleteLiabilityScans: true,
  canRunLiabilityScans: true,
  canViewEaps: true,
  canCreateEaps: true,
  canEditEaps: true,
  canDeleteEaps: true,
  canExportEaps: true,
  canViewSiteAssessments: true,
  canCreateSiteAssessments: true,
  canEditSiteAssessments: true,
  canDeleteSiteAssessments: true,
  canViewDrills: true,
  canCreateDrills: true,
  canEditDrills: true,
  canDeleteDrills: true,
  canLaunchDrills: true,
  canScheduleDrills: true,
  canViewDrillResults: true,
  canTriggerRasAlerts: true,
  canViewRasAlertHistory: true,
  canGetAlertResponses: true,
  canViewIncidents: true,
  canLogIncidents: true,
  canEditIncidents: true,
  canDeleteIncidents: true,
  canReviewIncidentReports: true,
  canSubmitIncidentReports: true,
  canViewReports: true,
  canExportReports: true,
  canImpersonateUsers: true,
};

const SUPER_ADMIN_PERMISSIONS: RolePermissions = {
  canManageOrganization: true,
  canManageAllUsers: true,
  canManageAdminsAndBelow: true,
  canManageAuditorsAndBelow: true,
  canManageUsersOnly: true,
  canAssignRoles: true,
  canViewAuditLogs: true,
  canOverrideSystemSettings: false,
  canManageIntegrations: true,
  canViewSystemAnalytics: true,
  canViewLiabilityScans: true,
  canEditLiabilityScans: true,
  canDeleteLiabilityScans: true,
  canRunLiabilityScans: true,
  canViewEaps: true,
  canCreateEaps: true,
  canEditEaps: true,
  canDeleteEaps: true,
  canExportEaps: true,
  canViewSiteAssessments: true,
  canCreateSiteAssessments: true,
  canEditSiteAssessments: true,
  canDeleteSiteAssessments: true,
  canViewDrills: true,
  canCreateDrills: true,
  canEditDrills: true,
  canDeleteDrills: true,
  canLaunchDrills: true,
  canScheduleDrills: true,
  canViewDrillResults: true,
  canTriggerRasAlerts: true,
  canViewRasAlertHistory: true,
  canGetAlertResponses: true,
  canViewIncidents: true,
  canLogIncidents: true,
  canEditIncidents: true,
  canDeleteIncidents: true,
  canReviewIncidentReports: true,
  canSubmitIncidentReports: true,
  canViewReports: true,
  canExportReports: true,
  canImpersonateUsers: false,
};

const ADMIN_PERMISSIONS: RolePermissions = {
  canManageOrganization: false,
  canManageAllUsers: false,
  canManageAdminsAndBelow: false,
  canManageAuditorsAndBelow: true,  // Can create/edit auditors and users
  canManageUsersOnly: true,
  canAssignRoles: false,
  canViewAuditLogs: false,
  canOverrideSystemSettings: false,
  canManageIntegrations: false,
  canViewSystemAnalytics: false,
  canViewLiabilityScans: true,
  canEditLiabilityScans: true,
  canDeleteLiabilityScans: false,
  canRunLiabilityScans: true,
  canViewEaps: true,
  canCreateEaps: true,
  canEditEaps: true,
  canDeleteEaps: false,
  canExportEaps: true,
  canViewSiteAssessments: true,
  canCreateSiteAssessments: true,
  canEditSiteAssessments: true,
  canDeleteSiteAssessments: false,
  canViewDrills: true,
  canCreateDrills: true,
  canEditDrills: true,
  canDeleteDrills: false,
  canLaunchDrills: true,
  canScheduleDrills: true,
  canViewDrillResults: true,
  canTriggerRasAlerts: true,
  canViewRasAlertHistory: true,
  canGetAlertResponses: true,
  canViewIncidents: true,
  canLogIncidents: true,
  canEditIncidents: true,
  canDeleteIncidents: false,
  canReviewIncidentReports: true,
  canSubmitIncidentReports: true,
  canViewReports: true,
  canExportReports: true,
  canImpersonateUsers: false,
};

const AUDITOR_PERMISSIONS: RolePermissions = {
  canManageOrganization: false,
  canManageAllUsers: false,
  canManageAdminsAndBelow: false,
  canManageAuditorsAndBelow: false,
  canManageUsersOnly: false,
  canAssignRoles: false,
  canViewAuditLogs: false,
  canOverrideSystemSettings: false,
  canManageIntegrations: false,
  canViewSystemAnalytics: false,
  canViewLiabilityScans: true,
  canEditLiabilityScans: true,   // Both view and edit per spec
  canDeleteLiabilityScans: false,
  canRunLiabilityScans: true,
  canViewEaps: true,
  canCreateEaps: false,
  canEditEaps: true,             // Both view and edit per spec
  canDeleteEaps: false,
  canExportEaps: true,
  canViewSiteAssessments: true,
  canCreateSiteAssessments: true,  // Conduct site assessments
  canEditSiteAssessments: true,
  canDeleteSiteAssessments: false,
  canViewDrills: true,
  canCreateDrills: false,
  canEditDrills: false,
  canDeleteDrills: false,
  canLaunchDrills: false,
  canScheduleDrills: false,
  canViewDrillResults: true,
  canTriggerRasAlerts: false,    // Optional — controlled by flag
  canViewRasAlertHistory: true,
  canGetAlertResponses: false,
  canViewIncidents: true,
  canLogIncidents: false,
  canEditIncidents: false,
  canDeleteIncidents: false,
  canReviewIncidentReports: false,
  canSubmitIncidentReports: false,
  canViewReports: true,
  canExportReports: true,
  canImpersonateUsers: false,
};

const USER_PERMISSIONS: RolePermissions = {
  canManageOrganization: false,
  canManageAllUsers: false,
  canManageAdminsAndBelow: false,
  canManageAuditorsAndBelow: false,
  canManageUsersOnly: false,
  canAssignRoles: false,
  canViewAuditLogs: false,
  canOverrideSystemSettings: false,
  canManageIntegrations: false,
  canViewSystemAnalytics: false,
  canViewLiabilityScans: false,
  canEditLiabilityScans: false,
  canDeleteLiabilityScans: false,
  canRunLiabilityScans: false,
  canViewEaps: false,             // Controlled by flag
  canCreateEaps: false,
  canEditEaps: false,
  canDeleteEaps: false,
  canExportEaps: false,
  canViewSiteAssessments: false,
  canCreateSiteAssessments: false,
  canEditSiteAssessments: false,
  canDeleteSiteAssessments: false,
  canViewDrills: false,
  canCreateDrills: false,
  canEditDrills: false,
  canDeleteDrills: false,
  canLaunchDrills: false,
  canScheduleDrills: false,
  canViewDrillResults: false,
  canTriggerRasAlerts: false,     // Controlled by flag
  canViewRasAlertHistory: false,
  canGetAlertResponses: false,
  canViewIncidents: false,
  canLogIncidents: false,
  canEditIncidents: false,
  canDeleteIncidents: false,
  canReviewIncidentReports: false,
  canSubmitIncidentReports: true, // Users can submit incident reports
  canViewReports: false,
  canExportReports: false,
  canImpersonateUsers: false,
};

const VIEWER_PERMISSIONS: RolePermissions = {
  ...USER_PERMISSIONS,
  canViewLiabilityScans: true,
  canViewEaps: true,
  canViewSiteAssessments: true,
  canViewDrills: true,
  canViewDrillResults: true,
  canViewRasAlertHistory: true,
  canViewIncidents: true,
  canViewReports: true,
};

export const BASE_ROLE_PERMISSIONS: Record<PlatformRole | OrgRole, RolePermissions> = {
  ultra_admin: ULTRA_ADMIN_PERMISSIONS,
  super_admin: SUPER_ADMIN_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  auditor: AUDITOR_PERMISSIONS,
  user: USER_PERMISSIONS,
  viewer: VIEWER_PERMISSIONS,
};

// ─── Permission Resolver ──────────────────────────────────────────────────────

/**
 * Resolves the effective permissions for a user by combining their base role
 * permissions with any optional override flags.
 *
 * Flags can only GRANT additional permissions, never revoke base role permissions.
 */
export function resolvePermissions(
  role: PlatformRole | OrgRole,
  flags: Partial<PermissionFlags> = {}
): RolePermissions {
  const base = BASE_ROLE_PERMISSIONS[role] ?? USER_PERMISSIONS;

  return {
    ...base,
    // Apply optional flag overrides
    canTriggerRasAlerts: base.canTriggerRasAlerts || (flags.canTriggerAlerts ?? false),
    canLaunchDrills: base.canLaunchDrills || (flags.canRunDrills ?? false),
    canScheduleDrills: base.canScheduleDrills || (flags.canRunDrills ?? false),
    canExportReports: base.canExportReports || (flags.canExportReports ?? false),
    canExportEaps: base.canExportEaps || (flags.canExportReports ?? false),
    canViewIncidents: base.canViewIncidents || (flags.canViewIncidentLogs ?? false),
    canSubmitIncidentReports: base.canSubmitIncidentReports || (flags.canSubmitAnonymousReports ?? false),
    canViewEaps: base.canViewEaps || (flags.canAccessEap ?? false),
    canViewSiteAssessments: base.canViewSiteAssessments || (flags.canManageSiteAssessments ?? false),
    canCreateSiteAssessments: base.canCreateSiteAssessments || (flags.canManageSiteAssessments ?? false),
    canEditSiteAssessments: base.canEditSiteAssessments || (flags.canManageSiteAssessments ?? false),
  };
}

// ─── Role Metadata ────────────────────────────────────────────────────────────

export interface RoleMeta {
  label: string;
  description: string;
  color: string;
  badgeColor: string;
  level: number; // Higher = more privileged
}

export const ROLE_META: Record<PlatformRole | OrgRole, RoleMeta> = {
  ultra_admin: {
    label: "Ultra Admin",
    description: "Pursuit Pathways staff — full platform control with user impersonation",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    badgeColor: "bg-purple-600 text-white",
    level: 5,
  },
  super_admin: {
    label: "Super Admin",
    description: "Full organization control — manages all users, roles, and modules",
    color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    badgeColor: "bg-red-600 text-white",
    level: 4,
  },
  admin: {
    label: "Admin",
    description: "Operational owner — manages safety program execution and users",
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    badgeColor: "bg-orange-500 text-white",
    level: 3,
  },
  auditor: {
    label: "Auditor",
    description: "Oversight and compliance — read/validate with optional write access",
    color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    badgeColor: "bg-yellow-500 text-white",
    level: 2,
  },
  user: {
    label: "User",
    description: "General staff — participates in drills, receives alerts, submits reports",
    color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    badgeColor: "bg-green-600 text-white",
    level: 1,
  },
  viewer: {
    label: "Viewer",
    description: "Read-only access — cannot create or modify any data",
    color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    badgeColor: "bg-slate-500 text-white",
    level: 0,
  },
};

// ─── Role Hierarchy Helpers ───────────────────────────────────────────────────

/** Returns true if `actorRole` is at least as privileged as `targetRole` */
export function isAtLeastRole(
  actorRole: PlatformRole | OrgRole,
  targetRole: PlatformRole | OrgRole
): boolean {
  return (ROLE_META[actorRole]?.level ?? 0) >= (ROLE_META[targetRole]?.level ?? 0);
}

/** Returns true if `actorRole` is strictly more privileged than `targetRole` */
export function isHigherRole(
  actorRole: PlatformRole | OrgRole,
  targetRole: PlatformRole | OrgRole
): boolean {
  return (ROLE_META[actorRole]?.level ?? 0) > (ROLE_META[targetRole]?.level ?? 0);
}

/** Returns the list of roles that an actor can assign to others */
export function getAssignableRoles(actorRole: PlatformRole | OrgRole): OrgRole[] {
  const actorLevel = ROLE_META[actorRole]?.level ?? 0;
  const orgRoles: OrgRole[] = ["super_admin", "admin", "auditor", "user", "viewer"];
  return orgRoles.filter(r => (ROLE_META[r]?.level ?? 0) < actorLevel);
}

/** Returns true if the platform role is considered a platform-level admin */
export function isPlatformAdmin(role: PlatformRole): boolean {
  return role === "ultra_admin" || role === "admin";
}

/** Returns true if the role has full org control */
export function isOrgOwner(role: PlatformRole | OrgRole): boolean {
  return role === "ultra_admin" || role === "super_admin";
}
