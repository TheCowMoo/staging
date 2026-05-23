import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Shield, AlertTriangle, CheckCircle2, Copy, ChevronRight,
  Lock, Heart, Stethoscope, Building2
} from "lucide-react";

const INCIDENT_TYPES = [
  {
    value: "threatening_behavior",
    label: "Threatening Behavior",
    icon: "🚨",
    desc: "Verbal or written threats, intimidation, or menacing conduct directed at a person",
  },
  {
    value: "suspicious_person",
    label: "Suspicious Person",
    icon: "🔍",
    desc: "Unknown or suspicious individual on or near the premises exhibiting concerning behaviour",
  },
  {
    value: "observed_safety_gap",
    label: "Observed Safety Gap",
    icon: "⚠️",
    desc: "A physical, procedural, or environmental safety concern that creates risk",
  },
  {
    value: "workplace_violence",
    label: "Workplace Violence",
    icon: "🛑",
    desc: "Physical assault, fighting, or violent act that occurred in the workplace",
  },
  {
    value: "other",
    label: "Other Incidents",
    icon: "📝",
    desc: "Any other safety or security concern not covered by the categories above",
  },
];

const SEVERITY_LEVELS = [
  { value: "low",      label: "Low",      desc: "Concern noted, no immediate danger",   color: "border-green-500 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200" },
  { value: "moderate", label: "Moderate", desc: "Situation warrants attention",         color: "border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200" },
  { value: "high",     label: "High",     desc: "Significant risk or harm occurred",    color: "border-orange-500 bg-orange-50 dark:bg-orange-950 text-orange-800 dark:text-orange-200" },
  { value: "critical", label: "Critical", desc: "Immediate danger or ongoing threat",   color: "border-red-600 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200" },
];

const REPORTER_ROLES = [
  "Employee", "Manager / Supervisor", "Visitor", "Contractor", "Student",
  "Patient / Client", "Volunteer", "Prefer not to say",
];

const INJURY_TYPES = [
  { value: "injury",        label: "Injury (cut, fracture, sprain, burn, etc.)" },
  { value: "skin_disorder", label: "Skin Disorder (dermatitis, rash, etc.)" },
  { value: "respiratory",   label: "Respiratory Condition (asthma, silicosis, etc.)" },
  { value: "poisoning",     label: "Poisoning (chemical, gas, etc.)" },
  { value: "hearing_loss",  label: "Hearing Loss" },
  { value: "other_illness", label: "Other Illness" },
  { value: "other_injury",  label: "Other Injury" },
];

const MEDICAL_TREATMENT = [
  { value: "first_aid_only",      label: "First Aid Only (no medical professional required)" },
  { value: "medical_treatment",   label: "Medical Treatment (physician/clinic visit)" },
  { value: "emergency_room",      label: "Emergency Room Visit" },
  { value: "hospitalized",        label: "Hospitalized Overnight" },
];

const BODY_PARTS = [
  "Head / Skull", "Face", "Eye(s)", "Ear(s)", "Neck", "Shoulder(s)", "Arm(s)",
  "Elbow(s)", "Wrist(s)", "Hand(s)", "Finger(s)", "Back / Spine", "Chest / Torso",
  "Abdomen", "Hip(s)", "Leg(s)", "Knee(s)", "Ankle(s)", "Foot / Feet", "Toe(s)",
  "Multiple Body Parts", "Other",
];

type Step = "type" | "facility" | "details" | "osha" | "parties" | "reporter" | "followup" | "review" | "submitted";

export default function ReportIncident() {
  const [step, setStep] = useState<Step>("type");
  const [trackingToken, setTrackingToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const [form, setForm] = useState({
    incidentType: "",
    severity: "",
    incidentDate: "",
    location: "",
    description: "",
    involvedParties: "",
    witnesses: "",
    priorIncidents: false,
    reportedToAuthorities: false,
    reporterRole: "",
    contactEmail: "",
    facilityId: 0,
    facilityName: "",
    // OSHA fields
    involvesInjuryOrIllness: false,
    injuryType: "",
    bodyPartAffected: "",
    injuryDescription: "",
    medicalTreatment: "",
    daysAwayFromWork: "",
    daysOnRestriction: "",
    lossOfConsciousness: false,
    workRelated: true,
    oshaRecordable: false,
    employeeName: "",
    employeeJobTitle: "",
    employeeDateOfBirth: "",
    employeeDateHired: "",
    physicianName: "",
    treatedInER: false,
    hospitalizedOvernight: false,
    // Follow-up request
    followUpRequested: null as boolean | null,
    followUpMethod: "" as "phone" | "email" | "in_person" | "",
    followUpContact: "",
    // Involved person name (for repeat detection)
    involvedPersonName: "",
  });

  const facilitiesQuery = trpc.facility.list.useQuery();

  const submit = trpc.incident.submit.useMutation({
    onSuccess: (data) => {
      setTrackingToken(data.trackingToken);
      setStep("submitted");
    },
    onError: (err) => {
      toast.error("Submission failed: " + err.message);
    },
  });

  const set = (field: string, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = () => {
    if (!form.incidentType || !form.severity || !form.description) {
      toast.error("Please complete all required fields.");
      return;
    }
    submit.mutate({
      facilityId: form.facilityId || undefined,
      facilityName: form.facilityName || undefined,
      incidentType: form.incidentType as "threatening_behavior" | "suspicious_person" | "observed_safety_gap" | "workplace_violence" | "other",
      severity: form.severity as "low" | "moderate" | "high" | "critical",
      incidentDate: form.incidentDate || undefined,
      location: form.location || undefined,
      description: form.description,
      involvedParties: form.involvedParties || undefined,
      witnesses: form.witnesses || undefined,
      priorIncidents: form.priorIncidents,
      reportedToAuthorities: form.reportedToAuthorities,
      reporterRole: form.reporterRole || undefined,
      contactEmail: form.contactEmail || undefined,
      involvesInjuryOrIllness: form.involvesInjuryOrIllness,
      injuryType: (form.injuryType as "injury" | "skin_disorder" | "respiratory" | "poisoning" | "hearing_loss" | "other_illness" | "other_injury") || undefined,
      bodyPartAffected: form.bodyPartAffected || undefined,
      injuryDescription: form.injuryDescription || undefined,
      medicalTreatment: (form.medicalTreatment as "first_aid_only" | "medical_treatment" | "emergency_room" | "hospitalized") || undefined,
      daysAwayFromWork: form.daysAwayFromWork ? parseInt(form.daysAwayFromWork) : undefined,
      daysOnRestriction: form.daysOnRestriction ? parseInt(form.daysOnRestriction) : undefined,
      lossOfConsciousness: form.lossOfConsciousness,
      workRelated: form.workRelated,
      oshaRecordable: form.oshaRecordable,
      employeeName: form.employeeName || undefined,
      employeeJobTitle: form.employeeJobTitle || undefined,
      employeeDateOfBirth: form.employeeDateOfBirth || undefined,
      employeeDateHired: form.employeeDateHired || undefined,
      physicianName: form.physicianName || undefined,
      treatedInER: form.treatedInER,
      hospitalizedOvernight: form.hospitalizedOvernight,
      followUpRequested: form.followUpRequested === true,
      followUpMethod: (form.followUpMethod as "phone" | "email" | "in_person") || undefined,
      followUpContact: form.followUpContact || undefined,
      involvedPersonName: form.involvedPersonName || undefined,
    });
  };

  const copyToken = () => {
    if (trackingToken) {
      navigator.clipboard.writeText(trackingToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

  const STEPS: Step[] = ["type", "facility", "details", "osha", "parties", "reporter", "followup", "review"];
  const stepIdx = STEPS.indexOf(step);
  const progress = stepIdx >= 0 ? Math.round(((stepIdx + 1) / STEPS.length) * 100) : 100;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-8 px-4">
      {/* Header */}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Anonymous Incident Report</h1>
            <p className="text-sm text-muted-foreground">Your identity is protected. Reports are reviewed by safety administrators only.</p>
          </div>
        </div>
        {step !== "submitted" && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Step {stepIdx + 1} of {STEPS.length}</span>
              <span>{progress}% complete</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-sm p-6">

        {/* ── STEP 1: Incident Type ── */}
        {step === "type" && (
          <div>
            <h2 className="text-lg font-semibold mb-1">What type of incident are you reporting?</h2>
            <p className="text-sm text-muted-foreground mb-4">Select the category that best describes the incident.</p>
            <div className="space-y-2 mb-6">
              {INCIDENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => set("incidentType", t.value)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    form.incidentType === t.value
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                      : "border-border hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{t.icon}</span>
                    <div>
                      <div className="font-medium text-foreground">{t.label}</div>
                      <div className="text-sm text-muted-foreground">{t.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {/* Severity */}
            <h3 className="font-medium mb-2">Severity Level</h3>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {SEVERITY_LEVELS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => set("severity", s.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    form.severity === s.value ? s.color + " border-current" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="font-medium text-sm">{s.label}</div>
                  <div className="text-xs opacity-75">{s.desc}</div>
                </button>
              ))}
            </div>
            <Button
              className="w-full"
              disabled={!form.incidentType || !form.severity}
              onClick={() => setStep("facility")}
            >
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* ── STEP 2: Facility ── */}
        {step === "facility" && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Which facility did this occur at?</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Select a facility if known, or enter the name manually. This is optional.</p>
            {facilitiesQuery.data && facilitiesQuery.data.length > 0 ? (
              <div className="mb-4">
                <Label className="mb-1 block">Select Facility</Label>
                <select
                  className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm"
                  value={form.facilityId || ""}
                  onChange={(e) => {
                    const id = parseInt(e.target.value);
                    const facility = facilitiesQuery.data?.find((f) => f.id === id);
                    set("facilityId", id || 0);
                    set("facilityName", facility?.name || "");
                  }}
                >
                  <option value="">-- Select a facility (optional) --</option>
                  {facilitiesQuery.data.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mb-4">
                <Label className="mb-1 block">Facility Name (optional)</Label>
                <Input
                  placeholder="e.g. Main Street Office, Downtown Branch..."
                  value={form.facilityName}
                  onChange={(e) => set("facilityName", e.target.value)}
                />
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("type")} className="flex-1">Back</Button>
              <Button className="flex-1" onClick={() => setStep("details")}>
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Incident Details ── */}
        {step === "details" && (
          <div>
            <h2 className="text-lg font-semibold mb-1">Describe the incident</h2>
            <p className="text-sm text-muted-foreground mb-4">Provide as much detail as you are comfortable sharing. Do not include your own name.</p>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block">Date of Incident</Label>
                  <Input type="date" value={form.incidentDate} onChange={(e) => set("incidentDate", e.target.value)} />
                </div>
                <div>
                  <Label className="mb-1 block">Location / Area</Label>
                  <Input placeholder="e.g. Parking lot, Lobby, Room 204" value={form.location} onChange={(e) => set("location", e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="mb-1 block">Description of Incident <span className="text-red-500">*</span></Label>
                <Textarea
                  placeholder="Describe what happened in as much detail as possible. What did you see, hear, or experience? What was the sequence of events?"
                  rows={5}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
                <p className={`text-xs mt-1 ${form.description.length < 10 ? "text-red-500 font-medium" : "text-green-600"}`}>
                  {form.description.length < 10
                    ? `${form.description.length}/10 characters — please provide at least 10 characters to continue`
                    : `${form.description.length} characters ✓`
                  }
                </p>
              </div>
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <input
                  type="checkbox"
                  id="priorIncidents"
                  checked={form.priorIncidents}
                  onChange={(e) => set("priorIncidents", e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="priorIncidents" className="text-sm text-amber-800 dark:text-amber-200">
                  There have been prior incidents or concerns of a similar nature at this location
                </label>
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <input
                  type="checkbox"
                  id="reportedToAuthorities"
                  checked={form.reportedToAuthorities}
                  onChange={(e) => set("reportedToAuthorities", e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="reportedToAuthorities" className="text-sm text-blue-800 dark:text-blue-200">
                  This incident has been reported to law enforcement or emergency services
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("facility")} className="flex-1">Back</Button>
              <Button
                className="flex-1"
                disabled={form.description.length < 10}
                onClick={() => setStep("osha")}
                title={form.description.length < 10 ? "Please enter at least 10 characters in the description" : undefined}
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: OSHA Recordability ── */}
        {step === "osha" && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Did this incident involve an injury or illness?</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              OSHA 29 CFR 1904 requires employers to record work-related injuries and illnesses. This section is optional but helps ensure compliance.
            </p>
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => set("involvesInjuryOrIllness", true)}
                className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  form.involvesInjuryOrIllness ? "border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200" : "border-border"
                }`}
              >
                Yes — injury or illness occurred
              </button>
              <button
                onClick={() => set("involvesInjuryOrIllness", false)}
                className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  !form.involvesInjuryOrIllness ? "border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200" : "border-border"
                }`}
              >
                No — no physical injury
              </button>
            </div>

            {form.involvesInjuryOrIllness && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">OSHA Form 301 — Injury & Illness Details</p>
                <div>
                  <Label className="mb-1 block">Type of Injury or Illness</Label>
                  <select
                    className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm"
                    value={form.injuryType}
                    onChange={(e) => set("injuryType", e.target.value)}
                  >
                    <option value="">-- Select type --</option>
                    {INJURY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="mb-1 block">Body Part(s) Affected</Label>
                  <select
                    className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm"
                    value={form.bodyPartAffected}
                    onChange={(e) => set("bodyPartAffected", e.target.value)}
                  >
                    <option value="">-- Select body part --</option>
                    {BODY_PARTS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="mb-1 block">Describe the injury/illness and how it occurred</Label>
                  <Textarea
                    placeholder="e.g. Strained lower back while lifting boxes. Employee slipped on wet floor and fell."
                    rows={3}
                    value={form.injuryDescription}
                    onChange={(e) => set("injuryDescription", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Medical Treatment Level</Label>
                  <select
                    className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm"
                    value={form.medicalTreatment}
                    onChange={(e) => set("medicalTreatment", e.target.value)}
                  >
                    <option value="">-- Select treatment --</option>
                    {MEDICAL_TREATMENT.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 block">Days Away from Work</Label>
                    <Input type="number" min="0" placeholder="0" value={form.daysAwayFromWork} onChange={(e) => set("daysAwayFromWork", e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1 block">Days on Restricted Duty</Label>
                    <Input type="number" min="0" placeholder="0" value={form.daysOnRestriction} onChange={(e) => set("daysOnRestriction", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="loc" checked={form.lossOfConsciousness} onChange={(e) => set("lossOfConsciousness", e.target.checked)} className="rounded" />
                    <label htmlFor="loc" className="text-sm">Loss of consciousness occurred</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="workRelated" checked={form.workRelated} onChange={(e) => set("workRelated", e.target.checked)} className="rounded" />
                    <label htmlFor="workRelated" className="text-sm">This injury/illness is work-related (occurred during work or due to work conditions)</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="oshaRecordable" checked={form.oshaRecordable} onChange={(e) => set("oshaRecordable", e.target.checked)} className="rounded" />
                    <label htmlFor="oshaRecordable" className="text-sm font-medium text-amber-700 dark:text-amber-400">This case meets OSHA recordability criteria (29 CFR 1904.7)</label>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Employee Information (Confidential — for OSHA 300 Log)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="mb-1 block text-xs">Employee Name</Label>
                      <Input placeholder="Full name" value={form.employeeName} onChange={(e) => set("employeeName", e.target.value)} />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Job Title</Label>
                      <Input placeholder="e.g. Warehouse Associate" value={form.employeeJobTitle} onChange={(e) => set("employeeJobTitle", e.target.value)} />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Date of Birth</Label>
                      <Input type="date" value={form.employeeDateOfBirth} onChange={(e) => set("employeeDateOfBirth", e.target.value)} />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Date Hired</Label>
                      <Input type="date" value={form.employeeDateHired} onChange={(e) => set("employeeDateHired", e.target.value)} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label className="mb-1 block text-xs">Physician / Health Care Professional</Label>
                    <Input placeholder="Name of treating physician or clinic" value={form.physicianName} onChange={(e) => set("physicianName", e.target.value)} />
                  </div>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="er" checked={form.treatedInER} onChange={(e) => set("treatedInER", e.target.checked)} className="rounded" />
                      <label htmlFor="er" className="text-sm">Treated in Emergency Room</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="hosp" checked={form.hospitalizedOvernight} onChange={(e) => set("hospitalizedOvernight", e.target.checked)} className="rounded" />
                      <label htmlFor="hosp" className="text-sm">Hospitalized Overnight</label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("details")} className="flex-1">Back</Button>
              <Button className="flex-1" onClick={() => setStep("parties")}>
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Parties Involved ── */}
        {step === "parties" && (
          <div>
            <h2 className="text-lg font-semibold mb-1">Persons involved</h2>
            <p className="text-sm text-muted-foreground mb-4">
              You do not need to provide names. Descriptions (role, department, physical description) are sufficient. Leave blank if you prefer.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <Label className="mb-1 block">Person(s) who caused or were involved in the incident</Label>
                <Textarea
                  placeholder="e.g. A male visitor in a red jacket, approximately 40 years old. A co-worker from the shipping department."
                  rows={3}
                  value={form.involvedParties}
                  onChange={(e) => set("involvedParties", e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1 block">Witnesses (if any)</Label>
                <Textarea
                  placeholder="e.g. Two employees were present in the break room. A security guard was nearby."
                  rows={2}
                  value={form.witnesses}
                  onChange={(e) => set("witnesses", e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("osha")} className="flex-1">Back</Button>
              <Button className="flex-1" onClick={() => setStep("reporter")}>
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 6: Reporter Info ── */}
        {step === "reporter" && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold">Your information (optional)</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              All fields on this page are completely optional. Your identity is protected. You may submit anonymously.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <Label className="mb-1 block">Your Role</Label>
                <select
                  className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm"
                  value={form.reporterRole}
                  onChange={(e) => set("reporterRole", e.target.value)}
                >
                  <option value="">-- Select role (optional) --</option>
                  {REPORTER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("parties")} className="flex-1">Back</Button>
              <Button className="flex-1" onClick={() => setStep("followup")}>
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 7: Follow-Up Request ── */}
        {step === "followup" && (
          <div>
            <h2 className="text-lg font-semibold mb-1">Follow-up preference</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Would you like someone to follow up with you about this report? This is entirely optional and will not affect how your report is handled.
            </p>
            {/* Yes / No toggle */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                onClick={() => set("followUpRequested", true)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  form.followUpRequested === true
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                    : "border-border hover:border-blue-400"
                }`}
              >
                <div className="font-semibold text-sm mb-0.5">Yes, I'd like a follow-up</div>
                <div className="text-xs text-muted-foreground">A safety administrator will reach out to you</div>
              </button>
              <button
                onClick={() => { set("followUpRequested", false); set("followUpMethod", ""); set("followUpContact", ""); }}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  form.followUpRequested === false
                    ? "border-slate-500 bg-slate-50 dark:bg-slate-900"
                    : "border-border hover:border-slate-400"
                }`}
              >
                <div className="font-semibold text-sm mb-0.5">No follow-up needed</div>
                <div className="text-xs text-muted-foreground">Submit anonymously with no contact</div>
              </button>
            </div>

            {/* Contact method — only shown if yes */}
            {form.followUpRequested === true && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border mb-4">
                <div>
                  <Label className="mb-2 block font-medium">Preferred contact method</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["phone", "email", "in_person"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => { set("followUpMethod", m); set("followUpContact", ""); }}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          form.followUpMethod === m
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                            : "border-border hover:border-blue-400"
                        }`}
                      >
                        {m === "phone" ? "📞 Phone" : m === "email" ? "✉️ Email" : "🤝 In-Person"}
                      </button>
                    ))}
                  </div>
                </div>
                {form.followUpMethod === "phone" && (
                  <div>
                    <Label className="mb-1 block text-sm">Best phone number to reach you</Label>
                    <Input
                      type="tel"
                      placeholder="e.g. (555) 123-4567"
                      value={form.followUpContact}
                      onChange={(e) => set("followUpContact", e.target.value)}
                    />
                  </div>
                )}
                {form.followUpMethod === "email" && (
                  <div>
                    <Label className="mb-1 block text-sm">Best email address</Label>
                    <Input
                      type="email"
                      placeholder="e.g. yourname@example.com"
                      value={form.followUpContact}
                      onChange={(e) => set("followUpContact", e.target.value)}
                    />
                  </div>
                )}
                {form.followUpMethod === "in_person" && (
                  <div>
                    <Label className="mb-1 block text-sm">Best way to find / meet you</Label>
                    <Input
                      placeholder="e.g. Warehouse floor, morning shift, ask for John"
                      value={form.followUpContact}
                      onChange={(e) => set("followUpContact", e.target.value)}
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  <Lock className="w-3 h-3 inline mr-1" />
                  Contact details are only shared with the safety administrator reviewing your report.
                </p>
              </div>
            )}

            {/* Involved person name for repeat tracking */}
            <div className="mb-5">
              <Label className="mb-1 block font-medium">Name of person involved (optional)</Label>
              <Input
                placeholder="First and last name, if known and you are comfortable sharing"
                value={form.involvedPersonName}
                onChange={(e) => set("involvedPersonName", e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Providing a name helps administrators identify repeat incidents involving the same individual. Leave blank to remain fully anonymous.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("reporter")} className="flex-1">Back</Button>
              <Button
                className="flex-1"
                onClick={() => setStep("review")}
                disabled={form.followUpRequested === null}
              >
                Review Report <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 8: Review ── */}
        {step === "review" && (
          <div>
            <h2 className="text-lg font-semibold mb-1">Review your report</h2>
            <p className="text-sm text-muted-foreground mb-4">Please review the details below before submitting.</p>
            <div className="space-y-3 mb-6 text-sm">
              <div className="p-3 bg-muted/40 rounded-lg">
                <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-1">Incident Type & Severity</div>
                <div>{INCIDENT_TYPES.find((t) => t.value === form.incidentType)?.label} — {form.severity.charAt(0).toUpperCase() + form.severity.slice(1)}</div>
              </div>
              {form.facilityName && (
                <div className="p-3 bg-muted/40 rounded-lg">
                  <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-1">Facility</div>
                  <div>{form.facilityName}</div>
                </div>
              )}
              <div className="p-3 bg-muted/40 rounded-lg">
                <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-1">Date & Location</div>
                <div>{form.incidentDate || "Not specified"} — {form.location || "Not specified"}</div>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-1">Description</div>
                <div className="whitespace-pre-wrap">{form.description}</div>
              </div>
              {form.involvesInjuryOrIllness && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="font-medium text-amber-800 dark:text-amber-200 text-xs uppercase tracking-wide mb-1">OSHA Recordable Incident</div>
                  <div className="text-amber-700 dark:text-amber-300">
                    {INJURY_TYPES.find((t) => t.value === form.injuryType)?.label || "Injury/illness"} — {form.bodyPartAffected || "body part not specified"}
                    {form.oshaRecordable && " — Marked as OSHA recordable"}
                  </div>
                </div>
              )}
              <div className="p-3 bg-muted/40 rounded-lg">
                <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-1">Reported to Authorities</div>
                <div>{form.reportedToAuthorities ? "Yes" : "No"}</div>
              </div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg mb-4 text-sm text-green-800 dark:text-green-200">
              <Lock className="w-4 h-4 inline mr-1" />
              Your report will be submitted anonymously. You will receive a tracking token to check the status of your report.
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("reporter")} className="flex-1">Back</Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleSubmit}
                disabled={submit.isPending}
              >
                {submit.isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </div>
        )}

        {/* ── SUBMITTED ── */}
        {step === "submitted" && trackingToken && (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Report Submitted</h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Your report has been received and will be reviewed by safety administrators. Your identity remains protected.
            </p>
            <div className="p-4 bg-muted/40 rounded-lg border border-border mb-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Your Tracking Token — save this to check your report status</p>
              <div className="flex items-center gap-2 justify-center">
                <code className="text-lg font-mono font-bold tracking-wider text-foreground">{trackingToken}</code>
                <button onClick={copyToken} className="p-1.5 hover:bg-muted rounded">
                  {tokenCopied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200 mb-4">
              <Heart className="w-4 h-4 inline mr-1" />
              If you are in immediate danger, please call <strong>911</strong> immediately.
            </div>
            <Button variant="outline" onClick={() => window.location.href = "/check-report"} className="w-full">
              Check Report Status
            </Button>
          </div>
        )}
      </div>

      {/* Privacy notice */}
      {step !== "submitted" && (
        <div className="w-full max-w-2xl mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>
            This form is anonymous. No identifying information is required. Reports are stored securely and accessible only to authorized safety administrators.
            OSHA information provided is kept strictly confidential per 29 CFR 1904.29(b)(6).
          </span>
        </div>
      )}
    </div>
  );
}
