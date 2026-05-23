import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  Shield,
  User,
  FileText,
  ClipboardList,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Plus,
  Lock,
  Clock,
  ExternalLink,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

// ── Concern level helpers ──────────────────────────────────────────────────
const CONCERN_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  low: "bg-green-100 text-green-800",
  moderate: "bg-yellow-100 text-yellow-800",
  elevated: "bg-orange-100 text-orange-800",
  high: "bg-red-100 text-red-800",
  imminent: "bg-red-600 text-white",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  active: "bg-indigo-100 text-indigo-800",
  monitoring: "bg-yellow-100 text-yellow-800",
  closed: "bg-slate-100 text-slate-600",
  archived: "bg-slate-100 text-slate-400",
};

// ── WAVR-21 factor definitions ─────────────────────────────────────────────
const WAVR_FACTORS = [
  { key: "grievanceFixation", label: "Grievance Fixation", category: "Grievance" },
  { key: "grievanceWithTarget", label: "Grievance with Identified Target", category: "Grievance" },
  { key: "desperationHopelessness", label: "Desperation / Hopelessness", category: "Psychological" },
  { key: "mentalHealthConcern", label: "Mental Health Concern", category: "Psychological" },
  { key: "paranoidThinking", label: "Paranoid Thinking", category: "Psychological" },
  { key: "depressionWithdrawal", label: "Depression / Withdrawal", category: "Psychological" },
  { key: "narcissisticInjury", label: "Narcissistic Injury", category: "Psychological" },
  { key: "concerningCommunications", label: "Concerning Communications", category: "Behavioral" },
  { key: "weaponsInterest", label: "Weapons Interest / Access", category: "Behavioral" },
  { key: "pathwayBehaviors", label: "Pathway Behaviors", category: "Behavioral" },
  { key: "leakage", label: "Leakage", category: "Behavioral" },
  { key: "priorViolenceHistory", label: "Prior Violence History", category: "History" },
  { key: "priorMentalHealthCrisis", label: "Prior Mental Health Crisis", category: "History" },
  { key: "domesticViolenceHistory", label: "Domestic Violence History", category: "History" },
  { key: "recentStressor", label: "Recent Stressor", category: "Contextual" },
  { key: "socialIsolation", label: "Social Isolation", category: "Contextual" },
  { key: "personalCrisis", label: "Personal Crisis", category: "Contextual" },
  { key: "helpSeeking", label: "Help Seeking Behavior", category: "Protective" },
  { key: "socialSupport", label: "Social Support", category: "Protective" },
  { key: "futureOrientation", label: "Future Orientation", category: "Protective" },
  { key: "finalActBehaviors", label: "Final Act Behaviors", category: "Imminent" },
  { key: "surveillanceOfTarget", label: "Surveillance of Target", category: "Imminent" },
  { key: "imminentCommunication", label: "Imminent Communication", category: "Imminent" },
] as const;

type WavrKey = typeof WAVR_FACTORS[number]["key"];
type WavrFactors = Record<WavrKey, number>;

const defaultFactors: WavrFactors = Object.fromEntries(
  WAVR_FACTORS.map((f) => [f.key, 0])
) as WavrFactors;

// ── Intervention type labels ───────────────────────────────────────────────
const INTERVENTION_LABELS: Record<string, string> = {
  monitoring: "Monitoring",
  hr_meeting: "HR Meeting",
  eap_referral: "EAP Referral",
  mandatory_counseling: "Mandatory Counseling",
  credential_suspension: "Credential Suspension",
  law_enforcement_notification: "Law Enforcement Notification",
  no_contact_order: "No Contact Order",
  termination_with_safety_protocol: "Termination with Safety Protocol",
  hospitalization_referral: "Hospitalization Referral",
  other: "Other",
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  observation: "Observation",
  interview: "Interview",
  external_report: "External Report",
  law_enforcement: "Law Enforcement",
  legal: "Legal",
  hr: "HR",
  general: "General",
};

// ── Helper to render top contributing factors ────────────────────────────
function renderTopFactors(json: string): React.ReactNode {
  try {
    const factors = JSON.parse(json) as string[];
    return factors.slice(0, 3).map((f: string) => (
      <Badge key={f} variant="outline" className="text-xs">{f.replace(/_/g, " ")}</Badge>
    ));
  } catch {
    return null;
  }
}

// ── Main component ─────────────────────────────────────────────────────────
export default function BtamCaseDetail() {
  const params = useParams<{ id: string }>();
  const caseId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();
  const { data, isLoading, refetch } = trpc.btam.getCase.useQuery(
    { caseId },
    { enabled: !!caseId }
  );

  // Assessment state
  const [factors, setFactors] = useState<WavrFactors>(defaultFactors);
  const [assessorNotes, setAssessorNotes] = useState("");
  const [attestation, setAttestation] = useState(false);
  const [assessmentOpen, setAssessmentOpen] = useState(false);

  const submitAssessment = trpc.btam.submitAssessment.useMutation({
    onSuccess: (result) => {
      toast.success(`Assessment saved — Concern level: ${result.scoring.computedConcernLevel.toUpperCase()} (score: ${result.scoring.totalWeightedScore})`);
      setAssessmentOpen(false);
      setFactors(defaultFactors);
      setAssessorNotes("");
      setAttestation(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Plan item state
  const [planOpen, setPlanOpen] = useState(false);
  const [interventionType, setInterventionType] = useState("");
  const [actionDescription, setActionDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const addPlanItem = trpc.btam.addPlanItem.useMutation({
    onSuccess: () => {
      toast.success("Plan item added");
      setPlanOpen(false);
      setInterventionType("");
      setActionDescription("");
      setDueDate("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const completePlanItem = trpc.btam.completePlanItem.useMutation({
    onSuccess: () => { toast.success("Item marked complete"); refetch(); },
  });

  // Note state
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteType, setNoteType] = useState("general");
  const [noteContent, setNoteContent] = useState("");
  const [notePrivileged, setNotePrivileged] = useState(false);

  const addNote = trpc.btam.addNote.useMutation({
    onSuccess: () => {
      toast.success("Note added");
      setNoteOpen(false);
      setNoteType("general");
      setNoteContent("");
      setNotePrivileged(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Status update
  const updateStatus = trpc.btam.updateCaseStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto p-6 text-center">
          <p className="text-slate-500">Case not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/btam")}>
            Back to BTAM Cases
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { case: c, subject, intake, latestAssessment, plan, notes, history } = data;

  // Fetch the linked incident report if one exists
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { data: linkedIncident } = trpc.btam.getLinkedIncident.useQuery(
    { incidentId: c.linkedIncidentId! },
    { enabled: !!c.linkedIncidentId }
  );

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/btam")} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Cases
          </Button>
          <div className="flex-1" />
          <Badge className={CONCERN_COLORS[c.concernLevel ?? "pending"]}>
            {(c.concernLevel ?? "pending").toUpperCase()}
          </Badge>
          <Badge className={STATUS_COLORS[c.status ?? "open"]}>
            {(c.status ?? "open").toUpperCase()}
          </Badge>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-indigo-600" />
              Case {c.caseNumber}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Opened {new Date(c.createdAt).toLocaleDateString()} ·{" "}
              {c.violenceType ? c.violenceType.replace(/_/g, " ") : "Type not specified"}
            </p>
          </div>
          <div className="flex gap-2">
            <Select
              value={c.status ?? "open"}
              onValueChange={(v) =>
                updateStatus.mutate({ caseId, status: v as any, reason: "Status updated by reviewer" })
              }
            >
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["open", "active", "monitoring", "closed", "archived"].map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="summary" className="gap-1.5">
              <User className="w-3.5 h-3.5" /> Summary
            </TabsTrigger>
            <TabsTrigger value="assessment" className="gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> Assessment
            </TabsTrigger>
            <TabsTrigger value="plan" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Management Plan
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Notes
            </TabsTrigger>
          </TabsList>

          {/* ── Summary Tab ── */}
          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Subject */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">Subject</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {subject ? (
                    <>
                      <Row label="Type" value={subject.subjectType?.replace(/_/g, " ") ?? "—"} />
                      <Row label="Name / Alias" value={subject.subjectAlias ?? (subject.nameKnown ? "Known (encrypted)" : "Unknown")} />
                      <Row label="Employment" value={subject.employmentStatus?.replace(/_/g, " ") ?? "—"} />
                      <Row label="Department" value={subject.department ?? "—"} />
                      <Row label="Location" value={subject.location ?? "—"} />
                      <Row label="Supervisor" value={subject.supervisorName ?? "—"} />
                      {subject.tenureYears != null && (
                        <Row label="Tenure" value={`${subject.tenureYears} yr${subject.tenureYears !== 1 ? "s" : ""}`} />
                      )}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {subject.recentDisciplinaryAction && <FlagBadge label="Recent Discipline" />}
                        {subject.pendingTermination && <FlagBadge label="Pending Termination" color="red" />}
                        {subject.grievanceFiled && <FlagBadge label="Grievance Filed" />}
                        {subject.domesticSituationKnown && <FlagBadge label="Domestic Situation" />}
                        {!subject.accessCredentialsActive && <FlagBadge label="Credentials Inactive" color="red" />}
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-400 italic">No subject information recorded.</p>
                  )}
                </CardContent>
              </Card>

              {/* Intake */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">Referral Intake</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {intake ? (
                    <>
                      <Row label="Reporter Role" value={intake.reporterRole?.replace(/_/g, " ") ?? "—"} />
                      {intake.dateOfConcern && <Row label="Date of Concern" value={new Date(intake.dateOfConcern).toLocaleDateString()} />}
                      {intake.locationOfConcern && <Row label="Location" value={intake.locationOfConcern} />}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {intake.weaponMentioned && <FlagBadge label="Weapon Mentioned" color="red" />}
                        {intake.targetIdentified && <FlagBadge label="Target Identified" color="red" />}
                        {intake.immediateThreathFelt && <FlagBadge label="Immediate Threat" color="red" />}
                        {intake.witnessesPresent && <FlagBadge label="Witnesses Present" />}
                        {intake.priorIncidentsKnown && <FlagBadge label="Prior Incidents" />}
                      </div>
                      <div className="mt-2 p-2 bg-slate-50 rounded text-slate-700 text-xs leading-relaxed">
                        {intake.concernDescription ?? "No description provided."}
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-400 italic">No intake information recorded.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Linked Incident Card */}
            {c.linkedIncidentId && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5" /> Linked Incident Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {linkedIncident ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <Row label="Type" value={linkedIncident.incidentType?.replace(/_/g, " ") ?? "—"} />
                        <Row label="Severity" value={linkedIncident.severity ?? "—"} />
                        <Row label="Status" value={linkedIncident.status?.replace(/_/g, " ") ?? "—"} />
                        {linkedIncident.facilityName && <Row label="Facility" value={linkedIncident.facilityName} />}
                        {linkedIncident.incidentDate && (
                          <Row label="Incident Date" value={new Date(linkedIncident.incidentDate).toLocaleDateString()} />
                        )}
                        <Row label="Reported" value={new Date(linkedIncident.createdAt).toLocaleDateString()} />
                      </div>
                      {linkedIncident.description && (
                        <div className="mt-2 p-2 bg-white rounded border border-amber-100 text-xs text-slate-700 leading-relaxed line-clamp-3">
                          {linkedIncident.description}
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1 gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-100"
                        onClick={() => navigate(`/incidents`)}
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View in Incident Dashboard
                      </Button>
                    </div>
                  ) : (
                    <p className="text-amber-700 text-xs">Incident #{c.linkedIncidentId} — loading or not accessible.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Status history */}
            {history && history.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Status History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="relative border-l border-slate-200 ml-2 space-y-3">
                    {history.map((h: any) => (
                      <li key={h.id} className="ml-4">
                        <div className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-indigo-400 border-2 border-white" />
                        <p className="text-xs text-slate-500">{new Date(h.changedAt).toLocaleString()}</p>
                        <p className="text-sm text-slate-700">
                          {h.previousStatus !== h.newStatus && (
                            <span>Status: <strong>{h.previousStatus}</strong> → <strong>{h.newStatus}</strong> · </span>
                          )}
                          {h.previousConcernLevel !== h.newConcernLevel && (
                            <span>Concern: <strong>{h.previousConcernLevel}</strong> → <strong>{h.newConcernLevel}</strong> · </span>
                          )}
                          {h.reason && <span className="text-slate-500">{h.reason}</span>}
                        </p>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Assessment Tab ── */}
          <TabsContent value="assessment" className="space-y-4">
            {latestAssessment && (
              <Card className="border-indigo-200 bg-indigo-50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wide">Latest Assessment</p>
                      <p className="text-sm text-slate-600">
                        {new Date(latestAssessment.assessedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-indigo-700">{latestAssessment.totalWeightedScore}</p>
                      <p className="text-xs text-indigo-500">Weighted Score</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={CONCERN_COLORS[latestAssessment.computedConcernLevel ?? "pending"]}>
                      {(latestAssessment.computedConcernLevel ?? "pending").toUpperCase()}
                    </Badge>
                    {latestAssessment.topContributingFactors != null && renderTopFactors(JSON.stringify(latestAssessment.topContributingFactors))}
                  </div>
                  {latestAssessment.assessorNotes && (
                    <p className="mt-2 text-sm text-slate-600 italic">{latestAssessment.assessorNotes}</p>
                  )}
                </CardContent>
              </Card>
            )}

            <Dialog open={assessmentOpen} onOpenChange={setAssessmentOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-indigo-700 hover:bg-indigo-800">
                  <Plus className="w-4 h-4" /> New WAVR-21 Assessment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>WAVR-21 Assessment — Case {c.caseNumber}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <p className="text-xs text-slate-500">
                    Rate each factor: <strong>0</strong> = Not present, <strong>1</strong> = Present/Mild, <strong>2</strong> = Significant/Severe.
                    Protective factors (Help Seeking, Social Support, Future Orientation) are scored inversely.
                  </p>
                  {(["Grievance", "Psychological", "Behavioral", "History", "Contextual", "Protective", "Imminent"] as const).map((cat) => (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{cat}</p>
                      <div className="space-y-2">
                        {WAVR_FACTORS.filter((f) => f.category === cat).map((f) => (
                          <div key={f.key} className="flex items-center justify-between gap-4">
                            <Label className="text-sm flex-1">{f.label}</Label>
                            <div className="flex gap-1">
                              {[0, 1, 2].map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => setFactors((prev) => ({ ...prev, [f.key]: v }))}
                                  className={`w-8 h-8 rounded text-sm font-medium border transition-colors ${
                                    factors[f.key] === v
                                      ? v === 0
                                        ? "bg-slate-200 border-slate-400 text-slate-700"
                                        : v === 1
                                        ? "bg-yellow-200 border-yellow-500 text-yellow-800"
                                        : "bg-red-200 border-red-500 text-red-800"
                                      : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                                  }`}
                                >
                                  {v}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div>
                    <Label>Assessor Notes</Label>
                    <Textarea
                      value={assessorNotes}
                      onChange={(e) => setAssessorNotes(e.target.value)}
                      placeholder="Clinical observations, context, rationale..."
                      rows={3}
                      className="mt-1 resize-none"
                    />
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="attestation"
                      checked={attestation}
                      onChange={(e) => setAttestation(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600 mt-0.5"
                    />
                    <label htmlFor="attestation" className="text-xs text-amber-800">
                      I attest that this assessment reflects my professional judgment based on available information and is subject to revision as new information emerges.
                    </label>
                  </div>
                  <Button
                    className="w-full bg-indigo-700 hover:bg-indigo-800"
                    disabled={!attestation || submitAssessment.isPending}
                    onClick={() =>
                      submitAssessment.mutate({
                        caseId,
                        factors,
                        assessorNotes: assessorNotes || undefined,
                        assessorAttestation: attestation,
                      })
                    }
                  >
                    {submitAssessment.isPending ? "Saving..." : "Submit Assessment"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ── Management Plan Tab ── */}
          <TabsContent value="plan" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-500">
                {plan?.length ?? 0} intervention{(plan?.length ?? 0) !== 1 ? "s" : ""} recorded
              </p>
              <Dialog open={planOpen} onOpenChange={setPlanOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 bg-indigo-700 hover:bg-indigo-800">
                    <Plus className="w-3.5 h-3.5" /> Add Intervention
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Management Plan Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <Label>Intervention Type *</Label>
                      <Select value={interventionType} onValueChange={setInterventionType}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(INTERVENTION_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Action Description *</Label>
                      <Textarea
                        value={actionDescription}
                        onChange={(e) => setActionDescription(e.target.value)}
                        placeholder="Describe the specific action to be taken..."
                        rows={3}
                        className="mt-1 resize-none"
                      />
                    </div>
                    <div>
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      className="w-full bg-indigo-700 hover:bg-indigo-800"
                      disabled={!interventionType || actionDescription.length < 5 || addPlanItem.isPending}
                      onClick={() =>
                        addPlanItem.mutate({
                          caseId,
                          interventionType: interventionType as any,
                          actionDescription,
                          dueDate: dueDate || undefined,
                        })
                      }
                    >
                      {addPlanItem.isPending ? "Adding..." : "Add Item"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {plan && plan.length > 0 ? (
              <div className="space-y-3">
                {plan.map((item: any) => (
                  <Card key={item.id} className={item.completed ? "opacity-60" : ""}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {INTERVENTION_LABELS[item.interventionType] ?? item.interventionType}
                            </Badge>
                            {item.completed && (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" /> Complete
                              </Badge>
                            )}
                            {item.dueDate && (
                              <span className="text-xs text-slate-400">
                                Due: {new Date(item.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700">{item.actionDescription}</p>
                          {item.completionNotes && (
                            <p className="text-xs text-slate-500 mt-1 italic">{item.completionNotes}</p>
                          )}
                        </div>
                        {!item.completed && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 text-xs"
                            onClick={() => completePlanItem.mutate({ itemId: item.id })}
                          >
                            Mark Complete
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No management plan items yet.</p>
              </div>
            )}
          </TabsContent>

          {/* ── Notes Tab ── */}
          <TabsContent value="notes" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-500">
                {notes?.length ?? 0} note{(notes?.length ?? 0) !== 1 ? "s" : ""}
              </p>
              <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 bg-indigo-700 hover:bg-indigo-800">
                    <Plus className="w-3.5 h-3.5" /> Add Note
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Case Note</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <Label>Note Type *</Label>
                      <Select value={noteType} onValueChange={setNoteType}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(NOTE_TYPE_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Content *</Label>
                      <Textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Enter your note..."
                        rows={5}
                        className="mt-1 resize-none"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="privileged"
                        checked={notePrivileged}
                        onChange={(e) => setNotePrivileged(e.target.checked)}
                        className="w-4 h-4 accent-indigo-600"
                      />
                      <label htmlFor="privileged" className="text-sm text-slate-700 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        Mark as privileged (TAT Admin only)
                      </label>
                    </div>
                    <Button
                      className="w-full bg-indigo-700 hover:bg-indigo-800"
                      disabled={noteContent.length < 5 || addNote.isPending}
                      onClick={() =>
                        addNote.mutate({
                          caseId,
                          noteType: noteType as any,
                          content: noteContent,
                          isPrivileged: notePrivileged,
                        })
                      }
                    >
                      {addNote.isPending ? "Saving..." : "Save Note"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {notes && notes.length > 0 ? (
              <div className="space-y-3">
                {notes.map((note: any) => (
                  <Card key={note.id}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {NOTE_TYPE_LABELS[note.noteType] ?? note.noteType}
                        </Badge>
                        {note.isPrivileged && (
                          <Badge className="bg-amber-100 text-amber-700 text-xs gap-1">
                            <Lock className="w-2.5 h-2.5" /> Privileged
                          </Badge>
                        )}
                        <span className="text-xs text-slate-400 ml-auto">
                          {new Date(note.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No notes yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ── Small helper components ────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-800 text-right capitalize">{value}</span>
    </div>
  );
}

function FlagBadge({ label, color = "slate" }: { label: string; color?: "slate" | "red" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        color === "red" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {color === "red" && <AlertTriangle className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}
