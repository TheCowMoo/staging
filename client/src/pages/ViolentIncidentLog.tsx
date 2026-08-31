import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldAlert, Lock, CalendarClock } from "lucide-react";

const VIOLENCE_TYPES = [
  { value: "type_i_criminal", label: "Type 1: Criminal Intent", desc: "Violence by a stranger with no legitimate business relationship (e.g. robbery, shoplifting gone violent, trespassing)." },
  { value: "type_ii_client", label: "Type 2: Customer / Client", desc: "Violence directed at employees by clients, patients, students, or visitors." },
  { value: "type_iii_worker_on_worker", label: "Type 3: Worker-on-Worker", desc: "Violence between coworkers, supervisors, or managers." },
  { value: "type_iv_personal_relationship", label: "Type 4: Personal Relationship", desc: "Violence by someone with a personal relationship to an employee (e.g. domestic violence spilling into the workplace)." },
];

const PERP_CATEGORIES = [
  { value: "customer_client", label: "Customer / Client / Patient / Visitor / Student" },
  { value: "current_employee", label: "Current Employee / Supervisor / Manager" },
  { value: "former_employee", label: "Former Employee" },
  { value: "personal_relationship", label: "Intimate Partner / Relative / Friend of an Employee" },
  { value: "stranger", label: "Stranger / Trespasser with criminal intent" },
  { value: "other_unknown", label: "Other / Unknown" },
];

const CHARACTERISTICS = ["Verbal Threat", "Written / Digital Threat", "Physical Assault (Unarmed)", "Physical Assault (With Weapon)", "Sexual Assault / Threat of Sexual Assault", "Animal Attack"];

const WEAPON_TYPES = [
  { value: "none", label: "None (physical force or threat only)" },
  { value: "firearm", label: "Firearm" },
  { value: "edged", label: "Edged weapon (knife, box cutter, blade)" },
  { value: "blunt", label: "Blunt object / improvised weapon" },
  { value: "chemical", label: "Chemical agent (pepper spray, tear gas)" },
  { value: "other", label: "Other" },
];

const ENV_FACTORS = ["Employee was working alone / isolated", "Incident occurred during night / early morning hours", "Poor or insufficient lighting", "Cash handling / financial transaction in progress", "Low staffing levels", "High-stress or escalated customer dispute", "Community / public-facing environment", "Performing routine, everyday duties", "Employee was rushed / under severe time pressure"];

const INDUSTRY_OPTS: Record<string, string[]> = {
  healthcare: ["Patient clinical status involved (altered mental state, dementia, drug interaction)", "High-risk triage or waiting area"],
  retail: ["Active shoplifting / theft intervention", "Refusal of service / alcohol cut-off", "Alone at Point-of-Sale (POS) terminal"],
  education: ["Active classroom disruption", "After-school athletic / public event"],
  logistics: ["Working on private residential property", "Isolated public roadway or remote delivery site"],
};

type LogForm = {
  incidentDate: string; incidentTime: string; location: string;
  violenceType: string; perpetratorCategory: string;
  characteristics: string[]; weaponType: string; weaponOther: string;
  environmentalFactors: string[]; industryCircumstances: string[];
  narrative: string; lawEnforcementContacted: boolean;
  leAgencyName: string; policeReportNumber: string;
  protectiveActions: string; hazardEvaluation: string; correctiveActions: string;
};

const EMPTY_FORM: LogForm = {
  incidentDate: "", incidentTime: "", location: "",
  violenceType: "", perpetratorCategory: "",
  characteristics: [], weaponType: "", weaponOther: "",
  environmentalFactors: [], industryCircumstances: [],
  narrative: "", lawEnforcementContacted: false,
  leAgencyName: "", policeReportNumber: "",
  protectiveActions: "", hazardEvaluation: "", correctiveActions: "",
};

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function ViolentIncidentLog() {
  const { user } = useAuth();
  const isAdmin = !!user && ["ultra_admin", "admin", "super_admin"].includes(user.role);
  const { data: memberships } = trpc.org.myMemberships.useQuery(undefined, { enabled: !!user });
  const orgId = memberships?.[0]?.orgId;

  const [form, setForm] = useState<LogForm>(EMPTY_FORM);
  const set = (k: keyof LogForm, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const myRequests = trpc.violentIncidentLog.listMyRequests.useQuery(undefined, { enabled: !!user });
  const requestLog = trpc.violentIncidentLog.requestLog.useMutation({
    onSuccess: () => { toast.success("Log requested. Your organization must provide it within 15 calendar days."); myRequests.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const logs = trpc.violentIncidentLog.list.useQuery({ orgId }, { enabled: isAdmin && !!orgId });
  const requests = trpc.violentIncidentLog.listRequests.useQuery({ orgId }, { enabled: isAdmin && !!orgId });
  const fulfill = trpc.violentIncidentLog.fulfillRequest.useMutation({
    onSuccess: () => { toast.success("Request marked as fulfilled."); requests.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const create = trpc.violentIncidentLog.create.useMutation({
    onSuccess: () => { toast.success("Log entry saved."); logs.refetch(); setForm(EMPTY_FORM); },
    onError: (e) => toast.error(e.message),
  });


  const submitLog = () => {
    create.mutate({
      orgId,
      incidentDate: form.incidentDate || undefined,
      incidentTime: form.incidentTime || undefined,
      location: form.location || undefined,
      violenceType: (form.violenceType || undefined) as any,
      perpetratorCategory: (form.perpetratorCategory || undefined) as any,
      characteristics: form.characteristics.length ? form.characteristics : undefined,
      weaponType: (form.weaponType || undefined) as any,
      weaponOther: form.weaponOther || undefined,
      environmentalFactors: form.environmentalFactors.length ? form.environmentalFactors : undefined,
      industryCircumstances: form.industryCircumstances.length ? form.industryCircumstances : undefined,
      narrative: form.narrative || undefined,
      lawEnforcementContacted: form.lawEnforcementContacted,
      leAgencyName: form.leAgencyName || undefined,
      policeReportNumber: form.policeReportNumber || undefined,
      protectiveActions: form.protectiveActions || undefined,
      hazardEvaluation: form.hazardEvaluation || undefined,
      correctiveActions: form.correctiveActions || undefined,
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-red-600" /> Violent Incident Report Log
        </h1>
        <p className="text-sm text-muted-foreground mt-1">California Labor Code §6401.9 (Senate Bill 553)</p>
      </div>

      {/* Compliance banner */}
      <div className="rounded-md border border-red-200 bg-red-50/60 px-4 py-3 text-xs text-red-800 space-y-1">
        <p className="font-medium flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> PII-free compliance log</p>
        <p>Do NOT enter names, phone numbers, addresses, or identifying details of victims, witnesses, or perpetrators. Use generalized terms (e.g. "Cashier 1", "Customer A").</p>
        <p>Records are retained for a minimum of 5 years and cannot be deleted.</p>
      </div>

      {/* Log requests: employees request a copy; admins track org requests (org-scoped) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            {isAdmin ? "Employee Log Requests" : "Request a copy of the log"}
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? "California law requires your organization to provide a copy of this log within 15 calendar days of an employee's request."
              : "You have the right to request a copy of this log. Your employer is legally required to provide it within 15 calendar days."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isAdmin && (
            <Button onClick={() => requestLog.mutate({ orgId })} disabled={requestLog.isPending || !orgId}>
              {requestLog.isPending ? "Submitting..." : "Request a copy (15-day deadline)"}
            </Button>
          )}

          {isAdmin ? (
            <>
              <p className="font-medium text-sm">Pending Employee Requests</p>
              {requests.data && requests.data.length === 0 && <p className="text-xs text-muted-foreground">No requests yet.</p>}
              {requests.data?.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                  <div>
                    <p className="font-medium">Requested {new Date(r.requestedAt).toLocaleString()}</p>
                    <p className="text-muted-foreground">Due {r.dueAt ? new Date(r.dueAt).toLocaleDateString() : "N/A"} · {r.status}</p>
                  </div>
                  {r.status === "pending" && (
                    <Button size="sm" variant="outline" onClick={() => fulfill.mutate({ id: r.id })}>Mark fulfilled</Button>
                  )}
                </div>
              ))}
            </>
          ) : (
            myRequests.data && myRequests.data.length > 0 && (
              <div className="space-y-2 text-sm">
                <p className="font-medium">My Request History</p>
                {myRequests.data.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                    <span>Requested {new Date(r.requestedAt).toLocaleDateString()}</span>
                    <span className={r.status === "fulfilled" ? "text-green-600" : "text-amber-600"}>
                      {r.status === "fulfilled" ? "Fulfilled" : `Due ${r.dueAt ? new Date(r.dueAt).toLocaleDateString() : "N/A"}`}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {isAdmin && orgId && (
      <>      {/* Admin: New log entry form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log an incident</CardTitle>
          <CardDescription>Complete the required fields. Use generalized identifiers only — no names or contact details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Timing &amp; Location</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1 block">Date incident occurred</Label><Input type="date" value={form.incidentDate} onChange={(e) => set("incidentDate", e.target.value)} /></div>
              <div><Label className="mb-1 block">Time incident occurred</Label><Input type="time" value={form.incidentTime} onChange={(e) => set("incidentTime", e.target.value)} /></div>
            </div>
            <div><Label className="mb-1 block">Specific physical location</Label><Input placeholder="e.g. Breakroom, South Parking Lot, Loading Dock 2" value={form.location} onChange={(e) => set("location", e.target.value)} /></div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Workplace Violence Classification</h3>
            {VIOLENCE_TYPES.map((t) => (
              <label key={t.value} className="flex items-start gap-2 rounded-md border border-border p-3 cursor-pointer">
                <input type="radio" name="violenceType" checked={form.violenceType === t.value} onChange={() => set("violenceType", t.value)} className="mt-1" />
                <span><span className="font-medium">{t.label}</span> <span className="text-muted-foreground">{t.desc}</span></span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Perpetrator Classification</h3>
            {PERP_CATEGORIES.map((p) => (
              <label key={p.value} className="flex items-center gap-2 rounded-md border border-border p-3 cursor-pointer">
                <input type="radio" name="perp" checked={form.perpetratorCategory === p.value} onChange={() => set("perpetratorCategory", p.value)} />
                <span>{p.label}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Incident Characteristics (select all that apply)</h3>
            {CHARACTERISTICS.map((c) => (
              <label key={c} className="flex items-center gap-2">
                <input type="checkbox" checked={form.characteristics.includes(c)} onChange={() => set("characteristics", toggleInList(form.characteristics, c))} />
                <span>{c}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Weapons Involved</h3>
            {WEAPON_TYPES.map((w) => (
              <label key={w.value} className="flex items-center gap-2 rounded-md border border-border p-3 cursor-pointer">
                <input type="radio" name="weapon" checked={form.weaponType === w.value} onChange={() => set("weaponType", w.value)} />
                <span>{w.label}</span>
              </label>
            ))}
            {form.weaponType === "other" && (
              <Input placeholder="Specify weapon type" value={form.weaponOther} onChange={(e) => set("weaponOther", e.target.value)} />
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Environmental &amp; Work Circumstances (select all that apply)</h3>
            {ENV_FACTORS.map((f) => (
              <label key={f} className="flex items-center gap-2">
                <input type="checkbox" checked={form.environmentalFactors.includes(f)} onChange={() => set("environmentalFactors", toggleInList(form.environmentalFactors, f))} />
                <span>{f}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Industry-Specific Circumstances</h3>
            {Object.entries(INDUSTRY_OPTS).flatMap(([, opts]) => opts).map((opt) => (
              <label key={opt} className="flex items-center gap-2">
                <input type="checkbox" checked={form.industryCircumstances.includes(opt)} onChange={() => set("industryCircumstances", toggleInList(form.industryCircumstances, opt))} />
                <span>{opt}</span>
              </label>
            ))}
          </div>

          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Objective Incident Narrative</h3>
            <p className="text-xs text-muted-foreground">Factual, step-by-step description. Do NOT write names, identifying descriptions, or contact details.</p>
            <textarea className="w-full min-h-[120px] rounded-md border border-border p-3 text-sm bg-background" value={form.narrative} onChange={(e) => set("narrative", e.target.value)} />
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Consequences &amp; Post-Incident Actions</h3>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.lawEnforcementContacted} onChange={() => set("lawEnforcementContacted", !form.lawEnforcementContacted)} />
              <span>Law enforcement contacted?</span>
            </label>
            {form.lawEnforcementContacted && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="mb-1 block">Law enforcement agency name</Label><Input value={form.leAgencyName} onChange={(e) => set("leAgencyName", e.target.value)} /></div>
                <div><Label className="mb-1 block">Police report number</Label><Input value={form.policeReportNumber} onChange={(e) => set("policeReportNumber", e.target.value)} /></div>
              </div>
            )}
            <div><Label className="mb-1 block">Immediate protective actions taken</Label><Input placeholder="e.g. First aid rendered, facility locked down" value={form.protectiveActions} onChange={(e) => set("protectiveActions", e.target.value)} /></div>
            <div><Label className="mb-1 block">Post-incident hazard evaluation</Label><Input placeholder="What physical, environmental, or operational factor permitted this to happen?" value={form.hazardEvaluation} onChange={(e) => set("hazardEvaluation", e.target.value)} /></div>
            <div><Label className="mb-1 block">Required corrective actions</Label><Input placeholder="Operational changes, physical barriers, or lighting improvements" value={form.correctiveActions} onChange={(e) => set("correctiveActions", e.target.value)} /></div>
          </div>

          <Button onClick={submitLog} disabled={create.isPending} className="w-full">
            {create.isPending ? "Saving..." : "Save Log Entry"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logged incidents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {logs.isLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
          {logs.data && logs.data.length === 0 && <p className="text-xs text-muted-foreground">No incidents logged yet.</p>}
          {logs.data?.map((log: any) => (
            <div key={log.id} className="rounded-md border border-border bg-muted/40 p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">Log #{log.id}</span>
                <span>{log.incidentDate ? new Date(log.incidentDate).toLocaleDateString() : "—"}</span>
              </div>
              <p className="text-muted-foreground">{log.violenceType?.replace(/_/g, " ") ?? "Unclassified"}</p>
              <p className="text-muted-foreground line-clamp-2">{log.narrative || "No narrative"}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      </>
      )}
    </div>
  );
}