/**
 * 5 Stones Technology — shared brand & semantic color utilities
 * Used by all assessment components for consistent color logic.
 */

export const BRAND = {
  navy: "#0B1F33",
  steel: "#3A5F7D",
  gold: "#C9A86A",
  risk: {
    red: "#E5484D",
    orange: "#F59E0B",
    yellow: "#FACC15",
    green: "#22C55E",
  },
} as const;

export type RiskColor = "red" | "orange" | "yellow" | "green";

export function riskHex(color: RiskColor | string): string {
  if (color === "red") return BRAND.risk.red;
  if (color === "orange") return BRAND.risk.orange;
  if (color === "yellow") return BRAND.risk.yellow;
  return BRAND.risk.green;
}

export function riskTextClass(color: RiskColor | string): string {
  if (color === "red") return "text-[#E5484D]";
  if (color === "orange") return "text-[#F59E0B]";
  if (color === "yellow") return "text-[#ca8a04]";
  return "text-[#22C55E]";
}

export function riskBarColor(color: RiskColor | string): string {
  if (color === "red") return "bg-[#E5484D]";
  if (color === "orange") return "bg-[#F59E0B]";
  if (color === "yellow") return "bg-[#FACC15]";
  return "bg-[#22C55E]";
}

export function riskBadgeStyle(color: RiskColor | string): React.CSSProperties {
  const bg = riskHex(color);
  const isLight = color === "yellow";
  return { backgroundColor: bg, color: isLight ? BRAND.navy : "#fff" };
}

export function scoreToColor(score: number): RiskColor {
  if (score >= 80) return "green";
  if (score >= 55) return "yellow";
  if (score >= 30) return "orange";
  return "red";
}

/** Canonical severity badge styles — single source of truth for all Top Liability Gap badges */
export const SEVERITY_BADGE: Record<"CRITICAL" | "HIGH" | "MODERATE" | "LOW", { label: string; cls: string }> = {
  CRITICAL: { label: "CRITICAL", cls: "bg-red-700 text-white border border-red-800 font-bold uppercase tracking-wide" },
  HIGH:     { label: "HIGH",     cls: "bg-orange-500 text-white border border-orange-600 font-bold uppercase tracking-wide" },
  MODERATE: { label: "MODERATE", cls: "bg-yellow-400 text-yellow-900 border border-yellow-500 font-semibold uppercase tracking-wide" },
  LOW:      { label: "LOW",      cls: "bg-green-100 text-green-700 border border-green-200 font-semibold uppercase tracking-wide" },
};

/** Derive severity tier from a numeric weight (used when gap.severity is not explicitly set) */
export function impactLevel(weight: number): { label: string; cls: string } {
  if (weight >= 15) return SEVERITY_BADGE.CRITICAL;
  if (weight >= 10) return SEVERITY_BADGE.HIGH;
  return SEVERITY_BADGE.MODERATE;
}

export const HEADING_FONT: React.CSSProperties = {
  fontFamily: "Poppins, Inter, sans-serif",
};
