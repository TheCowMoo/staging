/**
 * FacilityOnboarding — 4-step guided wizard that pre-fills a complete facility
 * profile and automatically routes the data to:
 *   1. The Facilities table (full profile record)
 *   2. An in-progress Audit (ready to begin walkthrough)
 *
 * Each step maps directly to the facility schema fields so nothing is lost.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, ChevronLeft, Building2, Layers, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { FACILITY_TYPES } from "@shared/auditFramework";
import { ALL_STATE_PROVINCES } from "@shared/stateProvinces";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormData {
  // Step 1 — Identity
  name: string;
  facilityType: string;
  address: string;
  city: string;
  state: string;
  jurisdiction: string;
  // Step 2 — Physical
  squareFootage: string;
  floors: string;
  maxOccupancy: string;
  publicEntrances: string;
  staffEntrances: string;
  hasAlleyways: boolean;
  hasConcealedAreas: boolean;
  multiTenant: boolean;
  // Step 3 — Operations
  operatingHours: string;
  eveningOperations: boolean;
  usedAfterDark: boolean;
  publicAccessWithoutScreening: boolean;
  multiSite: boolean;
  // Step 4 — Personnel
  emergencyCoordinator: string;
  notes: string;
  createAudit: boolean;
}

const empty = (): FormData => ({
  name: "", facilityType: "", address: "", city: "", state: "", jurisdiction: "United States",
  squareFootage: "", floors: "", maxOccupancy: "", publicEntrances: "", staffEntrances: "",
  hasAlleyways: false, hasConcealedAreas: false, multiTenant: false,
  operatingHours: "", eveningOperations: false, usedAfterDark: false,
  publicAccessWithoutScreening: false, multiSite: false,
  emergencyCoordinator: "", notes: "", createAudit: true,
});

// ─── Step metadata ────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Facility Identity",       icon: Building2 },
  { id: 2, label: "Physical Layout",         icon: Layers },
  { id: 3, label: "Operations",              icon: Clock },
  { id: 4, label: "Personnel & Contacts",    icon: Users },
];

// ─── Helper ───────────────────────────────────────────────────────────────────
function num(v: string): number | undefined {
  const n = parseInt(v, 10);
  return isNaN(n) ? undefined : n;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FacilityOnboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(empty());
  const [done, setDone] = useState<{ facilityId: number; facilityName: string; auditId: number | null } | null>(null);

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const submit = trpc.onboarding.submitProfile.useMutation({
    onSuccess: (result) => {
      setDone(result);
      toast.success(`"${result.facilityName}" profile created successfully`);
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Validation per step ──
  const canAdvance = () => {
    if (step === 1) return form.name.trim().length > 0 && form.facilityType.length > 0;
    return true;
  };

  // ── Success screen ──
  if (done) {
    return (
      <AppLayout>
        <div className="container max-w-2xl py-16 text-center space-y-6">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Facility Profile Created</h1>
          <p className="text-muted-foreground">
            <strong>{done.facilityName}</strong> has been added to your facilities. All profile data has been saved and is ready to drive your audit, EAP, and reporting.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {done.auditId && (
              <Button onClick={() => navigate(`/audit/${done.auditId}`)}>
                Start Audit Walkthrough
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(`/facilities`)}>
              View All Facilities
            </Button>
            <Button variant="ghost" onClick={() => { setDone(null); setForm(empty()); setStep(1); }}>
              Add Another Facility
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-2xl py-8 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold">Facility Profile Setup</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete all four steps to build a full facility profile. This data pre-fills your audit, EAP, and liability scan — no re-entry required.
          </p>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = s.id === step;
            const done = s.id < step;
            return (
              <div key={s.id} className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => s.id < step && setStep(s.id)}
                  className={[
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground" : done ? "bg-green-100 text-green-700 cursor-pointer hover:bg-green-200" : "bg-muted text-muted-foreground cursor-default",
                  ].join(" ")}
                >
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  {s.label}
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <Card>
          <CardContent className="pt-6 space-y-5">
            {/* ── Step 1: Identity ── */}
            {step === 1 && (
              <>
                <div className="space-y-1">
                  <Label>Facility Name <span className="text-red-500">*</span></Label>
                  <Input placeholder="e.g. Downtown Office — Suite 400" value={form.name} onChange={e => set("name", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Facility Type <span className="text-red-500">*</span></Label>
                  <Select value={form.facilityType} onValueChange={v => set("facilityType", v)}>
                    <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                    <SelectContent>
                      {FACILITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Street Address</Label>
                  <Input placeholder="123 Main St" value={form.address} onChange={e => set("address", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>City</Label>
                    <Input placeholder="City" value={form.city} onChange={e => set("city", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>State / Province</Label>
                    <Select value={form.state} onValueChange={v => set("state", v)}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {ALL_STATE_PROVINCES.map(group => (
                          <SelectGroup key={group.group}>
                            <SelectLabel>{group.group}</SelectLabel>
                            {group.items.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Jurisdiction</Label>
                  <Select value={form.jurisdiction} onValueChange={v => set("jurisdiction", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="United States">United States (Federal OSHA)</SelectItem>
                      <SelectItem value="Canada">Canada (Federal — Canada Labour Code)</SelectItem>
                      <SelectItem value="Ontario">Ontario (OHSA Bill 168)</SelectItem>
                      <SelectItem value="British Columbia">British Columbia (WorkSafeBC)</SelectItem>
                      <SelectItem value="Other">Other / International</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* ── Step 2: Physical Layout ── */}
            {step === 2 && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Square Footage</Label>
                    <Input type="number" placeholder="e.g. 8500" value={form.squareFootage} onChange={e => set("squareFootage", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Floors</Label>
                    <Input type="number" placeholder="e.g. 3" value={form.floors} onChange={e => set("floors", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Max Occupancy</Label>
                    <Input type="number" placeholder="e.g. 250" value={form.maxOccupancy} onChange={e => set("maxOccupancy", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Public Entrances</Label>
                    <Input type="number" placeholder="e.g. 2" value={form.publicEntrances} onChange={e => set("publicEntrances", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Staff / Controlled Entrances</Label>
                    <Input type="number" placeholder="e.g. 1" value={form.staffEntrances} onChange={e => set("staffEntrances", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-3 pt-1">
                  {([
                    ["hasAlleyways",     "Has alleyways or concealed exterior areas"],
                    ["hasConcealedAreas","Has interior concealed or blind-spot areas"],
                    ["multiTenant",      "Multi-tenant building (shared with other occupants)"],
                  ] as [keyof FormData, string][]).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="font-normal">{label}</Label>
                      <Switch checked={form[key] as boolean} onCheckedChange={v => set(key, v)} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Step 3: Operations ── */}
            {step === 3 && (
              <>
                <div className="space-y-1">
                  <Label>Normal Operating Hours</Label>
                  <Input placeholder="e.g. Mon–Fri 8 AM – 6 PM" value={form.operatingHours} onChange={e => set("operatingHours", e.target.value)} />
                </div>
                <div className="space-y-3 pt-1">
                  {([
                    ["eveningOperations",            "Evening or night-time operations"],
                    ["usedAfterDark",                "Facility or parking used after dark"],
                    ["publicAccessWithoutScreening", "Public access without screening or sign-in"],
                    ["multiSite",                    "Part of a multi-site organization"],
                  ] as [keyof FormData, string][]).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="font-normal">{label}</Label>
                      <Switch checked={form[key] as boolean} onCheckedChange={v => set(key, v)} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Step 4: Personnel & Options ── */}
            {step === 4 && (
              <>
                <div className="space-y-1">
                  <Label>Emergency Coordinator</Label>
                  <Input placeholder="Name and title of primary emergency contact" value={form.emergencyCoordinator} onChange={e => set("emergencyCoordinator", e.target.value)} />
                  <p className="text-xs text-muted-foreground">This person will be referenced in your EAP as the primary point of contact.</p>
                </div>
                <div className="space-y-1">
                  <Label>Additional Notes</Label>
                  <Textarea placeholder="Any additional context about this facility (optional)" value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} />
                </div>
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <p className="text-sm font-medium">What happens after submission</p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Full facility profile saved — pre-fills all audit questions, EAP sections, and liability scan fields.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${form.createAudit ? "text-green-500" : "text-muted-foreground"}`} />
                      <span>
                        Initial audit created and ready to begin walkthrough immediately.
                        <button className="ml-1 underline text-xs" onClick={() => set("createAudit", !form.createAudit)}>
                          {form.createAudit ? "(skip audit creation)" : "(create audit)"}
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
                {form.facilityType && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Facility type:</span>
                    <Badge variant="outline">{FACILITY_TYPES.find(t => t.value === form.facilityType)?.label ?? form.facilityType}</Badge>
                    {form.state && <Badge variant="outline">{form.state}</Badge>}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/facilities")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < STEPS.length ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => submit.mutate({
                name: form.name.trim(),
                facilityType: form.facilityType,
                address: form.address.trim() || undefined,
                city: form.city.trim() || undefined,
                state: form.state || undefined,
                jurisdiction: form.jurisdiction || undefined,
                squareFootage: num(form.squareFootage),
                floors: num(form.floors),
                maxOccupancy: num(form.maxOccupancy),
                publicEntrances: num(form.publicEntrances),
                staffEntrances: num(form.staffEntrances),
                hasAlleyways: form.hasAlleyways,
                hasConcealedAreas: form.hasConcealedAreas,
                multiTenant: form.multiTenant,
                operatingHours: form.operatingHours.trim() || undefined,
                eveningOperations: form.eveningOperations,
                usedAfterDark: form.usedAfterDark,
                publicAccessWithoutScreening: form.publicAccessWithoutScreening,
                multiSite: form.multiSite,
                emergencyCoordinator: form.emergencyCoordinator.trim() || undefined,
                notes: form.notes.trim() || undefined,
                createAudit: form.createAudit,
              })}
              disabled={submit.isPending}
            >
              {submit.isPending ? "Creating…" : "Create Facility Profile"}
              {!submit.isPending && <CheckCircle2 className="h-4 w-4 ml-1" />}
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
