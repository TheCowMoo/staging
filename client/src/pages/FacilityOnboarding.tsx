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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OperatingHoursSelector } from "@/components/OperatingHoursSelector";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, ChevronLeft, Building2, Layers, Clock, Users, HeartPulse, ShieldAlert, Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import MapPicker from "@/components/MapPicker";
import { toast } from "sonner";
import { FACILITY_TYPES } from "@shared/auditFramework";
import { ALL_STATE_PROVINCES } from "@shared/stateProvinces";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FloorPlanEntry {
  file: File;
  name: string;
  floor: string;
  base64Data: string;
  mimeType: string;
  previewUrl: string;
  width?: number;
  height?: number;
  uploading?: boolean;
  uploaded?: boolean;
  error?: string;
}

interface FormData {
  // Step 1 — Identity
  latitude: number | null;
  longitude: number | null;
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
  // Step 4 — Personnel & Administration
  emergencyCoordinator: string;
  emergencyRoles: string;
  aedOnSite: boolean;
  aedLocations: string;
  operationalPolicies: string;
  coordinatorContacts: string;
  emergencyContacts: string;
  notes: string;
  createAudit: boolean;
}

const empty = (): FormData => ({
  latitude: null, longitude: null, name: "", facilityType: "", address: "", city: "", state: "", jurisdiction: "United States",
  squareFootage: "", floors: "", maxOccupancy: "", publicEntrances: "", staffEntrances: "",
  hasAlleyways: false, hasConcealedAreas: false, multiTenant: false,
  operatingHours: "", eveningOperations: false, usedAfterDark: false,
  publicAccessWithoutScreening: false, multiSite: false,
  emergencyCoordinator: "", emergencyRoles: "", aedOnSite: false, aedLocations: "",
  operationalPolicies: "", coordinatorContacts: "", emergencyContacts: "",
  notes: "", createAudit: true,
});

// ─── Emergency role keys (shared with FacilityDetail) ─────────────────────────
const EMERGENCY_ROLE_KEYS = [
  { key: "role_siteLead", label: "Site Lead" },
  { key: "role_secondaryLead", label: "Secondary Lead" },
  { key: "role_emergencyCaller", label: "Emergency Caller" },
  { key: "role_evacuationCoordinator", label: "Evacuation Coordinator" },
  { key: "role_accountabilityCoordinator", label: "Accountability Coordinator" },
  { key: "role_mediaRelations", label: "Media Relations" },
];

const TIER_OPTIONS = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "territory", label: "Territory" },
];

interface RoleContact {
  tier: string;
  name: string;
}

function parseRoles(json: string): Record<string, RoleContact[]> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    // Migrate old semicolon-separated format → new array format
    if (typeof parsed === "object" && !Array.isArray(parsed)) {
      const result: Record<string, RoleContact[]> = {};
      for (const [key, val] of Object.entries(parsed)) {
        if (typeof val === "string" && val.includes(";")) {
          // Old format: "Jane; Bob; Maria"
          const parts = val.split(";").map((s) => s.trim()).filter(Boolean);
          result[key] = parts.map((name, i) => ({
            tier: i === 0 ? "primary" : i === 1 ? "secondary" : "territory",
            name,
          }));
        } else if (Array.isArray(val)) {
          // New format: [{ tier, name }]
          result[key] = val;
        } else if (typeof val === "string" && val.trim()) {
          // Single name, no semicolons
          result[key] = [{ tier: "primary", name: val.trim() }];
        }
      }
      return result;
    }
    return parsed;
  } catch {
    return {};
  }
}

// ─── Step metadata ────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Facility Identity",       icon: Building2 },
  { id: 2, label: "Physical Layout",         icon: Layers },
  { id: 3, label: "Operations",              icon: Clock },
  { id: 4, label: "Personnel & Admin",    icon: Users },
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
  const [submitted, setSubmitted] = useState<{ facilityId: number; facilityName: string; auditId: number | null } | null>(null);
  const [floorPlans, setFloorPlans] = useState<FloorPlanEntry[]>([]);
  const [newMapName, setNewMapName] = useState("");
  const [newMapFloor, setNewMapFloor] = useState("");
  const [uploadMapsPending, setUploadMapsPending] = useState(false);

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const submit = trpc.onboarding.submitProfile.useMutation({
    onSuccess: async (result) => {
      // Upload any pending floor plans using the newly created facility ID
      const pending = floorPlans.filter(p => !p.uploaded && !p.uploading);
      if (pending.length > 0) {
        setUploadMapsPending(true);
        for (const plan of pending) {
          plan.uploading = true;
          setFloorPlans([...floorPlans]);
          try {
            await uploadFloorMap.mutateAsync({
              facilityId: result.facilityId,
              name: plan.name,
              floor: plan.floor || undefined,
              base64Data: plan.base64Data,
              mimeType: plan.mimeType,
              width: plan.width,
              height: plan.height,
            });
            plan.uploaded = true;
            plan.uploading = false;
            setFloorPlans([...floorPlans]);
          } catch (err: any) {
            plan.uploading = false;
            plan.error = err?.message || "Upload failed";
            setFloorPlans([...floorPlans]);
          }
        }
        setUploadMapsPending(false);
      }

      setSubmitted(result);
      toast.success(`"${result.facilityName}" profile created successfully`);
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadFloorMap = trpc.facilityMap.upload.useMutation();

  // ── Floor plan file handler ──
  const handleFloorPlanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validTypes = ["image/png", "image/jpeg", "application/pdf"];
    const newEntries: FloorPlanEntry[] = [];

    for (const file of Array.from(files)) {
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name}: Only PNG, JPEG, and PDF files are supported`);
        continue;
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const data = (reader.result as string).split(",")[1];
          if (data) resolve(data);
          else reject(new Error("Failed to read file"));
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const name = newMapName.trim() || file.name.replace(/\.[^/.]+$/, "");
      const previewUrl = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : "";

      // Try to get image dimensions
      let width: number | undefined;
      let height: number | undefined;
      if (file.type.startsWith("image/")) {
        try {
          const img = new Image();
          img.src = previewUrl;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => { width = img.width; height = img.height; resolve(); };
            img.onerror = () => resolve(); // ignore dimension errors
          });
        } catch { /* ignore */ }
      }

      newEntries.push({
        file,
        name,
        floor: newMapFloor,
        base64Data: base64,
        mimeType: file.type,
        previewUrl,
        width,
        height,
      });
    }

    setFloorPlans(prev => [...prev, ...newEntries]);
    setNewMapName("");
    setNewMapFloor("");
    // Reset the file input
    e.target.value = "";
  };

  const removeFloorPlan = (index: number) => {
    const plan = floorPlans[index];
    if (plan.previewUrl) URL.revokeObjectURL(plan.previewUrl);
    setFloorPlans(prev => prev.filter((_, i) => i !== index));
  };

  // ── Validation per step ──
  const canAdvance = () => {
    if (step === 1) return form.name.trim().length > 0 && form.facilityType.length > 0;
    return true;
  };

  // ── Success screen ──
  if (submitted) {
    const uploadedCount = floorPlans.filter(p => p.uploaded).length;
    const failedCount = floorPlans.filter(p => p.error).length;

    return (

        <div className="container max-w-2xl py-16 text-center space-y-6">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Facility Profile Created</h1>
          <p className="text-muted-foreground">
            <strong>{submitted.facilityName}</strong> has been added to your facilities. All profile data has been saved and is ready to drive your audit, EAP, and reporting.
          </p>
          {floorPlans.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {uploadedCount} floor plan{uploadedCount !== 1 ? "s" : ""} uploaded
              {failedCount > 0 && ` (${failedCount} failed)`}.
              {uploadMapsPending && " Uploading remaining plans..."}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {submitted.auditId && (
              <Button onClick={() => navigate(`/audit/${submitted.auditId}`)}>
                Start Audit Walkthrough
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(`/facilities`)}>
              View All Facilities
            </Button>
            <Button variant="ghost" onClick={() => { setSubmitted(null); setForm(empty()); setStep(1); setFloorPlans([]); }}>
              Add Another Facility
            </Button>
          </div>
        </div>

    );
  }

  return (

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

                {/* Map Picker */}
                <MapPicker
                  initialLat={form.latitude}
                  initialLng={form.longitude}
                  initialAddress={`${form.address}, ${form.city}, ${form.state}`}
                  onChange={(result) => {
                    setForm(f => ({ ...f, latitude: result.lat, longitude: result.lng, address: result.address }));
                  }}
                />
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

                {/* ── Floor Plan Upload Section ── */}
                <div className="pt-4 border-t border-border space-y-4">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Floor Plans</h3>
                    <span className="text-[10px] text-muted-foreground">(uploaded after facility is created)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload floor plans for this facility. Supports PNG, JPEG, and PDF. These will be uploaded once the facility profile is created.
                  </p>

                  {/* Add new floor plan form */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-xs">Map Name</Label>
                      <Input
                        placeholder="e.g. First Floor"
                        value={newMapName}
                        onChange={e => setNewMapName(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Floor (optional)</Label>
                      <Input
                        placeholder="e.g. Floor 1, Basement"
                        value={newMapFloor}
                        onChange={e => setNewMapFloor(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
                        onClick={() => document.getElementById("fp-file-upload")?.click()}
                      >
                        <div className="text-center">
                          <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                          <p className="mt-1 text-xs text-muted-foreground">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            PNG, JPEG, or PDF up to 50MB
                          </p>
                        </div>
                      </div>
                      <input
                        id="fp-file-upload"
                        type="file"
                        accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                        className="hidden"
                        multiple
                        onChange={handleFloorPlanFile}
                        disabled={submit.isPending}
                      />
                    </div>
                  </div>

                  {/* List of pending floor plans */}
                  {floorPlans.length > 0 && (
                    <div className="space-y-2">
                      {floorPlans.map((plan, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card">
                          {/* Thumbnail */}
                          <div className="w-12 h-12 rounded-md bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {plan.previewUrl ? (
                              <img src={plan.previewUrl} alt={plan.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{plan.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {plan.floor ? `${plan.floor} · ` : ""}
                              {(plan.file.size / 1024).toFixed(0)} KB
                              {plan.width && plan.height ? ` · ${plan.width}×${plan.height}` : ""}
                            </p>
                          </div>
                          {/* Status / Remove */}
                          <div className="flex items-center gap-1">
                            {plan.uploading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                            {plan.uploaded && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                            {plan.error && <span className="text-[10px] text-red-500 max-w-[120px] truncate" title={plan.error}>Error</span>}
                            {!plan.uploading && !plan.uploaded && (
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFloorPlan(idx)}>
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Step 3: Operations ── */}
            {step === 3 && (
              <>
                <OperatingHoursSelector
                  value={form.operatingHours}
                  onChange={(value) => set("operatingHours", value)}
                />
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

            {/* ── Step 4: Personnel & Admin ── */}
            {step === 4 && (
              <>
                <div className="space-y-1">
                  <Label>Emergency Coordinator</Label>
                  <Input placeholder="Name and title of primary emergency contact" value={form.emergencyCoordinator} onChange={e => set("emergencyCoordinator", e.target.value)} />
                  <p className="text-xs text-muted-foreground">This person will be referenced in your EAP as the primary point of contact.</p>
                </div>

                {/* Assigned Emergency Roles */}
                <div className="space-y-3 pt-1 border-t border-border">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert size={13} /> Assigned Emergency Roles
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Add contacts for each emergency role. Use the dropdown to label each contact as Primary, Secondary, or Territory.
                  </p>
                  {EMERGENCY_ROLE_KEYS.map((r) => {
                    const parsed = parseRoles(form.emergencyRoles);
                    const contacts: RoleContact[] = parsed[r.key] ?? [];
                    const updateContacts = (updated: RoleContact[]) => {
                      const cur = parseRoles(form.emergencyRoles);
                      cur[r.key] = updated;
                      set("emergencyRoles", JSON.stringify(cur));
                    };
                    const addContact = () => {
                      updateContacts([...contacts, { tier: "primary", name: "" }]);
                    };
                    const removeContact = (idx: number) => {
                      updateContacts(contacts.filter((_, i) => i !== idx));
                    };
                    const updateContact = (idx: number, patch: Partial<RoleContact>) => {
                      updateContacts(contacts.map((c, i) => i === idx ? { ...c, ...patch } : c));
                    };
                    return (
                      <div key={r.key} className="space-y-1.5">
                        <Label className="text-sm">{r.label}</Label>
                        <div className="space-y-1.5">
                          {contacts.map((contact, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Select
                                value={contact.tier}
                                onValueChange={(v) => updateContact(idx, { tier: v })}
                              >
                                <SelectTrigger className="w-[130px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TIER_OPTIONS.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                className="h-8 text-xs flex-1"
                                placeholder="Contact name"
                                value={contact.name}
                                onChange={(e) => updateContact(idx, { name: e.target.value })}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => removeContact(idx)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={addContact}
                        >
                          + Add contact
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {/* Administration */}
                <div className="space-y-3 pt-1 border-t border-border">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <span className="text-primary">🛡️</span> Administration
                  </h3>
                  <div className="space-y-1">
                    <Label>Operational Policies</Label>
                    <Textarea
                      placeholder="Enter operational policies..."
                      value={form.operationalPolicies}
                      onChange={e => set("operationalPolicies", e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Coordinator Contacts</Label>
                    <Textarea
                      placeholder="Enter coordinator contact information..."
                      value={form.coordinatorContacts}
                      onChange={e => set("coordinatorContacts", e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Emergency Contacts</Label>
                    <Textarea
                      placeholder="Enter emergency contact information..."
                      value={form.emergencyContacts}
                      onChange={e => set("emergencyContacts", e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                {/* AED */}
                <div className="space-y-3 pt-1 border-t border-border">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <HeartPulse size={13} /> AED (Automated External Defibrillator)
                  </h3>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                    <Label className="text-sm font-normal cursor-pointer">AED(s) on-site?</Label>
                    <Switch
                      checked={form.aedOnSite}
                      onCheckedChange={v => set("aedOnSite", v)}
                    />
                  </div>
                  {form.aedOnSite && (
                    <div className="space-y-1">
                      <Label>AED Location(s)</Label>
                      <Textarea
                        placeholder="e.g. Main lobby near reception desk; Second floor break room"
                        value={form.aedLocations}
                        onChange={e => set("aedLocations", e.target.value)}
                        rows={2}
                      />
                    </div>
                  )}
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
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${floorPlans.length > 0 ? "text-green-500" : "text-muted-foreground"}`} />
                      <span>
                        {floorPlans.length > 0
                          ? `${floorPlans.length} floor plan${floorPlans.length !== 1 ? "s" : ""} will be uploaded after submission.`
                          : "No floor plans selected for upload."}
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
                latitude: form.latitude ?? undefined,
                longitude: form.longitude ?? undefined,
                emergencyCoordinator: form.emergencyCoordinator.trim() || undefined,
                emergencyRoles: form.emergencyRoles || undefined,
                aedOnSite: form.aedOnSite,
                aedLocations: form.aedLocations || undefined,
                operationalPolicies: form.operationalPolicies || undefined,
                coordinatorContacts: form.coordinatorContacts || undefined,
                emergencyContacts: form.emergencyContacts || undefined,
                notes: form.notes.trim() || undefined,
                createAudit: form.createAudit,
              })}
              disabled={submit.isPending || uploadMapsPending}
            >
              {(submit.isPending || uploadMapsPending) ? "Creating…" : "Create Facility Profile"}
              {!(submit.isPending || uploadMapsPending) && <CheckCircle2 className="h-4 w-4 ml-1" />}
            </Button>
          )}
        </div>
      </div>

  );
}