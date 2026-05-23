/**
 * AssessmentCTAButton
 * Shared CTA button primitive for the assessment system.
 * One change here updates every CTA across:
 *  - HeroScoreCard
 *  - ServiceCardsSection ("Learn More" buttons)
 *  - FinalCTABanner (primary + secondary)
 *  - AuditReport hero
 *  - any future assessment/result CTA buttons
 *
 * Variant hierarchy (simplified):
 *  - "primary"   → Highest emphasis. Gold fill (#C9A86A), navy text.
 *                  Used for: "Generate Your Defensibility Plan"
 *  - "secondary" → Supporting action. Navy outline, navy text (light bg) / white outline, white text (dark bg).
 *                  Used for: "Export Report"
 *  - "tertiary"  → Lowest emphasis. Muted steel-blue outline, lightweight.
 *                  Used for: "Start Reducing Exposure", "Learn More" in service cards.
 *
 * The old gold/ghost/service variants are retired and internally mapped:
 *   gold    → primary
 *   ghost   → secondary (dark-bg context handled via `darkBg` prop)
 *   service → tertiary
 *
 * Context prop:
 *  - `darkBg?: boolean` — when true, secondary uses white outline/text (for use inside dark banners)
 */
import { Loader2 } from "lucide-react";
import type { ReactNode, ButtonHTMLAttributes } from "react";

export type CTAVariant = "primary" | "secondary" | "tertiary";
export type CTASize = "sm" | "md" | "lg";

interface AssessmentCTAButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CTAVariant;
  size?: CTASize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  /** Set to true when the button sits on a dark/navy background */
  darkBg?: boolean;
  children: ReactNode;
}

const BASE =
  "inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

const SIZE_STYLES: Record<CTASize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-6 text-sm",
};

function variantClass(variant: CTAVariant, darkBg: boolean): string {
  switch (variant) {
    case "primary":
      // Gold fill — stands out on both light and dark backgrounds
      return "bg-[#C9A86A] text-[#0B1F33] hover:bg-[#b8954f] focus-visible:ring-[#C9A86A] shadow-sm";
    case "secondary":
      // On dark bg: white outline + white text; on light bg: navy outline + navy text
      return darkBg
        ? "border border-white/60 text-white hover:bg-white/10 focus-visible:ring-white"
        : "border border-[#0B1F33] text-[#0B1F33] hover:bg-[#0B1F33]/8 focus-visible:ring-[#0B1F33]";
    case "tertiary":
      // Lightweight steel-blue outline — never competes with primary/secondary
      return "border border-[#3A5F7D]/50 text-[#3A5F7D] hover:bg-[#3A5F7D]/8 focus-visible:ring-[#3A5F7D]";
  }
}

export function AssessmentCTAButton({
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  loading = false,
  fullWidth = false,
  darkBg = false,
  children,
  className = "",
  disabled,
  ...props
}: AssessmentCTAButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        BASE,
        variantClass(variant, darkBg),
        SIZE_STYLES[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        iconLeft && <span className="flex-shrink-0">{iconLeft}</span>
      )}
      {children}
      {!loading && iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  );
}
