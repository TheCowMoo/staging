import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  AlertTriangle, Shield, Clock, CheckCircle2, ArrowRight,
  Search, Eye, X, Filter, Download, Building2, Hash, Link2, ExternalLink, ShieldAlert
} from "lucide-react";
import { WARNING_SIGN_LABELS } from "../../../shared/threatKeywords";

type ThreatFlag = {
  id: string;
  wavrKey: string;
  warningSign: number;
  severity: "critical" | "high" | "moderate" | "low";
  label: string;
  matchedPhrases: string[];
};

const THREAT_SEVERITY_CONFIG = {
  critical: { color: "bg-red-100 text-red-800 border-red-300",    dot: "bg-red-500",    label: "Critical" },
  high:     { color: "bg-orange-100 text-orange-800 border-orange-300", dot: "bg-orange-500", label: "High" },
  moderate: { color: "bg-amber-100 text-amber-800 border-amber-300",  dot: "bg-amber-500",  label: "Moderate" },
  low:      { color: "bg-blue-100 text-blue-800 border-blue-300",    dot: "bg-blue-400",   label: "Low" },
};

/** Panel showing detected threat flags in the incident detail modal */
function ThreatFlagsPanel({ report, isAdmin, onEscalate }: {
  report: { id: number; threatFlags?: string | null; maxThreatSeverity?: string | null };
  isAdmin: boolean;
  onEscalate: () => void;
}) {
  const flags: ThreatFlag[] = (() => {
    try { return report.threatFlags ? JSON.parse(report.threatFlags) : []; }
    catch { return []; }
  })();
  if (flags.length === 0) return null;
  const maxSev = report.maxThreatSeverity as keyof typeof THREAT_SEVERITY_CONFIG | null;
  const sevConfig = maxSev ? THREAT_SEVERITY_CONFIG[maxSev] : null;
  const requiresEscalation = maxSev === "critical" || maxSev === "high";
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-red-700 uppercase tracking-wide flex items-center gap-1.5">
          <ShieldAlert size={13} /> Behavioral Warning Signs Detected
        </p>
        {sevConfig && (
          <Badge className={`text-xs border ${sevConfig.color}`}>{sevConfig.label} Risk</Badge>
        )}
      </div>
      {requiresEscalation && isAdmin && (
        <div className="flex items-center gap-2 p-2 bg-red-100 border border-red-300 rounded-md">
          <AlertTriangle size={13} className="text-red-600 flex-shrink-0" />
          <p className="text-xs text-red-700 flex-1">
            High-risk behavioral indicators detected. Consider escalating to the Behavioral Threat Assessment Team.
          </p>
          <Button size="sm" variant="outline" className="text-xs h-7 gap-1 border-red-400 text-red-700 hover:bg-red-100 flex-shrink-0" onClick={onEscalate}>
            <ArrowRight size={11} /> Escalate
          </Button>
        </div>
      )}
      <div className="space-y-2">
        {flags.map((flag) => (
          <div key={flag.id} className="flex items-start gap-2">
            <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${THREAT_SEVERITY_CONFIG[flag.severity]?.dot ?? "bg-slate-400"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-800">
                {flag.label}
                <span className="ml-1.5 text-slate-400 font-normal">· Warning Sign {flag.warningSign}: {WARNING_SIGN_LABELS[flag.warningSign]}</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Matched: {flag.matchedPhrases.slice(0, 3).map((p) => `"${p}"`).join(", ")}
                {flag.matchedPhrases.length > 3 && ` +${flag.matchedPhrases.length - 3} more`}
              </p>
              <p className="text-xs text-indigo-600 mt-0.5">WAVR-21: {flag.wavrKey}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_CONFIG = {
  new:          { label: "New",          color: "bg-blue-100 text-blue-800",    dot: "bg-blue-500" },
  under_review: { label: "Under Review", color: "bg-amber-100 text-amber-800",  dot: "bg-amber-500" },
  resolved:     { label: "Resolved",     color: "bg-green-100 text-green-800",  dot: "bg-green-500" },
  referred:     { label: "Referred",     color: "bg-purple-100 text-purple-800", dot: "bg-purple-500" },
};

const SEVERITY_CONFIG = {
  low:      { color: "bg-green-100 text-green-800",  label: "Low" },
  moderate: { color: "bg-amber-100 text-amber-800",  label: "Moderate" },
  high:     { color: "bg-orange-100 text-orange-800", label: "High" },
  critical: { color: "bg-red-100 text-red-800",      label: "Critical" },
};

const TYPE_LABELS: Record<string, string> = {
  threatening_behavior:  "Threatening Behavior",
  suspicious_person:     "Suspicious Person",
  observed_safety_gap:   "Observed Safety Gap",
  workplace_violence:    "Workplace Violence",
  other:                 "Other Incidents",
  // Legacy labels for older reports
  domestic_violence:     "Domestic Violence",
  harassment:            "Harassment",
  stalking:              "Stalking",
  suspicious_activity:   "Suspicious Activity",
  security_concern:      "Security Concern",
  policy_violation:      "Policy Violation",
};

type Report = {
  id: number;
  orgId: number | null;
  incidentType: string;
  severity: string;
  status: string;
  description: string;
  location: string | null;
  facilityName: string | null;
  incidentDate: Date | null;
  involvedParties: string | null;
  witnesses: string | null;
  priorIncidents: boolean | null;
  reportedToAuthorities: boolean | null;
  reporterRole: string | null;
  contactEmail: string | null;
  adminNotes: string | null;
  trackingToken: string | null;
  createdAt: Date;
  // Repeat tracking
  isRepeatType: boolean | null;
  repeatTypeCount: number | null;
  isRepeatPerson: boolean | null;
  repeatPersonCount: number | null;
  involvedPersonName: string | null;
  // Follow-up
  followUpRequested: boolean | null;
  followUpMethod: string | null;
  followUpContact: string | null;
  // Threat flags
  threatFlags: string | null;
  maxThreatSeverity: string | null;
};

function EscalateButton({ incidentId, isAdmin }: { incidentId: number; isAdmin: boolean }) {
  const [, navigate] = useLocation();
  if (!isAdmin) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
      onClick={() => navigate(`/btam/new?incidentId=${incidentId}`)}
    >
      <AlertTriangle size={13} />
      Escalate to BTAM
    </Button>
  );
}

/** Small badge shown in the incident list row if this incident has a linked BTAM case */
function BtamEscalationBadge({ incidentId }: { incidentId: number }) {
  const [, navigate] = useLocation();
  const { data: btamCase } = trpc.btam.getCaseByLinkedIncident.useQuery({ incidentId });
  if (!btamCase) return null;
  return (
    <Badge
      className="text-xs bg-indigo-100 text-indigo-800 border border-indigo-200 cursor-pointer gap-1 hover:bg-indigo-200"
      onClick={(e) => { e.stopPropagation(); navigate(`/btam/${btamCase.caseId}`); }}
    >
      <Link2 size={10} /> BTAM {btamCase.caseNumber}
    </Badge>
  );
}

/** Detail panel section showing the linked BTAM case (if any) */
function BtamEscalationDetailPanel({ incidentId, isAdmin }: { incidentId: number; isAdmin: boolean }) {
  const [, navigate] = useLocation();
  const { data: btamCase } = trpc.btam.getCaseByLinkedIncident.useQuery({ incidentId });
  if (!btamCase) return null;
  return (
    <div className="mb-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
      <p className="text-xs font-semibold text-indigo-700 mb-1 flex items-center gap-1">
        <Link2 size={11} /> Already escalated to BTAM
      </p>
      <p className="text-xs text-indigo-600 mb-2">
        Case <strong>{btamCase.caseNumber}</strong> · {btamCase.status?.replace(/_/g, " ")} · Concern: {btamCase.concernLevel}
      </p>
      {isAdmin && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-indigo-700 border-indigo-300 hover:bg-indigo-100 text-xs h-7"
          onClick={() => navigate(`/btam/${btamCase.caseId}`)}
        >
          <ExternalLink size={11} /> Open BTAM Case
        </Button>
      )}
    </div>
  );
}

export default function IncidentDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [referredTo, setReferredTo] = useState<number | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenSearch, setTokenSearch] = useState("");

  const { data: tokenReport, error: tokenError, isFetching: tokenFetching } = trpc.incident.adminLookup.useQuery(
    { token: tokenSearch },
    { enabled: tokenSearch.length > 0, retry: false }
  );

  const { data: reports = [], refetch } = trpc.incident.list.useQuery({});
  const facilitiesQuery = trpc.facility.list.useQuery();
  const updateStatus = trpc.incident.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Report status updated");
      refetch();
      setSelectedReport(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // Fetch the current user's own org memberships as fallback
  const { data: myMemberships = [] } = trpc.org.myMemberships.useQuery();
  const myOrgId = myMemberships[0]?.orgId ?? 0;

  // Resolve the orgId: prefer the report's orgId, fall back to the current user's org
  const referralOrgId = selectedReport?.orgId ?? myOrgId;

  // Fetch org members when referred status is selected
  const { data: orgMembers = [] } = trpc.org.members.useQuery(
    { orgId: referralOrgId },
    { enabled: newStatus === "referred" && referralOrgId > 0 }
  );

  const [referralDialogOpen, setReferralDialogOpen] = useState(false);

  const filtered = reports
    .filter((r) => statusFilter === "all" || r.status === statusFilter)
    .filter((r) => facilityFilter === "all" || (r.facilityName ?? "") === facilityFilter);

  const uniqueFacilities = Array.from(new Set(reports.map((r) => r.facilityName).filter(Boolean))) as string[];

  const exportCSV = () => {
    const headers = [
      "ID", "Date Submitted", "Incident Date", "Type", "Severity", "Status",
      "Facility", "Location", "Description", "Involved Parties", "Witnesses",
      "Prior Incidents", "Reported to Authorities", "Reporter Role", "Contact Email",
      "OSHA Recordable", "Injury Type", "Body Part", "Medical Treatment",
      "Days Away", "Days Restricted", "Loss of Consciousness", "Work Related",
      "Employee Name", "Employee Job Title", "Physician", "Treated in ER", "Hospitalized",
      "Admin Notes", "Tracking Token"
    ];
    const rows = filtered.map((r) => [
      r.id,
      new Date(r.createdAt).toLocaleDateString(),
      r.incidentDate ? new Date(r.incidentDate).toLocaleDateString() : "",
      TYPE_LABELS[r.incidentType] ?? r.incidentType,
      r.severity,
      r.status,
      r.facilityName ?? "",
      r.location ?? "",
      `"${(r.description ?? "").replace(/"/g, '""')}"`,
      `"${(r.involvedParties ?? "").replace(/"/g, '""')}"`,
      `"${(r.witnesses ?? "").replace(/"/g, '""')}"`,
      r.priorIncidents ? "Yes" : "No",
      r.reportedToAuthorities ? "Yes" : "No",
      r.reporterRole ?? "",
      r.contactEmail ?? "",
      (r as unknown as Record<string, unknown>).oshaRecordable ? "Yes" : "No",
      (r as unknown as Record<string, unknown>).injuryType ?? "",
      (r as unknown as Record<string, unknown>).bodyPartAffected ?? "",
      (r as unknown as Record<string, unknown>).medicalTreatment ?? "",
      (r as unknown as Record<string, unknown>).daysAwayFromWork ?? "",
      (r as unknown as Record<string, unknown>).daysOnRestriction ?? "",
      (r as unknown as Record<string, unknown>).lossOfConsciousness ? "Yes" : "No",
      (r as unknown as Record<string, unknown>).workRelated ? "Yes" : "No",
      (r as unknown as Record<string, unknown>).employeeName ?? "",
      (r as unknown as Record<string, unknown>).employeeJobTitle ?? "",
      (r as unknown as Record<string, unknown>).physicianName ?? "",
      (r as unknown as Record<string, unknown>).treatedInER ? "Yes" : "No",
      (r as unknown as Record<string, unknown>).hospitalizedOvernight ? "Yes" : "No",
      `"${(r.adminNotes ?? "").replace(/"/g, '""')}"`,
      r.trackingToken ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incident-reports-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const counts = {
    all: reports.length,
    new: reports.filter((r) => r.status === "new").length,
    under_review: reports.filter((r) => r.status === "under_review").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
    referred: reports.filter((r) => r.status === "referred").length,
  };

  const handleUpdateStatus = () => {
    if (!selectedReport || !newStatus) return;
    updateStatus.mutate({
      id: selectedReport.id,
      status: newStatus as "new" | "under_review" | "resolved" | "referred",
      adminNotes: adminNotes || undefined,
      referredTo: newStatus === "referred" ? (referredTo ?? undefined) : undefined,
    });
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Incident Reports</h1>
            <p className="text-slate-500 text-sm mt-1">Anonymous incident reports submitted by staff, clients, or visitors</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <Shield size={14} className="text-primary" />
              <span>All reports are anonymous</span>
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
              <Download size={14} />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Tracking Token Lookup */}
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
            <Hash size={14} className="text-primary" />
            Look Up Report by Tracking Token
          </p>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter tracking token (e.g. abc123xyz)"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") setTokenSearch(tokenInput.trim()); }}
              className="max-w-xs bg-white"
            />
            <Button
              size="sm"
              onClick={() => setTokenSearch(tokenInput.trim())}
              disabled={!tokenInput.trim()}
            >
              <Search size={14} className="mr-1" />
              Search
            </Button>
            {tokenSearch && (
              <Button size="sm" variant="ghost" onClick={() => { setTokenSearch(""); setTokenInput(""); }}>
                <X size={14} />
              </Button>
            )}
          </div>
          {tokenFetching && <p className="text-xs text-slate-500 mt-2">Searching...</p>}
          {tokenError && <p className="text-xs text-red-600 mt-2">No report found with that tracking token.</p>}
          {tokenReport && !tokenFetching && (
            <div className="mt-3 p-3 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-800">Report #{tokenReport.id} — Token: <code className="text-primary">{tokenReport.trackingToken}</code></p>
                <Button size="sm" variant="outline" onClick={() => setSelectedReport(tokenReport as unknown as Report)}>
                  <Eye size={13} className="mr-1" /> View Full Report
                </Button>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span>Type: <strong>{TYPE_LABELS[tokenReport.incidentType] ?? tokenReport.incidentType}</strong></span>
                <span>Severity: <strong className="capitalize">{tokenReport.severity}</strong></span>
                <span>Status: <strong className="capitalize">{tokenReport.status?.replace("_", " ")}</strong></span>
                <span>Submitted: <strong>{new Date(tokenReport.createdAt).toLocaleDateString()}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {(["all", "new", "under_review", "resolved", "referred"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`p-3 rounded-xl border text-center transition-all ${
                statusFilter === s
                  ? "border-primary bg-primary/5"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="text-2xl font-bold text-slate-900">{counts[s]}</div>
              <div className="text-xs text-slate-500 mt-0.5 capitalize">{s === "all" ? "Total" : s.replace("_", " ")}</div>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-700">
                {filtered.length} report{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>
            {uniqueFacilities.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Building2 size={14} className="text-slate-400" />
                <select
                  className="text-sm border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700"
                  value={facilityFilter}
                  onChange={(e) => setFacilityFilter(e.target.value)}
                >
                  <option value="all">All Facilities</option>
                  {uniqueFacilities.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Shield size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No reports found</p>
              <p className="text-sm mt-1">Reports submitted anonymously will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((report) => (
                <div
                  key={report.id}
                  className="flex items-start gap-4 px-4 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedReport(report as unknown as Report);
                    setAdminNotes(report.adminNotes || "");
                    setNewStatus(report.status);
                  }}
                >
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG]?.dot ?? "bg-slate-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm">
                        {TYPE_LABELS[report.incidentType] ?? report.incidentType}
                      </span>
                      <Badge className={`text-xs ${SEVERITY_CONFIG[report.severity as keyof typeof SEVERITY_CONFIG]?.color ?? ""}`}>
                        {SEVERITY_CONFIG[report.severity as keyof typeof SEVERITY_CONFIG]?.label ?? report.severity}
                      </Badge>
                      <Badge className={`text-xs ${STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG]?.color ?? ""}`}>
                        {STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG]?.label ?? report.status}
                      </Badge>
                      {((report as unknown as Report).isRepeatType || (report as unknown as Report).isRepeatPerson) && (
                        <Badge className="text-xs bg-orange-100 text-orange-800 border border-orange-300">
                          🔁 Repeat
                        </Badge>
                      )}
                      {(report as unknown as Report).maxThreatSeverity && (
                        <Badge className={`text-xs border ${
                          THREAT_SEVERITY_CONFIG[(report as unknown as Report).maxThreatSeverity as keyof typeof THREAT_SEVERITY_CONFIG]?.color ?? ""
                        }`}>
                          <ShieldAlert size={10} className="mr-0.5" />
                          {THREAT_SEVERITY_CONFIG[(report as unknown as Report).maxThreatSeverity as keyof typeof THREAT_SEVERITY_CONFIG]?.label ?? ""} Risk
                        </Badge>
                      )}
                      <BtamEscalationBadge incidentId={report.id} />
                      {(report as unknown as Report).followUpRequested && (
                        <Badge className="text-xs bg-purple-100 text-purple-800">
                          📞 Follow-up
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 truncate">{report.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      {report.facilityName && <span>{report.facilityName}</span>}
                      {report.location && <span>· {report.location}</span>}
                      <span>· {new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Eye size={16} className="text-slate-300 flex-shrink-0 mt-1" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white">
                <div>
                  <h2 className="font-bold text-slate-900">
                    {TYPE_LABELS[selectedReport.incidentType] ?? selectedReport.incidentType}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Report #{selectedReport.id} · Token: {selectedReport.trackingToken}
                  </p>
                </div>
                <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  <Badge className={SEVERITY_CONFIG[selectedReport.severity as keyof typeof SEVERITY_CONFIG]?.color ?? ""}>
                    Severity: {SEVERITY_CONFIG[selectedReport.severity as keyof typeof SEVERITY_CONFIG]?.label ?? selectedReport.severity}
                  </Badge>
                  <Badge className={STATUS_CONFIG[selectedReport.status as keyof typeof STATUS_CONFIG]?.color ?? ""}>
                    {STATUS_CONFIG[selectedReport.status as keyof typeof STATUS_CONFIG]?.label ?? selectedReport.status}
                  </Badge>
                  {selectedReport.priorIncidents && (
                    <Badge className="bg-red-100 text-red-800">Prior Incidents</Badge>
                  )}
                  {selectedReport.reportedToAuthorities && (
                    <Badge className="bg-blue-100 text-blue-800">Reported to Authorities</Badge>
                  )}
                  {selectedReport.isRepeatType && (
                    <Badge className="bg-orange-100 text-orange-800 border border-orange-300">
                      🔁 Repeat Incident Type ({selectedReport.repeatTypeCount ?? 0} prior)
                    </Badge>
                  )}
                  {selectedReport.isRepeatPerson && (
                    <Badge className="bg-red-100 text-red-800 border border-red-300">
                      👤 Repeat Person ({selectedReport.repeatPersonCount ?? 0} prior)
                    </Badge>
                  )}
                  {selectedReport.followUpRequested && (
                    <Badge className="bg-purple-100 text-purple-800">
                      📞 Follow-up Requested
                    </Badge>
                  )}
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: "Date of Incident", value: selectedReport.incidentDate ? new Date(selectedReport.incidentDate).toLocaleDateString() : "Not provided" },
                    { label: "Location", value: selectedReport.location || "Not provided" },
                    { label: "Organization", value: selectedReport.facilityName || "Not provided" },
                    { label: "Reporter Role", value: selectedReport.reporterRole || "Anonymous" },
                    { label: "Contact Email", value: selectedReport.contactEmail || "Not provided" },
                    { label: "Submitted", value: new Date(selectedReport.createdAt).toLocaleString() },
                    ...(selectedReport.involvedPersonName ? [{ label: "Involved Person", value: selectedReport.involvedPersonName }] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                      <p className="font-medium text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Description</p>
                  <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-800 whitespace-pre-wrap">
                    {selectedReport.description}
                  </div>
                </div>

                {selectedReport.involvedParties && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Involved Parties</p>
                    <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-800">{selectedReport.involvedParties}</div>
                  </div>
                )}

                {selectedReport.witnesses && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Witnesses</p>
                    <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-800">{selectedReport.witnesses}</div>
                  </div>
                )}
                {/* Follow-up Details */}
                {selectedReport.followUpRequested && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Follow-up Requested</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-white rounded-lg p-2">
                        <p className="text-xs text-slate-500 mb-0.5">Preferred Method</p>
                        <p className="font-medium capitalize">{selectedReport.followUpMethod?.replace("_", "-") ?? "Not specified"}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2">
                        <p className="text-xs text-slate-500 mb-0.5">Contact Details</p>
                        <p className="font-medium">{selectedReport.followUpContact || "Not provided"}</p>
                      </div>
                    </div>
                  </div>
                )}
                {/* Repeat Incident Alerts */}
                {(selectedReport.isRepeatType || selectedReport.isRepeatPerson) && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2">Repeat Incident Alerts</p>
                    <div className="space-y-1.5 text-sm">
                      {selectedReport.isRepeatType && (
                        <div className="flex items-start gap-2">
                          <span className="text-orange-500 mt-0.5">🔁</span>
                          <span><strong>{selectedReport.repeatTypeCount}</strong> prior incident(s) of the same type have been reported at this facility in the past 12 months.</span>
                        </div>
                      )}
                      {selectedReport.isRepeatPerson && (
                        <div className="flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">👤</span>
                          <span><strong>{selectedReport.repeatPersonCount}</strong> prior incident(s) involving <strong>{selectedReport.involvedPersonName}</strong> have been reported in the past 12 months.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Threat Flags Panel */}
                {selectedReport.threatFlags && (
                  <ThreatFlagsPanel
                    report={selectedReport}
                    isAdmin={isAdmin}
                    onEscalate={() => { setSelectedReport(null); window.location.href = `/btam/new?incidentId=${selectedReport.id}`; }}
                  />
                )}
                {/* Admin Actions */}
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Update Status</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {(["new", "under_review", "resolved", "referred"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setNewStatus(s);
                          if (s !== "referred") setReferredTo(null);
                          if (s === "referred") setReferralDialogOpen(true);
                        }}
                        className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                          newStatus === s
                            ? `${STATUS_CONFIG[s].color} border-current font-medium`
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {STATUS_CONFIG[s].label}
                      </button>
                    ))}
                  </div>
                  {newStatus === "referred" && referredTo && (
                    <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-200 text-sm text-purple-800">
                      <span className="flex-1">
                        Raising concern to: <strong>{orgMembers.find(m => m.userId === referredTo)?.userName || orgMembers.find(m => m.userId === referredTo)?.userEmail || `User #${referredTo}`}</strong>
                      </span>
                      <button className="text-xs text-purple-600 hover:underline" onClick={() => setReferralDialogOpen(true)}>Change</button>
                    </div>
                  )}
                  {newStatus === "referred" && !referredTo && (
                    <div className="mb-3">
                      <button
                        className="w-full px-3 py-2 rounded-lg border border-dashed border-purple-300 text-sm text-purple-700 hover:bg-purple-50 transition-colors"
                        onClick={() => setReferralDialogOpen(true)}
                      >
                        + Select person to raise concern to
                      </button>
                    </div>
                  )}

                  {/* Referral person picker dialog */}
                  <Dialog open={referralDialogOpen} onOpenChange={setReferralDialogOpen}>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Raise Concern To</DialogTitle>
                        <DialogDescription>Select a member of your organization to raise this concern to.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {orgMembers.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No org members found.</p>
                        )}
                        {orgMembers.map((member) => (
                          <button
                            key={member.userId}
                            onClick={() => { setReferredTo(member.userId); setReferralDialogOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition-all text-left ${
                              referredTo === member.userId
                                ? "border-purple-400 bg-purple-50 text-purple-800 font-medium"
                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
                              {(member.userName || member.userEmail || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{member.userName || member.userEmail}</p>
                              {member.userName && <p className="text-xs text-muted-foreground truncate">{member.userEmail}</p>}
                            </div>
                            <span className="text-xs text-muted-foreground capitalize">{member.role?.replace(/_/g, " ")}</span>
                          </button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Textarea
                    placeholder="Admin notes (internal only, not visible to reporter)..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="resize-none mb-3"
                  />
                  <Button
                    onClick={handleUpdateStatus}
                    disabled={updateStatus.isPending}
                    className="w-full"
                  >
                    {updateStatus.isPending ? "Saving..." : "Save Update"}
                  </Button>

                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
