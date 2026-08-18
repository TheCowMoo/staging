/**
 * AdvisoryReport
 * Executive Advisory Report — printable HTML report for the Readiness Scan.
 *
 * Reads the completed scan from sessionStorage (lib/scanSession.ts).
 * Compliance (executive directive):
 *  - "Advisor Insight", "Current Owner", "Status", "Executive Observations",
 *    "Strategic Priorities", and "Estimated Investment Range" are MANUAL fields
 *    (advisor types into the inputs/dropdowns) — never AI-generated.
 *  - Category descriptions are the exact operational-interpretation outputs
 *    (categoryInsight()) — not summarized or reworded.
 *  - All pre-scan intake fields are captured exactly as submitted.
 */
import { useMemo, useState } from "react";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { useLocation } from "wouter";
import { loadScanSession } from "@/lib/scanSession";
import { categoryInsight } from "@/components/assessment/CategoryBreakdownBar";
import type { CategoryKey } from "../../../shared/assessmentEngine";

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

const PHASE_1_OPTIONS = [
  "Select Phase 1 Deliverable...",
  "Site Threat Assessment & Stakeholder Meetings",
  "Documentation Review & Policy Audit",
  "Executive Training Demonstration",
];
const PHASE_2_OPTIONS = [
  "Select Phase 2 Deliverable...",
  "Emergency Response Plan Creation",
  "Workplace Violence Prevention Plan Drafting",
  "Five Stones App Configuration & Onboarding",
];
const PHASE_3_OPTIONS = [
  "Select Phase 3 Deliverable...",
  "Staff Training & Drill Execution",
  "Leadership Tabletop Exercise",
  "System Handover & Routine Monitoring",
];

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
.advisory-root .page {
  background-color: #fff; width: 8.5in; min-height: 11in; box-sizing: border-box;
  padding: 0.75in; box-shadow: 0 4px 15px rgba(0,0,0,0.3); position: relative;
}
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
.advisory-root input[type="text"], .advisory-root textarea, .advisory-root select {
  width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid var(--fs-neutral);
  font-family: 'Open Sans', system-ui, sans-serif; font-size: 12px; background-color: #fcfcfc; resize: none; border-radius: 4px;
}
.advisory-root input[type="text"]:focus, .advisory-root textarea:focus, .advisory-root select:focus { outline: 1px solid var(--fs-mid-blue); background-color: #fff; }
.advisory-root .score-box { background-color: var(--fs-light-blue); border: 1px solid var(--fs-mid-blue); padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px; }
.advisory-root .score-box h1 { font-size: 36px; color: var(--fs-navy); margin-bottom: 5px; }
.advisory-root .chart-row { margin-bottom: 15px; }
.advisory-root .chart-header { display: flex; justify-content: space-between; font-size: 14px; color: var(--fs-navy); margin-bottom: 4px; }
.advisory-root .bar-track { width: 100%; height: 12px; background-color: #e0e0e0; border-radius: 6px; overflow: hidden; margin-bottom: 4px; }
.advisory-root .bar-fill { height: 100%; width: 0%; border-radius: 6px; }
.advisory-root .bar-fill.low { background-color: var(--fs-orange); }
.advisory-root .bar-fill.mid { background-color: var(--fs-citrus); }
.advisory-root .bar-fill.high { background-color: var(--fs-dark-teal); }
.advisory-root .chart-desc { font-size: 12px; color: #666; font-style: italic; }
.advisory-root table { width: 100%; border-collapse: collapse; margin-top: 15px; table-layout: fixed; }
.advisory-root th, .advisory-root td { border: 1px solid var(--fs-neutral); padding: 10px; text-align: left; vertical-align: top; font-size: 13px; }
.advisory-root th { background-color: var(--fs-navy); color: #fff; }
.advisory-root .phase-block { margin-bottom: 20px; padding: 15px; border: 1px solid var(--fs-neutral); border-left: 5px solid var(--fs-dark-teal); border-radius: 4px; background-color: #fafafa; }
.advisory-root .phase-block h3 { color: var(--fs-navy); margin-top: 0; margin-bottom: 10px; }
.advisory-root .investment-group { display: flex; align-items: center; gap: 10px; background-color: var(--fs-light-blue); padding: 15px; border-radius: 4px; font-weight: 600; color: var(--fs-navy); width: max-content; margin-top: 10px; }
.advisory-root .investment-group input { width: 120px; padding: 8px; font-size: 14px; }
.advisory-root hr { border: 0; border-top: 1px solid var(--fs-neutral); margin: 30px 0; }
@media print {
  @page { size: letter; margin: 0.5in 0.75in; }
  body { background-color: transparent; }
  .advisory-root { background-color: transparent; padding: 0; display: block; }
  .advisory-root .page { width: 100%; min-height: auto; padding: 0; box-shadow: none; margin: 0; page-break-after: always; }
  .advisory-root .page:last-child { page-break-after: auto; }
  .advisory-root * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .advisory-root input[type="text"], .advisory-root textarea, .advisory-root select { border: 1px solid #ddd !important; background-color: transparent !important; }
  .advisory-root input::placeholder, .advisory-root textarea::placeholder { color: transparent !important; }
  .advisory-root .no-print { display: none !important; }
}
`;


export default function AdvisoryReport() {
  const session = useMemo(() => loadScanSession(), []);
  const [, navigate] = useLocation();
  const result = session.result;

  // ── Manual advisor fields (Rule #1: never AI-generated) ────────────────
  const [advisorInsight, setAdvisorInsight] = useState("");
  const [owner, setOwner] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [observation, setObservation] = useState<Record<string, string>>({});
  const [phase1, setPhase1] = useState("");
  const [phase2, setPhase2] = useState("");
  const [phase3, setPhase3] = useState("");
  const [investmentMin, setInvestmentMin] = useState("");
  const [investmentMax, setInvestmentMax] = useState("");

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

  const rows = CATEGORIES.map((c) => {
    const score = (result.categoryScores as unknown as Record<string, number>)[c.scoreKey] ?? 0;
    return { ...c, score, desc: categoryInsight(c.key, score) };
  });

  const setRow =
    (setter: Dispatch<SetStateAction<Record<string, string>>>) =>
    (key: string) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setter((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="advisory-root">
      <style>{REPORT_CSS}</style>

      {/* Floating Save-as-PDF button (hidden when printing) */}
      <button className="print-btn no-print" onClick={() => window.print()}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        Save as PDF
      </button>

      {/* PAGE 1: INTAKE & SCAN DATA */}
      <div className="page">
        <div className="header-section">
          <div className="brand-wordmark">Five Stones Technology</div>
          <h1>Executive Advisory Report</h1>
          <h3 style={{ color: "var(--fs-dark-teal)", marginTop: 5 }}>
            Prepared for: {session.organization || "Not specified"}
          </h3>
        </div>

        {/* Intake fields — captured exactly as submitted */}
        <div className="client-info-grid">
          <div><strong>Jurisdiction:</strong> {session.jurisdiction || "—"}</div>
          <div><strong>Industry:</strong> {session.industry || "—"}</div>
          <div><strong>Employees:</strong> {session.employeeCount || "—"}</div>
          <div><strong>Late-Night Operations:</strong> {session.lateNightOperations ? "Yes" : "No"}</div>
          <div style={{ gridColumn: "span 2" }}><strong>Facility / Locations:</strong> {session.facilityLocation || "—"}</div>
        </div>

        {/* Advisor Insight — manual */}
        <h2 style={{ marginTop: 0 }}>Advisor Insight / Executive Summary</h2>
        <textarea
          rows={4}
          value={advisorInsight}
          onChange={(e) => setAdvisorInsight(e.target.value)}
          placeholder="Advisor to fill out insight after the call..."
        />

        <hr />

        <h2 className="highlight" style={{ marginTop: 0 }}>Readiness Scan Insights</h2>
        <div className="score-box">
          <h3>Overall Readiness Score</h3>
          <h1>{result.score} / 100</h1>
        </div>

        <h3>Category Breakdown &amp; Operational Interpretation</h3>
        {rows.map((r) => (
          <div className="chart-row" key={r.key}>
            <div className="chart-header">
              <span>{r.label}</span>
              <span>{r.score}%</span>
            </div>
            <div className="bar-track">
              <div className={`bar-fill ${scoreClass(r.score)}`} style={{ width: `${r.score}%` }} />
            </div>
            <div className="chart-desc">{r.desc}</div>
          </div>
        ))}
      </div>


      {/* PAGE 2: STRATEGIC PRIORITIES & OPERATING MODEL */}
      <div className="page">
        <h2 className="highlight" style={{ marginTop: 0 }}>Current State Operating Model</h2>
        <table>
          <thead>
            <tr>
              <th style={{ width: "25%" }}>Program Component</th>
              <th style={{ width: "20%" }}>Current Owner</th>
              <th style={{ width: "20%" }}>Status</th>
              <th style={{ width: "35%" }}>Executive Observation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td><strong>{r.label}</strong></td>
                <td>
                  <input type="text" placeholder="Advisor Input" value={owner[r.key] ?? ""} onChange={setRow(setOwner)(r.key)} />
                </td>
                <td>
                  <input type="text" placeholder="Advisor Input" value={status[r.key] ?? ""} onChange={setRow(setStatus)(r.key)} />
                </td>
                <td>
                  <textarea rows={2} placeholder="Advisor Input" value={observation[r.key] ?? ""} onChange={setRow(setObservation)(r.key)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr />

        {/* Strategic Priorities — manual dropdowns */}
        <h2 className="highlight">Strategic Priorities</h2>
        <p style={{ fontSize: 13 }}>Select the recommended phased approach for this organization.</p>

        <div className="phase-block">
          <h3>Phase 1: Discovery &amp; Assessment</h3>
          <select value={phase1} onChange={(e) => setPhase1(e.target.value)}>
            {PHASE_1_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div className="phase-block">
          <h3>Phase 2: Planning &amp; Development</h3>
          <select value={phase2} onChange={(e) => setPhase2(e.target.value)}>
            {PHASE_2_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div className="phase-block">
          <h3>Phase 3: Implementation &amp; Validation</h3>
          <select value={phase3} onChange={(e) => setPhase3(e.target.value)}>
            {PHASE_3_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <hr />

        {/* Estimated Investment Range — manual */}
        <h3>Estimated Investment Range</h3>
        <div className="investment-group">
          $ <input type="text" placeholder="Min Amount" value={investmentMin} onChange={(e) => setInvestmentMin(e.target.value)} />
          &mdash;
          $ <input type="text" placeholder="Max Amount" value={investmentMax} onChange={(e) => setInvestmentMax(e.target.value)} />
        </div>
      </div>
    </div>
  );
}

