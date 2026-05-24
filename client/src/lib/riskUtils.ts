export function getRiskColor(level: string): string {
  const colors: Record<string, string> = {
    Low: "#22c55e",
    Moderate: "#D97706",
    Elevated: "#FF8C00",
    High: "#FF6F00",
    Critical: "#8B0000",
  };
  return colors[level] ?? "#94a3b8";
}

export function getRiskBadgeClass(level: string): string {
  const classes: Record<string, string> = {
    Low: "bg-emerald-500 text-white",
    Moderate: "bg-amber-600 text-white",
    Elevated: "bg-orange-600 text-white",
    High: "bg-orange-500 text-white",
    Critical: "bg-[#8B0000] text-white",
  };
  return classes[level] ?? "bg-slate-700 text-white";
}

export function getPriorityBadgeClass(priority: string): string {
  const classes: Record<string, string> = {
    Immediate: "bg-red-100 text-red-800",
    "30 Day": "bg-orange-100 text-orange-800",
    "90 Day": "bg-amber-100 text-amber-800",
    "Long-Term": "bg-blue-100 text-blue-800",
  };
  return classes[priority] ?? "bg-slate-100 text-slate-700";
}

export function getScoreLabel(score: number): string {
  if (score === 0) return "Secure / Yes";
  if (score === 1) return "Minor Concern";
  if (score === 2) return "Moderate Concern";
  if (score === 3) return "Serious Vulnerability";
  return "Unknown";
}

/**
 * Returns the numeric risk score for a response string.
 * Polarity determines which scoring table is used:
 *   "positive" (default): "Secure / Yes" = 0, "Serious Vulnerability" = 3
 *   "negative": "No — Not Present" = 0, "Yes — Present" = 3
 */
export function getResponseScore(response: string, polarity: "positive" | "negative" = "positive"): number | null {
  if (polarity === "negative") {
    const negativeScores: Record<string, number | null> = {
      "No — Not Present": 0,
      "Unlikely / Minimal": 1,
      "Partially Present": 2,
      "Yes — Present": 3,
      "Unknown": 1,
      "Not Applicable": null,
    };
    return negativeScores[response] ?? null;
  }
  const positiveScores: Record<string, number | null> = {
    "Secure / Yes": 0,
    "Minor Concern": 1,
    "Moderate Concern": 2,
    "Serious Vulnerability": 3,
    "Unknown": 1,
    "Not Applicable": null,
  };
  return positiveScores[response] ?? null;
}
