import { useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ShieldAlert,
  Clock,
  MapPin,
  Building2,
  ChevronRight,
  History,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { saveScanSession, clearScanSession } from "@/lib/scanSession";
import { runAssessment } from "../../../shared/assessmentEngine";
import type { AnswerValue } from "../../../shared/assessmentEngine";
import { BRAND, HEADING_FONT } from "@/components/assessment/brandUtils";

// ─── Risk level → color mapping (matches HeroScoreCard) ──────────────────────
const RISK_STYLE: Record<string, { border: string; badge: string; text: string }> = {
  "Critical Risk": {
    border: "border-red-600",
    badge: "bg-red-700 text-white",
    text: "text-red-700",
  },
  "High Risk": {
    border: "border-orange-500",
    badge: "bg-orange-500 text-white",
    text: "text-orange-600",
  },
  "Moderate Risk": {
    border: "border-yellow-400",
    badge: "bg-yellow-400 text-gray-900",
    text: "text-yellow-600",
  },
  "Low Risk": {
    border: "border-green-500",
    badge: "bg-green-600 text-white",
    text: "text-green-600",
  },
};

function riskStyle(status: string | null | undefined) {
  return RISK_STYLE[status ?? ""] ?? RISK_STYLE["Moderate Risk"];
}

// ─── ScanHistory Page ─────────────────────────────────────────────────────────
export default function ScanHistory() {
  const [, navigate] = useLocation();
  const { data: scans, isLoading, error } = trpc.liabilityScan.list.useQuery(undefined, {
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Sort newest first (already ordered by server, but ensure it)
  const sorted = useMemo(
    () => (scans ? [...scans].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : []),
    [scans]
  );

  function handleOpen(scan: (typeof sorted)[number]) {
    // Re-run the engine from stored answers so LiabilityScan.tsx gets a live result
    const rawAnswers = scan.answers as Record<string, AnswerValue> | null;
    if (!rawAnswers || Object.keys(rawAnswers).length === 0) {
      // No answers stored — navigate anyway, LiabilityScan will show empty state
      clearScanSession();
      navigate("/liability-scan");
      return;
    }
    try {
      const result = runAssessment(rawAnswers, scan.jurisdiction, scan.industry);
      saveScanSession({
        result,
        answers: rawAnswers,
        jurisdiction: scan.jurisdiction,
        industry: scan.industry,
        scanId: scan.id,
      });
    } catch {
      // If engine fails, still navigate — LiabilityScan will handle gracefully
      clearScanSession();
    }
    navigate("/liability-scan");
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-56 mb-6" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle size={18} />
          <p className="text-sm">Failed to load scan history. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!sorted.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <History size={28} className="text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground" style={HEADING_FONT}>
          No Scans Yet
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          You haven't run a Workplace Violence Readiness Scan yet. Run your first scan to see your results here.
        </p>
        <Button
          onClick={() => navigate("/liability-scan")}
          style={{ backgroundColor: BRAND.navy, color: "#fff" }}
          className="mt-2"
        >
          <ShieldAlert size={16} className="mr-2" />
          Run Readiness Scan
        </Button>
      </div>
    );
  }

  // ── Scan list ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: BRAND.navy }}
        >
          <History size={18} className="text-white" />
        </div>
        <div>
          <h1
            className="text-xl font-bold text-foreground leading-tight"
            style={HEADING_FONT}
          >
            Your Scan History
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live view of your scans — only scans tied to your account are shown.
          </p>
        </div>
        <div className="ml-auto">
          <Button
            size="sm"
            onClick={() => navigate("/liability-scan")}
            style={{ backgroundColor: BRAND.navy, color: "#fff" }}
          >
            <ShieldAlert size={14} className="mr-1.5" />
            New Scan
          </Button>
        </div>
      </div>

      {/* Scan cards */}
      <div className="space-y-3">
        {sorted.map((scan) => {
          const style = riskStyle(scan.defensibilityStatus);
          const date = new Date(scan.createdAt);
          const dateStr = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const timeStr = date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });

          return (
            <Card
              key={scan.id}
              className={`border-l-4 ${style.border} hover:shadow-md transition-shadow cursor-pointer`}
              onClick={() => handleOpen(scan)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  {/* Left: metadata */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Risk badge + score */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs font-semibold px-2 py-0.5 ${style.badge}`}>
                        {scan.defensibilityStatus ?? scan.classification ?? "Assessed"}
                      </Badge>
                      {scan.scorePercent != null && (
                        <span className={`text-xs font-medium ${style.text}`}>
                          {scan.scorePercent}% Structural Score
                        </span>
                      )}
                    </div>

                    {/* Jurisdiction + Industry */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {scan.jurisdiction && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin size={11} className="flex-shrink-0" />
                          {scan.jurisdiction}
                        </span>
                      )}
                      {scan.industry && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 size={11} className="flex-shrink-0" />
                          {scan.industry}
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock size={11} className="flex-shrink-0" />
                      {dateStr} at {timeStr}
                    </div>
                  </div>

                  {/* Right: action */}
                  <div className="flex items-center gap-1 text-xs font-medium text-primary flex-shrink-0 mt-1">
                    View Results
                    <ChevronRight size={14} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
