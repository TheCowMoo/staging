/**
 * AdvisoryReport
 * Executive Advisory Report — a fully EDITABLE printable template for the
 * Readiness Scan. Every value (intake, stats, category text, manual fields)
 * is pre-filled and editable before export.
 *
 * Two exports:
 *  - "Save Advisor PDF" — full report (includes admin-only Discovery Call Notes).
 *  - "Save Client PDF" — hides `.admin-only` sections (Discovery Call Notes).
 *
 * Compliance (executive directive):
 *  - Discovery Call Notes, Advisor Insight, Strategic Priorities, Expected
 *    Organizational Outcomes, Investment Range, and Sections 2–6 (operating
 *    model, exposure, recommended solution, roadmap, ROI) are MANUAL fields —
 *    never AI-generated. Strategic Priorities pre-fill from the scan's
 *    Action Roadmap; Sections 4–6 pre-fill from editable templates.
 *  - Category descriptions start as the exact operational-interpretation
 *    outputs (categoryInsight()) but are editable per the template requirement.
 */
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { loadScanSession } from "@/lib/scanSession";
import { useAuth } from "@/_core/hooks/useAuth";
import { categoryInsight } from "@/components/assessment/CategoryBreakdownBar";
import type { CategoryKey, CategoryScores } from "../../../shared/assessmentEngine";

// Five Stones brand palette (platform was rebranded from Pursuit Pathways)
const FS = {
  navy: "#0B1F33",
  steel: "#3A5F7D",
  gold: "#C9A86A",
  neutral: "#BBBDB7",
  lightBlue: "#D3E2F3",
  midBlue: "#82ACD6",
  darkTeal: "#00808E",
  citrus: "#E4E348",
  orange: "#F0AD4E",
};

// Self-hosted brand logos (served from client/public)
const LOGO_URL = "/logo-five-stones.png";
const PURSUIT_LOGO_URL = "/PursuitPathwaysLogo.png";

const CATEGORIES: { key: CategoryKey; scoreKey: string; label: string }[] = [
  { key: "planning_documentation", scoreKey: "planningDocumentation", label: "Planning & Documentation" },
  { key: "training_awareness", scoreKey: "trainingAwareness", label: "Training & Awareness" },
  { key: "reporting_communication", scoreKey: "reportingCommunication", label: "Reporting & Communication" },
  { key: "response_readiness", scoreKey: "responseReadiness", label: "Response Readiness" },
];

function scoreClass(score: number): "low" | "mid" | "high" {
  if (score < 40) return "low";
  if (score <= 75) return "mid";
  return "high";
}

// Section 2 — Current State Operating Model (program components → scan categories)
const PROGRAM_COMPONENTS: { label: string; categoryKey: keyof CategoryScores }[] = [
  { label: "Executive Oversight", categoryKey: "planningDocumentation" },
  { label: "Site Risk Assessment", categoryKey: "planningDocumentation" },
  { label: "Workplace Violence Prevention Plan", categoryKey: "planningDocumentation" },
  { label: "Active Threat Emergency Response Plan", categoryKey: "planningDocumentation" },
  { label: "Employee Reporting", categoryKey: "reportingCommunication" },
  { label: "Employee Communication", categoryKey: "reportingCommunication" },
  { label: "Employee Training", categoryKey: "trainingAwareness" },
  { label: "Drills & Exercises", categoryKey: "responseReadiness" },
  { label: "Incident Review & Continuous Improvement", categoryKey: "responseReadiness" },
];

const OWNER_OPTIONS = [
  "Executive Leadership",
  "Human Resources",
  "Facilities / Operations",
  "Security",
  "EHS / Safety Manager",
  "IT",
  "Designated Safety Coordinator",
  "Not Assigned",
  "Other",
];

type StatusLevel = "complete" | "partial" | "not_in_place";
const STATUS_ORDER: StatusLevel[] = ["complete", "partial", "not_in_place"];
const STATUS_LABELS: Record<StatusLevel, string> = {
  complete: "Complete",
  partial: "Partial",
  not_in_place: "Not in Place",
};

function statusFromScore(score: number): StatusLevel {
  if (score < 40) return "not_in_place";
  if (score <= 75) return "partial";
  return "complete";
}

// ── Section 4 — Recommended Solution (prefilled, add/remove options) ──────
interface SolutionOption {
  id: string;
  label: string;        // "Option 1"
  title: string;        // "Guided Implementation"
  description: string;  // one-line pitch
  provides: string;     // multi-line list (one item per line)
  owns: string;         // multi-line list (one item per line)
}

const DEFAULT_OPTIONS: SolutionOption[] = [
  {
    id: "opt-1",
    label: "Option 1",
    title: "Guided Implementation",
    description:
      "Best suited for organizations wanting to build internal capability while leveraging Pursuit Pathways as an extension of their team.",
    provides: "Five Stones Platform\nTemplates\nAdvisory support\nReviews\nGuidance",
    owns: "Assessments\nInternal coordination\nProgram management\nAnnual reviews",
  },
  {
    id: "opt-2",
    label: "Option 2",
    title: "Full Service Implementation",
    description: "Best suited for organizations seeking expert-led implementation.",
    provides:
      "Site Threat Assessments\nFacility walkthroughs\nExecutive reporting\nEmergency Response Plans\nWorkplace Violence Prevention Plans\nFive Stones deliverables\nAdvisory support",
    owns: "Internal approvals\nOngoing ownership",
  },
];

const DEFAULT_ADDITIONAL_SERVICES =
  "Site Threat Assessment\nActive Threat Emergency Response Plan\nWorkplace Violence Prevention Plan\nExecutive Leadership Training\nEmployee Training\nTabletop Exercises\nActive Threat Drills\nFive Stones Platform\nAnnual Reviews";

// ── Section 5 — Implementation Roadmap (prefilled, add/remove phases) ─────
interface RoadmapPhase {
  id: string;
  name: string;         // "Phase 1"
  title: string;        // "Discovery & Assessment"
  timeline: string;     // "Week 1–2"
  deliverables: string; // multi-line list
  outcome: string;      // "Clear understanding of ..."
}

const DEFAULT_PHASES: RoadmapPhase[] = [
  {
    id: "phase-1",
    name: "Phase 1",
    title: "Discovery & Assessment",
    timeline: "Week 1–2",
    deliverables: "Project kickoff\nStakeholder meetings\nDocumentation review\nSite Threat Assessment\nExecutive observations",
    outcome: "Clear understanding of organizational readiness and implementation priorities.",
  },
  {
    id: "phase-2",
    name: "Phase 2",
    title: "Planning & Development",
    timeline: "Week 3–6",
    deliverables: "Emergency Response Plan\nWorkplace Violence Prevention Plan\nFive Stones configuration\nLeadership review",
    outcome: "Documented plans aligned with operational needs.",
  },
  {
    id: "phase-3",
    name: "Phase 3",
    title: "Implementation & Validation",
    timeline: "Week 7–10",
    deliverables: "Leadership training\nEmployee training\nTabletop exercises\nActive threat drills\nFinal recommendations",
    outcome: "Operational readiness validated through training and exercises.",
  },
  {
    id: "phase-4",
    name: "Phase 4",
    title: "Sustainment & Continuous Improvement",
    timeline: "Ongoing",
    deliverables: "Annual reviews\nFive Stones updates\nRefresher training\nAdditional assessments\nAdvisory support",
    outcome: "Preparedness becomes an ongoing organizational capability.",
  },
];

const DEFAULT_PURPOSE =
  "Provide leadership with a clear understanding of the implementation process, expected deliverables, and project visibility.";

const DEFAULT_COMMUNICATION =
  "Leadership receives regular project updates, milestone reviews, and implementation status throughout the engagement.\n\nProgress may be communicated through Five Stones, Microsoft Teams, Slack, email, scheduled project meetings, or executive status reports, based on the organization's preferred communication method.";

// ── Section 6 — Quantified Return on Investment (prefilled template, editable) ──
interface RoiLine {
  id: string;
  label: string;   // "Employee Attrition Savings"
  value: string;   // raw "$" amount text (the "$" prefix is rendered separately)
  total?: boolean; // true for the "Total Estimated Annual Value" row
}

const DEFAULT_ROI_LINES: RoiLine[] = [
  { id: "roi-1", label: "Employee Attrition Savings", value: "" },
  { id: "roi-2", label: "Insurance Premium Impact", value: "" },
  { id: "roi-3", label: "Lost Production Avoidance", value: "" },
  { id: "roi-4", label: "Litigation Risk Reduction", value: "" },
  { id: "roi-5", label: "Leadership Time Savings", value: "" },
  { id: "roi-total", label: "Total Estimated Annual Value", value: "", total: true },
];

const DEFAULT_ROI_NOTE =
  "Based on conservative estimates generated through the Pursuit Pathways ROI Calculator using client-provided information.";

const REPORT_CSS = `
.advisory-root {
  --fs-navy: ${FS.navy}; --fs-steel: ${FS.steel}; --fs-gold: ${FS.gold};
  --fs-neutral: ${FS.neutral}; --fs-light-blue: ${FS.lightBlue}; --fs-mid-blue: ${FS.midBlue};
  --fs-dark-teal: ${FS.darkTeal}; --fs-citrus: ${FS.citrus}; --fs-orange: ${FS.orange};
  background-color: #525659;
  padding: 40px 20px;
  display: flex; flex-direction: column; align-items: center; gap: 40px;
  font-family: 'Open Sans', system-ui, sans-serif; line-height: 1.5; color: #333;
}
.advisory-root .print-btn {
  position: fixed; bottom: 30px; right: 30px; background-color: var(--fs-dark-teal); color: #fff;
  border: none; padding: 14px 22px; font-size: 15px; border-radius: 8px; cursor: pointer;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 1000; display: flex; align-items: center; gap: 10px;
}
.advisory-root .print-btn:hover { background-color: var(--fs-navy); transform: translateY(-2px); }
.advisory-root .print-btn.client-export { right: 215px; background-color: var(--fs-navy); }
.advisory-root .back-btn {
  position: fixed; bottom: 30px; left: 30px; background-color: #fff; color: var(--fs-navy);
  border: 1px solid var(--fs-mid-blue); padding: 12px 18px; font-size: 14px; border-radius: 8px;
  cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 1000;
}
.advisory-root .back-btn:hover { background-color: var(--fs-light-blue); }
.advisory-root .page {
  background-color: #fff; width: 8.5in; min-height: 11in; box-sizing: border-box;
  padding: 0.75in; box-shadow: 0 4px 15px rgba(0,0,0,0.3); position: relative;
  display: flex; flex-direction: column;
}
.advisory-root .report-footer {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--fs-neutral);
  display: flex; justify-content: space-between; align-items: center;
  font-size: 9px; color: #777;
}
.advisory-root .report-footer .footer-page { font-weight: 600; color: var(--fs-navy); }
.advisory-root .logo-band {
  background: #4B5563; border-radius: 8px; display: flex; justify-content: center; align-items: center;
  padding: 14px 18px; margin: 0 0 18px;
}
.advisory-root .logo-pursuit { height: 30px; width: auto; opacity: 0.5; position: absolute; top: 0; left: 0; }
.advisory-root .logo-band img.logo-fivestones { height: 90px; width: auto; display: block; }
.advisory-root .header-section { text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid var(--fs-mid-blue); }
.advisory-root .brand-wordmark { font-weight: 700; font-size: 20px; letter-spacing: 3px; color: var(--fs-navy); text-transform: uppercase; margin-bottom: 12px; }
.advisory-root h1, .advisory-root h2, .advisory-root h3, .advisory-root h4, .advisory-root th { color: var(--fs-navy); margin: 0; }
.advisory-root h1 { font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
.advisory-root h2 { font-size: 18px; margin-top: 25px; margin-bottom: 10px; color: var(--fs-dark-teal); }
.advisory-root h3 { font-size: 16px; margin-top: 20px; margin-bottom: 8px; }
.advisory-root p, .advisory-root li { font-size: 13px; margin-top: 5px; margin-bottom: 5px; }
.advisory-root .highlight { background-color: var(--fs-citrus); color: var(--fs-navy); padding: 4px 8px; display: inline-block; }
.advisory-root .client-info-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background-color: #fafafa;
  padding: 15px; border: 1px solid var(--fs-neutral); border-radius: 4px; margin-bottom: 20px; font-size: 13px;
}
.advisory-root .client-info-grid strong { color: var(--fs-navy); }
.advisory-root input[type="text"], .advisory-root input[type="number"], .advisory-root textarea, .advisory-root select {
  width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid var(--fs-neutral);
  font-family: 'Open Sans', system-ui, sans-serif; font-size: 12px; background-color: #fcfcfc; resize: none; border-radius: 4px;
}
.advisory-root textarea { overflow: hidden; }
.advisory-root input[type="text"]:focus, .advisory-root input[type="number"]:focus, .advisory-root textarea:focus, .advisory-root select:focus { outline: 1px solid var(--fs-mid-blue); background-color: #fff; }
.advisory-root .score-box { background-color: var(--fs-light-blue); border: 1px solid var(--fs-mid-blue); padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px; }
.advisory-root .gauge { position: relative; width: 150px; height: 150px; margin: 2px auto 0; }
.advisory-root .gauge svg { width: 150px; height: 150px; display: block; }
.advisory-root .gauge-track { fill: none; stroke: #E0E0E0; stroke-width: 12; }
.advisory-root .gauge-arc { fill: none; stroke-width: 12; stroke-linecap: round; transition: stroke-dashoffset 0.3s ease; }
.advisory-root .gauge-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.advisory-root .overall-score-input { width: 90px; font-size: 32px; font-weight: 700; color: var(--fs-navy); text-align: center; border: 1px solid transparent; background: transparent; }
.advisory-root .overall-score-input:focus { outline: none; border-color: var(--fs-mid-blue); background: #fff; }
.advisory-root .overall-score-denom { font-size: 15px; color: var(--fs-navy); margin-top: -2px; }
.advisory-root .chart-row { margin-bottom: 15px; }
.advisory-root .phase-block, .advisory-root .chart-row, .advisory-root .exposure-grid,
.advisory-root .client-info-grid, .advisory-root .score-box { break-inside: avoid; page-break-inside: avoid; }
.advisory-root .chart-header { display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: var(--fs-navy); margin-bottom: 4px; }
.advisory-root .score-input { width: 64px; padding: 4px 6px; font-size: 13px; text-align: right; border: 1px solid var(--fs-neutral); border-radius: 4px; background: #fcfcfc; }
.advisory-root .bar-track { width: 100%; height: 12px; background-color: #e0e0e0; border-radius: 6px; overflow: hidden; margin-bottom: 4px; }
.advisory-root .bar-fill { height: 100%; width: 0%; border-radius: 6px; }
.advisory-root .bar-fill.low { background-color: var(--fs-orange); }
.advisory-root .bar-fill.mid { background-color: var(--fs-citrus); }
.advisory-root .bar-fill.high { background-color: var(--fs-dark-teal); }

.advisory-root textarea.chart-desc { width: 100%; padding: 6px; border: 1px solid var(--fs-neutral); border-radius: 4px; background: #fcfcfc; color: #666; font-style: italic; }
.advisory-root .private-tag { font-size: 10px; color: #fff; background: var(--fs-dark-teal); padding: 2px 6px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.5px; vertical-align: middle; }
.advisory-root .exposure-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.advisory-root .exposure-grid label { font-size: 12px; font-weight: 600; color: var(--fs-navy); display: block; margin-bottom: 4px; }
.advisory-root table { width: 100%; border-collapse: collapse; margin-top: 15px; table-layout: fixed; }
.advisory-root th, .advisory-root td { border: 1px solid var(--fs-neutral); padding: 10px; text-align: left; vertical-align: top; font-size: 13px; }
.advisory-root th { background-color: var(--fs-navy); color: #fff; }
.advisory-root .ops-table th { background-color: #f3f4f6; color: var(--fs-navy); }
.advisory-root .status-circle {
  width: 16px; height: 16px; border-radius: 50%; border: 1px solid #555;
  display: inline-block; vertical-align: middle; cursor: pointer; padding: 0;
}
.advisory-root .status-circle.complete { background-color: #22C55E; border-color: #22C55E; }
.advisory-root .status-circle.partial { background-color: #F59E0B; border-color: #F59E0B; }
.advisory-root .status-circle.not_in_place { background-color: #E5484D; border-color: #E5484D; }
.advisory-root .status-label { font-size: 12px; color: var(--fs-navy); margin-left: 6px; }
.advisory-root .add-btn {
  display: inline-block; margin: 4px 0 14px; padding: 6px 14px; font-size: 12px;
  border: 1px dashed var(--fs-mid-blue); border-radius: 6px; background: #fff;
  color: var(--fs-navy); cursor: pointer;
}
.advisory-root .remove-btn {
  display: inline-block; margin-left: 10px; padding: 4px 10px; font-size: 11px;
  border: 1px solid #d7d7d7; border-radius: 4px; background: #fff; color: #b91c1c; cursor: pointer;
}
.advisory-root .option-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.advisory-root .option-head input[type="text"] { width: auto; padding: 4px 8px; }
.advisory-root .option-head .opt-label { width: 96px; font-weight: 700; color: var(--fs-navy); }
.advisory-root .option-head .opt-title { flex: 1; min-width: 140px; font-size: 14px; font-weight: 600; }
.advisory-root .list-label { display: block; font-size: 11px; font-weight: 700; color: var(--fs-navy); margin: 10px 0 4px; text-transform: uppercase; letter-spacing: 0.4px; }
.advisory-root .timeline-row { display: flex; align-items: center; gap: 6px; margin: 8px 0; }
.advisory-root .timeline-row label { font-size: 12px; font-weight: 700; color: var(--fs-navy); white-space: nowrap; }
.advisory-root .timeline-row input { flex: 1; }
.advisory-root .money-row { display: flex; align-items: center; gap: 4px; }
.advisory-root .money-row input { width: 150px; padding: 4px 8px; }
.advisory-root .cap-row { display: flex; align-items: center; gap: 6px; margin: 6px 0; }
.advisory-root .cap-label { width: auto; min-width: 240px; font-weight: 600; color: var(--fs-navy); }
.advisory-root .cap-fixed-label { font-size: 13px; color: var(--fs-navy); min-width: 240px; font-weight: 600; }
.advisory-root .cap-value { width: 90px; padding: 4px 8px; text-align: center; }
.advisory-root .cap-unit { font-size: 12px; color: #666; }
.advisory-root .roi-label { font-weight: 600; }
.advisory-root .roi-total .roi-label { font-weight: 700; color: var(--fs-navy); }
.advisory-root textarea.roi-note { font-size: 12px; color: #666; font-style: italic; margin-top: 16px; }
.advisory-root .phase-block { margin-bottom: 20px; padding: 15px; border: 1px solid var(--fs-neutral); border-left: 5px solid var(--fs-dark-teal); border-radius: 4px; background-color: #fafafa; }
.advisory-root .phase-block h3 { color: var(--fs-navy); margin-top: 0; margin-bottom: 10px; }
.advisory-root .investment-group { display: flex; align-items: center; gap: 10px; background-color: var(--fs-light-blue); padding: 15px; border-radius: 4px; font-weight: 600; color: var(--fs-navy); width: max-content; margin-top: 10px; }
.advisory-root .investment-group input { width: 320px; padding: 8px; font-size: 14px; }
.advisory-root hr { border: 0; border-top: 1px solid var(--fs-neutral); margin: 30px 0; }
.advisory-root.client-mode .admin-only { display: none !important; }
@media print {
  @page { size: letter; margin: 0.5in 0.75in; }
  body { background-color: transparent; }
  .advisory-root { background-color: transparent; padding: 0; display: block; }
  .advisory-root .page { width: 100%; min-height: auto; padding: 0; box-shadow: none; margin: 0; page-break-after: always; }
  .advisory-root .page:last-child { page-break-after: auto; }
  .advisory-root * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .advisory-root input[type="text"], .advisory-root input[type="number"], .advisory-root textarea, .advisory-root select { border: none !important; background-color: transparent !important; box-shadow: none !important; border-radius: 0 !important; }
  .advisory-root input::placeholder, .advisory-root textarea::placeholder { color: transparent !important; }
  .advisory-root .no-print { display: none !important; }
  .advisory-root.client-mode .admin-only { display: none !important; }
  .advisory-root hr { margin: 20px 0; }
  .advisory-root .highlight { background: none !important; padding: 0 0 4px !important; display: block !important; border-bottom: 2px solid var(--fs-mid-blue) !important; margin-bottom: 10px !important; }
  .advisory-root .phase-block { border: none !important; background: transparent !important; padding: 0 !important; margin-bottom: 16px; }
  .advisory-root .client-info-grid { background: transparent !important; border: none !important; padding: 0 !important; margin-bottom: 16px; }
  .advisory-root .score-box { background: transparent !important; border: none !important; padding: 0 !important; }
  .advisory-root .investment-group { background: transparent !important; }
  .advisory-root table th, .advisory-root table td { padding: 6px; }
  .advisory-root textarea { padding: 4px 0; }
}
`;


export default function AdvisoryReport() {
  const session = useMemo(() => loadScanSession(), []);
  const [, navigate] = useLocation();
  const result = session.result;
  // Only platform advisors may see/export the admin-only report (Discovery Call Notes).
  const { user } = useAuth();
  const isAdvisor = user?.role === "ultra_admin" || user?.role === "admin";

  // ── Auto-populated intake fields (editable before export) ──────────────
  const [organization, setOrganization] = useState(session.organization);
  const [jurisdiction, setJurisdiction] = useState(session.jurisdiction);
  const [industry, setIndustry] = useState(session.industry);
  const [employees, setEmployees] = useState(session.employeeCount);
  const [locations, setLocations] = useState(session.facilityLocation);
  const [lateNight, setLateNight] = useState(session.lateNightOperations ? "Yes" : "No");

  // ── Stats (editable before export) ─────────────────────────────────────
  const [overallScore, setOverallScore] = useState(result ? String(result.score) : "");
  const [catScores, setCatScores] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const c of CATEGORIES) {
      out[c.scoreKey] = result
        ? String((result.categoryScores as unknown as Record<string, number>)[c.scoreKey] ?? 0)
        : "";
    }
    return out;
  });
  const [catDescs, setCatDescs] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const c of CATEGORIES) {
      const score = result ? (result.categoryScores as unknown as Record<string, number>)[c.scoreKey] ?? 0 : 0;
      out[c.scoreKey] = categoryInsight(c.key, score);
    }
    return out;
  });

  // ── Manual advisor fields (never AI-generated) ─────────────────────────
  const [discoveryNotes, setDiscoveryNotes] = useState("");
  const [advisorInsight, setAdvisorInsight] = useState("");
  // ── Strategic Priorities — pre-filled from the scan's Action Roadmap ────
  const roadmapActions = result?.immediateActionPlan ?? [];
  const [priorities, setPriorities] = useState(() => roadmapActions.filter(Boolean).join("\n\n"));

  // ── Section 3 — Current Organizational Exposure (manual placeholder) ────
  const [exposure, setExposure] = useState("");

  // ── Expected Organizational Outcomes + Investment (manual placeholders) ──
  const [outcomes, setOutcomes] = useState("");
  const [investment, setInvestment] = useState("");

  // ── Section 2 — Current State Operating Model (status pre-filled from scan) ─
  const [componentOwners, setComponentOwners] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const c of PROGRAM_COMPONENTS) out[c.label] = "";
    return out;
  });
  const [customOwners, setCustomOwners] = useState<Record<string, string>>({});
  const [componentStatus, setComponentStatus] = useState<Record<string, StatusLevel>>(() => {
    const out: Record<string, StatusLevel> = {};
    for (const c of PROGRAM_COMPONENTS) {
      const score = result ? result.categoryScores[c.categoryKey] ?? 0 : 0;
      out[c.label] = statusFromScore(Number(score) || 0);
    }
    return out;
  });
  const [componentNotes, setComponentNotes] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const c of PROGRAM_COMPONENTS) out[c.label] = "";
    return out;
  });

  function cycleStatus(label: string) {
    setComponentStatus((prev) => {
      const cur = prev[label] ?? "not_in_place";
      const next = STATUS_ORDER[(STATUS_ORDER.indexOf(cur) + 1) % STATUS_ORDER.length];
      return { ...prev, [label]: next };
    });
  }

  // ── Section 4 — Recommended Solution (prefilled, add/remove options) ────
  const [solutionOptions, setSolutionOptions] = useState<SolutionOption[]>(DEFAULT_OPTIONS);
  const [additionalServices, setAdditionalServices] = useState(DEFAULT_ADDITIONAL_SERVICES);

  // ── Section 5 — Implementation Roadmap (prefilled, add/remove phases) ────
  const [roadmapPhases, setRoadmapPhases] = useState<RoadmapPhase[]>(DEFAULT_PHASES);
  const [purpose, setPurpose] = useState(DEFAULT_PURPOSE);
  const [communication, setCommunication] = useState(DEFAULT_COMMUNICATION);

  function updateOption(id: string, patch: Partial<SolutionOption>) {
    setSolutionOptions((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }
  function addOption() {
    setSolutionOptions((prev) => [
      ...prev,
      { id: `opt-${Date.now()}`, label: `Option ${prev.length + 1}`, title: "", description: "", provides: "", owns: "" },
    ]);
  }
  function removeOption(id: string) {
    setSolutionOptions((prev) => prev.filter((o) => o.id !== id));
  }
  function updatePhase(id: string, patch: Partial<RoadmapPhase>) {
    setRoadmapPhases((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function addPhase() {
    setRoadmapPhases((prev) => [
      ...prev,
      { id: `phase-${Date.now()}`, name: `Phase ${prev.length + 1}`, title: "", timeline: "", deliverables: "", outcome: "" },
    ]);
  }
  function removePhase(id: string) {
    setRoadmapPhases((prev) => prev.filter((p) => p.id !== id));
  }

  // ── Section 6 — Quantified Return on Investment (prefilled, editable) ────
  const [roiLines, setRoiLines] = useState<RoiLine[]>(DEFAULT_ROI_LINES);
  const [paybackMonths, setPaybackMonths] = useState("");
  const [roiNote, setRoiNote] = useState(DEFAULT_ROI_NOTE);

  function updateRoiLine(id: string, patch: Partial<RoiLine>) {
    setRoiLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  // ── Export mode: advisor = full report, client = hides admin-only ─────
  const [exportMode, setExportMode] = useState<"advisor" | "client">("advisor");

  // ── Auto-grow every textarea so the printed PDF never clips scrollable content ──
  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll("textarea").forEach((ta) => {
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight + 2}px`;
    });
  });

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4 bg-background">
        <h1 className="text-xl font-bold">No scan data available</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Complete a Readiness Scan first — the Executive Advisory Report is generated from the latest scan results.
        </p>
        <button
          className="rounded-lg bg-[#0B1F33] text-white text-sm font-medium px-5 py-2.5 hover:bg-[#3A5F7D] transition-colors"
          onClick={() => navigate("/liability-scan")}
        >
          Run a Readiness Scan
        </button>
      </div>
    );
  }

  const rows = CATEGORIES.map((c) => ({
    ...c,
    score: Number(catScores[c.scoreKey]) || 0,
    desc: catDescs[c.scoreKey] ?? "",
  }));

  // ── Section 4/5 pagination (dynamic: options & phases can be added/removed) ─
  const OPTIONS_PER_PAGE = 2;
  const PHASES_PER_PAGE = 2;
  const optionChunks: SolutionOption[][] = [];
  for (let i = 0; i < solutionOptions.length; i += OPTIONS_PER_PAGE) {
    optionChunks.push(solutionOptions.slice(i, i + OPTIONS_PER_PAGE));
  }
  const phaseChunks: RoadmapPhase[][] = [];
  for (let i = 0; i < roadmapPhases.length; i += PHASES_PER_PAGE) {
    phaseChunks.push(roadmapPhases.slice(i, i + PHASES_PER_PAGE));
  }
  const optionPages = optionChunks.length > 0 ? optionChunks : [[]];
  const phasePages = phaseChunks.length > 0 ? phaseChunks : [[]];
  const section4Pages = optionPages.length;
  const section5Pages = phasePages.length;
  const totalPages = 5 + section4Pages + section5Pages + 1; // +1 = Section 6 (Quantified ROI)
  const section4StartPage = 6;
  const section5StartPage = section4StartPage + section4Pages;

  // ── Overall score radial gauge ──────────────────────────────────────────
  const scoreNum = Math.max(0, Math.min(100, Number(overallScore) || 0));
  const GAUGE_R = 56;
  const GAUGE_CIRC = 2 * Math.PI * GAUGE_R;
  const arcColor = scoreNum < 40 ? FS.orange : scoreNum <= 75 ? FS.citrus : FS.darkTeal;

  function exportPdf(mode: "advisor" | "client") {
    setExportMode(mode);
    // Wait for React to re-render (hides .admin-only in client mode), then print, then reset.
    setTimeout(() => {
      window.print();
      setExportMode("advisor");
    }, 150);
  }

  return (
    <div ref={rootRef} className={`advisory-root${exportMode === "client" || !isAdvisor ? " client-mode" : ""}`}>
      <style>{REPORT_CSS}</style>

      {/* Floating export buttons (hidden when printing) */}
      {isAdvisor && (
        <button className="print-btn no-print" onClick={() => exportPdf("advisor")}>
          Save Advisor PDF
        </button>
      )}
      <button className="print-btn client-export no-print" onClick={() => exportPdf("client")}>
        Save Client PDF
      </button>

      {/* Back to results (hidden when printing) */}
      <button className="back-btn no-print" onClick={() => navigate("/liability-scan")}>
        &larr; Back to Results
      </button>


      {/* PAGE 1: INTAKE & SCAN DATA */}
      <div className="page">
        <div className="header-section">
          <img src={PURSUIT_LOGO_URL} alt="Pursuit Pathways" className="logo-pursuit" />
          <div className="logo-band">
            <img src={LOGO_URL} alt="Five Stones Technology" className="logo-fivestones" />
          </div>
          <h1>Executive Advisory Report</h1>
          <h3 style={{ color: "var(--fs-dark-teal)", marginTop: 5 }}>
            Prepared for: {organization || "Not specified"}
          </h3>
        </div>

        {/* Section 1 — Pre-Assessment & Organization Overview (auto-populated, editable) */}
        <div className="client-info-grid">
          <div>
            <strong>Organization:</strong>{" "}
            <input type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} />
          </div>
          <div>
            <strong>Jurisdiction:</strong>{" "}
            <input type="text" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} />
          </div>
          <div>
            <strong>Industry:</strong>{" "}
            <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          </div>
          <div>
            <strong>Employees:</strong>{" "}
            <input type="text" value={employees} onChange={(e) => setEmployees(e.target.value)} />
          </div>
          <div>
            <strong>Late-Night Operations:</strong>{" "}
            <input type="text" value={lateNight} onChange={(e) => setLateNight(e.target.value)} />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <strong>Facility / Locations:</strong>{" "}
            <input type="text" value={locations} onChange={(e) => setLocations(e.target.value)} />
          </div>
        </div>

        {/* Section 2 — Discovery Call Notes (admin-only; hidden in client PDF) */}
        <div className="admin-only">
          <h2 style={{ marginTop: 0 }}>
            Discovery Call Notes <span className="private-tag">Private — Advisor only</span>
          </h2>
          <textarea
            rows={4}
            value={discoveryNotes}
            onChange={(e) => setDiscoveryNotes(e.target.value)}
            placeholder="Client's current reasons for engaging and primary organizational concerns (capture the client's own language)..."
          />
        </div>
        <hr className="admin-only" />

        {/* Section 3 — Advisor Insight / Executive Summary (manual) */}
        <h2 style={{ marginTop: 0 }}>Advisor Insight / Executive Summary</h2>
        <textarea
          rows={4}
          value={advisorInsight}
          onChange={(e) => setAdvisorInsight(e.target.value)}
          placeholder="Advisor to fill out insight after the call..."
        />

        {/* Footer */}
        <div className="report-footer">
          <span>Five Stones Technology</span>
          <span className="footer-page">Page 1 of {totalPages}</span>
        </div>
      </div>


      {/* PAGE 2: READINESS SCAN INSIGHTS */}
      <div className="page">
        {/* Section 4 — Readiness Scan Insights (auto-populated, editable) */}
        <h2 className="highlight" style={{ marginTop: 0 }}>Readiness Scan Insights</h2>
        <div className="score-box">
          <h3>Overall Readiness Score</h3>
          <div className="gauge">
            <svg viewBox="0 0 140 140" aria-hidden="true">
              <circle className="gauge-track" cx="70" cy="70" r={GAUGE_R} />
              <circle
                className="gauge-arc"
                cx="70"
                cy="70"
                r={GAUGE_R}
                stroke={arcColor}
                strokeDasharray={GAUGE_CIRC}
                strokeDashoffset={GAUGE_CIRC * (1 - scoreNum / 100)}
                transform="rotate(-90 70 70)"
              />
            </svg>
            <div className="gauge-center">
              <input
                className="overall-score-input"
                type="number"
                min={0}
                max={100}
                value={overallScore}
                onChange={(e) => setOverallScore(e.target.value)}
              />
              <span className="overall-score-denom">/ 100</span>
            </div>
          </div>
        </div>

        <h3>Category Breakdown &amp; Operational Interpretation</h3>
        {rows.map((r) => (
          <div className="chart-row" key={r.scoreKey}>
            <div className="chart-header">
              <span>{r.label}</span>
              <input
                className="score-input"
                type="number"
                min={0}
                max={100}
                value={catScores[r.scoreKey]}
                onChange={(e) => setCatScores((prev) => ({ ...prev, [r.scoreKey]: e.target.value }))}
              />
            </div>
            <div className="bar-track">
              <div className={`bar-fill ${scoreClass(r.score)}`} style={{ width: `${r.score}%` }} />
            </div>
            <textarea
              className="chart-desc"
              rows={2}
              value={catDescs[r.scoreKey]}
              onChange={(e) => setCatDescs((prev) => ({ ...prev, [r.scoreKey]: e.target.value }))}
            />
          </div>
        ))}

        {/* Footer */}
        <div className="report-footer">
          <span>Five Stones Technology</span>
          <span className="footer-page">Page 2 of {totalPages}</span>
        </div>
      </div>


      {/* PAGE 3: EXPECTED OUTCOMES, INVESTMENT & STRATEGIC PRIORITIES */}
      <div className="page">
        {/* Section 5 — Expected Organizational Outcomes (manual placeholder) */}
        <h2 className="highlight" style={{ marginTop: 0 }}>Expected Organizational Outcomes</h2>
        <textarea
          rows={4}
          value={outcomes}
          onChange={(e) => setOutcomes(e.target.value)}
          placeholder="Describe the expected organizational outcomes for this engagement..."
        />

        <hr />

        {/* Section 6 — Estimated Investment Range (manual placeholder) */}
        <h3>Estimated Investment Range</h3>
        <textarea
          rows={2}
          value={investment}
          onChange={(e) => setInvestment(e.target.value)}
          placeholder="Enter estimated investment range (e.g. $15,000 – $25,000)"
        />

        <hr />

        {/* Section 7 — Strategic Priorities (pre-filled from the scan's Action Roadmap, editable) */}
        <h2 className="highlight">Strategic Priorities</h2>
        <textarea
          rows={16}
          value={priorities}
          onChange={(e) => setPriorities(e.target.value)}
          placeholder="Recommended actions from the Action Roadmap..."
        />

        {/* Footer */}
        <div className="report-footer">
          <span>Five Stones Technology</span>
          <span className="footer-page">Page 3 of {totalPages}</span>
        </div>
      </div>


      {/* PAGE 4: SECTION 2 — CURRENT STATE OPERATING MODEL */}
      <div className="page">
        {/* Section 2 — Current State Operating Model (category breakdown from the readiness scan) */}
        <h2 className="highlight" style={{ marginTop: 0 }}>Section 2: Current State Operating Model</h2>
        <p style={{ fontSize: 13 }}>
          Provide leadership with a visual representation of the current Workplace Violence Prevention System,
          identifying ownership, system gaps, and areas requiring executive attention.
        </p>

        <table className="ops-table">
          <thead>
            <tr>
              <th style={{ width: "30%" }}>Program Component</th>
              <th style={{ width: "18%" }}>Current Owner</th>
              <th style={{ width: "18%" }}>Status</th>
              <th>Advisor Observation</th>
            </tr>
          </thead>
          <tbody>
            {PROGRAM_COMPONENTS.map((c) => (
              <tr key={c.label}>
                <td>{c.label}</td>
                <td>
                  <select
                    value={componentOwners[c.label] ?? ""}
                    onChange={(e) => setComponentOwners((prev) => ({ ...prev, [c.label]: e.target.value }))}
                  >
                    <option value="">Select owner...</option>
                    {OWNER_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                  {componentOwners[c.label] === "Other" && (
                    <div className="mt-1">
                      <input
                        type="text"
                        value={customOwners[c.label] ?? ""}
                        onChange={(e) => setCustomOwners((prev) => ({ ...prev, [c.label]: e.target.value }))}
                        placeholder="Specify owner..."
                      />
                    </div>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className={`status-circle ${componentStatus[c.label] ?? "not_in_place"}`}
                    onClick={() => cycleStatus(c.label)}
                    title="Click to change status"
                  />
                  <span className="status-label">{STATUS_LABELS[componentStatus[c.label] ?? "not_in_place"]}</span>
                </td>
                <td>
                  <textarea
                    rows={2}
                    value={componentNotes[c.label] ?? ""}
                    onChange={(e) => setComponentNotes((prev) => ({ ...prev, [c.label]: e.target.value }))}
                    placeholder="Advisor observation..."
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="report-footer">
          <span>Five Stones Technology</span>
          <span className="footer-page">Page 4 of {totalPages}</span>
        </div>
      </div>


      {/* PAGE 5: SECTION 3 — CURRENT ORGANIZATIONAL EXPOSURE */}
      <div className="page">
        {/* Section 3 — Current Organizational Exposure (manual placeholder) */}
        <h2 className="highlight" style={{ marginTop: 0 }}>Section 3: Current Organizational Exposure</h2>
        <textarea
          rows={10}
          value={exposure}
          onChange={(e) => setExposure(e.target.value)}
          placeholder="Describe the organization's current exposure — legal defensibility, time impact, operational downtime, and quantified ROI..."
        />

        {/* Footer */}
        <div className="report-footer">
          <span>Five Stones Technology</span>
          <span className="footer-page">Page 5 of {totalPages}</span>
        </div>
      </div>


      {/* SECTION 4 — RECOMMENDED SOLUTION */}
      {optionPages.map((chunk, ci) => (
        <div className="page" key={`s4-${ci}`}>
          {ci === 0 && (
            <>
              <h2 className="highlight" style={{ marginTop: 0 }}>Section 4: Recommended Solution</h2>
              <button type="button" className="add-btn no-print" onClick={addOption}>+ Add Option</button>
            </>
          )}

          {chunk.map((opt) => (
            <div className="phase-block" key={opt.id}>
              <div className="option-head">
                <input className="opt-label" type="text" value={opt.label} onChange={(e) => updateOption(opt.id, { label: e.target.value })} />
                <input className="opt-title" type="text" value={opt.title} onChange={(e) => updateOption(opt.id, { title: e.target.value })} />
                <button type="button" className="remove-btn no-print" onClick={() => removeOption(opt.id)}>Remove</button>
              </div>
              <textarea rows={2} value={opt.description} onChange={(e) => updateOption(opt.id, { description: e.target.value })} />
              <label className="list-label">Pursuit Pathways Provides</label>
              <textarea rows={4} value={opt.provides} onChange={(e) => updateOption(opt.id, { provides: e.target.value })} />
              <label className="list-label">Client Owns</label>
              <textarea rows={3} value={opt.owns} onChange={(e) => updateOption(opt.id, { owns: e.target.value })} />
            </div>
          ))}

          {ci === optionPages.length - 1 && (
            <>
              <hr />
              <h3>Additional Services</h3>
              <textarea rows={9} value={additionalServices} onChange={(e) => setAdditionalServices(e.target.value)} />
            </>
          )}

          <div className="report-footer">
            <span>Five Stones Technology</span>
            <span className="footer-page">Page {section4StartPage + ci} of {totalPages}</span>
          </div>
        </div>
      ))}


      {/* SECTION 5 — IMPLEMENTATION ROADMAP */}
      {phasePages.map((chunk, ci) => (
        <div className="page" key={`s5-${ci}`}>
          {ci === 0 && (
            <>
              <h2 className="highlight" style={{ marginTop: 0 }}>Section 5: Implementation Roadmap</h2>
              <label className="list-label">Purpose</label>
              <textarea rows={2} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
              <button type="button" className="add-btn no-print" onClick={addPhase}>+ Add Phase</button>
            </>
          )}

          {chunk.map((ph) => (
            <div className="phase-block" key={ph.id}>
              <div className="option-head">
                <input className="opt-label" type="text" value={ph.name} onChange={(e) => updatePhase(ph.id, { name: e.target.value })} />
                <input className="opt-title" type="text" value={ph.title} onChange={(e) => updatePhase(ph.id, { title: e.target.value })} />
                <button type="button" className="remove-btn no-print" onClick={() => removePhase(ph.id)}>Remove</button>
              </div>
              <div className="timeline-row">
                <label>Estimated Timeline:</label>
                <input type="text" value={ph.timeline} onChange={(e) => updatePhase(ph.id, { timeline: e.target.value })} />
              </div>
              <label className="list-label">Deliverables</label>
              <textarea rows={5} value={ph.deliverables} onChange={(e) => updatePhase(ph.id, { deliverables: e.target.value })} />
              <label className="list-label">Client Outcome</label>
              <textarea rows={2} value={ph.outcome} onChange={(e) => updatePhase(ph.id, { outcome: e.target.value })} />
            </div>
          ))}

          {ci === phasePages.length - 1 && (
            <>
              <hr />
              <h3>Communication &amp; Project Visibility</h3>
              <textarea rows={3} value={communication} onChange={(e) => setCommunication(e.target.value)} />
            </>
          )}

          <div className="report-footer">
            <span>Five Stones Technology</span>
            <span className="footer-page">Page {section5StartPage + ci} of {totalPages}</span>
          </div>
        </div>
      ))}


      {/* SECTION 6 — QUANTIFIED RETURN ON INVESTMENT */}
      <div className="page">
        {/* Section 6 — Quantified ROI (prefilled template, editable) */}
        <h2 className="highlight" style={{ marginTop: 0 }}>Section 6: Quantified Return on Investment (ROI)</h2>

        <h3>Estimated Annual Value</h3>
        <table className="ops-table">
          <thead>
            <tr>
              <th style={{ width: "70%" }}>Category</th>
              <th>Estimated Annual Value</th>
            </tr>
          </thead>
          <tbody>
            {roiLines.map((line) => (
              <tr key={line.id}>
                <td className={line.total ? "roi-total" : undefined}>
                  <input className="roi-label" type="text" value={line.label} onChange={(e) => updateRoiLine(line.id, { label: e.target.value })} />
                </td>
                <td>
                  <div className="money-row">
                    <span>$</span>
                    <input type="text" value={line.value} onChange={(e) => updateRoiLine(line.id, { value: e.target.value })} placeholder="________" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Estimated Payback Period</h3>
        <div className="cap-row">
          <span className="cap-fixed-label">Estimated Payback:</span>
          <input className="cap-value" type="text" value={paybackMonths} onChange={(e) => setPaybackMonths(e.target.value)} placeholder="_____" />
          <span className="cap-unit">months</span>
        </div>

        <textarea className="roi-note" rows={2} value={roiNote} onChange={(e) => setRoiNote(e.target.value)} />

        <div className="report-footer">
          <span>Five Stones Technology</span>
          <span className="footer-page">Page {totalPages} of {totalPages}</span>
        </div>
      </div>
    </div>
  );
}

