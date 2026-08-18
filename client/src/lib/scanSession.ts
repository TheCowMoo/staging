/**
 * scanSession.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin sessionStorage wrapper that persists Liability Exposure Scan state
 * across in-session navigation (browser back, route changes, etc.).
 *
 * Data is scoped to the browser tab session — it is automatically cleared when
 * the tab is closed, which is the correct lifecycle for a scan workflow.
 *
 * Keys:
 *   pp_scan_result      — AssessmentOutput JSON
 *   pp_scan_answers     — Record<string, AnswerValue> JSON
 *   pp_scan_jurisdiction — string
 *   pp_scan_industry    — string
 *   pp_scan_id          — number (DB row id after auto-save)
 *   pp_plan_visited     — "1" flag set when user navigates to /defensibility-plan
 */

import type { AssessmentOutput, AnswerValue } from "../../../shared/assessmentEngine";

const KEYS = {
  result: "pp_scan_result",
  answers: "pp_scan_answers",
  jurisdiction: "pp_scan_jurisdiction",
  industry: "pp_scan_industry",
  organization: "pp_scan_organization",
  employeeCount: "pp_scan_employee_count",
  facilityLocation: "pp_scan_facility_location",
  lateNight: "pp_scan_late_night",
  scanId: "pp_scan_id",
  planVisited: "pp_plan_visited",
} as const;

// ─── Write helpers ────────────────────────────────────────────────────────────

export function saveScanSession(params: {
  result: AssessmentOutput;
  answers: Record<string, AnswerValue>;
  jurisdiction: string;
  industry: string;
  organization?: string;
  employeeCount?: string;
  facilityLocation?: string;
  scanId?: number | null;
  lateNightOperations?: boolean;
}) {
  try {
    sessionStorage.setItem(KEYS.result, JSON.stringify(params.result));
    sessionStorage.setItem(KEYS.answers, JSON.stringify(params.answers));
    sessionStorage.setItem(KEYS.jurisdiction, params.jurisdiction);
    sessionStorage.setItem(KEYS.industry, params.industry);
    if (params.organization !== undefined) {
      sessionStorage.setItem(KEYS.organization, params.organization);
    }
    if (params.employeeCount !== undefined) {
      sessionStorage.setItem(KEYS.employeeCount, params.employeeCount);
    }
    if (params.facilityLocation !== undefined) {
      sessionStorage.setItem(KEYS.facilityLocation, params.facilityLocation);
    }
    if (typeof params.lateNightOperations === "boolean") {
      sessionStorage.setItem(KEYS.lateNight, params.lateNightOperations ? "1" : "0");
    }
    if (params.scanId != null) {
      sessionStorage.setItem(KEYS.scanId, String(params.scanId));
    }
  } catch {
    // sessionStorage may be unavailable in private-browsing edge cases; fail silently
  }
}

export function saveScanId(scanId: number) {
  try {
    sessionStorage.setItem(KEYS.scanId, String(scanId));
  } catch { /* ignore */ }
}

export function markPlanVisited() {
  try {
    sessionStorage.setItem(KEYS.planVisited, "1");
  } catch { /* ignore */ }
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

export interface ScanSession {
  result: AssessmentOutput | null;
  answers: Record<string, AnswerValue>;
  jurisdiction: string;
  industry: string;
  organization: string;
  employeeCount: string;
  facilityLocation: string;
  scanId: number | null;
  lateNightOperations?: boolean;
  planVisited: boolean;
}

export function loadScanSession(): ScanSession {
  try {
    const rawResult = sessionStorage.getItem(KEYS.result);
    const rawAnswers = sessionStorage.getItem(KEYS.answers);
    const rawScanId = sessionStorage.getItem(KEYS.scanId);
    return {
      result: rawResult ? (JSON.parse(rawResult) as AssessmentOutput) : null,
      answers: rawAnswers ? (JSON.parse(rawAnswers) as Record<string, AnswerValue>) : {},
      jurisdiction: sessionStorage.getItem(KEYS.jurisdiction) ?? "",
      industry: sessionStorage.getItem(KEYS.industry) ?? "",
      organization: sessionStorage.getItem(KEYS.organization) ?? "",
      employeeCount: sessionStorage.getItem(KEYS.employeeCount) ?? "",
      facilityLocation: sessionStorage.getItem(KEYS.facilityLocation) ?? "",
      scanId: rawScanId ? Number(rawScanId) : null,
      lateNightOperations: sessionStorage.getItem(KEYS.lateNight) === "1",
      planVisited: sessionStorage.getItem(KEYS.planVisited) === "1",
    };
  } catch {
    return { result: null, answers: {}, jurisdiction: "", industry: "", organization: "", employeeCount: "", facilityLocation: "", scanId: null, planVisited: false };
  }
}

// ─── Clear helpers ────────────────────────────────────────────────────────────

/** Full reset — called by "Start Over" and the empty-state "Start Scan" CTA */
export function clearScanSession() {
  try {
    Object.values(KEYS).forEach((k) => sessionStorage.removeItem(k));
  } catch { /* ignore */ }
}
