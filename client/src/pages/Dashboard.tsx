import AppLayout from "@/components/AppLayout";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Building2, ClipboardList, CheckCircle2, Clock,
  Plus, ArrowRight, Shield, AlertTriangle, History, ShieldAlert
} from "lucide-react";
import { getRiskBadgeClass, getRiskColor } from "@/lib/riskUtils";

// ─── Risk level → color mapping for scans ──────────────────────
const SCAN_RISK_STYLE: Record<string, { badge: string; text: string }> = {
  "Critical Risk": {
    badge: "bg-red-700 text-white",
    text: "text-red-700",
  },
  "High Risk": {
    badge: "bg-orange-500 text-white",
    text: "text-orange-600",
  },
  "Moderate Risk": {
    badge: "bg-yellow-400 text-gray-900",
    text: "text-yellow-600",
  },
  "Low Risk": {
    badge: "bg-green-600 text-white",
    text: "text-green-600",
  },
};

function getScanRiskStyle(status: string | null | undefined) {
  return SCAN_RISK_STYLE[status ?? ""] ?? SCAN_RISK_STYLE["Moderate Risk"];
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = trpc.dashboard.summary.useQuery();
  const { data: recentScans, isLoading: scansLoading } = trpc.liabilityScan.list.useQuery(undefined, {
    select: (scans) => scans?.slice(0, 5) || [], // Get only the 5 most recent scans
  });
  const { data: allScans } = trpc.liabilityScan.list.useQuery(undefined, {
    select: (scans) => scans?.length || 0,
  });

  const riskOrder = ["Critical", "High", "Elevated", "Moderate", "Low"];

  return (
    <ProtectedLayout>
      <AppLayout>
        <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Overview of your facility safety assessments</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/liability-scan" className="flex items-center gap-2"><ShieldAlert size={16} /> Run Scan</Link>
            </Button>
            <Button asChild>
              <Link href="/facilities/new" className="flex items-center gap-2"><Plus size={16} /> New Facility</Link>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 h-28 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <StatCard icon={<Building2 size={18} />} label="Total Facilities" value={data?.totalFacilities ?? 0} />
              <StatCard icon={<ClipboardList size={18} />} label="Total Audits" value={data?.totalAudits ?? 0} />
              <StatCard icon={<CheckCircle2 size={18} />} label="Completed" value={data?.completedAudits ?? 0} />
              <StatCard icon={<Clock size={18} />} label="In Progress" value={data?.inProgressAudits ?? 0} />
              <StatCard icon={<ShieldAlert size={18} />} label="Liability Scans" value={allScans ?? 0} />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Risk Distribution */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="font-semibold text-foreground mb-4">Risk Distribution</h2>
                {data?.completedAudits === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No completed audits yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {riskOrder.map((level) => {
                      const count = data?.riskDistribution?.[level] ?? 0;
                      const total = data?.completedAudits ?? 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={level}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-foreground">{level}</span>
                            <span className="text-muted-foreground">{count} audit{count !== 1 ? "s" : ""}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: getRiskColor(level) }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Audits */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-foreground">Recent Audits</h2>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/audits" className="flex items-center gap-1 text-xs">View All <ArrowRight size={12} /></Link>
                  </Button>
                </div>
                {!data?.recentAudits?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm mb-3">No audits yet</p>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/facilities">Start from a Facility</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.recentAudits.map((audit) => {
                      const facility = data.facilities?.find((f) => f.id === audit.facilityId);
                      return (
                        <Link
                          key={audit.id}
                          href={audit.status === "completed" ? `/audit/${audit.id}/report` : `/audit/${audit.id}`}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                        >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${audit.status === "completed" ? "bg-green-500" : "bg-amber-400"}`} />
                              <div>
                                <p className="text-sm font-medium text-foreground">{facility?.name ?? `Facility #${audit.facilityId}`}</p>
                                <p className="text-xs text-muted-foreground">{new Date(audit.auditDate).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {audit.overallRiskLevel && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRiskBadgeClass(audit.overallRiskLevel)}`}>
                                  {audit.overallRiskLevel}
                                </span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-full ${audit.status === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                {audit.status === "completed" ? "Complete" : "In Progress"}
                              </span>
                            </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Scans */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-foreground">Recent Scans</h2>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/scan-history" className="flex items-center gap-1 text-xs">View All <ArrowRight size={12} /></Link>
                  </Button>
                </div>
                {scansLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border animate-pulse">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                          <div>
                            <div className="h-4 w-32 bg-gray-300 rounded mb-1" />
                            <div className="h-3 w-24 bg-gray-300 rounded" />
                          </div>
                        </div>
                        <div className="h-5 w-16 bg-gray-300 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : !recentScans?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm mb-3">No scans yet</p>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/liability-scan">Run Your First Scan</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentScans.map((scan) => {
                      const style = getScanRiskStyle(scan.defensibilityStatus);
                      const date = new Date(scan.createdAt);
                      const dateStr = date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                      return (
                        <Link
                          key={scan.id}
                          href="/scan-history"
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                        >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${style.text.includes('red') ? 'bg-red-500' : style.text.includes('orange') ? 'bg-orange-500' : style.text.includes('yellow') ? 'bg-yellow-500' : 'bg-green-500'}`} />
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {scan.jurisdiction && scan.industry ? `${scan.jurisdiction} - ${scan.industry}` : 'Liability Scan'}
                                </p>
                                <p className="text-xs text-muted-foreground">{dateStr}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {scan.defensibilityStatus && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                                  {scan.defensibilityStatus}
                                </span>
                              )}
                              {scan.scorePercent != null && (
                                <span className={`text-xs font-medium ${style.text}`}>
                                  {scan.scorePercent}%
                                </span>
                              )}
                            </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Facilities quick access */}
            {data?.facilities && data.facilities.length > 0 && (
              <div className="mt-6 bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-foreground">Your Facilities</h2>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/facilities" className="flex items-center gap-1 text-xs">Manage <ArrowRight size={12} /></Link>
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.facilities.slice(0, 6).map((facility) => (
                    <Link
                      key={facility.id}
                      href={`/facilities/${facility.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 size={16} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{facility.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{facility.facilityType.replace("_", " ")}</p>
                        </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </AppLayout>
    </ProtectedLayout>
  );
}
