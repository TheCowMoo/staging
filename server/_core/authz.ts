/**
 * Centralized object-level authorization (F-02/F-03/F-04/F-05/F-06).
 *
 * Relationship chain: user → org membership → facility → audit (and audit-owned
 * children: responses, threat findings, photos, EAP data).
 *
 * Convention: every tRPC procedure that accepts a caller-supplied
 * `facilityId` / `auditId` / `photoId` / `incidentId` / `keyId` MUST call the
 * matching `require*Access` helper as its first step. Platform admins
 * (ultra_admin / admin) bypass org checks. Legacy rows with no orgId are only
 * accessible to the owning auditor or a platform admin.
 */
import { TRPCError } from "@trpc/server";
import {
  getOrgMembershipForUser,
  getFacilityById,
  getAuditById,
  getPhotoById,
  getIncidentReportById,
} from "../db";
import type { User } from "../../drizzle/schema";

/** Platform staff roles that bypass org-scoped checks. */
export function isPlatformAdmin(user: Pick<User, "role"> | null | undefined): boolean {
  return !!user && ["ultra_admin", "admin"].includes(user.role);
}

/** Org IDs the user belongs to via org_members (empty if none). */
export async function getUserOrgIds(userId: number): Promise<number[]> {
  const memberships = await getOrgMembershipForUser(userId);
  return memberships.map((m) => m.orgId);
}

/**
 * Throw FORBIDDEN unless the user is a platform admin OR a member of at least
 * one of the given orgs.
 */
export async function requireOrgAccess(
  user: User | null | undefined,
  orgIds: number[],
  message = "You do not have access to this data."
): Promise<void> {
  if (isPlatformAdmin(user)) return;
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (orgIds.length === 0) {
    throw new TRPCError({ code: "FORBIDDEN", message });
  }
  const userOrgIds = await getUserOrgIds(user.id);
  if (!orgIds.some((orgId) => userOrgIds.includes(orgId))) {
    throw new TRPCError({ code: "FORBIDDEN", message });
  }
}

/**
 * Require access to a facility. Throws NOT_FOUND if it doesn't exist and
 * FORBIDDEN if the caller is not a member of the facility's org.
 */
export async function requireFacilityAccess(
  user: User | null | undefined,
  facilityId: number
): Promise<void> {
  const facility = await getFacilityById(facilityId);
  if (!facility) throw new TRPCError({ code: "NOT_FOUND", message: "Facility not found." });
  if (facility.orgId == null) {
    if (!isPlatformAdmin(user)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this facility." });
    }
    return;
  }
  await requireOrgAccess(user, [facility.orgId], "You do not have access to this facility.");
}

/**
 * Require access to an audit (and everything owned by it). Throws NOT_FOUND if
 * the audit doesn't exist and FORBIDDEN if the caller is not authorized.
 */
export async function requireAuditAccess(
  user: User | null | undefined,
  auditId: number
): Promise<void> {
  const audit = await getAuditById(auditId);
  if (!audit) throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found." });
  const orgId = audit.orgId ?? (await getFacilityById(audit.facilityId))?.orgId ?? null;
  if (orgId == null) {
    // Legacy audit with no org — only the owning auditor or a platform admin.
    if (audit.auditorId === user?.id || isPlatformAdmin(user)) return;
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this audit." });
  }
  await requireOrgAccess(user, [orgId], "You do not have access to this audit.");
}

/**
 * Require access to an audit photo (resolves the photo → audit → org chain).
 * Throws NOT_FOUND if the photo doesn't exist.
 */
export async function requirePhotoAccess(
  user: User | null | undefined,
  photoId: number
): Promise<void> {
  const photo = await getPhotoById(photoId);
  if (!photo) throw new TRPCError({ code: "NOT_FOUND", message: "Photo not found." });
  await requireAuditAccess(user, photo.auditId);
}

/**
 * Require access to an incident report (resolves incident → org chain).
 * Throws NOT_FOUND if the incident doesn't exist.
 */
export async function requireIncidentAccess(
  user: User | null | undefined,
  incidentId: number
): Promise<void> {
  const incident = await getIncidentReportById(incidentId);
  if (!incident) throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found." });
  const orgId = incident.orgId ?? null;
  if (orgId == null) {
    if (!isPlatformAdmin(user)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this incident." });
    }
    return;
  }
  await requireOrgAccess(user, [orgId], "You do not have access to this incident.");
}
