/**
 * eapMerge.ts — Shared EAP section resolution helper
 *
 * Merges audits.eapJson (raw AI output, source of truth for base content)
 * with eap_sections rows (user edits, source of truth for overrides).
 *
 * Precedence rules:
 *  1. If eap_sections.applicable === false  → section is excluded from output
 *  2. If eap_sections.contentOverride is non-null and non-empty → replaces base content
 *  3. If eap_sections.contentOverride is null/empty             → base LLM content used
 *  4. eap_sections.auditorRecommendations are APPENDED to base recommendations
 *  5. eap_sections.auditorNotes are INTERNAL ONLY — never included in PDF output
 *  6. Sections missing from eap_sections (no row yet) → base content used unchanged
 *  7. Section ordering follows eapJson.sections exactly (LLM output order)
 *
 * This helper is used by:
 *  - server/eapPdf.ts  (PDF download route)
 *  - (future) any server-side EAP export or preview endpoint
 *
 * The UI (EmergencyActionPlan.tsx) performs its own client-side merge using
 * the same precedence rules for display purposes.
 */

export interface EapBaseSection {
  id: string;
  title: string;
  content: string;
  subsections?: Array<{ title: string; content: string }>;
  recommendations?: Array<{ action: string; priority: string; basis: string }>;
}

export interface EapSectionOverride {
  sectionId: string;
  contentOverride: string | null;
  applicable: boolean;
  auditorNotes: string | null;
  auditorRecommendations: unknown; // JSON array stored in DB
}

export interface ResolvedEapSection extends EapBaseSection {
  /** true if the content came from an auditor edit rather than the LLM */
  isEdited: boolean;
}

/**
 * Resolves the final set of EAP sections to render/export.
 *
 * @param baseSections  - sections array from audits.eapJson (LLM output)
 * @param overrideRows  - rows from eap_sections table for this audit
 * @returns             - merged sections, with N/A sections excluded
 */
export function resolveEapSections(
  baseSections: EapBaseSection[],
  overrideRows: EapSectionOverride[]
): ResolvedEapSection[] {
  // Build lookup: sectionId → override row
  const overrideMap = new Map<string, EapSectionOverride>();
  for (const row of overrideRows) {
    overrideMap.set(row.sectionId, row);
  }

  const resolved: ResolvedEapSection[] = [];

  for (const sec of baseSections) {
    const override = overrideMap.get(sec.id);

    // Rule 1: Exclude sections marked not applicable
    if (override && override.applicable === false) {
      continue;
    }

    const merged: ResolvedEapSection = { ...sec, isEdited: false };

    if (override) {
      // Rule 2 / 3: Content override
      if (override.contentOverride != null && override.contentOverride.trim() !== "") {
        merged.content = override.contentOverride;
        merged.isEdited = true;
      }

      // Rule 4: Merge auditor recommendations (append, not replace)
      const auditorRecs = Array.isArray(override.auditorRecommendations)
        ? (override.auditorRecommendations as Array<{ action: string; priority: string; basis: string }>)
        : [];
      if (auditorRecs.length > 0) {
        merged.recommendations = [
          ...(merged.recommendations ?? []),
          ...auditorRecs,
        ];
      }

      // Rule 5: auditorNotes are INTERNAL ONLY — not included here
    }

    resolved.push(merged);
  }

  return resolved;
}
