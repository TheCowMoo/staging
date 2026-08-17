import { describe, it, expect } from "vitest";
import { BASE_ROLE_PERMISSIONS } from "../shared/permissions";

/**
 * Sandbox role permission matrix — verifies the sandbox lock profile
 * matches the product requirements (Prompts 6-12):
 *  - Full: Readiness Scan, Incidents, Analytics (view)
 *  - View-only: Site Assessments (content-locked), EAP (no create), Drills, RAS
 */
describe("Sandbox role permissions", () => {
  const sb = BASE_ROLE_PERMISSIONS.sandbox;

  it("grants full Readiness Scan (liability scan) access", () => {
    expect(sb.canViewLiabilityScans).toBe(true);
    expect(sb.canRunLiabilityScans).toBe(true);
    expect(sb.canEditLiabilityScans).toBe(true);
    expect(sb.canDeleteLiabilityScans).toBe(true);
  });

  it("grants full access to incidents (Prompt 8)", () => {
    expect(sb.canViewIncidents).toBe(true);
    expect(sb.canLogIncidents).toBe(true);
    expect(sb.canEditIncidents).toBe(true);
    expect(sb.canDeleteIncidents).toBe(true);
    expect(sb.canSubmitIncidentReports).toBe(true);
  });

  it("allows site assessment + EAP viewing but never EAP creation (Prompt 7)", () => {
    expect(sb.canViewSiteAssessments).toBe(true);
    expect(sb.canCreateSiteAssessments).toBe(false);
    expect(sb.canEditSiteAssessments).toBe(false);
    expect(sb.canViewEaps).toBe(true);
    expect(sb.canCreateEaps).toBe(false);
    expect(sb.canExportEaps).toBe(false);
  });

  it("makes drills view-only (Prompt 10)", () => {
    expect(sb.canViewDrills).toBe(true);
    expect(sb.canViewDrillResults).toBe(true);
    expect(sb.canScheduleDrills).toBe(false);
    expect(sb.canLaunchDrills).toBe(false);
    expect(sb.canCreateDrills).toBe(false);
  });

  it("makes RAS view-only (Prompt 12)", () => {
    expect(sb.canViewRasAlertHistory).toBe(true);
    expect(sb.canGetAlertResponses).toBe(true);
    expect(sb.canTriggerRasAlerts).toBe(false);
  });

  it("grants analytics view but no admin / user management (Prompt 11)", () => {
    expect(sb.canViewSystemAnalytics).toBe(true);
    expect(sb.canManageAllUsers).toBe(false);
    expect(sb.canManageOrganization).toBe(false);
    expect(sb.canImpersonateUsers).toBe(false);
  });
});
