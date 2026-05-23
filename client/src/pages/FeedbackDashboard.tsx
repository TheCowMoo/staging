import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import {
  ClipboardList, Star, CheckCircle2, XCircle, Download,
  Flag, TrendingUp, MessageSquare, AlertTriangle
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function avg(arr: (number | null | undefined)[]): number {
  const valid = arr.filter((v): v is number => v != null);
  if (!valid.length) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{value.toFixed(1)}</span>
    </div>
  );
}

const FLAG_TYPE_LABELS: Record<string, string> = {
  wrong_response_options: "Wrong Response Options",
  question_unclear: "Question Unclear",
  not_applicable_to_facility: "Not Applicable",
  scoring_seems_wrong: "Scoring Seems Wrong",
  missing_context: "Missing Context",
  other: "Other",
};

const FLAG_COLORS: Record<string, string> = {
  wrong_response_options: "bg-red-100 text-red-700 border-red-200",
  question_unclear: "bg-amber-100 text-amber-700 border-amber-200",
  not_applicable_to_facility: "bg-blue-100 text-blue-700 border-blue-200",
  scoring_seems_wrong: "bg-purple-100 text-purple-700 border-purple-200",
  missing_context: "bg-orange-100 text-orange-700 border-orange-200",
  other: "bg-gray-100 text-gray-700 border-gray-200",
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FeedbackDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "feedback" | "flags">("overview");

  const { data: allFeedback = [], isLoading: feedbackLoading } = trpc.feedback.listAll.useQuery();
  const { data: allFlags = [], isLoading: flagsLoading } = trpc.feedback.getAllFlags.useQuery();

  // ─── Computed Metrics ─────────────────────────────────────────────────────
  const totalFeedback = allFeedback.length;
  const clientReadyCount = allFeedback.filter((f) => f.wouldUseForClient).length;
  const clientReadyPct = totalFeedback ? Math.round((clientReadyCount / totalFeedback) * 100) : 0;

  const avgRatings = {
    overallReportQuality: avg(allFeedback.map((f) => f.overallReportQuality)),
    scoringAccuracy: avg(allFeedback.map((f) => f.scoringAccuracy)),
    correctiveActionRealism: avg(allFeedback.map((f) => f.correctiveActionRealism)),
    eapCompleteness: avg(allFeedback.map((f) => f.eapCompleteness)),
    questionRelevance: avg(allFeedback.map((f) => f.questionRelevance)),
  };

  const avgCompletionTime = avg(allFeedback.map((f) => f.completionTimeMinutes));

  const ratingChartData = [
    { name: "Report Quality", value: avgRatings.overallReportQuality },
    { name: "Scoring Accuracy", value: avgRatings.scoringAccuracy },
    { name: "CAP Realism", value: avgRatings.correctiveActionRealism },
    { name: "EAP Completeness", value: avgRatings.eapCompleteness },
    { name: "Question Relevance", value: avgRatings.questionRelevance },
  ];

  // Flag frequency by type
  const flagCounts: Record<string, number> = {};
  allFlags.forEach((f) => {
    flagCounts[f.flagType] = (flagCounts[f.flagType] || 0) + 1;
  });

  // Flag frequency by category
  const categoryCounts: Record<string, number> = {};
  allFlags.forEach((f) => {
    categoryCounts[f.categoryName] = (categoryCounts[f.categoryName] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Export CSV
  const exportFeedbackCSV = () => {
    const headers = [
      "ID", "Audit ID", "Facility Type", "Completion Time (min)",
      "Report Quality", "Scoring Accuracy", "CAP Realism", "EAP Completeness", "Question Relevance",
      "Client Ready", "Missing Questions", "Irrelevant Questions", "CAP Issues",
      "Scoring Disagreements", "EAP Feedback", "General Notes", "Date"
    ];
    const rows = allFeedback.map((f) => [
      f.id, f.auditId, f.facilityType ?? "", f.completionTimeMinutes ?? "",
      f.overallReportQuality ?? "", f.scoringAccuracy ?? "", f.correctiveActionRealism ?? "",
      f.eapCompleteness ?? "", f.questionRelevance ?? "",
      f.wouldUseForClient ? "Yes" : "No",
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
    a.download = `pursuit-pathways-feedback-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportFlagsCSV = () => {
    const headers = ["ID", "Audit ID", "Category", "Question ID", "Question Text", "Flag Type", "Notes", "Date"];
    const rows = allFlags.map((f) => [
      f.id, f.auditId, f.categoryName, f.questionId,
      (f.questionText ?? "").replace(/,/g, ";"),
      FLAG_TYPE_LABELS[f.flagType] ?? f.flagType,
      (f.notes ?? "").replace(/,/g, ";"),
      new Date(f.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pursuit-pathways-question-flags-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Feedback Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Aggregate tester feedback and question flags from all audit sessions.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportFlagsCSV} className="gap-2">
              <Download className="h-3.5 w-3.5" />
              Export Flags
            </Button>
            <Button variant="outline" size="sm" onClick={exportFeedbackCSV} className="gap-2">
              <Download className="h-3.5 w-3.5" />
              Export Feedback
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Feedback Sessions", value: totalFeedback, icon: ClipboardList, color: "text-blue-600" },
            { label: "Client Ready", value: `${clientReadyPct}%`, icon: CheckCircle2, color: "text-green-600" },
            { label: "Question Flags", value: allFlags.length, icon: Flag, color: "text-amber-600" },
            { label: "Avg Completion Time", value: avgCompletionTime ? `${Math.round(avgCompletionTime)}m` : "—", icon: MessageSquare, color: "text-purple-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${color}`} />
                  <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {(["overview", "feedback", "flags"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "overview" ? "Overview" : tab === "feedback" ? `Feedback (${totalFeedback})` : `Question Flags (${allFlags.length})`}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rating Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Average Ratings by Dimension</CardTitle>
              </CardHeader>
              <CardContent>
                {totalFeedback === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No feedback submitted yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={ratingChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 5]} tickCount={6} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
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
                <div className="mt-3 space-y-2">
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

            {/* Top Flagged Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Most Flagged Categories</CardTitle>
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

                <Separator className="my-4" />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Flag Types</p>
                  {Object.entries(flagCounts).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <Badge className={`text-xs ${FLAG_COLORS[type] ?? ""}`}>
                        {FLAG_TYPE_LABELS[type] ?? type}
                      </Badge>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Client Readiness */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Client Readiness Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600">{clientReadyCount}</div>
                    <div className="text-sm text-muted-foreground mt-1">Would use for client</div>
                    <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mt-1" />
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-red-500">{totalFeedback - clientReadyCount}</div>
                    <div className="text-sm text-muted-foreground mt-1">Needs improvement</div>
                    <XCircle className="h-5 w-5 text-red-400 mx-auto mt-1" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Client Ready Rate</span>
                      <span className="text-sm font-bold">{clientReadyPct}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${clientReadyPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Target: 80%+ before commercial launch
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === "feedback" && (
          <div className="space-y-4">
            {feedbackLoading && <p className="text-sm text-muted-foreground">Loading feedback...</p>}
            {!feedbackLoading && allFeedback.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <ClipboardList className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No feedback submitted yet. Complete an audit and submit the feedback form to see data here.</p>
                </CardContent>
              </Card>
            )}
            {allFeedback.map((fb) => (
              <Card key={fb.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Audit #{fb.auditId}</Badge>
                      {fb.facilityType && (
                        <Badge variant="secondary" className="capitalize">{fb.facilityType.replace(/_/g, " ")}</Badge>
                      )}
                      {fb.completionTimeMinutes && (
                        <span className="text-xs text-muted-foreground">{fb.completionTimeMinutes} min</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {fb.wouldUseForClient ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Client Ready</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Needs Work</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{new Date(fb.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                    {[
                      { label: "Report Quality", val: fb.overallReportQuality },
                      { label: "Scoring", val: fb.scoringAccuracy },
                      { label: "CAP Realism", val: fb.correctiveActionRealism },
                      { label: "EAP", val: fb.eapCompleteness },
                      { label: "Questions", val: fb.questionRelevance },
                    ].map(({ label, val }) => (
                      <div key={label} className="text-center p-2 rounded-lg bg-muted/40">
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        {val ? <StarDisplay value={val} /> : <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {[
                      { label: "Missing Questions", val: fb.missingQuestions },
                      { label: "Irrelevant Questions", val: fb.irrelevantQuestions },
                      { label: "CAP Issues", val: fb.correctiveActionIssues },
                      { label: "Scoring Disagreements", val: fb.scoringDisagreements },
                      { label: "EAP Feedback", val: fb.eapFeedback },
                      { label: "General Notes", val: fb.generalNotes },
                    ].filter(({ val }) => val).map(({ label, val }) => (
                      <div key={label} className="text-sm">
                        <span className="font-medium text-foreground">{label}: </span>
                        <span className="text-muted-foreground">{val}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Flags Tab */}
        {activeTab === "flags" && (
          <div className="space-y-4">
            {flagsLoading && <p className="text-sm text-muted-foreground">Loading flags...</p>}
            {!flagsLoading && allFlags.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Flag className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No question flags submitted yet. Use the flag button during an audit walkthrough to flag specific questions.</p>
                </CardContent>
              </Card>
            )}
            {allFlags.length > 0 && (
              <div className="space-y-2">
                {allFlags.map((flag) => (
                  <Card key={flag.id} className="border-l-4 border-l-amber-400">
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">{flag.categoryName}</Badge>
                            <Badge className={`text-xs ${FLAG_COLORS[flag.flagType] ?? ""}`}>
                              {FLAG_TYPE_LABELS[flag.flagType] ?? flag.flagType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">Audit #{flag.auditId}</span>
                          </div>
                          <p className="text-sm font-medium text-foreground truncate">{flag.questionText}</p>
                          {flag.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{flag.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <span className="text-xs text-muted-foreground">{new Date(flag.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
