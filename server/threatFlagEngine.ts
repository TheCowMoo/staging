/**
 * Threat Flag Engine
 *
 * Scans free-text (incident descriptions, BTAM intake notes, etc.) against the
 * comprehensive keyword dictionary and returns structured threat flags.
 */

import {
  THREAT_KEYWORD_ENTRIES,
  SEVERITY_RANK,
  type ThreatSeverity,
  type WavrKey,
} from "../shared/threatKeywords";

export interface ThreatFlag {
  id: string;
  wavrKey: WavrKey;
  warningSign: number;
  severity: ThreatSeverity;
  label: string;
  matchedPhrases: string[];
}

export interface ScanResult {
  flags: ThreatFlag[];
  /** Highest severity found across all flags */
  maxSeverity: ThreatSeverity | null;
  /** True if any critical or high flag was found */
  requiresEscalation: boolean;
  /** WAVR-21 keys that were triggered */
  triggeredWavrKeys: WavrKey[];
  /** Warning sign numbers that were triggered */
  triggeredWarningSigns: number[];
}

/**
 * Scan one or more text strings for threat keywords.
 * Multiple text fields (description, notes, etc.) can be passed and will be
 * concatenated before scanning.
 */
export function scanText(...texts: (string | null | undefined)[]): ScanResult {
  const combined = texts
    .filter((t): t is string => typeof t === "string" && t.length > 0)
    .join(" ")
    .toLowerCase();

  if (!combined.trim()) {
    return {
      flags: [],
      maxSeverity: null,
      requiresEscalation: false,
      triggeredWavrKeys: [],
      triggeredWarningSigns: [],
    };
  }

  const flagMap = new Map<string, ThreatFlag>();

  for (const entry of THREAT_KEYWORD_ENTRIES) {
    const matched: string[] = [];
    for (const phrase of entry.phrases) {
      if (combined.includes(phrase.toLowerCase())) {
        matched.push(phrase);
      }
    }
    if (matched.length > 0) {
      const existing = flagMap.get(entry.id);
      if (existing) {
        // Merge matched phrases (dedup)
        existing.matchedPhrases = Array.from(
          new Set([...existing.matchedPhrases, ...matched])
        );
      } else {
        flagMap.set(entry.id, {
          id: entry.id,
          wavrKey: entry.wavrKey,
          warningSign: entry.warningSign,
          severity: entry.severity,
          label: entry.label,
          matchedPhrases: matched,
        });
      }
    }
  }

  const flags = Array.from(flagMap.values()).sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
  );

  const maxSeverity: ThreatSeverity | null =
    flags.length > 0 ? flags[0].severity : null;

  const requiresEscalation =
    maxSeverity === "critical" || maxSeverity === "high";

  const triggeredWavrKeys = Array.from(
    new Set(flags.map((f) => f.wavrKey))
  );

  const triggeredWarningSigns = Array.from(
    new Set(flags.map((f) => f.warningSign))
  ).sort((a, b) => a - b);

  return {
    flags,
    maxSeverity,
    requiresEscalation,
    triggeredWavrKeys,
    triggeredWarningSigns,
  };
}
