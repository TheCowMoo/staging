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
 *  - Discovery Call Notes, Advisor Insight, Current Organizational Exposure,
 *    Strategic Priorities, Roadmap, and Investment Range are MANUAL fields —
 *    never AI-generated.
 *  - Category descriptions start as the exact operational-interpretation
 *    outputs (categoryInsight()) but are editable per the template requirement.
 */
import { useMemo, useState } from "react";
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

// Five Stones logo (same source used by AppLayout)
const LOGO_URL = "https://pursuitpathways.com/content/logo%20five%20stones.png";

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

const DEFAULT_ROADMAP = {
  phase1: "Phase 1 — Discovery & Assessment:\nSite Threat Assessment and stakeholder meetings to baseline the current operating state.",
  phase2: "Phase 2 — Planning & Development:\nEmergency Response Plan and Workplace Violence Prevention Plan development aligned to the facility.",
  phase3: "Phase 3 — Implementation & Validation:\nStaff training, facilitated drills, and system handover with routine monitoring.",
};

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
.advisory-root input[type="text"]:focus, .advisory-root input[type="number"]:focus, .advisory-root textarea:focus, .advisory-root select:focus { outline: 1px solid var(--fs-mid-blue); background-color: #fff; }
.advisory-root .score-box { background-color: var(--fs-light-blue); border: 1px solid var(--fs-mid-blue); padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px; }
.advisory-root .overall-score-row { display: flex; align-items: baseline; justify-content: center; gap: 6px; }
.advisory-root .overall-score-input { width: 130px; font-size: 36px; font-weight: 700; color: var(--fs-navy); text-align: center; border: 1px solid transparent; background: transparent; }
.advisory-root .overall-score-input:focus { outline: none; border-color: var(--fs-mid-blue); background: #fff; }
.advisory-root .overall-score-denom { font-size: 16px; color: var(--fs-navy); }
.advisory-root .chart-row { margin-bottom: 15px; }
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
.advisory-root .phase-block { margin-bottom: 20px; padding: 15px; border: 1px solid var(--fs-neutral); border-left: 5px solid var(--fs-dark-teal); border-radius: 4px; background-color: #fafafa; }
.advisory-root .phase-block h3 { color: var(--fs-navy); margin-top: 0; margin-bottom: 10px; }
.advisory-root .investment-group { display: flex; align-items: center; gap: 10px; background-color: var(--fs-light-blue); padding: 15px; border-radius: 4px; font-weight: 600; color: var(--fs-navy); width: max-content; margin-top: 10px; }
.advisory-root .investment-group input { width: 120px; padding: 8px; font-size: 14px; }
.advisory-root hr { border: 0; border-top: 1px solid var(--fs-neutral); margin: 30px 0; }
.advisory-root.client-mode .admin-only { display: none !important; }
@media print {
  @page { size: letter; margin: 0.5in 0.75in; }
  body { background-color: transparent; }
  .advisory-root { background-color: transparent; padding: 0; display: block; }
  .advisory-root .page { width: 100%; min-height: auto; padding: 0; box-shadow: none; margin: 0; page-break-after: always; }
  .advisory-root .page:last-child { page-break-after: auto; }
  .advisory-root * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .advisory-root input[type="text"], .advisory-root input[type="number"], .advisory-root textarea, .advisory-root select { border: 1px solid #ddd !important; background-color: transparent !important; }
  .advisory-root input::placeholder, .advisory-root textarea::placeholder { color: transparent !important; }
  .advisory-root .no-print { display: none !important; }
  .advisory-root.client-mode .admin-only { display: none !important; }
}
`;


export default function AdvisoryReport() {
  const session = useMemo(() => loadScanSession(), []);
  const [, navigate] = useLocation();
  const result = session.result;

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
  const [exposure, setExposure] = useState({ legal: "", time: "", downtime: "", roi: "" });
  const [phase1, setPhase1] = useState("");
  const [phase2, setPhase2] = useState("");
  const [phase3, setPhase3] = useState("");
  const [roadmap, setRoadmap] = useState(DEFAULT_ROADMAP);
  const [timeline, setTimeline] = useState("");
  const [outcomes, setOutcomes] = useState("");
  const [investmentMin, setInvestmentMin] = useState("");
  const [investmentMax, setInvestmentMax] = useState("");

  // ── Export mode: advisor = full report, client = hides admin-only ─────
  const [exportMode, setExportMode] = useState<"advisor" | "client">("advisor");

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

  function exportPdf(mode: "advisor" | "client") {
    setExportMode(mode);
    // Wait for React to re-render (hides .admin-only in client mode), then print, then reset.
    setTimeout(() => {
      window.print();
      setExportMode("advisor");
    }, 150);
  }

  return (
    <div className={`advisory-root${exportMode === "client" ? " client-mode" : ""}`}>
      <style>{REPORT_CSS}</style>

      {/* Floating export buttons (hidden when printing) */}
      <button className="print-btn no-print" onClick={() => exportPdf("advisor")}>
        Save Advisor PDF
      </button>
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
          <img
            src={LOGO_URL}
            alt="Five Stones Technology"
            style={{ maxWidth: 260, height: "auto", marginBottom: 12 }}
          />
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

        <hr />

        {/* Section 4 — Category Breakdown (auto-populated, editable) */}
        <h2 className="highlight" style={{ marginTop: 0 }}>Readiness Scan Insights</h2>
        <div className="score-box">
          <h3>Overall Readiness Score</h3>
          <div className="overall-score-row">
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
          <span className="footer-page">Page 1 of 2</span>
        </div>
      </div>


      {/* PAGE 2: EXPOSURE, STRATEGIC PRIORITIES, ROADMAP, INVESTMENT */}
      <div className="page">
        {/* Section 5 — Current Organizational Exposure (manual) */}
        <h2 className="highlight" style={{ marginTop: 0 }}>Current Organizational Exposure</h2>
        <div className="exposure-grid">
          <div>
            <label>Legal Defensibility</label>
            <textarea rows={2} value={exposure.legal} onChange={(e) => setExposure((p) => ({ ...p, legal: e.target.value }))} placeholder="Advisor input..." />
          </div>
          <div>
            <label>Time Impact</label>
            <textarea rows={2} value={exposure.time} onChange={(e) => setExposure((p) => ({ ...p, time: e.target.value }))} placeholder="Advisor input..." />
          </div>
          <div>
            <label>Operational Downtime</label>
            <textarea rows={2} value={exposure.downtime} onChange={(e) => setExposure((p) => ({ ...p, downtime: e.target.value }))} placeholder="Advisor input..." />
          </div>
          <div>
            <label>Quantified ROI</label>
            <textarea rows={2} value={exposure.roi} onChange={(e) => setExposure((p) => ({ ...p, roi: e.target.value }))} placeholder="Advisor input..." />
          </div>
        </div>

        <hr />

        {/* Section 6 — Recommended Solution & Strategic Priorities (manual dropdowns) */}
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

        {/* Section 7 — Implementation Roadmap & Outcomes (prefilled text + manual) */}
        <h2 className="highlight">Implementation Roadmap &amp; Outcomes</h2>
        <div className="phase-block">
          <h3>Phase 1</h3>
          <textarea rows={3} value={roadmap.phase1} onChange={(e) => setRoadmap((p) => ({ ...p, phase1: e.target.value }))} />
        </div>
        <div className="phase-block">
          <h3>Phase 2</h3>
          <textarea rows={3} value={roadmap.phase2} onChange={(e) => setRoadmap((p) => ({ ...p, phase2: e.target.value }))} />
        </div>
        <div className="phase-block">
          <h3>Phase 3</h3>
          <textarea rows={3} value={roadmap.phase3} onChange={(e) => setRoadmap((p) => ({ ...p, phase3: e.target.value }))} />
        </div>
        <div className="client-info-grid">
          <div>
            <strong>Estimated Timeline:</strong>{" "}
            <input type="text" value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="e.g. 12–16 weeks" />
          </div>
          <div>
            <strong>Expected Organizational Outcomes:</strong>{" "}
            <input type="text" value={outcomes} onChange={(e) => setOutcomes(e.target.value)} placeholder="e.g. Documented plan, trained staff, validated drills" />
          </div>
        </div>

        <hr />

        {/* Section 8 — Estimated Investment Range (manual) */}
        <h3>Estimated Investment Range</h3>
        <div className="investment-group">
          $ <input type="text" placeholder="Min Amount" value={investmentMin} onChange={(e) => setInvestmentMin(e.target.value)} />
          &mdash;
          $ <input type="text" placeholder="Max Amount" value={investmentMax} onChange={(e) => setInvestmentMax(e.target.value)} />
        </div>

        {/* Footer */}
        <div className="report-footer">
          <span>Five Stones Technology</span>
          <span className="footer-page">Page 2 of 2</span>
        </div>
      </div>
    </div>
  );
}

