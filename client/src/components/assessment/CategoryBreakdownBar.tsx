/**
 * CategoryBreakdownBar
 * Progress bar with score-aware 1-line insight below.
 * Reusable across Results Page, Dashboard, and Report views.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown } from "lucide-react";
import type { CategoryKey } from "../../../../shared/assessmentEngine";
import { riskTextClass, riskBarColor } from "./brandUtils";

// ─── Score-aware insight lines per category ───────────────────────────────────
export function categoryInsight(key: CategoryKey, score: number): string {
  if (key === "planning_documentation") {
    if (score === 0) return "No foundational documentation in place — highest readiness gap category.";
    if (score < 50) return "Critical documentation gaps — limited ability to support consistent action and learning.";
    if (score < 75) return "Partial documentation in place — gaps create vulnerabilities in post-incident review and operational learning.";
    return "Strong documentation foundation — maintain and audit annually.";
  }
  if (key === "training_awareness") {
    if (score === 0) return "No training program in place — employees are unprepared to respond under stress.";
    if (score < 50) return "Limited training coverage — employees unlikely to respond effectively under stress.";
    if (score < 75) return "Moderate training coverage — refresh cycles and documentation need strengthening.";
    return "Robust training program — continue annual refreshes and document completion records.";
  }
  if (key === "reporting_communication") {
    if (score === 0) return "No reporting or communication system — incidents go undocumented and unaddressed.";
    if (score < 50) return "Weak reporting infrastructure — near-miss data is not captured, limiting risk visibility.";
    if (score < 75) return "Moderate capability, but gaps may delay response during critical incidents.";
    return "Solid reporting system — ensure escalation paths are tested and documented.";
  }
  if (key === "response_readiness") {
    if (score === 0) return "No validated response capability — organization is not operationally prepared.";
    if (score < 50) return "Minimal response readiness — drills and role assignments are absent or untested.";
    if (score < 75) return "Partial readiness — response roles and drill frequency need formalization.";
    return "Strong response readiness — document drill outcomes and review after each exercise.";
  }
  return "";
}

function insightTextClass(color: string): string {
  if (color === "red") return "text-[#E5484D]";
  if (color === "orange") return "text-[#b45309]";
  if (color === "yellow") return "text-[#ca8a04]";
  return "text-[#16a34a]";
}

export interface CategoryBarItem {
  catKey: CategoryKey;
  label: string;
  score: number;
}

function scoreColor(score: number): string {
  if (score >= 75) return "green";
  if (score >= 50) return "yellow";
  if (score >= 30) return "orange";
  return "red";
}

interface SingleBarProps {
  catKey: CategoryKey;
  label: string;
  score: number;
}

export function CategoryBreakdownBar({ catKey, label, score }: SingleBarProps) {
  const color = scoreColor(score);
  const insight = categoryInsight(catKey, score);
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className={`text-sm font-bold ${riskTextClass(color)}`}>{score}%</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${riskBarColor(color)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {insight && (
        <p className={`text-xs leading-relaxed ${insightTextClass(color)}`}>{insight}</p>
      )}
    </div>
  );
}

interface CategoryBreakdownSectionProps {
  categories: CategoryBarItem[];
  /** If true, wraps in a Card. Default: true */
  withCard?: boolean;
}

export function CategoryBreakdownSection({ categories, withCard = true }: CategoryBreakdownSectionProps) {
  const content = (
    <div className="space-y-5">
      {categories.map(({ catKey, label, score }) => (
        <CategoryBreakdownBar key={catKey} catKey={catKey} label={label} score={score} />
      ))}
    </div>
  );

  if (!withCard) return content;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-primary" />
          Category Breakdown
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">Your readiness across key control areas</p>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
