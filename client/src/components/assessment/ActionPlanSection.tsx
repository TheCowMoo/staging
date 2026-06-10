/**
 * ActionPlanSection
 * Priority Risk Reduction Plan with three phases, progress counter, and checkbox state.
 * Reusable across Results Page, Dashboard, and Report views.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Zap } from "lucide-react";

// ─── Phase definitions ────────────────────────────────────────────────────────
const PHASES: { label: string; description: string; indices: number[] }[] = [
  {
    label: "Phase 1: Establish Readiness",
    description: "Foundation controls that build measurable workplace violence readiness.",
    indices: [0, 1],
  },
  {
    label: "Phase 2: Enable Response",
    description: "Operational controls that enable effective incident response.",
    indices: [2, 3],
  },
  {
    label: "Phase 3: Sustain & Validate",
    description: "Ongoing controls that validate and sustain your safety posture.",
    indices: [4, 5],
  },
];

// ─── Single action card ───────────────────────────────────────────────────────
interface ActionCardProps {
  action: string;
  index: number;
  checked: boolean;
  onToggle: () => void;
}

/** Safely convert an action item to a string, handling legacy {priority, action} objects stored in DB */
function normalizeAction(item: unknown): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    if (typeof obj.action === "string") {
      return obj.priority ? `${obj.priority}: ${obj.action}` : obj.action;
    }
    const vals = Object.values(obj).filter((v) => typeof v === "string");
    if (vals.length > 0) return vals.join(" — ");
  }
  return String(item ?? "");
}

function ActionCard({ action, index, checked, onToggle }: ActionCardProps) {
<<<<<<< HEAD
  const actionStr = normalizeAction(action);
=======
  const actionStr = typeof action === "string" ? action : (action && typeof action === "object" && "action" in action ? String((action as any).action) : String(action ?? ""));
>>>>>>> 18d2514 (Updated project)
  const dashIdx = actionStr.indexOf(" — ");
  const title = dashIdx > -1 ? actionStr.slice(0, dashIdx) : actionStr;
  const body = dashIdx > -1 ? actionStr.slice(dashIdx + 3) : "";
  const impactLabel = index < 2 ? "Impact: High" : "Impact: Medium";
  const impactCls = index < 2
    ? "bg-red-100 text-red-700 border border-red-200"
    : "bg-yellow-100 text-yellow-700 border border-yellow-200";

  return (
    <div className={`border rounded-xl p-4 shadow-sm transition-all ${checked ? "opacity-60 bg-muted/30" : "bg-card"}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
            checked ? "bg-[#22C55E] border-[#22C55E]" : "border-border hover:border-primary"
          }`}
          aria-label={checked ? "Mark incomplete" : "Mark complete"}
        >
          {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${impactCls}`}>{impactLabel}</span>
          </div>
          {dashIdx > -1 && (
            <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Progress counter ─────────────────────────────────────────────────────────
interface ActionProgressProps {
  total: number;
  completed: number;
}

export function ActionProgress({ total, completed }: ActionProgressProps) {
  return (
    <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full whitespace-nowrap">
      {completed} of {total} critical actions completed
    </span>
  );
}

// ─── Phased action plan ───────────────────────────────────────────────────────
interface PhasedActionPlanProps {
  actions: string[];
}

export function PhasedActionPlan({ actions }: PhasedActionPlanProps) {
  const [checked, setChecked] = useState<boolean[]>(() => actions.map(() => false));

  function toggle(i: number) {
    setChecked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {PHASES.map((phase) => {
        const phaseActions = phase.indices
          .filter((i) => i < actions.length)
          .map((i) => ({ action: actions[i], index: i }));
        if (phaseActions.length === 0) return null;
        return (
          <div key={phase.label} className="space-y-3">
            <div>
              <p className="text-sm font-bold text-foreground" style={{ fontFamily: "Poppins, Inter, sans-serif" }}>
                {phase.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{phase.description}</p>
            </div>
            {phaseActions.map(({ action, index }) => (
              <ActionCard
                key={index}
                action={action}
                index={index}
                checked={checked[index] ?? false}
                onToggle={() => toggle(index)}
              />
            ))}
          </div>
        );
      })}
      {/* Overflow actions beyond phase definitions */}
      {actions.length > 6 && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-foreground" style={{ fontFamily: "Poppins, Inter, sans-serif" }}>
            Additional Actions
          </p>
          {actions.slice(6).map((action, i) => (
            <ActionCard
              key={6 + i}
              action={action}
              index={6 + i}
              checked={checked[6 + i] ?? false}
              onToggle={() => toggle(6 + i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Full section with Card wrapper ──────────────────────────────────────────
interface ActionPlanSectionProps {
  actions: string[];
  withCard?: boolean;
  sectionId?: string;
}

export function ActionPlanSection({ actions, withCard = true, sectionId = "priority-actions" }: ActionPlanSectionProps) {
  const [checked, setChecked] = useState<boolean[]>(() => actions.map(() => false));
  const completedCount = checked.filter(Boolean).length;

  function toggle(i: number) {
    setChecked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

  const content = (
    <div className="space-y-6">
      {PHASES.map((phase) => {
        const phaseActions = phase.indices
          .filter((i) => i < actions.length)
          .map((i) => ({ action: actions[i], index: i }));
        if (phaseActions.length === 0) return null;
        return (
          <div key={phase.label} className="space-y-3">
            <div>
              <p className="text-sm font-bold text-foreground" style={{ fontFamily: "Poppins, Inter, sans-serif" }}>
                {phase.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{phase.description}</p>
            </div>
            {phaseActions.map(({ action, index }) => (
              <ActionCard
                key={index}
                action={action}
                index={index}
                checked={checked[index] ?? false}
                onToggle={() => toggle(index)}
              />
            ))}
          </div>
        );
      })}
      {actions.length > 6 && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-foreground" style={{ fontFamily: "Poppins, Inter, sans-serif" }}>
            Additional Actions
          </p>
          {actions.slice(6).map((action, i) => (
            <ActionCard
              key={6 + i}
              action={action}
              index={6 + i}
              checked={checked[6 + i] ?? false}
              onToggle={() => toggle(6 + i)}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (!withCard) return <div id={sectionId}>{content}</div>;

  return (
    <div id={sectionId}>
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#F59E0B]" />
              Action Roadmap
            </CardTitle>
            <ActionProgress total={actions.length} completed={completedCount} />
          </div>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    </div>
  );
}
