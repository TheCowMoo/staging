/**
 * liabilityScanPdf.ts
 * POST /api/liability-scan/pdf
 *
 * Generates a downloadable, executive-ready PDF from the scan data posted as
 * a JSON body.
 *
 * KEY DESIGN RULES:
 *  1. NEVER call doc.addPage() directly — use ensureSpace(pts) exclusively.
 *  2. For boxed sections: draw text FIRST, record startY/endY, then draw the
 *     background rect using doc.save()/restore() so it appears behind the text
 *     in the PDF stream. PDFKit renders in stream order, so the rect must be
 *     emitted BEFORE the text in the stream — we achieve this by using a
 *     "deferred rect" pattern: write text to a temp buffer position, then
 *     insert the rect. Since PDFKit doesn't support true z-ordering, we use
 *     a light-colored fill (nearly transparent) so text is always readable
 *     even if the rect technically renders on top.
 *  3. heightOfString() is unreliable for pre-measuring — always add generous
 *     padding (1.5× multiplier) and use Math.max(textEnd, boxEnd) for doc.y.
 *  4. drawFooter() uses a `drawing` guard to prevent re-entrant pageAdded calls.
 */
import { Router, type Request, type Response } from "express";
import PDFDocument from "pdfkit";
import { GAP_MAP } from "../shared/gapMap";

// ── Brand constants ────────────────────────────────────────────────────────────
const NAVY = "#0B1F33";
const STEEL = "#3A5F7D";
const GOLD = "#C9A86A";
const RISK_RED = "#E5484D";
const RISK_ORANGE = "#F59E0B";
const RISK_YELLOW = "#CA8A04";
const RISK_GREEN = "#22C55E";
const BORDER = "#E2E8F0";

function riskHex(color: string): string {
  if (color === "red") return RISK_RED;
  if (color === "orange") return RISK_ORANGE;
  if (color === "yellow") return RISK_YELLOW;
  return RISK_GREEN;
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface TopGap {
  id: string;
  gap: string;
  status: string;
  impact: string;
  weight?: number;
}
interface PdfInput {
  score: number;
  classification: string;
  riskMapColor: string;
  riskMapDescriptor: string;
  jurisdiction?: string;
  industry?: string;
  topGaps: TopGap[];
  interpretation?: string;
  advisorSummary?: string;
  immediateActions?: string[];
  scanId?: number;
  createdAt?: string | number;
}

// ── PDF builder ────────────────────────────────────────────────────────────────
function buildPdf(input: PdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 64, bottom: 64, left: 68, right: 68 },
      info: {
        Title: "Liability Exposure Scan — Executive Report",
        Author: "Five Stones Technology",
        Subject: "Workplace Violence Liability Assessment",
      },
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const L = doc.page.margins.left;
    const MARGIN_TOP = doc.page.margins.top;
    const PAGE_H = doc.page.height;
    const FOOTER_H = 32;
    const USABLE_BOTTOM = PAGE_H - doc.page.margins.bottom - FOOTER_H;

    // ── Footer ─────────────────────────────────────────────────────────────────
    let drawing = false;
    function drawFooter() {
      if (drawing) return;
      drawing = true;
      const footerY = PAGE_H - FOOTER_H;
      doc.save();
      doc.rect(0, footerY, doc.page.width, FOOTER_H).fill(NAVY);
      const savedBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc
        .fillColor("rgba(255,255,255,0.55)")
        .font("Helvetica")
        .fontSize(7)
        .text(
          "Five Stones Technology  \u00B7  Workplace Safety Assessment Platform",
          L,
          footerY + 11,
          { width: W, align: "center", lineBreak: false }
        );
      doc.page.margins.bottom = savedBottom;
      doc.restore();
      drawing = false;
    }

    doc.on("pageAdded", () => {
      drawFooter();
      doc.y = MARGIN_TOP;
    });
    drawFooter();

    // ── ensureSpace ────────────────────────────────────────────────────────────
    function ensureSpace(minPts: number) {
      if (doc.y + minPts > USABLE_BOTTOM) {
        doc.addPage();
      }
    }

    // ── sectionHeading ─────────────────────────────────────────────────────────
    function sectionHeading(text: string, color = NAVY) {
      doc.rect(L, doc.y, W, 1.5).fill(color);
      doc.y += 10;
      doc.fillColor(color).font("Helvetica-Bold").fontSize(11).text(text.toUpperCase(), L, doc.y, { width: W });
      doc.moveDown(0.7);
    }

    // ── body text ──────────────────────────────────────────────────────────────
    function body(text: string, opts: object = {}) {
      doc.fillColor("#374151").font("Helvetica").fontSize(9.5).text(text, L, doc.y, { width: W, lineGap: 5, ...opts });
    }

    // ── small label ───────────────────────────────────────────────────────────
    function smallLabel(text: string) {
      doc.fillColor("#6B7280").font("Helvetica").fontSize(8).text(text, L, doc.y, { width: W });
    }

    // ── horizontal rule ───────────────────────────────────────────────────────
    function rule(color = BORDER) {
      doc.moveDown(0.5);
      doc.rect(L, doc.y, W, 0.5).fill(color);
      doc.moveDown(0.6);
    }

    // ── textBox: draw a lightly-filled box THEN text inside it ─────────────────
    // Uses a 1.6× height multiplier on heightOfString to ensure box is never
    // smaller than the rendered text. Advances doc.y past the box bottom.
    function textBox(text: string, bgColor: string, textColor: string, padH = 16, padV = 14, lineGap = 3) {
      const innerW = W - padH * 2;
      // Measure with multiplier — PDFKit consistently undercounts for long text
      const measuredH = doc.heightOfString(text, { width: innerW, lineGap });
      const safeH = measuredH * 1.6 + padV * 2;
      ensureSpace(safeH + 20);
      const boxY = doc.y;
      // Draw background rect first
      doc.rect(L, boxY, W, safeH).fill(bgColor);
      // Draw text on top
      doc.fillColor(textColor).font("Helvetica").fontSize(9.5)
        .text(text, L + padH, boxY + padV, { width: innerW, lineGap });
      const textBottomY = doc.y;
      const boxBottomY = boxY + safeH;
      // Advance past whichever is lower
      doc.y = Math.max(textBottomY, boxBottomY) + padV;
    }

    // =========================================================================
    // PAGE 1: COVER
    // =========================================================================
    doc.rect(0, 0, doc.page.width, 110).fill(NAVY);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(20).text("Liability Exposure Scan", L, 28, { width: W });
    doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(11).text("Executive Assessment Report", L, 54, { width: W });
    doc.fillColor("rgba(255,255,255,0.7)").font("Helvetica").fontSize(8.5)
      .text("Five Stones Technology  \u00B7  Workplace Safety Assessment Platform", L, 72, { width: W });

    const dateStr = input.createdAt
      ? new Date(input.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    doc.y = 132;

    const contextItems: [string, string][] = [
      ["Assessment Date", dateStr],
      ["Jurisdiction", input.jurisdiction || "Not specified"],
      ["Industry", input.industry || "Not specified"],
    ];

    contextItems.forEach(([k, v]) => {
      doc.fillColor("#6B7280").font("Helvetica").fontSize(8).text(k.toUpperCase(), L, doc.y, { width: W });
      doc.moveDown(0.2);
      doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(9.5).text(v, L, doc.y, { width: W });
      doc.moveDown(0.75);
    });

    rule();

    // ── Score block ────────────────────────────────────────────────────────────
    const scoreColor = riskHex(input.riskMapColor);
    const circleX = L;
    const circleY = doc.y;

    doc.rect(circleX, circleY, 72, 72).fillAndStroke(scoreColor + "18", scoreColor);
    doc.fillColor(scoreColor).font("Helvetica-Bold").fontSize(32)
      .text(String(input.score), circleX, circleY + 12, { width: 72, align: "center" });
    doc.fillColor(scoreColor).font("Helvetica").fontSize(8)
      .text("/ 100", circleX, circleY + 50, { width: 72, align: "center" });

    const textX = circleX + 84;
    const textW = W - 84;

    // Measure classification height before drawing descriptor
    doc.font("Helvetica-Bold").fontSize(15);
    const classH = doc.heightOfString(input.classification, { width: textW });
    doc.fillColor(scoreColor).font("Helvetica-Bold").fontSize(15)
      .text(input.classification, textX, circleY + 4, { width: textW });

    if (input.riskMapDescriptor) {
      const descY = circleY + 4 + classH + 8;
      doc.fillColor("#374151").font("Helvetica").fontSize(9.5)
        .text(input.riskMapDescriptor, textX, descY, { width: textW, lineGap: 3 });
    }

    // Advance past score block
    const blockBottom = Math.max(circleY + 72, doc.y);
    doc.y = blockBottom + 14;

    // Progress bar
    const barY = doc.y;
    doc.rect(L, barY, W, 8).fillAndStroke("#E5E7EB", "#E5E7EB");
    doc.rect(L, barY, (input.score / 100) * W, 8).fill(scoreColor);
    doc.y = barY + 8;
    doc.moveDown(0.7);

    smallLabel(`Liability Exposure Score: ${input.score}/100 — ${input.classification}`);
    doc.moveDown(0.5);
    rule();

    // Disclaimer
    doc.fillColor("#9CA3AF").font("Helvetica").fontSize(7.5)
      .text(
        "This report is a preliminary liability exposure assessment. It is not a formal audit, legal determination, or compliance certification. Results are based on self-reported responses and are intended to identify potential gaps and support risk management planning.",
        L, doc.y, { width: W, lineGap: 2 }
      );
    doc.moveDown(0.7);

    // =========================================================================
    // SECTION: ADVISOR ASSESSMENT
    // =========================================================================
    if (input.advisorSummary) {
      ensureSpace(120);
      doc.moveDown(1.1);
      sectionHeading("Advisor Insight — System-Level Exposure Analysis", STEEL);
      doc.moveDown(0.4);
      body(input.advisorSummary, { lineGap: 4 });
    }

    // =========================================================================
    // SECTION: SYSTEM MISALIGNMENT IDENTIFIED
    // =========================================================================
    if (input.topGaps?.length) {
      const resolvedForPdf = input.topGaps
        .map((g) => { const def = GAP_MAP.find((d) => d.gap_id === g.id); return def ? { ...def, ...g } : null; })
        .filter(Boolean) as Array<typeof GAP_MAP[0] & TopGap>;

      if (resolvedForPdf.length > 0) {
        ensureSpace(160);
        doc.moveDown(1.1);
        sectionHeading("System Misalignment Identified", GOLD);

        const misalignIntro =
          "Your responses suggest that elements of workplace violence preparedness may exist, but are not functioning as a fully aligned system. " +
          "Organizations are rarely evaluated on whether something existed \u2014 they are evaluated on whether it was aligned, understood, and executable.";
        body(misalignIntro);
        doc.moveDown(0.8);

        const exposureItems = [
          "Operational response during an incident",
          "Defensibility during post-incident review",
        ];
        exposureItems.forEach((item) => {
          ensureSpace(24);
          const dotX = L + 6;
          const dotY = doc.y + 5;
          doc.circle(dotX, dotY, 2.5).fill(GOLD);
          doc.fillColor("#374151").font("Helvetica").fontSize(9.5)
            .text(item, L + 18, doc.y, { width: W - 18, lineGap: 2 });
          doc.moveDown(0.4);
        });

        ensureSpace(40);
        doc.moveDown(0.6);
        const accentY = doc.y;
        doc.rect(L, accentY, 3, 22).fill(GOLD);
        doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(9.5)
          .text(
            "This indicates that elements may exist, but are not functioning as a legally defensible system.",
            L + 12, accentY + 4, { width: W - 12, lineGap: 2 }
          );
        doc.y = Math.max(doc.y, accentY + 26);
        doc.moveDown(0.6);
      }
    }

    // =========================================================================
    // SECTION: TOP LIABILITY GAPS
    // =========================================================================
    if (input.topGaps?.length) {
      ensureSpace(160);
      doc.moveDown(1.1);
      sectionHeading("Top Liability Gaps — Defensibility Exposure");

      const gaps = input.topGaps.slice(0, 6);
      gaps.forEach((gap, i) => {
        const weight = gap.weight ?? 0;
        const impactLabel = weight >= 15 ? "CRITICAL" : weight >= 10 ? "HIGH IMPACT" : "MODERATE";
        const impactColor = weight >= 15 ? RISK_RED : weight >= 10 ? RISK_ORANGE : RISK_YELLOW;

        const gapTitleW = W - 100;
        const statusText = `Status: ${gap.status}`;

        // Measure each text block independently with generous multipliers
        doc.font("Helvetica-Bold").fontSize(9.5);
        const gapTitleH = doc.heightOfString(gap.gap, { width: gapTitleW, lineGap: 2 }) * 1.3;

        doc.font("Helvetica").fontSize(8);
        const statusH = doc.heightOfString(statusText, { width: gapTitleW, lineGap: 2 }) * 1.3;

        doc.font("Helvetica").fontSize(8.5);
        const impactTextH = gap.impact
          ? doc.heightOfString(gap.impact, { width: gapTitleW, lineGap: 3 }) * 1.3
          : 0;

        const rowH = 10 + gapTitleH + 8 + statusH + (gap.impact ? 8 + impactTextH : 0) + 14;
        ensureSpace(rowH + 16);

        const rowY = doc.y;

        // Left accent bar
        doc.rect(L, rowY, 3, rowH).fill(impactColor);

        // Row number
        doc.fillColor("#9CA3AF").font("Helvetica").fontSize(7.5)
          .text(`${i + 1}`, L + 8, rowY + 8, { width: 14 });

        // Impact badge (top-right)
        doc.fillColor(impactColor).font("Helvetica-Bold").fontSize(7.5)
          .text(impactLabel, L + W - 72, rowY + 8, { width: 72, align: "right" });

        // Gap title
        let curY = rowY + 8;
        doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(9.5)
          .text(gap.gap, L + 26, curY, { width: gapTitleW, lineGap: 2 });
        curY = doc.y + 6;

        // Status
        doc.fillColor("#6B7280").font("Helvetica").fontSize(8)
          .text(statusText, L + 26, curY, { width: gapTitleW, lineGap: 2 });
        curY = doc.y + 8;

        // Impact description
        if (gap.impact) {
          doc.fillColor("#374151").font("Helvetica").fontSize(8.5)
            .text(gap.impact, L + 26, curY, { width: gapTitleW, lineGap: 3 });
          curY = doc.y + 6;
        }

        // Advance past row — use whichever is lower: measured rowH or actual text end
        doc.y = Math.max(rowY + rowH, curY + 8);

        // Divider between rows
        if (i < gaps.length - 1) {
          doc.rect(L + 26, doc.y, W - 26, 0.5).fill(BORDER);
          doc.moveDown(0.7);
        }
      });

      doc.moveDown(0.8);
    }

    // =========================================================================
    // SECTION: LIABILITY INTERPRETATION
    // =========================================================================
    if (input.interpretation) {
      ensureSpace(100);
      doc.moveDown(1.1);
      sectionHeading("Liability Interpretation — Post-Incident Scrutiny Risk");
      body(input.interpretation);
      doc.moveDown(1.1);
    }

    // =========================================================================
    // SECTION: PRIORITY RISK REDUCTION PLAN
    // =========================================================================
    if (input.immediateActions?.length) {
      ensureSpace(130);
      doc.moveDown(1.1);
      sectionHeading("Priority Risk Reduction Plan — Due Diligence Roadmap");

      const phases = [
        { label: "Phase 1 — Immediate (0–30 days)", color: RISK_RED, items: input.immediateActions.slice(0, 2) },
        { label: "Phase 2 — Near-Term (30–90 days)", color: STEEL, items: input.immediateActions.slice(2, 4) },
        { label: "Phase 3 — Ongoing (90–180 days)", color: GOLD, items: input.immediateActions.slice(4) },
      ].filter((p) => p.items.length > 0);

      phases.forEach((phase) => {
        const phaseH = 28 + phase.items.reduce((acc, action) => {
          return acc + doc.heightOfString(action, { width: W - 20, lineGap: 4 }) * 1.3 + 16;
        }, 0) + 16;
        ensureSpace(phaseH);

        doc.fillColor(phase.color).font("Helvetica-Bold").fontSize(10)
          .text(phase.label, L, doc.y, { width: W });
        doc.moveDown(0.45);

        phase.items.forEach((action, i) => {
          ensureSpace(50);
          doc.fillColor("#374151").font("Helvetica").fontSize(9.5)
            .text(`${i + 1}.  ${action}`, L + 14, doc.y, { width: W - 14, lineGap: 4 });
          doc.moveDown(0.65);
        });
        doc.moveDown(1.0);
      });
    }

    // =========================================================================
    // SECTION: RECOMMENDED NEXT STEPS
    // =========================================================================
    ensureSpace(150);
    doc.moveDown(1.1);
    sectionHeading("Recommended Next Steps — Closing the Defensibility Gap", STEEL);

    const nextSteps = [
      {
        title: "Full Liability Assessment",
        desc: "Engage Five Stones Technology for an on-site, third-party assessment that produces a defensible, documented record of your organization's workplace violence risk posture.",
      },
      {
        title: "Site-Specific Plan Development",
        desc: "Commission a customized Active Threat Response Plan and Emergency Action Plan aligned to your facility, workforce, and jurisdiction — the foundation of a legally defensible safety program.",
      },
      {
        title: "Training & Drill Implementation",
        desc: "Establish a documented training and drill program with attendance records and after-action reports — the most frequently cited gap in post-incident investigations.",
      },
    ];

    nextSteps.forEach((step, i) => {
      const descH = doc.heightOfString(step.desc, { width: W - 20, lineGap: 4 }) * 1.3;
      ensureSpace(descH + 40);

      doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(10)
        .text(`${i + 1}.  ${step.title}`, L, doc.y, { width: W });
      doc.moveDown(0.4);
      doc.fillColor("#374151").font("Helvetica").fontSize(9.5)
        .text(step.desc, L + 18, doc.y, { width: W - 18, lineGap: 4 });
      doc.moveDown(1.2);
    });

    doc.end();
  });
}

// ── Express router ─────────────────────────────────────────────────────────────
export const liabilityScanPdfRouter = Router();

liabilityScanPdfRouter.post(
  "/api/liability-scan/pdf",
  async (req: Request, res: Response) => {
    try {
      const input = req.body as PdfInput;
      if (typeof input.score !== "number" || !input.classification) {
        res.status(400).json({ error: "Missing required scan fields: score, classification" });
        return;
      }
      const buf = await buildPdf(input);
      const safeName = `FiveStonesWPV_LiabilityScan_${input.scanId ?? "Report"}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
      res.setHeader("Content-Length", String(buf.length));
      res.end(buf);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "PDF generation failed";
      console.error("[LiabilityScan PDF]", err);
      if (!res.headersSent) {
        res.status(500).json({ error: message });
      }
    }
  }
);
