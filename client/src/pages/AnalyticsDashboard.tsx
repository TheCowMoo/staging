import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, AreaChart, Area
} from "recharts";
import {
  Users, Building2, ClipboardList, ShieldAlert, AlertTriangle,
  CheckCircle2, XCircle, Clock, Flag, MessageSquare, Download,
  BarChart3, Target, ArrowUpRight, ArrowDownRight, Zap, Activity
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function avg(arr: (number | null | undefined)[]): number {
  const valid = arr.filter((v): v is number => v != null);
  if (!valid.length) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <div
          key={s}
          className={`h-3 w-3 rounded-sm ${s <= Math.round(value) ? "bg-amber-400" : "bg-muted"}`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{value.toFixed(1)}</span>
    </div>
  );
}

function StatCard({ icon, label, value, sub, trend, trendUp }: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="metal-card p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground mb-2">{label}</p>
          <p className="metric-number text-2xl sm:text-3xl">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trendUp ? "text-green-600" : "text-red-500"}`}>
              {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-[#0B1F33]/5 flex items-center justify-center text-[#0B1F33] shadow-inner shadow-black/5 shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Tab Config ───────────────────────────────────────────────────────────────
type TabId = "overview" | "audits" | "feedback" | "incidents" | "users" | "drills" | "scans";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Platform Overview", icon: Activity },
  { id: "audits", label: "Audit Analytics", icon: ClipboardList },
  { id: "feedback", label: "Feedback & Flags", icon: MessageSquare },
  { id: "incidents", label: "Incident Reports", icon: AlertTriangle },
  { id: "users", label: "User Analytics", icon: Users },
  { id: "drills", label: "Drills & Training", icon: Target },
  { id: "scans", label: "Liability Scans", icon: ShieldAlert },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const isSandbox = user?.role === "sandbox";
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | "all">("all");

  // ── Data Queries ──────────────────────────────────────────────────────────
  const { data: allFeedback = [], isLoading: fbLoading } = trpc.feedback.listAll.useQuery();
  const { data: allFlags = [] } = trpc.feedback.getAllFlags.useQuery();
  const { data: allUsers = [] } = trpc.adminUser.listAll.useQuery(undefined, { enabled: (activeTab === "users" || activeTab === "overview") && !isSandbox });
  const { data: allOrgs = [] } = trpc.org.listAll.useQuery(undefined, { enabled: activeTab === "overview" && !isSandbox });
  const { data: allIncidents = [] } = trpc.incident.list.useQuery({}, { enabled: activeTab === "incidents" || activeTab === "overview" });
  const { data: allScans = [] } = trpc.liabilityScan.list.useQuery(undefined, { enabled: activeTab === "scans" || activeTab === "overview" });
  const { data: drillSessions = [] } = trpc.drill.listSessions.useQuery({}, { enabled: activeTab === "drills" || activeTab === "overview" });
  const { data: facilities = [] } = trpc.facility.list.useQuery();
  const { data: myMemberships = [] } = trpc.org.myMemberships.useQuery();

  // ── Facility filter helpers ──────────────────────────────────────────────
  const filteredIncidents = useMemo(() => {
    if (selectedFacilityId === "all") return allIncidents;
    const selectedFacility = facilities.find(f => f.id === selectedFacilityId);
    if (!selectedFacility) return allIncidents;
    return allIncidents.filter((inc: any) => inc.facilityName === selectedFacility.name);
  }, [allIncidents, selectedFacilityId, facilities]);

  const filteredDrills = useMemo(() => {
    if (selectedFacilityId === "all") return drillSessions;
    return drillSessions.filter((d: any) => d.facilityId === selectedFacilityId);
  }, [drillSessions, selectedFacilityId]);

  // ── Computed Metrics ──────────────────────────────────────────────────────
  const totalFeedback = allFeedback.length;

  const avgRatings = useMemo(() => ({
    overallReportQuality: avg(allFeedback.map((f: any) => f.overallReportQuality)),
    scoringAccuracy: avg(allFeedback.map((f: any) => f.scoringAccuracy)),
    correctiveActionRealism: avg(allFeedback.map((f: any) => f.correctiveActionRealism)),
    eapCompleteness: avg(allFeedback.map((f: any) => f.eapCompleteness)),
    questionRelevance: avg(allFeedback.map((f: any) => f.questionRelevance)),
  }), [allFeedback]);

  const avgCompletionTime = avg(allFeedback.map((f: any) => f.completionTimeMinutes));

  // ── Feedback Rating Chart ─────────────────────────────────────────────────
  const ratingChartData = [
    { name: "Report Quality", value: avgRatings.overallReportQuality },
    { name: "Scoring Accuracy", value: avgRatings.scoringAccuracy },
    { name: "CAP Realism", value: avgRatings.correctiveActionRealism },
    { name: "EAP Completeness", value: avgRatings.eapCompleteness },
    { name: "Question Relevance", value: avgRatings.questionRelevance },
  ];

  // ── Flag Analysis ─────────────────────────────────────────────────────────
  const flagCounts: Record<string, number> = {};
  allFlags.forEach((f: any) => {
    flagCounts[f.flagType] = (flagCounts[f.flagType] || 0) + 1;
  });

  const categoryCounts: Record<string, number> = {};
  allFlags.forEach((f: any) => {
    categoryCounts[f.categoryName] = (categoryCounts[f.categoryName] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // ── Incident Analysis (uses filteredIncidents) ──────────────────────────
  const incidentByType: Record<string, number> = {};
  const incidentBySeverity: Record<string, number> = {};
  const incidentByStatus: Record<string, number> = {};
  filteredIncidents.forEach((inc: any) => {
    incidentByType[inc.incidentType] = (incidentByType[inc.incidentType] || 0) + 1;
    incidentBySeverity[inc.severity] = (incidentBySeverity[inc.severity] || 0) + 1;
    incidentByStatus[inc.status] = (incidentByStatus[inc.status] || 0) + 1;
  });

  const incidentTypeChart = Object.entries(incidentByType).map(([name, value]) => ({
    name: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    value,
  }));

  const incidentSeverityChart = Object.entries(incidentBySeverity).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const SEVERITY_COLORS: Record<string, string> = {
    Low: "#22c55e",
    Moderate: "#eab308",
    High: "#FF8C00",
    Critical: "#8B0000",
  };

  // ── User Analysis ─────────────────────────────────────────────────────────
  const userByRole: Record<string, number> = {};
  allUsers.forEach((u: any) => {
    userByRole[u.role] = (userByRole[u.role] || 0) + 1;
  });
  const userRoleChart = Object.entries(userByRole).map(([name, value]) => ({
    name: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    value,
  }));

  // ── Scan Analysis ─────────────────────────────────────────────────────────
  const scanRiskDist: Record<string, number> = {};
  allScans.forEach((s: any) => {
    const level = s.defensibilityStatus ?? "Unknown";
    scanRiskDist[level] = (scanRiskDist[level] || 0) + 1;
  });
  const scanRiskChart = Object.entries(scanRiskDist).map(([name, value]) => ({
    name,
    value,
  }));

  // ── Drill Analysis ────────────────────────────────────────────────────────
  const completedDrills = drillSessions.filter((d: any) => d.status === "completed").length;
  const inProgressDrills = drillSessions.filter((d: any) => d.status === "in_progress").length;
  const scheduledDrills = drillSessions.filter((d: any) => d.status === "scheduled").length;

  // ── Monthly Trend (from feedback created dates) ───────────────────────────
  const monthlyActivity = useMemo(() => {
    const byMonth: Record<string, number> = {};
    allFeedback.forEach((fb: any) => {
      if (fb.createdAt) {
        const d = new Date(fb.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        byMonth[key] = (byMonth[key] || 0) + 1;
      }
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, count]) => {
        const [, m] = key.split("-");
        return { name: MONTHS[parseInt(m) - 1] || key, value: count };
      });
  }, [allFeedback]);

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportFeedbackCSV = () => {
    const headers = [
      "ID", "Audit ID", "Facility Type", "Completion Time (min)",
      "Report Quality", "Scoring Accuracy", "CAP Realism", "EAP Completeness", "Question Relevance",
      "Missing Questions", "Irrelevant Questions", "CAP Issues",
      "Scoring Disagreements", "EAP Feedback", "General Notes", "Date"
    ];
    const rows = allFeedback.map((f: any) => [
      f.id, f.auditId, f.facilityType ?? "", f.completionTimeMinutes ?? "",
      f.overallReportQuality ?? "", f.scoringAccuracy ?? "", f.correctiveActionRealism ?? "",
      f.eapCompleteness ?? "", f.questionRelevance ?? "",
      (f.missingQuestions ?? "").replace(/,/g, ";"),
      (f.irrelevantQuestions ?? "").replace(/,/g, ";"),
      (f.correctiveActionIssues ?? "").replace(/,/g, ";"),
      (f.scoringDisagreements ?? "").replace(/,/g, ";"),
      (f.eapFeedback ?? "").replace(/,/g, ";"),
      (f.generalNotes ?? "").replace(/,/g, ";"),
      new Date(f.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-feedback-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportIncidentsCSV = () => {
    const headers = ["ID", "Type", "Severity", "Status", "Facility", "Date", "Description"];
    const rows = allIncidents.map((inc: any) => [
      inc.id,
      inc.incidentType?.replace(/_/g, " "),
      inc.severity,
      inc.status,
      inc.facilityName ?? "",
      inc.createdAt ? new Date(inc.createdAt).toLocaleDateString() : "",
      (inc.description ?? "").replace(/,/g, ";").slice(0, 200),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-incidents-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (

      <div className="space-y-6 px-6">
        {/* Sandbox notice */}
        {isSandbox && (
          <div className="rounded-md border border-sky-300 bg-sky-50/70 px-4 py-3 text-sm text-sky-800">
            <p className="font-medium">Sandbox analytics — your organization's data</p>
            <p className="mt-1 text-sky-700/80">
              Platform-wide user and organization counts are hidden in the sandbox. You can still view
              feedback, incidents, scans, and drill analytics.
            </p>
          </div>
        )}
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Platform-wide analytics, trends, and performance metrics for administrators.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportFeedbackCSV} className="gap-2">
              <Download className="h-3.5 w-3.5" />
              Export Feedback
            </Button>
            <Button variant="outline" size="sm" onClick={exportIncidentsCSV} className="gap-2">
              <Download className="h-3.5 w-3.5" />
              Export Incidents
            </Button>
          </div>
        </div>

        {/* Top-Level KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard icon={<Building2 size={16} />} label="Organizations" value={allOrgs.length} />
          <StatCard icon={<Users size={16} />} label="Total Users" value={allUsers.length} />
          <StatCard icon={<ClipboardList size={16} />} label="Feedback Sessions" value={totalFeedback} />
          <StatCard icon={<AlertTriangle size={16} />} label="Incidents" value={allIncidents.length} />
          <StatCard icon={<ShieldAlert size={16} />} label="Liability Scans" value={allScans.length} />
          <StatCard icon={<Flag size={16} />} label="Question Flags" value={allFlags.length} />
        </div>

        {/* Facility Filter Selector */}
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-muted-foreground" />
          <Select
            value={selectedFacilityId === "all" ? "all" : String(selectedFacilityId)}
            onValueChange={(v) => setSelectedFacilityId(v === "all" ? "all" : parseInt(v))}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All facilities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Facilities</SelectItem>
              {facilities.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Monthly Activity Trend */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-primary" />
                  <CardTitle className="text-base">Platform Activity (12-Month Trend)</CardTitle>
                </div>
                <CardDescription>Feedback submissions per month across all organizations</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No activity data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={monthlyActivity} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3A5F7D" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3A5F7D" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="value" stroke="#3A5F7D" fill="url(#colorActivity)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Avg Ratings Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <StarDisplay value={avg(allFeedback.map((f: any) => f.overallReportQuality ?? 0))} />
                    Avg Ratings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(avgRatings).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <StarDisplay value={val} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Avg Completion Time */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock size={16} className="text-purple-600" />
                    Avg Completion Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <div className="text-4xl font-bold text-purple-600">
                      {avgCompletionTime ? `${Math.round(avgCompletionTime)}` : "—"}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">minutes</div>
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    Based on {totalFeedback} feedback sessions
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity Feed */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-primary" />
                  <CardTitle className="text-base">Recent Feedback Activity</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {allFeedback.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No feedback recorded yet.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {allFeedback.slice(0, 30).map((fb: any) => (
                      <div key={fb.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 text-sm">
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-amber-500" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-foreground">Feedback #{fb.id}</span>
                          <span className="text-muted-foreground">
                            {" "}— Audit #{fb.auditId}
                            {fb.facilityType ? ` (${fb.facilityType.replace(/_/g, " ")})` : ""}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* AUDITS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "audits" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rating Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Average Ratings by Dimension</CardTitle>
                <CardDescription>1–5 scale across all feedback submissions</CardDescription>
              </CardHeader>
              <CardContent>
                {totalFeedback === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No feedback submitted yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={ratingChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 5]} tickCount={6} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => v.toFixed(1)} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {ratingChartData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={entry.value >= 4 ? "#22c55e" : entry.value >= 3 ? "#f59e0b" : "#ef4444"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Completion Time Distribution */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Completion Time Distribution</CardTitle>
                <CardDescription>How long audits take to complete</CardDescription>
              </CardHeader>
              <CardContent>
                {totalFeedback === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: "Under 30 min", range: [0, 30], color: "bg-green-500" },
                      { label: "30–60 min", range: [30, 60], color: "bg-amber-500" },
                      { label: "Over 60 min", range: [60, Infinity], color: "bg-red-500" },
                    ].map(({ label, range, color }) => {
                      const count = allFeedback.filter((f: any) => {
                        const t = f.completionTimeMinutes;
                        return t != null && t >= range[0] && t < range[1];
                      }).length;
                      const p = totalFeedback ? Math.round((count / totalFeedback) * 100) : 0;
                      return (
                        <div key={label} className="text-center p-4 rounded-lg border">
                          <div className={`text-3xl font-bold ${color.replace("bg-", "text-")}`}>{count}</div>
                          <div className="text-sm text-muted-foreground mt-1">{label}</div>
                          <div className="h-2 rounded-full bg-muted mt-3 overflow-hidden">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${p}%` }} />
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{p}% of total</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* FEEDBACK & FLAGS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "feedback" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Flagged Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Most Flagged Categories</CardTitle>
                <CardDescription>Categories with the most question flags</CardDescription>
              </CardHeader>
              <CardContent>
                {topCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No question flags yet.</p>
                ) : (
                  <div className="space-y-3">
                    {topCategories.map(([cat, count]) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-sm">{cat}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 rounded-full bg-amber-400" style={{ width: `${Math.max(20, (count / allFlags.length) * 120)}px` }} />
                          <Badge variant="outline" className="text-xs">{count}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Flag Types Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Flag Types Distribution</CardTitle>
                <CardDescription>Breakdown of flag reasons</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(flagCounts).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No flags yet.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(flagCounts)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count]) => {
                        const pctVal = Math.round((count / allFlags.length) * 100);
                        return (
                          <div key={type}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm capitalize">{type.replace(/_/g, " ")}</span>
                              <span className="text-sm font-medium">{count} ({pctVal}%)</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-amber-500" style={{ width: `${pctVal}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Feedback List */}
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">All Feedback Sessions ({totalFeedback})</CardTitle>
                  <Button variant="outline" size="sm" onClick={exportFeedbackCSV} className="gap-2">
                    <Download size={14} />
                    CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {fbLoading && <p className="text-sm text-muted-foreground">Loading feedback...</p>}
                {!fbLoading && totalFeedback === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No feedback submitted yet.</p>
                )}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allFeedback.map((fb: any) => (
                    <div key={fb.id} className="p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">Audit #{fb.auditId}</Badge>
                          {fb.facilityType && (
                            <Badge variant="secondary" className="text-xs capitalize">{fb.facilityType.replace(/_/g, " ")}</Badge>
                          )}
                          {fb.completionTimeMinutes && (
                            <span className="text-xs text-muted-foreground">{fb.completionTimeMinutes} min</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <StarDisplay value={fb.overallReportQuality ?? 0} />
                        {fb.createdAt && <span>{new Date(fb.createdAt).toLocaleDateString()}</span>}
                      </div>
                      {fb.generalNotes && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{fb.generalNotes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* INCIDENTS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "incidents" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Incident Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Incidents by Type</CardTitle>
                <CardDescription>Distribution across incident categories</CardDescription>
              </CardHeader>
              <CardContent>
                {incidentTypeChart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No incidents reported.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={incidentTypeChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {incidentTypeChart.map((entry, i) => (
                          <Cell key={entry.name} fill={["#3A5F7D", "#C9A86A", "#FF8C00", "#8B0000", "#22c55e", "#6b7280"][i % 6]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Incident Severity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Incidents by Severity</CardTitle>
                <CardDescription>Severity level distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {incidentSeverityChart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No incidents reported.</p>
                ) : (
                  <div className="space-y-4">
                    {incidentSeverityChart.map(({ name, value }) => {
                      const total = incidentSeverityChart.reduce((s, i) => s + i.value, 0);
                      const pct = total ? Math.round((value / total) * 100) : 0;
                      return (
                        <div key={name}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[name] || "#6b7280" }} />
                              <span className="text-sm font-medium">{name}</span>
                            </div>
                            <span className="text-sm">{value} ({pct}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: SEVERITY_COLORS[name] || "#6b7280" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Incident Status */}
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Incident Status Overview</CardTitle>
                  <Button variant="outline" size="sm" onClick={exportIncidentsCSV} className="gap-2">
                    <Download size={14} />
                    CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {Object.keys(incidentByStatus).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No incidents reported.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(incidentByStatus).map(([status, count]) => (
                      <div key={status} className="text-center p-4 rounded-lg border">
                        <div className="text-3xl font-bold">{count}</div>
                        <div className="text-sm text-muted-foreground mt-1 capitalize">{status.replace(/_/g, " ")}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* USERS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "users" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Role Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Users by Role</CardTitle>
                <CardDescription>Role distribution across the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {userRoleChart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={userRoleChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {userRoleChart.map((entry, i) => (
                          <Cell key={entry.name} fill={["#3A5F7D", "#C9A86A", "#FF8C00", "#8B0000", "#22c55e", "#6b7280"][i % 6]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* User Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">User Statistics</CardTitle>
                <CardDescription>Platform user metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-primary">{allUsers.length}</div>
                    <div className="text-sm text-muted-foreground mt-1">Total Registered Users</div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    {userRoleChart.map(({ name, value }) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-sm">{name}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(20, (value / allUsers.length) * 100)}px` }} />
                          <Badge variant="outline" className="text-xs">{value}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DRILLS & TRAINING TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "drills" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Drill Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Drill Status Overview</CardTitle>
                <CardDescription>Status distribution of all drill sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {drillSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No drill sessions found.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg border border-green-200 bg-green-50/50">
                      <div className="text-3xl font-bold text-green-600">{completedDrills}</div>
                      <div className="text-xs text-muted-foreground mt-1">Completed</div>
                    </div>
                    <div className="text-center p-4 rounded-lg border border-amber-200 bg-amber-50/50">
                      <div className="text-3xl font-bold text-amber-600">{inProgressDrills}</div>
                      <div className="text-xs text-muted-foreground mt-1">In Progress</div>
                    </div>
                    <div className="text-center p-4 rounded-lg border border-blue-200 bg-blue-50/50">
                      <div className="text-3xl font-bold text-blue-600">{scheduledDrills}</div>
                      <div className="text-xs text-muted-foreground mt-1">Scheduled</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Drill Completion Rate */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Drill Completion Rate</CardTitle>
                <CardDescription>Overall training engagement</CardDescription>
              </CardHeader>
              <CardContent>
                {drillSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No drill data available.</p>
                ) : (
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-primary">
                      {drillSessions.length ? Math.round((completedDrills / drillSessions.length) * 100) : 0}%
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Completion Rate</div>
                    <div className="mt-6">
                      <div className="h-4 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${drillSessions.length ? (completedDrills / drillSessions.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>{completedDrills} completed</span>
                      <span>{drillSessions.length} total</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* LIABILITY SCANS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "scans" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scan Risk Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Liability Scan Results</CardTitle>
                <CardDescription>Defensibility status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {scanRiskChart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No liability scans found.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={scanRiskChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {scanRiskChart.map((entry, i) => (
                          <Cell key={entry.name} fill={["#22c55e", "#f59e0b", "#FF8C00", "#ef4444", "#6b7280"][i % 5]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Scan Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scan Summary</CardTitle>
                <CardDescription>Total scans and risk assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-primary">{allScans.length}</div>
                    <div className="text-sm text-muted-foreground mt-1">Total Liability Scans</div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    {scanRiskChart.map(({ name, value }) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-sm">{name}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(20, (value / allScans.length) * 100)}px` }} />
                          <Badge variant="outline" className="text-xs">{value}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

  );
}