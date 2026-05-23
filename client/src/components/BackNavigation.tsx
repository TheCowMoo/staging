/**
 * BackNavigation.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared back-navigation button used across the Liability Scan workflow pages.
 *
 * Usage:
 *   <BackNavigation to="/dashboard" label="Back to Dashboard" />
 *   <BackNavigation to="/liability-scan" label="Back to Scan Results" />
 *
 * Behaviour:
 *   - Always navigates to the explicit `to` route — never relies on browser
 *     history alone, so direct-link entry never causes a 404.
 *   - Matches the ghost-button style established on the DefensibilityPlan page.
 */
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

interface BackNavigationProps {
  /** The route to navigate to on click (e.g. "/dashboard", "/liability-scan") */
  to: string;
  /** Button label text (default: "Back") */
  label?: string;
  /** Extra Tailwind classes for the button wrapper */
  className?: string;
}

export function BackNavigation({ to, label = "Back", className = "" }: BackNavigationProps) {
  const [, navigate] = useLocation();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate(to)}
      className={`text-muted-foreground hover:text-foreground -ml-1 ${className}`}
    >
      <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
      {label}
    </Button>
  );
}
