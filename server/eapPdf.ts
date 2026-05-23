/**
 * EAP PDF Download Route
 * GET /api/eap/:auditId/pdf
 *
 * Document order:
 *  1. Cover Page (meta grid, executive summary, assigned roles)
 *  2. Table of Contents (auto-generated, page numbers patched via bufferPages)
 *  3. Glossary of Terms (platform glossary, alphabetical)
 *  4. Facility Overview
 *  5. Risk Summary
 *  6. EAP Sections (only applicable, non-empty sections)
 *
 * Key fixes vs. previous version:
 *  - Sections NO LONGER force a new page unconditionally — they continue on the
 *    current page when space is available, preventing blank pages.
 *  - safeY() is used consistently before every draw call.
 *  - Empty sections (no content, no subsections, no recommendations) are skipped.
 *  - Meta grid label widths are capped so "Standards" never overlaps "Sections Included".
 *  - All inner helpers are arrow-const (strict-mode compatible).
 *
 * Constraints honoured:
 *  - resolveEapSections() logic unchanged
 *  - No schema changes, no scoring changes, no LLM prompt changes
 *  - auditorNotes excluded (internal only)
 */
import { Router, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { getAuditById, getFacilityById, getEapSectionsByAudit } from "./db";
import { sdk } from "./_core/sdk";
import { resolveEapSections, EapBaseSection, EapSectionOverride, ResolvedEapSection } from "./eapMerge";

export const eapPdfRouter = Router();

// ── In-memory PDF cache (keyed by auditId, invalidated after 5 minutes) ──────
const PDF_CACHE = new Map<number, { buf: Buffer; generatedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
/** Invalidate the cached PDF for a given audit (call after any EAP section save) */
export function clearPdfCache(auditId: number): void {
  PDF_CACHE.delete(auditId);
}

// ── Build the PDF into a Buffer (never pipes directly to res) ────────────────
export async function buildEapPdfBuffer(
  auditId: number
): Promise<{ buf: Buffer; filename: string }> {
  const audit = await getAuditById(auditId);
  if (!audit) throw Object.assign(new Error("Audit not found"), { status: 404 });

  const facility = await getFacilityById(audit.facilityId);
  if (!facility) throw Object.assign(new Error("Facility not found"), { status: 404 });

  const eapJson = (audit as any).eapJson as Record<string, any> | null;
  if (!eapJson) throw Object.assign(new Error("No EAP has been generated for this audit yet."), { status: 404 });

  // Inject persisted AI executive summary into eapJson so the cover page renders it
  const persistedExecSummary = (audit as any).executiveSummaryJson as {
    summary: string;
    topPriorities: string[];
    leadershipFocus: string;
  } | null;
  if (persistedExecSummary?.summary && !eapJson.executiveSummary) {
    eapJson.executiveSummary = [
      persistedExecSummary.summary,
      persistedExecSummary.topPriorities?.length
        ? "Key Priorities:\n" + persistedExecSummary.topPriorities.map((p: string) => `• ${p}`).join("\n")
        : "",
      persistedExecSummary.leadershipFocus
        ? `Leadership Focus: ${persistedExecSummary.leadershipFocus}`
        : "",
    ].filter(Boolean).join("\n\n");
  }

  const eapSectionRows = await getEapSectionsByAudit(auditId);
  const baseSections   = (eapJson.sections ?? []) as EapBaseSection[];
  const overrideRows   = eapSectionRows.map(r => ({
    sectionId:              r.sectionId,
    contentOverride:        r.contentOverride ?? null,
    applicable:             r.applicable,
    auditorNotes:           r.auditorNotes ?? null,
    auditorRecommendations: r.auditorRecommendations,
  })) as EapSectionOverride[];

  const allSections = resolveEapSections(baseSections, overrideRows);
  const sections    = allSections.filter(s => {
    const hasContent = s.content && s.content.trim().length > 0;
    const hasSubs    = Array.isArray(s.subsections) && s.subsections.length > 0;
    const hasRecs    = Array.isArray(s.recommendations) && s.recommendations.length > 0;
    return hasContent || hasSubs || hasRecs;
  });

  const buf = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: MT, bottom: MB, left: ML, right: MR },
      bufferPages: false, // KEY: bufferPages:true causes phantom pages in PDFKit 0.18
      info: {
        Title:    eapJson.planTitle ?? `Emergency Action Plan — ${facility.name}`,
        Author:   "Five Stones Technology — Workplace Safety Assessment Platform",
        Subject:  "Emergency Action Plan",
        Keywords: "emergency action plan, workplace safety, OSHA",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data",  (chunk: Buffer) => chunks.push(chunk));
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── All rendering happens inside this try block ────────────────────────
    try {
      const layout = computePageLayout(sections, eapJson, doc);
      renderDocument(doc, audit, facility, eapJson, sections, baseSections, layout);
      doc.end();
    } catch (renderErr) {
      reject(renderErr);
    }
  });

  const safeName = facility.name.replace(/[^a-z0-9]/gi, "_");
  const dateStr  = new Date().toISOString().slice(0, 10);
  return { buf, filename: `EAP_${safeName}_${dateStr}.pdf` };
}

// ── Colour palette ────────────────────────────────────────────────────────────

function hex(h: string): [number, number, number] {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const C_NAVY:   [number, number, number] = hex("1e3a5f");
const C_BLUE:   [number, number, number] = hex("2563eb");
const C_TEAL:   [number, number, number] = hex("0d9488");
const C_BODY:   [number, number, number] = hex("1f2937");
const C_MUTED:  [number, number, number] = hex("6b7280");
const C_RULE:   [number, number, number] = hex("d1d5db");
const C_LIGHT:  [number, number, number] = hex("f8fafc");
const C_WHITE:  [number, number, number] = [255, 255, 255];
const C_RED:    [number, number, number] = hex("dc2626");
const C_ORANGE: [number, number, number] = hex("ea580c");
const C_AMBER:  [number, number, number] = hex("d97706");
const C_INDIGO: [number, number, number] = hex("4f46e5");
const C_GRAY:   [number, number, number] = hex("6b7280");
const C_GREEN:  [number, number, number] = hex("16a34a");

// ── Layout constants (points) ─────────────────────────────────────────────────

const ML = 54;   // margin left  (0.75 in)
const MR = 54;   // margin right
const MT = 54;   // margin top
const MB = 54;   // margin bottom

// ── Spacing constants (points) ────────────────────────────────────────────────

const SP_PARA    = 6;   // paragraph gap (was 4)
const SP_SECTION = 12;  // section gap (was 10)
const SP_HEADER  = 10;  // header-to-content gap (was 8)
const SP_BULLET  = 2;

// ── Font sizes ────────────────────────────────────────────────────────────────

const FS_COVER_TITLE = 24;
const FS_COVER_SUB   = 13;
const FS_COVER_META  = 9;
const FS_TOC_TITLE   = 14;
const FS_TOC_ENTRY   = 10;
const FS_SEC_TITLE   = 13;
const FS_SUB_TITLE   = 10.5;
const FS_BODY        = 9.5;
const FS_REC_LABEL   = 8;
const FS_FOOTER      = 7.5;
const FS_BADGE       = 11;
const FS_GLOSS_TERM  = 9.5;
const FS_GLOSS_DEF   = 9;

// ── Platform Glossary (sourced from client/src/pages/Glossary.tsx) ────────────

const GLOSSARY_TERMS: Array<{ term: string; definition: string }> = [
  { term: "Access Control",        definition: "Physical and procedural measures that restrict entry to authorised personnel only. Includes key-card systems, visitor management, and controlled entry points." },
  { term: "ACTD",                  definition: "Assess, Commit, Take Action, Debrief — the preferred active threat response protocol. Replaces older Active Threat Response Training language with a structured decision-making model." },
  { term: "AED",                   definition: "Automated External Defibrillator. A portable device that analyses heart rhythm and delivers a shock to restore normal rhythm in sudden cardiac arrest. Recommended to be accessible and staff-trained." },
  { term: "ASHER",                 definition: "Active Shooter / Hostile Event Response. The category of emergency response addressed by NFPA 3000, covering planning, training, and operational procedures." },
  { term: "CCTV",                  definition: "Closed-Circuit Television. A video surveillance system evaluated for coverage, recording capability, and monitoring protocols during security assessments." },
  { term: "CISA",                  definition: "Cybersecurity and Infrastructure Security Agency. A U.S. federal agency that provides resources and guidance on workplace violence prevention, active shooter preparedness, and physical security." },
  { term: "CPTED",                 definition: "Crime Prevention Through Environmental Design. A multi-disciplinary approach that deters criminal behaviour through design — using natural surveillance, access control, territorial reinforcement, and maintenance." },
  { term: "EAP",                   definition: "Emergency Action Plan. A written document required by OSHA (29 CFR 1910.38) that describes actions employees should take during fire and other emergencies, including workplace violence." },
  { term: "Evacuation",            definition: "The organised movement of occupants out of a building or area in response to an emergency. Requires designated routes, assembly points, and accountability procedures." },
  { term: "FEMA",                  definition: "Federal Emergency Management Agency. Coordinates federal preparedness, response, and recovery for domestic disasters. Developed and maintains NIMS and ICS." },
  { term: "ICS",                   definition: "Incident Command System. A standardised on-scene management approach that integrates personnel, procedures, and communications. Part of NIMS with a clear chain of command." },
  { term: "Lockdown",              definition: "A protective action that restricts movement within a facility to prevent an active threat from gaining access to occupants. Involves securing doors, silencing communications, and sheltering in place." },
  { term: "NFPA 3000",             definition: "National Fire Protection Association Standard 3000. The standard for Active Shooter / Hostile Event Response programs, covering planning, training, and recovery." },
  { term: "NIMS",                  definition: "National Incident Management System. A FEMA-developed framework providing standardised terminology, structures, and procedures for managing incidents of all sizes." },
  { term: "OSHA",                  definition: "Occupational Safety and Health Administration. The U.S. federal agency that enforces workplace safety regulations. The General Duty Clause (Section 5(a)(1)) requires employers to provide a hazard-free workplace." },
  { term: "Shelter-in-Place",      definition: "A protective action directing occupants to remain inside a building and secure themselves in a designated interior room away from windows and doors, typically used for external threats or hazardous material incidents." },
  { term: "Threat Assessment",     definition: "A structured process for identifying, evaluating, and managing individuals or situations that may pose a risk of violence. Involves gathering information, assessing intent and capability, and implementing intervention strategies." },
  { term: "Workplace Violence",    definition: "Any act or threat of physical violence, harassment, intimidation, or other threatening disruptive behaviour that occurs at the work site. Ranges from verbal abuse to physical assault." },
].sort((a, b) => a.term.localeCompare(b.term));

// ── Risk level colour ─────────────────────────────────────────────────────────

function riskColor(level: string): [number, number, number] {
  const l = (level ?? "").toLowerCase();
  if (l.includes("critical")) return C_RED;
  if (l.includes("high"))     return C_ORANGE;
  if (l.includes("moderate")) return C_AMBER;
  if (l.includes("low"))      return C_GREEN;
  return C_GRAY;
}

// ── Priority helpers ──────────────────────────────────────────────────────────

function priorityColor(p: string): [number, number, number] {
  if (/immediate/i.test(p)) return C_RED;
  if (/30/i.test(p))        return C_ORANGE;
  if (/60/i.test(p))        return C_AMBER;
  if (/90/i.test(p))        return C_INDIGO;
  return C_GRAY;
}

function priorityLabel(p: string): string {
  if (/immediate/i.test(p)) return "IMMEDIATE";
  if (/30/i.test(p))        return "30 DAYS";
  if (/60/i.test(p))        return "60 DAYS";
  if (/90/i.test(p))        return "90 DAYS";
  return (p ?? "").toUpperCase();
}

// ── Markdown stripper ─────────────────────────────────────────────────────────

function stripMd(s: string): string {
  return s.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").trim();
}

// ── Bullet splitter ───────────────────────────────────────────────────────────

function splitBullets(text: string): Array<{ bullet: boolean; text: string }> {
  return text.split(/\n/).map(l => {
    const t = l.trim();
    if (/^[-•*]\s+/.test(t))   return { bullet: true,  text: t.replace(/^[-•*]\s+/, "") };
    if (/^\d+[.)]\s+/.test(t)) return { bullet: true,  text: t };
    return { bullet: false, text: t };
  }).filter(l => l.text.length > 0);
}


// ── Page layout pre-computation (dry-run to get TOC page numbers) ─────────────
// PDFKit 0.18 with bufferPages:false cannot use switchToPage() to patch page numbers.
// Instead, we simulate the layout to pre-compute page numbers before drawing.
interface PageLayout {
  glossaryPage: number;
  facilityPage: number;
  riskPage: number;
  sectionPages: number[];
}

function computePageLayout(
  sections: ResolvedEapSection[],
  eapJson: Record<string, any>,
  doc: InstanceType<typeof PDFDocument>
): PageLayout {
  const pageH = 792; // LETTER
  const bottomBound = pageH - MB - 24; // 714
  const MT_val = MT + 8;

  // Simulate page progression
  let pageNum = 1; // cover page

  // TOC page
  pageNum++;

  // Glossary page
  pageNum++;
  const glossaryPage = pageNum;

  // Facility page
  pageNum++;
  const facilityPage = pageNum;

  // Risk page
  pageNum++;
  const riskPage = pageNum;

  // Section pages — simulate safeY logic
  const sectionPages: number[] = [];
  let currentY = MT_val;

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si];

    if (si === 0) {
      // First section always on new page
      pageNum++;
      currentY = MT_val;
    } else {
      // Check if section header fits
      const neededY = currentY + 10 + 34 + 8 + 40; // SP_SECTION + header + padding + first content
      if (neededY > bottomBound) {
        pageNum++;
        currentY = MT_val;
      }
    }
    sectionPages.push(pageNum);

    // Estimate content height using PDFKit's heightOfString
    const contentH = section.content && section.content.trim()
      ? doc.font("Helvetica").fontSize(9.5).heightOfString(
          section.content.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").trim(),
          { width: pageH - MB - ML - MR, lineGap: 1.5 }
        )
      : 0;

    currentY += 34 + 8 + contentH + 10;

    // Subsections
    if (Array.isArray(section.subsections)) {
      for (const sub of section.subsections) {
        if (!sub.title && !sub.content) continue;
        currentY += 30; // sub header
        if (sub.content) {
          const subH = doc.font("Helvetica").fontSize(9.5).heightOfString(
            sub.content.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").trim(),
            { width: pageH - MB - ML - MR - 8, lineGap: 1.5 }
          );
          currentY += subH + 8;
        }
      }
    }

    // Recommendations
    if (Array.isArray(section.recommendations) && section.recommendations.length > 0) {
      currentY += 40; // recommendations header
      for (const rec of section.recommendations) {
        if (!rec.action) continue;
        const recH = doc.font("Helvetica").fontSize(9.5).heightOfString(
          String(rec.action), { width: pageH - MB - ML - MR - 72, lineGap: 1.5 }
        ) + 22;
        currentY += recH;
      }
    }

    // Simulate page overflows
    while (currentY > bottomBound) {
      pageNum++;
      currentY = MT_val + (currentY - bottomBound);
    }
  }

  return { glossaryPage, facilityPage, riskPage, sectionPages };
}

// ── Rendering function (called by buildEapPdfBuffer) ─────────────────────────
function renderDocument(
  doc: InstanceType<typeof PDFDocument>,
  audit: NonNullable<Awaited<ReturnType<typeof getAuditById>>>,
  facility: NonNullable<Awaited<ReturnType<typeof getFacilityById>>>,
  eapJson: Record<string, any>,
  sections: ResolvedEapSection[],
  baseSections: EapBaseSection[],
  layout: PageLayout
): void {
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const cW    = pageW - ML - MR;
  const bottomBound = pageH - MB - 24;

// ═══════════════════════════════════════════════════════════════════════════
// SHARED DRAWING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

const drawPageBar = (): void => {
  doc.rect(0, 0, pageW, 5).fill(C_BLUE);
};
// Footer Y constants: must be INSIDE the bottom margin to avoid PDFKit phantom pages.
// PDFKit adds a new page if doc.text() is called with y + lineHeight > pageH - bottomMargin.
// bottomMargin = MB = 54, so safe footer y <= pageH - MB - lineHeight = 792 - 54 - 10 = 728.
const footerRuleY = pageH - MB - 22;  // 716
const footerTextY = pageH - MB - 18;  // 720
let _pageNum = 0;
const drawFooter = (): void => {
  _pageNum++;
  const planTitle = (eapJson as Record<string, any>).planTitle ?? "Emergency Action Plan";
  const shortFacility = facility.name.length > 30
    ? facility.name.slice(0, 28) + "\u2026"
    : facility.name;
  doc.moveTo(ML, footerRuleY).lineTo(pageW - MR, footerRuleY)
    .strokeColor(C_RULE).lineWidth(0.5).stroke();
  doc.fillColor(C_MUTED).font("Helvetica").fontSize(FS_FOOTER)
    .text(
      `${planTitle}  \u00b7  ${shortFacility}  \u00b7  CONFIDENTIAL`,
      ML, footerTextY, { width: cW - 60, align: "left", lineBreak: false }
    );
  doc.fillColor(C_NAVY).font("Helvetica-Bold").fontSize(FS_FOOTER)
    .text(
      `Page ${_pageNum}`,
      ML, footerTextY, { width: cW, align: "right", lineBreak: false }
    );
};

const hRule = (y: number, color: [number, number, number] = C_RULE, weight = 0.5): void => {
  doc.moveTo(ML, y).lineTo(pageW - MR, y)
    .strokeColor(color).lineWidth(weight).stroke();
};

/**
 * Ensure there is at least `minH` points of vertical space remaining.
 * If not, add a new page and return the new Y position.
 */
const safeY = (y: number, minH: number): number => {
  // Guard against NaN/Infinity coordinates (e.g. from doc.y after switchToPage)
  const safeInput = (isNaN(y) || !isFinite(y)) ? MT + 8 : y;
  if (safeInput + minH > bottomBound) {
    doc.addPage();
    drawPageBar();
    drawFooter();
    return MT + 8;
  }
  return safeInput;
};

/** Strip control characters and normalize whitespace that breaks PDFKit */
const sanitizeText = (s: string): string =>
  String(s ?? "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")  // control chars
    .replace(/\u2028|\u2029/g, " ")                       // line/paragraph separators
    .trim();

/**
 * Render a block of text with automatic bullet detection.
 * Returns the Y position after the last line.
 */
const renderTextBlock = (
  text: string,
  x: number,
  startY: number,
  w: number,
  opts: {
    fontSize?: number;
    color?: [number, number, number];
    lineGap?: number;
    indent?: number;
  } = {}
): number => {
  const { fontSize = FS_BODY, color = C_BODY, lineGap = 1, indent = 0 } = opts;
  const lines = splitBullets(sanitizeText(text));
  let y = startY;

  for (const line of lines) {
    const bx = x + indent + (line.bullet ? 14 : 0);
    const bw = w - indent - (line.bullet ? 14 : 0);
    const lh = doc.heightOfString(line.text, { width: bw, lineGap });

    y = safeY(y, lh + SP_PARA);

    if (line.bullet) {
      doc.circle(x + indent + 4, y + fontSize * 0.45, 2).fill(C_BLUE);
    }

    doc.fillColor(color).font("Helvetica").fontSize(fontSize)
      .text(line.text, bx, y, { width: bw, lineGap });
    y += lh + SP_BULLET;
  }

  return y + (SP_PARA - SP_BULLET);
};

/**
 * Draw a section heading bar (navy background, numbered badge, title).
 * Returns Y after the bar.
 */
const drawSectionHeader = (
  y: number,
  num: number,
  title: string,
  isEdited: boolean
): number => {
  const headerBarH = 34;
  y = safeY(y, headerBarH + 40);

  doc.rect(ML, y, cW, headerBarH).fill(C_NAVY);

  const badgeW = 30;
  doc.roundedRect(ML + 6, y + 6, badgeW, 22, 3).fill(C_BLUE);
  doc.fillColor(C_WHITE).font("Helvetica-Bold").fontSize(FS_BADGE)
    .text(String(num), ML + 6, y + 11, { width: badgeW, align: "center" });

  doc.fillColor(C_WHITE).font("Helvetica-Bold").fontSize(FS_SEC_TITLE)
    .text(title, ML + 44, y + 10, { width: cW - 50 });

  y += headerBarH + 4;

  if (isEdited) {
    doc.roundedRect(ML, y, 92, 14, 3).fill(C_TEAL);
    doc.fillColor(C_WHITE).font("Helvetica-Bold").fontSize(7)
      .text("AUDITOR-EDITED VERSION", ML + 4, y + 3, { width: 84 });
    y += 20;
  }

  return y + SP_HEADER;
};

/**
 * Draw a sub-section title with a rule above it.
 * Returns Y after the title.
 */
const drawSubHeader = (y: number, title: string): number => {
  y = safeY(y + SP_SECTION, 50) - SP_SECTION;
  y += SP_SECTION;
  doc.rect(ML, y, cW, 1).fill(C_RULE);
  y += 5;
  doc.fillColor(C_NAVY).font("Helvetica-Bold").fontSize(FS_SUB_TITLE)
    .text(title, ML, y);
  return y + 16;
};

// ═══════════════════════════════════════════════════════════════════════════
// 1. COVER PAGE
// ═══════════════════════════════════════════════════════════════════════════

drawPageBar();
drawFooter();

// Navy header block
const coverHeaderH = 110;
doc.rect(0, 5, pageW, coverHeaderH).fill(C_NAVY);

doc.fillColor(C_WHITE).font("Helvetica").fontSize(9)
  .text("PREPAREDNESS & RESPONSE FRAMEWORK", ML, 20, { width: cW, align: "center", characterSpacing: 1.5 });

doc.fillColor(C_WHITE).font("Helvetica-Bold").fontSize(FS_COVER_TITLE)
  .text("EMERGENCY ACTION PLAN", ML, 38, { width: cW, align: "center" });

doc.fillColor(hex("93c5fd")).font("Helvetica-Bold").fontSize(FS_COVER_SUB)
  .text(facility.name.toUpperCase(), ML, 72, { width: cW, align: "center" });

doc.rect(0, 5 + coverHeaderH, pageW, 4).fill(C_BLUE);

// ── Meta grid (2 columns, fixed label widths to prevent overflow) ─────────
const metaStartY = 5 + coverHeaderH + 4 + 24;
const colW = Math.floor(cW / 2) - 10;
const labelW = 90;
const valueW = colW - labelW - 6;

const leftMeta = [
  { label: "PLAN TITLE",       value: eapJson.planTitle ?? `EAP — ${facility.name}` },
  { label: "FACILITY",         value: facility.name },
  { label: "ADDRESS",          value: [facility.address, facility.city, facility.state].filter(Boolean).join(", ") || "—" },
  { label: "OVERALL RISK",     value: audit.overallRiskLevel ?? "Unknown" },
];
const rightMeta = [
  { label: "EFFECTIVE DATE",   value: eapJson.effectiveDate ?? new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
  { label: "REVIEW DATE",      value: eapJson.reviewDate ?? "Annual" },
  { label: "STANDARDS",        value: (eapJson.standardsAlignment ?? []).join(", ") || "OSHA 29 CFR 1910.38" },
  { label: "SECTIONS",         value: `${sections.length} of ${baseSections.length} applicable` },
];

let mY = metaStartY;

// Auto-height rows: measure both columns, use the taller
for (let i = 0; i < 4; i++) {
  const rx = ML + colW + 20;
  const lVal = String(leftMeta[i].value);
  const rVal = String(rightMeta[i].value);
  const lH = doc.font("Helvetica").fontSize(FS_COVER_META).heightOfString(lVal, { width: valueW, lineGap: 1 });
  const rH = doc.font("Helvetica").fontSize(FS_COVER_META).heightOfString(rVal, { width: valueW, lineGap: 1 });
  const rowH = Math.max(lH, rH, 14) + 8; // min 14pt + 8pt padding

  if (i % 2 === 0) doc.rect(ML, mY - 2, cW, rowH + 2).fill(C_LIGHT);

  // Left column
  doc.fillColor(C_BLUE).font("Helvetica-Bold").fontSize(7)
    .text(leftMeta[i].label, ML + 4, mY, { width: labelW, characterSpacing: 0.4 });
  doc.fillColor(C_BODY).font("Helvetica").fontSize(FS_COVER_META)
    .text(lVal, ML + labelW + 4, mY + 1, { width: valueW, lineGap: 1 });

  // Right column
  doc.fillColor(C_BLUE).font("Helvetica-Bold").fontSize(7)
    .text(rightMeta[i].label, rx, mY, { width: labelW, characterSpacing: 0.4 });
  doc.fillColor(C_BODY).font("Helvetica").fontSize(FS_COVER_META)
    .text(rVal, rx + labelW + 4, mY + 1, { width: valueW, lineGap: 1 });

  mY += rowH;
}

mY += 6;
hRule(mY);
mY += 12;

// ── Executive Summary on cover ────────────────────────────────────────────
if (eapJson.executiveSummary && eapJson.executiveSummary.trim()) {
  doc.fillColor(C_NAVY).font("Helvetica-Bold").fontSize(10)
    .text("EXECUTIVE SUMMARY", ML, mY, { characterSpacing: 0.8 });
  mY += 12;
  hRule(mY, C_BLUE, 0.8);
  mY += 8;

  const summaryText = stripMd(eapJson.executiveSummary);
  doc.fillColor(C_BODY).font("Helvetica").fontSize(FS_BODY)
    .text(summaryText, ML, mY, { width: cW, lineGap: 2 });
  mY = doc.y + 12;
}

// ── Assigned Roles ────────────────────────────────────────────────────────
if (Array.isArray(eapJson.assignedRoles) && eapJson.assignedRoles.length > 0) {
  mY = safeY(mY + 8, 20 + eapJson.assignedRoles.length * 18);

  doc.fillColor(C_NAVY).font("Helvetica-Bold").fontSize(10)
    .text("ASSIGNED EMERGENCY ROLES", ML, mY, { characterSpacing: 0.8 });
  mY += 12;
  hRule(mY, C_BLUE, 0.8);
  mY += 8;

  eapJson.assignedRoles.forEach((role: string, i: number) => {
    mY = safeY(mY, 18);
    if (i % 2 === 0) doc.rect(ML, mY - 2, cW, 18).fill(C_LIGHT);
    doc.circle(ML + 8, mY + 7, 3).fill(C_BLUE);
    doc.fillColor(C_BODY).font("Helvetica").fontSize(FS_BODY)
      .text(String(role), ML + 18, mY + 2, { width: cW - 18 });
    mY += 18;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. TABLE OF CONTENTS
// ═══════════════════════════════════════════════════════════════════════════

doc.addPage();
drawPageBar();
drawFooter();

let tocY = MT + 8;

// TOC header
doc.rect(ML, tocY, cW, 32).fill(C_NAVY);
doc.fillColor(C_WHITE).font("Helvetica-Bold").fontSize(FS_TOC_TITLE)
  .text("TABLE OF CONTENTS", ML, tocY + 9, { width: cW, align: "center" });
tocY += 40;

// TOC page numbers are pre-computed — no tocPageIndex needed

// Fixed TOC entries — page numbers from pre-computed layout (no switchToPage needed)
const fixedTocEntries: Array<{ label: string; page: number }> = [
  { label: "Glossary of Terms",  page: layout.glossaryPage },
  { label: "Facility Overview",  page: layout.facilityPage },
  { label: "Risk Summary",       page: layout.riskPage },
];

// Helper to draw one TOC row
const drawTocRow = (idx: number, label: string, pageNum: string, y: number): void => {
  if (idx % 2 === 0) doc.rect(ML, y - 2, cW, 18).fill(C_LIGHT);

  doc.fillColor(C_BODY).font("Helvetica").fontSize(FS_TOC_ENTRY)
    .text(label, ML + 4, y + 2, { width: cW - 60 });

  const labelPx = doc.widthOfString(label);
  const dotStart = ML + 4 + Math.min(labelPx + 6, cW - 80);
  const dotEnd   = pageW - MR - 28;
  if (dotEnd > dotStart + 10) {
    doc.moveTo(dotStart, y + 9).lineTo(dotEnd, y + 9)
      .dash(1, { space: 3 }).strokeColor(C_MUTED).lineWidth(0.5).stroke()
      .undash();
  }

  doc.fillColor(C_MUTED).font("Helvetica").fontSize(FS_TOC_ENTRY)
    .text(pageNum, pageW - MR - 24, y + 2, { width: 24, align: "right" });
};

// Draw fixed entries with pre-computed page numbers
fixedTocEntries.forEach((entry, i) => {
  tocY = safeY(tocY, 18);
  drawTocRow(i, entry.label, String(entry.page), tocY);
  tocY += 18;
});

// Spacer before section entries
tocY += 6;
doc.fillColor(C_MUTED).font("Helvetica-Bold").fontSize(8)
  .text("EAP SECTIONS", ML + 4, tocY, { characterSpacing: 0.8 });
tocY += 14;

// Section entries with pre-computed page numbers
for (let i = 0; i < sections.length; i++) {
  tocY = safeY(tocY, 18);
  const label = `${i + 1}.  ${sections[i].title ?? `Section ${i + 1}`}`;
  const pageNum = layout.sectionPages[i] ?? 0;
  drawTocRow(i + fixedTocEntries.length, label, String(pageNum), tocY);
  tocY += 18;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. GLOSSARY OF TERMS
// ═══════════════════════════════════════════════════════════════════════════

doc.addPage();
drawPageBar();
drawFooter();
// glossaryPage pre-computed in layout.glossaryPage

let gY = MT + 8;

// Glossary header
doc.rect(ML, gY, cW, 32).fill(C_NAVY);
doc.fillColor(C_WHITE).font("Helvetica-Bold").fontSize(14)
  .text("GLOSSARY OF TERMS", ML, gY + 9, { width: cW, align: "center" });
gY += 40;

doc.fillColor(C_MUTED).font("Helvetica").fontSize(8.5)
  .text("Key terms used throughout this Emergency Action Plan and the Five Stones Technology platform.", ML, gY, { width: cW });
gY += 18;
hRule(gY);
gY += 10;

for (let i = 0; i < GLOSSARY_TERMS.length; i++) {
  const entry = GLOSSARY_TERMS[i];
  const defH   = doc.heightOfString(entry.definition, { width: cW - 134, lineGap: 1.5 });
  const termH  = doc.heightOfString(entry.term, { width: 120 });
  const rowH   = Math.max(termH, defH) + 10;

  gY = safeY(gY, rowH);

  if (i % 2 === 0) doc.rect(ML, gY - 2, cW, rowH + 2).fill(C_LIGHT);

  doc.fillColor(C_NAVY).font("Helvetica-Bold").fontSize(FS_GLOSS_TERM)
    .text(entry.term, ML + 4, gY + 2, { width: 120 });

  doc.fillColor(C_BODY).font("Helvetica").fontSize(FS_GLOSS_DEF)
    .text(entry.definition, ML + 130, gY + 2, { width: cW - 134, lineGap: 1.5 });

  gY += rowH;
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. FACILITY OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════

doc.addPage();
drawPageBar();
drawFooter();
// facilityPage pre-computed in layout.facilityPage

let fY = MT + 8;

doc.rect(ML, fY, cW, 32).fill(C_NAVY);
doc.fillColor(C_WHITE).font("Helvetica-Bold").fontSize(14)
  .text("FACILITY OVERVIEW", ML, fY + 9, { width: cW, align: "center" });
fY += 40;

// Facility details table — only show rows with real values
const facilityRows: Array<[string, string]> = [
  ["Facility Name",              facility.name],
  ["Facility Type",              (facility as any).facilityType ?? ""],
  ["Address",                    [facility.address, facility.city, facility.state].filter(Boolean).join(", ")],
  ["Square Footage",             (facility as any).squareFootage ? `${Number((facility as any).squareFootage).toLocaleString()} sq ft` : ""],
  ["Floors",                     (facility as any).floors ? String((facility as any).floors) : ""],
  ["Max Occupancy",              (facility as any).maxOccupancy ? String((facility as any).maxOccupancy) : ""],
  ["Operating Hours",            (facility as any).operatingHours ?? ""],
  ["Public Entrances",           (facility as any).publicEntrances != null ? String((facility as any).publicEntrances) : ""],
  ["Staff Entrances",            (facility as any).staffEntrances != null ? String((facility as any).staffEntrances) : ""],
  ["Evening Operations",         (facility as any).eveningOperations ? "Yes" : ""],
  ["Multi-Tenant Building",      (facility as any).multiTenant ? "Yes" : ""],
  ["Public Access (Unscreened)", (facility as any).publicAccessWithoutScreening ? "Yes" : ""],
  ["Emergency Coordinator",      (facility as any).emergencyCoordinator ?? ""],
].filter(([, v]) => v && v.trim()) as Array<[string, string]>;

const fRowH = 20;
for (let i = 0; i < facilityRows.length; i++) {
  fY = safeY(fY, fRowH);
  if (i % 2 === 0) doc.rect(ML, fY - 2, cW, fRowH).fill(C_LIGHT);
  doc.fillColor(C_BLUE).font("Helvetica-Bold").fontSize(8)
    .text(facilityRows[i][0].toUpperCase(), ML + 4, fY + 2, { width: 140, characterSpacing: 0.3 });
  doc.fillColor(C_BODY).font("Helvetica").fontSize(FS_BODY)
    .text(facilityRows[i][1], ML + 148, fY + 2, { width: cW - 152 });
  fY += fRowH;
}

// EAP Contacts (from eapContacts JSON field)
const eapContacts = (audit as any).eapContacts as Record<string, any> | null;
if (eapContacts && typeof eapContacts === "object") {
  fY = safeY(fY + 10, 60);

  doc.fillColor(C_NAVY).font("Helvetica-Bold").fontSize(10)
    .text("EMERGENCY COORDINATOR CONTACTS", ML, fY, { characterSpacing: 0.6 });
  fY += 12;
  hRule(fY, C_BLUE, 0.8);
  fY += 8;

  const contactFields: Array<[string, string]> = [
    ["Primary Coordinator",  String(eapContacts.primary ?? "")],
    ["Backup Coordinator",   String(eapContacts.backup ?? "")],
    ["After-Hours Contact",  String(eapContacts.afterHours ?? "")],
    ["Additional Contacts",  String(eapContacts.other ?? "")],
  ].filter(([, v]) => v && v.trim() && v !== "undefined") as Array<[string, string]>;

  for (let i = 0; i < contactFields.length; i++) {
    fY = safeY(fY, 20);
    if (i % 2 === 0) doc.rect(ML, fY - 2, cW, 20).fill(C_LIGHT);
    doc.fillColor(C_BLUE).font("Helvetica-Bold").fontSize(8)
      .text(contactFields[i][0].toUpperCase(), ML + 4, fY + 2, { width: 140, characterSpacing: 0.3 });
    doc.fillColor(C_BODY).font("Helvetica").fontSize(FS_BODY)
      .text(contactFields[i][1], ML + 148, fY + 2, { width: cW - 152 });
    fY += 20;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. RISK SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

doc.addPage();
drawPageBar();
drawFooter();
// riskPage pre-computed in layout.riskPage

let rY = MT + 8;

doc.rect(ML, rY, cW, 32).fill(C_NAVY);
doc.fillColor(C_WHITE).font("Helvetica-Bold").fontSize(14)
  .text("RISK SUMMARY", ML, rY + 9, { width: cW, align: "center" });
rY += 40;

// Overall risk level badge
const overallRisk = audit.overallRiskLevel ?? "Unknown";
const rColor = riskColor(overallRisk);
doc.roundedRect(ML, rY, 120, 28, 4).fill(rColor);
doc.fillColor(C_WHITE).font("Helvetica-Bold").fontSize(11)
  .text("OVERALL RISK", ML + 4, rY + 4, { width: 112, align: "center" });
doc.fillColor(C_WHITE).font("Helvetica-Bold").fontSize(13)
  .text(overallRisk.toUpperCase(), ML + 4, rY + 14, { width: 112, align: "center" });

if (audit.overallScore != null) {
  doc.fillColor(C_BODY).font("Helvetica").fontSize(FS_BODY)
    .text(`Overall Score: ${Math.round(Number(audit.overallScore))}%`, ML + 130, rY + 10, { width: cW - 130 });
}
rY += 36;

// Category scores table
const categoryScores = (audit as any).categoryScores as Record<string, any> | null;
if (categoryScores && typeof categoryScores === "object" && Object.keys(categoryScores).length > 0) {
  rY = safeY(rY + 6, 40);

  doc.fillColor(C_NAVY).font("Helvetica-Bold").fontSize(10)
    .text("CATEGORY RISK SCORES", ML, rY, { characterSpacing: 0.6 });
  rY += 12;
  hRule(rY, C_BLUE, 0.8);
  rY += 8;
  // Sort by percentage ascending (most at-risk / lowest score first))
  const catEntries = Object.entries(categoryScores)
    .filter(([, v]) => v && typeof v === "object")
    .sort((a, b) => {
      // Use percentage field (0-100). Lower % = more at-risk.
      const pctA = Number((a[1] as any).percentage ?? (a[1] as any).score ?? 100);
      const pctB = Number((b[1] as any).percentage ?? (b[1] as any).score ?? 100);
      return pctA - pctB;
    });

  console.log("[EAP PDF] Risk Summary categories:", catEntries.map(([k, v]) =>
    `${k}: pct=${(v as any).percentage} riskLevel=${(v as any).riskLevel}`
  ));

  const catRowH = 22;  // slightly taller rows for breathing room (was 20)
  const barMaxW = 120;
  for (let i = 0; i < catEntries.length; i++) {
    const [catName, catData] = catEntries[i];
    // Use 'percentage' field (0-100). Fall back to 'score' for backwards compat.
    const rawPct    = (catData as any).percentage ?? (catData as any).score;
    const pct       = typeof rawPct === "number" ? Math.round(rawPct) : 0;
    const riskLevel = String((catData as any).riskLevel ?? "Unknown");
    const catColor  = riskColor(riskLevel);

    if (typeof rawPct !== "number") {
      console.warn(`[EAP PDF] Category "${catName}" missing percentage field:`, JSON.stringify(catData));
    }

    rY = safeY(rY, catRowH);
    if (i % 2 === 0) doc.rect(ML, rY - 2, cW, catRowH).fill(C_LIGHT);
    // Category name
    doc.fillColor(C_BODY).font("Helvetica").fontSize(FS_BODY)
      .text(catName, ML + 4, rY + 4, { width: cW - barMaxW - 80 });
    // Risk level badge
    const badgeX = ML + cW - barMaxW - 70;
    doc.roundedRect(badgeX, rY + 4, 60, 13, 2).fill(catColor);
    doc.fillColor(C_WHITE).font("Helvetica-Bold").fontSize(7)
      .text(riskLevel.toUpperCase(), badgeX + 2, rY + 6, { width: 56, align: "center" });
    // Progress bar (width driven by same pct value as text label)
    const barX  = ML + cW - barMaxW - 4;
    const barH  = 8;
    const barY  = rY + 7;
    const fillW = Math.max(0, Math.round((pct / 100) * barMaxW));
    doc.rect(barX, barY, barMaxW, barH).fill(C_RULE);
    if (fillW > 0) doc.rect(barX, barY, fillW, barH).fill(catColor);
    // Percentage label — same source as bar width
    doc.fillColor(C_MUTED).font("Helvetica").fontSize(7)
      .text(`${pct}%`, barX + barMaxW + 4, barY, { width: 28 });
    rY += catRowH;
  }
}

// Standards alignment
if (Array.isArray(eapJson.standardsAlignment) && eapJson.standardsAlignment.length > 0) {
  rY = safeY(rY + 14, 40);
  doc.fillColor(C_NAVY).font("Helvetica-Bold").fontSize(10)
    .text("STANDARDS ALIGNMENT", ML, rY, { characterSpacing: 0.6 });
  rY += 12;
  hRule(rY, C_BLUE, 0.8);
  rY += 8;
  const stdText = eapJson.standardsAlignment.join("  ·  ");
  doc.fillColor(C_BODY).font("Helvetica").fontSize(FS_BODY)
    .text(stdText, ML, rY, { width: cW, lineGap: 1.5 });
  rY += doc.heightOfString(stdText, { width: cW, lineGap: 1.5 }) + 8;
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. EAP SECTIONS
//    Sections do NOT force a new page unconditionally.
//    A new page is only added when content does not fit (via safeY).
// ═══════════════════════════════════════════════════════════════════════════

// sectionPageNumbers: pre-computed in layout.sectionPages

for (let si = 0; si < sections.length; si++) {
  const section: ResolvedEapSection = sections[si];
  const minFirstBlock = 34 + SP_HEADER + 40; // header bar + padding + first content

  let sY: number;
  if (si === 0) {
    // First section always starts on a new page (clean break after Risk Summary)
    doc.addPage();
    drawPageBar();
    drawFooter();
    sY = MT + 6;
  } else {
    // Subsequent sections: check if header fits on current page
    // safeY adds a new page if needed and returns MT+8; otherwise returns the input y.
    const currentY = (isNaN(doc.y) ? MT + 8 : doc.y) + SP_SECTION;
    sY = safeY(currentY, minFirstBlock);
    // sY is now either currentY (fits) or MT+8 (new page added) — both correct
  }

  // Page number pre-computed in layout.sectionPages[si]

  // Draw section header
  sY = drawSectionHeader(sY, si + 1, section.title ?? `Section ${si + 1}`, section.isEdited);

  // ── Main content ────────────────────────────────────────────────────────
  try {
    if (section.content && section.content.trim()) {
      const paragraphs = section.content.split(/\n\n+/);
      for (const para of paragraphs) {
        const cleaned = stripMd(para);
        if (!cleaned) continue;
        sY = renderTextBlock(cleaned, ML, sY, cW, { fontSize: FS_BODY, color: C_BODY, lineGap: 1.5 });
      }
    }

  // ── Subsections ─────────────────────────────────────────────────────────
    if (Array.isArray(section.subsections) && section.subsections.length > 0) {
      for (const sub of section.subsections) {
        if (!sub.title && !sub.content) continue;
        sY = drawSubHeader(sY, sub.title ?? "");
        if (sub.content && sub.content.trim()) {
          const cleaned = stripMd(sub.content);
          sY = renderTextBlock(cleaned, ML, sY, cW, { fontSize: FS_BODY, color: C_BODY, lineGap: 1.5, indent: 8 });
        }
      }
    }

  // ── Recommendations ──────────────────────────────────────────────────────
  if (Array.isArray(section.recommendations) && section.recommendations.length > 0) {
      sY = safeY(sY + SP_SECTION, 80) - SP_SECTION;
      sY += SP_SECTION;

      doc.rect(ML, sY, cW, 1).fill(C_BLUE);
      sY += 6;
      doc.fillColor(C_NAVY).font("Helvetica-Bold").fontSize(10)
        .text("RECOMMENDATIONS", ML, sY, { characterSpacing: 0.6 });
      sY += 16;

      for (const rec of section.recommendations) {
        if (!rec.action) continue;
        const pColor     = priorityColor(rec.priority ?? "");
        const pLabel     = priorityLabel(rec.priority ?? "");
        const actionText = sanitizeText(String(rec.action));
        if (!actionText) continue;
        const recH       = doc.heightOfString(actionText, { width: cW - 80, lineGap: 1.5 }) + 22;

        sY = safeY(sY, recH);

        doc.roundedRect(ML, sY, 64, 14, 2).fill(pColor);
        doc.fillColor(C_WHITE).font("Helvetica-Bold").fontSize(FS_REC_LABEL)
          .text(pLabel, ML + 2, sY + 3, { width: 60, align: "center" });

        doc.fillColor(C_BODY).font("Helvetica").fontSize(FS_BODY)
          .text(actionText, ML + 72, sY, { width: cW - 72, lineGap: 1.5 });

        const actionH = doc.heightOfString(actionText, { width: cW - 72, lineGap: 1.5 });

        if (rec.basis && rec.basis.trim()) {
          sY += Math.max(actionH, 14) + 4;
          sY = safeY(sY, 16);
          const basisText = `Basis: ${sanitizeText(rec.basis)}`;
          doc.fillColor(C_MUTED).font("Helvetica").fontSize(8)
            .text(basisText, ML + 72, sY, { width: cW - 72, lineGap: 1 });
          sY += doc.heightOfString(basisText, { width: cW - 72, lineGap: 1 }) + 6;
        } else {
          sY += Math.max(actionH, 14) + 6;
        }
      }
    }
  } catch (sectionErr: any) {
    console.error(`[EAP PDF] Section ${si + 1} "${section.title}" render error:`, sectionErr.message);
    sY = safeY((isNaN(sY) ? MT + 8 : sY) + 8, 20);
    doc.fillColor(C_MUTED).font("Helvetica").fontSize(8)
      .text(`[Section content unavailable: ${sectionErr.message}]`, ML, sY, { width: cW });
    sY += 16;
  }

  // (cursor sync removed — doc.text("", ...) can trigger phantom pages)
}

// TOC page numbers are pre-computed via computePageLayout() and drawn inline.
// No switchToPage() needed — eliminates PDFKit 0.18 phantom page doubling bug.

// Footer is drawn inline on each page via drawFooter() — no switchToPage loop needed.
// (PDFKit 0.18: doc.text() at y > pageH-MB triggers addPage; switchToPage loop doubles pages.)
}


// ── Route ─────────────────────────────────────────────────────────────────────

eapPdfRouter.get("/api/eap/:auditId/pdf", async (req: Request, res: Response) => {
  const t0 = Date.now();

  // ── Auth ──────────────────────────────────────────────────────────────────
  let user: Awaited<ReturnType<typeof sdk.authenticateRequest>> | null = null;
  try { user = await sdk.authenticateRequest(req as any); } catch { user = null; }
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const auditId = parseInt(req.params.auditId, 10);
  if (isNaN(auditId)) {
    res.status(400).json({ error: "Invalid audit ID" });
    return;
  }

  console.log(`[EAP PDF] Request — auditId=${auditId} user=${user.openId}`);

  // ── Cache check ───────────────────────────────────────────────────────────
  const cached = PDF_CACHE.get(auditId);
  if (cached && Date.now() - cached.generatedAt < CACHE_TTL_MS) {
    const safeName = `EAP_Audit_${auditId}_cached.pdf`;
    console.log(`[EAP PDF] Cache hit — auditId=${auditId} size=${cached.buf.length} bytes`);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    res.setHeader("Content-Length", String(cached.buf.length));
    res.setHeader("X-EAP-Cache", "HIT");
    res.end(cached.buf);
    return;
  }

  // ── Generate (with 60-second timeout) ────────────────────────────────────
  try {
    const timeoutMs = 60_000;
    const result = await Promise.race<{ buf: Buffer; filename: string }>([
      buildEapPdfBuffer(auditId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("PDF generation timed out after 60 seconds")), timeoutMs)
      ),
    ]);

    const { buf, filename } = result;
    const elapsed = Date.now() - t0;
    console.log(`[EAP PDF] Generated — auditId=${auditId} size=${buf.length} bytes elapsed=${elapsed}ms`);

    // Cache for reuse
    PDF_CACHE.set(auditId, { buf, generatedAt: Date.now() });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", String(buf.length));
    res.setHeader("X-EAP-Cache", "MISS");
    res.end(buf);

  } catch (err: any) {
    const elapsed = Date.now() - t0;
    const status  = (err as any).status ?? 500;
    const message = err?.message ?? "PDF generation failed";
    console.error(`[EAP PDF] Error — auditId=${auditId} status=${status} elapsed=${elapsed}ms`, err);
    if (!res.headersSent) {
      res.status(status).json({ error: message });
    }
  }
});
