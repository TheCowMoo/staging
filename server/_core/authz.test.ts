/**
 * Cross-tenant authorization regression tests (security audit F-02…F-06).
 *
 * Acceptance criterion: any caller-supplied facilityId / auditId / photoId /
 * incidentId that belongs to another tenant MUST be rejected with FORBIDDEN.
 *
 * The `../db` module is fully mocked so no database connection is required.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  getOrgMembershipForUser: vi.fn(),
  getFacilityById: vi.fn(),
  getAuditById: vi.fn(),
  getPhotoById: vi.fn(),
  getIncidentReportById: vi.fn(),
}));

import {
  requireOrgAccess,
  requireFacilityAccess,
  requireAuditAccess,
  requirePhotoAccess,
  requireIncidentAccess,
} from "./authz";
import {
  getOrgMembershipForUser,
  getFacilityById,
  getAuditById,
  getPhotoById,
  getIncidentReportById,
} from "../db";

const mocked = {
  getOrgMembershipForUser: vi.mocked(getOrgMembershipForUser),
  getFacilityById: vi.mocked(getFacilityById),
  getAuditById: vi.mocked(getAuditById),
  getPhotoById: vi.mocked(getPhotoById),
  getIncidentReportById: vi.mocked(getIncidentReportById),
};

/** Minimal authenticated user fixture (platform role "user" unless overridden). */
function user(overrides: Record<string, unknown> = {}) {
  return { id: 1, name: "tester", email: "tester@example.com", role: "user", ...overrides } as any;
}

function expectForbidden(promise: Promise<unknown>) {
  return expect(promise).rejects.toMatchObject({ code: "FORBIDDEN" });
}

beforeEach(() => {
  Object.values(mocked).forEach((m) => m.mockReset());
});

describe("requireOrgAccess", () => {
  it("allows a member of the target org", async () => {
    mocked.getOrgMembershipForUser.mockResolvedValue([{ orgId: 5 }] as any);
    await expect(requireOrgAccess(user(), [5])).resolves.toBeUndefined();
  });

  it("blocks a user who is not a member of the target org", async () => {
    mocked.getOrgMembershipForUser.mockResolvedValue([{ orgId: 5 }] as any);
    await expectForbidden(requireOrgAccess(user(), [6]));
  });

  it("allows platform admins regardless of membership", async () => {
    mocked.getOrgMembershipForUser.mockResolvedValue([] as any);
    await expect(requireOrgAccess(user({ role: "admin" }), [6])).resolves.toBeUndefined();
  });

  it("rejects unauthenticated callers with UNAUTHORIZED", async () => {
    await expect(requireOrgAccess(null, [5])).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("requireFacilityAccess — cross-tenant (F-02)", () => {
  it("blocks a user whose org does not own the facility", async () => {
    mocked.getFacilityById.mockResolvedValue({ id: 42, orgId: 100 } as any);
    mocked.getOrgMembershipForUser.mockResolvedValue([{ orgId: 200 }] as any);
    await expectForbidden(requireFacilityAccess(user(), 42));
  });

  it("allows a user whose org owns the facility", async () => {
    mocked.getFacilityById.mockResolvedValue({ id: 42, orgId: 100 } as any);
    mocked.getOrgMembershipForUser.mockResolvedValue([{ orgId: 100 }] as any);
    await expect(requireFacilityAccess(user(), 42)).resolves.toBeUndefined();
  });

  it("throws NOT_FOUND for missing facilities", async () => {
    mocked.getFacilityById.mockResolvedValue(undefined);
    await expect(requireFacilityAccess(user(), 999)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("requireAuditAccess — cross-tenant (F-02)", () => {
  it("blocks an audit belonging to another org (foreign auditId -> FORBIDDEN)", async () => {
    mocked.getAuditById.mockResolvedValue({ id: 7, orgId: 100, facilityId: 1, auditorId: 99 } as any);
    mocked.getOrgMembershipForUser.mockResolvedValue([{ orgId: 200 }] as any);
    await expectForbidden(requireAuditAccess(user(), 7));
  });

  it("allows a member of the audit's org", async () => {
    mocked.getAuditById.mockResolvedValue({ id: 7, orgId: 100, facilityId: 1, auditorId: 99 } as any);
    mocked.getOrgMembershipForUser.mockResolvedValue([{ orgId: 100 }] as any);
    await expect(requireAuditAccess(user(), 7)).resolves.toBeUndefined();
  });

  it("resolves the org from the facility when audit.orgId is null", async () => {
    mocked.getAuditById.mockResolvedValue({ id: 7, orgId: null, facilityId: 1, auditorId: 99 } as any);
    mocked.getFacilityById.mockResolvedValue({ id: 1, orgId: 100 } as any);
    mocked.getOrgMembershipForUser.mockResolvedValue([{ orgId: 100 }] as any);
    await expect(requireAuditAccess(user(), 7)).resolves.toBeUndefined();
  });

  it("blocks a foreign user even when the org is resolved via the facility", async () => {
    mocked.getAuditById.mockResolvedValue({ id: 7, orgId: null, facilityId: 1, auditorId: 99 } as any);
    mocked.getFacilityById.mockResolvedValue({ id: 1, orgId: 100 } as any);
    mocked.getOrgMembershipForUser.mockResolvedValue([{ orgId: 200 }] as any);
    await expectForbidden(requireAuditAccess(user(), 7));
  });

  it("allows the owning auditor on legacy audits with no org", async () => {
    mocked.getAuditById.mockResolvedValue({ id: 7, orgId: null, facilityId: 1, auditorId: 11 } as any);
    mocked.getFacilityById.mockResolvedValue({ id: 1, orgId: null } as any);
    await expect(requireAuditAccess(user({ id: 11 }), 7)).resolves.toBeUndefined();
  });

  it("blocks non-auditors from legacy audits with no org", async () => {
    mocked.getAuditById.mockResolvedValue({ id: 7, orgId: null, facilityId: 1, auditorId: 11 } as any);
    mocked.getFacilityById.mockResolvedValue({ id: 1, orgId: null } as any);
    await expectForbidden(requireAuditAccess(user({ id: 12 }), 7));
  });
});

describe("requirePhotoAccess — cross-tenant (F-03)", () => {
  it("blocks a photo whose audit belongs to another org", async () => {
    mocked.getPhotoById.mockResolvedValue({ id: 3, auditId: 7 } as any);
    mocked.getAuditById.mockResolvedValue({ id: 7, orgId: 100, facilityId: 1, auditorId: 99 } as any);
    mocked.getOrgMembershipForUser.mockResolvedValue([{ orgId: 200 }] as any);
    await expectForbidden(requirePhotoAccess(user(), 3));
  });

  it("allows a photo whose audit belongs to the caller's org", async () => {
    mocked.getPhotoById.mockResolvedValue({ id: 3, auditId: 7 } as any);
    mocked.getAuditById.mockResolvedValue({ id: 7, orgId: 100, facilityId: 1, auditorId: 99 } as any);
    mocked.getOrgMembershipForUser.mockResolvedValue([{ orgId: 100 }] as any);
    await expect(requirePhotoAccess(user(), 3)).resolves.toBeUndefined();
  });
});

describe("requireIncidentAccess — cross-tenant (F-04/F-05)", () => {
  it("blocks an incident belonging to another org", async () => {
    mocked.getIncidentReportById.mockResolvedValue({ id: 9, orgId: 100 } as any);
    mocked.getOrgMembershipForUser.mockResolvedValue([{ orgId: 200 }] as any);
    await expectForbidden(requireIncidentAccess(user(), 9));
  });

  it("allows a member of the incident's org", async () => {
    mocked.getIncidentReportById.mockResolvedValue({ id: 9, orgId: 100 } as any);
    mocked.getOrgMembershipForUser.mockResolvedValue([{ orgId: 100 }] as any);
    await expect(requireIncidentAccess(user(), 9)).resolves.toBeUndefined();
  });

  it("allows platform admins on legacy incidents with no org", async () => {
    mocked.getIncidentReportById.mockResolvedValue({ id: 9, orgId: null } as any);
    await expect(requireIncidentAccess(user({ role: "ultra_admin" }), 9)).resolves.toBeUndefined();
  });

  it("blocks regular users from legacy incidents with no org", async () => {
    mocked.getIncidentReportById.mockResolvedValue({ id: 9, orgId: null } as any);
    await expectForbidden(requireIncidentAccess(user(), 9));
  });
});

