import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Lock,
  User,
  FileText,
  CheckCircle,
} from "lucide-react";

const STEPS = [
  { id: "safety", label: "Safety Check" },
  { id: "reporter", label: "Reporter Info" },
  { id: "subject", label: "Subject Info" },
  { id: "incident", label: "Incident Details" },
  { id: "review", label: "Review & Submit" },
];

type FormData = {
  // Safety
  immediateDanger: boolean | null;
  // Reporter
  isAnonymous: boolean;
  reporterRole: string;
  reporterContact: string;
  // Subject
  subjectType: string;
  nameKnown: boolean;
  subjectAlias: string;
  employmentStatus: string;
  department: string;
  location: string;
  supervisorName: string;
  tenureYears: string;
  recentDisciplinaryAction: boolean;
  pendingTermination: boolean;
  grievanceFiled: boolean;
  domesticSituationKnown: boolean;
  accessCredentialsActive: boolean;
  // Incident
  violenceType: string;
  concernDescription: string;
  dateOfConcern: string;
  locationOfConcern: string;
  witnessesPresent: boolean;
  immediateThreathFelt: boolean;
  weaponMentioned: boolean;
  targetIdentified: boolean;
  targetDescription: string;
  priorIncidentsKnown: boolean;
  priorIncidentsDescription: string;
  linkedIncidentId: string;
};

const defaultForm: FormData = {
  immediateDanger: null,
  isAnonymous: false,
  reporterRole: "",
  reporterContact: "",
  subjectType: "",
  nameKnown: false,
  subjectAlias: "",
  employmentStatus: "",
  department: "",
  location: "",
  supervisorName: "",
  tenureYears: "",
  recentDisciplinaryAction: false,
  pendingTermination: false,
  grievanceFiled: false,
  domesticSituationKnown: false,
  accessCredentialsActive: true,
  violenceType: "",
  concernDescription: "",
  dateOfConcern: "",
  locationOfConcern: "",
  witnessesPresent: false,
  immediateThreathFelt: false,
  weaponMentioned: false,
  targetIdentified: false,
  targetDescription: "",
  priorIncidentsKnown: false,
  priorIncidentsDescription: "",
  linkedIncidentId: "",
};

export default function BtamIntake() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  // Pre-fill linkedIncidentId from URL query param (?incidentId=123)
  const prefilledIncidentId = new URLSearchParams(window.location.search).get("incidentId") ?? "";
  const [form, setForm] = useState<FormData>({ ...defaultForm, linkedIncidentId: prefilledIncidentId });
  const [submitted, setSubmitted] = useState(false);
  const [newCaseId, setNewCaseId] = useState<number | null>(null);

  const createReferral = trpc.btam.createReferral.useMutation({
    onSuccess: (data) => {
      setNewCaseId(data.caseId);
      setSubmitted(true);
    },
  });

  const update = (field: keyof FormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    createReferral.mutate({
      reporterRole: (form.isAnonymous ? "anonymous" : form.reporterRole || "anonymous") as any,
      concernDescription: form.concernDescription,
      dateOfConcern: form.dateOfConcern || undefined,
      locationOfConcern: form.locationOfConcern || undefined,
      witnessesPresent: form.witnessesPresent,
      immediateThreathFelt: form.immediateThreathFelt,
      weaponMentioned: form.weaponMentioned,
      targetIdentified: form.targetIdentified,
      targetDescription: form.targetDescription || undefined,
      priorIncidentsKnown: form.priorIncidentsKnown,
      priorIncidentsDescription: form.priorIncidentsDescription || undefined,
      subjectType: form.subjectType as any,
      nameKnown: form.nameKnown,
      subjectAlias: form.subjectAlias || undefined,
      employmentStatus: form.employmentStatus as any || undefined,
      department: form.department || undefined,
      location: form.location || undefined,
      supervisorName: form.supervisorName || undefined,
      tenureYears: form.tenureYears ? parseFloat(form.tenureYears) : undefined,
      recentDisciplinaryAction: form.recentDisciplinaryAction,
      pendingTermination: form.pendingTermination,
      grievanceFiled: form.grievanceFiled,
      domesticSituationKnown: form.domesticSituationKnown,
      accessCredentialsActive: form.accessCredentialsActive,
      violenceType: form.violenceType as any || undefined,
      isAnonymousReporter: form.isAnonymous,
      linkedIncidentId: form.linkedIncidentId ? parseInt(form.linkedIncidentId) : undefined,
    });
  };

  if (submitted) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Referral Submitted
          </h2>
          <p className="text-slate-500 mb-6">
            The case has been created and assigned a confidential case number. The
            TAT will review this referral and take appropriate action.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate("/btam")}
            >
              Back to Dashboard
            </Button>
            {newCaseId && (
              <Button
                className="bg-indigo-700 hover:bg-indigo-800"
                onClick={() => navigate(`/btam/${newCaseId}`)}
              >
                View Case
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Shield className="w-6 h-6 text-indigo-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">New BTAM Referral</h1>
          <p className="text-sm text-slate-500">
            Confidential — Authorized Personnel Only
          </p>
        </div>
        <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">
          <Lock className="w-3 h-3" />
          <span>Restricted</span>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 flex-shrink-0">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step
                  ? "bg-indigo-700 text-white"
                  : i < step
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">
                {i + 1}
              </span>
              {s.label}
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
        {/* ── Step 0: Safety Check ── */}
        {step === 0 && (
          <div>
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-800 mb-1">
                  Safety Check — Required
                </p>
                <p className="text-sm text-red-700">
                  If there is an <strong>immediate threat to life</strong>, do NOT
                  use this form. Call <strong>911</strong> immediately, then notify
                  your security team and facility leadership.
                </p>
              </div>
            </div>
            <p className="font-medium text-slate-800 mb-4">
              Is there an immediate danger to any person right now?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  update("immediateDanger", true);
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  form.immediateDanger === true
                    ? "border-red-500 bg-red-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="font-semibold text-red-700">Yes — Immediate Danger</p>
                <p className="text-xs text-slate-500 mt-1">
                  Stop. Call 911 now. This form is not appropriate.
                </p>
              </button>
              <button
                onClick={() => update("immediateDanger", false)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  form.immediateDanger === false
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="font-semibold text-slate-800">
                  No — Concerning Behavior
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  No immediate threat, but behavior warrants assessment.
                </p>
              </button>
            </div>
            {form.immediateDanger === true && (
              <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-xl text-center">
                <p className="font-bold text-red-800 text-lg">Call 911 Now</p>
                <p className="text-sm text-red-700 mt-1">
                  Do not submit this form. Contact emergency services immediately.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 1: Reporter Info ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-800">Reporter Information</h3>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <input
                type="checkbox"
                id="anon"
                checked={form.isAnonymous}
                onChange={(e) => update("isAnonymous", e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
              <label htmlFor="anon" className="text-sm font-medium text-slate-700">
                Submit anonymously (your identity will not be recorded)
              </label>
            </div>
            {!form.isAnonymous && (
              <>
                <div>
                  <Label>Your Role</Label>
                  <Select
                    value={form.reporterRole}
                    onValueChange={(v) => update("reporterRole", v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="manager">Manager / Supervisor</SelectItem>
                      <SelectItem value="coworker">Coworker</SelectItem>
                      <SelectItem value="self">Self</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Best Contact Method</Label>
                  <Input
                    value={form.reporterContact}
                    onChange={(e) => update("reporterContact", e.target.value)}
                    placeholder="Phone or email"
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 2: Subject Info ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-800">Subject Information</h3>
              <span className="text-xs text-slate-400 ml-auto">
                PII is encrypted at rest
              </span>
            </div>
            <div>
              <Label>Subject Type *</Label>
              <Select
                value={form.subjectType}
                onValueChange={(v) => update("subjectType", v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="former_employee">Former Employee</SelectItem>
                  <SelectItem value="customer_client">Customer / Client</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="visitor">Visitor</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <input
                type="checkbox"
                id="nameKnown"
                checked={form.nameKnown}
                onChange={(e) => update("nameKnown", e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
              <label
                htmlFor="nameKnown"
                className="text-sm font-medium text-slate-700"
              >
                Subject identity is known
              </label>
            </div>
            {form.nameKnown && (
              <div>
                <Label>Subject Name or Alias</Label>
                <Input
                  value={form.subjectAlias}
                  onChange={(e) => update("subjectAlias", e.target.value)}
                  placeholder="Name or identifier (encrypted at rest)"
                  className="mt-1"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Department</Label>
                <Input
                  value={form.department}
                  onChange={(e) => update("department", e.target.value)}
                  placeholder="e.g., Operations"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Location / Facility</Label>
                <Input
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="e.g., Main Campus"
                  className="mt-1"
                />
              </div>
            </div>
            {(form.subjectType === "employee" ||
              form.subjectType === "former_employee") && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Employment Status</Label>
                    <Select
                      value={form.employmentStatus}
                      onValueChange={(v) => update("employmentStatus", v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                        <SelectItem value="never_employed">Never Employed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Supervisor Name</Label>
                    <Input
                      value={form.supervisorName}
                      onChange={(e) => update("supervisorName", e.target.value)}
                      placeholder="Supervisor"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tenure (years)</Label>
                    <Input
                      type="number"
                      value={form.tenureYears}
                      onChange={(e) => update("tenureYears", e.target.value)}
                      placeholder="e.g., 3.5"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">
                    Known Risk Factors
                  </p>
                  {[
                    {
                      key: "recentDisciplinaryAction",
                      label: "Recent disciplinary action",
                    },
                    {
                      key: "pendingTermination",
                      label: "Pending termination or layoff",
                    },
                    { key: "grievanceFiled", label: "Grievance filed" },
                    {
                      key: "domesticSituationKnown",
                      label: "Known domestic situation concerns",
                    },
                    {
                      key: "accessCredentialsActive",
                      label: "Access credentials still active",
                    },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={key}
                        checked={form[key as keyof FormData] as boolean}
                        onChange={(e) => update(key as keyof FormData, e.target.checked)}
                        className="w-4 h-4 accent-indigo-600"
                      />
                      <label
                        htmlFor={key}
                        className="text-sm text-slate-700"
                      >
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 3: Incident Details ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-800">Incident Details</h3>
            </div>
            <div>
              <Label>Type of Violence Concern *</Label>
              <Select
                value={form.violenceType}
                onValueChange={(v) => update("violenceType", v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="type_i_criminal">
                    Type I — Criminal Intent
                  </SelectItem>
                  <SelectItem value="type_ii_client">
                    Type II — Customer / Client
                  </SelectItem>
                  <SelectItem value="type_iii_worker_on_worker">
                    Type III — Worker-on-Worker
                  </SelectItem>
                  <SelectItem value="type_iv_personal_relationship">
                    Type IV — Personal Relationship
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Concern Description *</Label>
              <Textarea
                value={form.concernDescription}
                onChange={(e) => update("concernDescription", e.target.value)}
                placeholder="Describe the behavior, statements, or events that prompted this referral. Include dates, locations, and witnesses if known."
                rows={5}
                className="mt-1 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date of Concern</Label>
                <Input
                  type="date"
                  value={form.dateOfConcern}
                  onChange={(e) => update("dateOfConcern", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Location of Concern</Label>
                <Input
                  value={form.locationOfConcern}
                  onChange={(e) => update("locationOfConcern", e.target.value)}
                  placeholder="e.g., Break room, Parking lot"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">
                Additional Risk Indicators
              </p>
              {[
                { key: "priorIncidentsKnown", label: "Prior incidents or complaints on record" },
                { key: "weaponMentioned", label: "Weapon mentioned or suspected access" },
                { key: "witnessesPresent", label: "Witnesses were present" },
                { key: "immediateThreathFelt", label: "Immediate threat was felt" },
                { key: "targetIdentified", label: "A specific target was identified" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={key}
                    checked={form[key as keyof FormData] as boolean}
                    onChange={(e) => update(key as keyof FormData, e.target.checked)}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <label htmlFor={key} className="text-sm text-slate-700">
                    {label}
                  </label>
                </div>
              ))}
            </div>
            {form.priorIncidentsKnown && (
              <div>
                <Label>Prior Incidents Description</Label>
                <Textarea
                  value={form.priorIncidentsDescription}
                  onChange={(e) =>
                    update("priorIncidentsDescription", e.target.value)
                  }
                  placeholder="Describe prior incidents..."
                  rows={3}
                  className="mt-1 resize-none"
                />
              </div>
            )}
            {form.targetIdentified && (
              <div>
                <Label>Target Description</Label>
                <Input
                  value={form.targetDescription}
                  onChange={(e) => update("targetDescription", e.target.value)}
                  placeholder="Describe the identified target"
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label>Linked Incident Report ID (optional)</Label>
              <Input
                type="number"
                value={form.linkedIncidentId}
                onChange={(e) => update("linkedIncidentId", e.target.value)}
                placeholder="Enter incident report ID to link"
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* ── Step 4: Review ── */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800 mb-4">
              Review & Submit
            </h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Reporter
                </p>
                <p className="text-slate-800">
                  {form.isAnonymous
                    ? "Anonymous submission"
                    : (form.reporterRole ? form.reporterRole.replace(/_/g, " ") : "Not provided")}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Subject
                </p>
                <p className="text-slate-800">
                  {form.subjectType.replace(/_/g, " ") || "Not specified"}
                  {form.nameKnown && form.subjectAlias
                    ? ` — ${form.subjectAlias}`
                    : ""}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Violence Type
                </p>
                <p className="text-slate-800">
                  {form.violenceType.replace(/_/g, " ") || "Not specified"}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Concern Description
                </p>
                <p className="text-slate-800 whitespace-pre-wrap">
                  {form.concernDescription || "—"}
                </p>
              </div>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                By submitting this referral, you confirm that the information
                provided is accurate to the best of your knowledge and that you
                understand this information is strictly confidential and will be
                used solely for threat assessment purposes.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? navigate("/btam") : setStep(step - 1))}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            className="gap-2 bg-indigo-700 hover:bg-indigo-800"
            disabled={
              (step === 0 && form.immediateDanger !== false) ||
              (step === 2 && !form.subjectType) ||
              (step === 3 && !form.concernDescription)
            }
            onClick={() => setStep(step + 1)}
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            className="gap-2 bg-indigo-700 hover:bg-indigo-800"
            disabled={createReferral.isPending}
            onClick={handleSubmit}
          >
            {createReferral.isPending ? "Submitting..." : "Submit Referral"}
          </Button>
        )}
      </div>
    </div>
  );
}
