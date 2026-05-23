import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Link, useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Building2, ArrowLeft, Plus, ClipboardList,
  MapPin, Clock, CheckCircle2, AlertCircle, Pencil, X, Save, ShieldAlert, HeartPulse
} from "lucide-react";
import { getRiskBadgeClass } from "@/lib/riskUtils";
import { FACILITY_TYPES } from "../../../shared/auditFramework";
import { ALL_STATE_PROVINCES } from "../../../shared/stateProvinces";
import { toast } from "sonner";
import { useState } from "react";

const EMERGENCY_ROLE_KEYS = [
  { key: "role_siteLead", label: "Site Lead" },
  { key: "role_secondaryLead", label: "Secondary Lead" },
  { key: "role_emergencyCaller", label: "Emergency Caller" },
  { key: "role_evacuationCoordinator", label: "Evacuation Coordinator" },
  { key: "role_accountabilityCoordinator", label: "Accountability Coordinator" },
  { key: "role_mediaRelations", label: "Media Relations" },
];

function parseRoles(json: string | null | undefined): Record<string, string> {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

export default function FacilityDetail() {
  const params = useParams<{ id: string }>();
  const facilityId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const utils = trpc.useUtils();
  const { data: facility, isLoading: facilityLoading } = trpc.facility.get.useQuery({ id: facilityId });
  const { data: audits, isLoading: auditsLoading } = trpc.audit.listByFacility.useQuery({ facilityId });

  const createAudit = trpc.audit.create.useMutation({
    onSuccess: (audit) => {
      toast.success("New audit started");
      navigate(`/audit/${audit?.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateFacility = trpc.facility.update.useMutation({
    onSuccess: () => {
      toast.success("Facility updated successfully");
      utils.facility.get.invalidate({ id: facilityId });
      setIsEditing(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const getFacilityLabel = (type: string) =>
    FACILITY_TYPES.find((f) => f.value === type)?.label ?? type;

  const startEditing = () => {
    if (!facility) return;
    setEditForm({
      name: facility.name ?? "",
      facilityType: facility.facilityType ?? "",
      address: facility.address ?? "",
      city: facility.city ?? "",
      state: facility.state ?? "",
      jurisdiction: facility.jurisdiction ?? "United States",
      squareFootage: facility.squareFootage?.toString() ?? "",
      floors: facility.floors?.toString() ?? "",
      maxOccupancy: facility.maxOccupancy?.toString() ?? "",
      operatingHours: facility.operatingHours ?? "",
      eveningOperations: facility.eveningOperations ?? false,
      multiTenant: facility.multiTenant ?? false,
      publicAccessWithoutScreening: facility.publicAccessWithoutScreening ?? false,
      publicEntrances: facility.publicEntrances?.toString() ?? "",
      staffEntrances: facility.staffEntrances?.toString() ?? "",
      hasAlleyways: facility.hasAlleyways ?? false,
      hasConcealedAreas: facility.hasConcealedAreas ?? false,
      usedAfterDark: facility.usedAfterDark ?? false,
      multiSite: facility.multiSite ?? false,
      emergencyCoordinator: facility.emergencyCoordinator ?? "",
      emergencyRoles: facility.emergencyRoles ?? "",
      aedOnSite: facility.aedOnSite ?? false,
      aedLocations: facility.aedLocations ?? "",
      notes: facility.notes ?? "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editForm.name || !editForm.facilityType) {
      toast.error("Facility name and type are required");
      return;
    }
    updateFacility.mutate({
      id: facilityId,
      name: editForm.name,
      facilityType: editForm.facilityType,
      address: editForm.address || undefined,
      city: editForm.city || undefined,
      state: editForm.state || undefined,
      jurisdiction: editForm.jurisdiction || undefined,
      squareFootage: editForm.squareFootage ? parseInt(editForm.squareFootage) : undefined,
      floors: editForm.floors ? parseInt(editForm.floors) : undefined,
      maxOccupancy: editForm.maxOccupancy ? parseInt(editForm.maxOccupancy) : undefined,
      operatingHours: editForm.operatingHours || undefined,
      eveningOperations: editForm.eveningOperations,
      multiTenant: editForm.multiTenant,
      publicAccessWithoutScreening: editForm.publicAccessWithoutScreening,
      publicEntrances: editForm.publicEntrances ? parseInt(editForm.publicEntrances) : undefined,
      staffEntrances: editForm.staffEntrances ? parseInt(editForm.staffEntrances) : undefined,
      hasAlleyways: editForm.hasAlleyways,
      hasConcealedAreas: editForm.hasConcealedAreas,
      usedAfterDark: editForm.usedAfterDark,
      multiSite: editForm.multiSite,
      emergencyCoordinator: editForm.emergencyCoordinator || undefined,
      emergencyRoles: editForm.emergencyRoles || undefined,
      aedOnSite: editForm.aedOnSite,
      aedLocations: editForm.aedLocations || undefined,
      notes: editForm.notes || undefined,
    });
  };

  if (facilityLoading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="h-48 bg-card border border-border rounded-xl animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  if (!facility) {
    return (
      <AppLayout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Facility not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/facilities">Back to Facilities</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Back */}
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/facilities" className="flex items-center gap-1"><ArrowLeft size={15} /> Facilities</Link>
        </Button>

        {/* Facility Header / Edit Form */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          {isEditing ? (
            /* ── Edit Mode ── */
            <div className="space-y-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-foreground">Edit Facility Profile</h2>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                  <X size={15} className="mr-1" /> Cancel
                </Button>
              </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Basic Information</h3>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="edit-name">Facility Name *</Label>
                    <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="edit-type">Facility Type *</Label>
                    <Select value={editForm.facilityType} onValueChange={(v) => setEditForm({ ...editForm, facilityType: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select facility type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {FACILITY_TYPES.map((ft) => (
                          <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4 pt-2 border-t border-border">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Location</h3>
                <div>
                  <Label htmlFor="edit-jurisdiction">Jurisdiction</Label>
                  <Select value={editForm.jurisdiction} onValueChange={(v) => setEditForm({ ...editForm, jurisdiction: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select jurisdiction..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="United States">United States (OSHA)</SelectItem>
                      <SelectItem value="Canada">Canada (CCOHS / Provincial)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-address">Street Address</Label>
                  <Input id="edit-address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-city">City</Label>
                    <Input id="edit-city" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="edit-state">State / Province</Label>
                    <Select value={editForm.state} onValueChange={(v) => setEditForm({ ...editForm, state: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {ALL_STATE_PROVINCES.map((group) => (
                          <SelectGroup key={group.group}>
                            <SelectLabel>{group.group}</SelectLabel>
                            {group.items.map((item) => (
                              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Physical Characteristics */}
              <div className="space-y-4 pt-2 border-t border-border">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Physical Characteristics</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="edit-sqft">Square Footage</Label>
                    <Input id="edit-sqft" type="number" value={editForm.squareFootage} onChange={(e) => setEditForm({ ...editForm, squareFootage: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="edit-floors">Floors</Label>
                    <Input id="edit-floors" type="number" value={editForm.floors} onChange={(e) => setEditForm({ ...editForm, floors: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="edit-occupancy">Max Occupancy</Label>
                    <Input id="edit-occupancy" type="number" value={editForm.maxOccupancy} onChange={(e) => setEditForm({ ...editForm, maxOccupancy: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-hours">Operating Hours</Label>
                  <Input id="edit-hours" value={editForm.operatingHours} onChange={(e) => setEditForm({ ...editForm, operatingHours: e.target.value })} className="mt-1" />
                </div>
              </div>

              {/* Operational Flags */}
              <div className="space-y-4 pt-2 border-t border-border">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Operational Characteristics</h3>
                <div className="space-y-3">
                  {[
                    { key: "eveningOperations", label: "Evening or night operations are common" },
                    { key: "multiTenant", label: "Multiple organizations share this facility" },
                    { key: "publicAccessWithoutScreening", label: "Public can enter without staff screening" },
                    { key: "hasAlleyways", label: "Alleyways or service corridors adjacent to building" },
                    { key: "hasConcealedAreas", label: "Concealed areas on property (alcoves, dense landscaping, etc.)" },
                    { key: "usedAfterDark", label: "Facility is regularly used after dark" },
                    { key: "multiSite", label: "Multi-site organization (multiple locations)" },
                  ].map((flag) => (
                    <div key={flag.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                      <Label className="text-sm font-normal cursor-pointer">{flag.label}</Label>
                      <Switch
                        checked={editForm[flag.key] as boolean}
                        onCheckedChange={(v) => setEditForm({ ...editForm, [flag.key]: v })}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-publicEntrances">Number of Public Entrances</Label>
                    <Input id="edit-publicEntrances" type="number" min="0" value={editForm.publicEntrances} onChange={(e) => setEditForm({ ...editForm, publicEntrances: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="edit-staffEntrances">Number of Staff-Only Entrances</Label>
                    <Input id="edit-staffEntrances" type="number" min="0" value={editForm.staffEntrances} onChange={(e) => setEditForm({ ...editForm, staffEntrances: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-emergencyCoordinator">Emergency Coordinator Name &amp; Contact</Label>
                  <Input id="edit-emergencyCoordinator" value={editForm.emergencyCoordinator} onChange={(e) => setEditForm({ ...editForm, emergencyCoordinator: e.target.value })} placeholder="e.g. Jane Smith — (555) 123-4567" className="mt-1" />
                </div>
              </div>

              {/* Assigned Emergency Roles */}
              <div className="space-y-4 pt-2 border-t border-border">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert size={13} /> Assigned Emergency Roles
                </h3>
                <p className="text-xs text-muted-foreground">
                  For each role, enter primary, secondary, and tertiary contacts separated by semicolons
                  (e.g. <em>Jane Smith; Bob Lee; Maria Torres</em>).
                </p>
                {EMERGENCY_ROLE_KEYS.map((r) => {
                  const parsed = parseRoles(editForm.emergencyRoles);
                  const val = parsed[r.key] ?? "";
                  return (
                    <div key={r.key}>
                      <Label className="text-sm">{r.label}</Label>
                      <Input
                        className="mt-1"
                        placeholder="Primary; Secondary (optional); Tertiary (optional)"
                        value={val}
                        onChange={(e) => {
                          const cur = parseRoles(editForm.emergencyRoles);
                          cur[r.key] = e.target.value;
                          setEditForm({ ...editForm, emergencyRoles: JSON.stringify(cur) });
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* AED */}
              <div className="space-y-3 pt-2 border-t border-border">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <HeartPulse size={13} /> AED (Automated External Defibrillator)
                </h3>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <Label className="text-sm font-normal cursor-pointer">AED(s) on-site?</Label>
                  <Switch
                    checked={editForm.aedOnSite as boolean}
                    onCheckedChange={(v) => setEditForm({ ...editForm, aedOnSite: v })}
                  />
                </div>
                {editForm.aedOnSite && (
                  <div>
                    <Label htmlFor="edit-aedLocations">AED Location(s)</Label>
                    <Textarea
                      id="edit-aedLocations"
                      value={editForm.aedLocations}
                      onChange={(e) => setEditForm({ ...editForm, aedLocations: e.target.value })}
                      className="mt-1"
                      rows={2}
                      placeholder="e.g. Main lobby near reception desk; Second floor break room"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="pt-2 border-t border-border">
                <Label htmlFor="edit-notes">Additional Notes</Label>
                <Textarea id="edit-notes" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="mt-1" rows={3} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={updateFacility.isPending} className="flex-1">
                  <Save size={14} className="mr-1.5" />
                  {updateFacility.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            /* ── View Mode ── */
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 size={22} className="text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">{facility.name}</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{getFacilityLabel(facility.facilityType)}</p>
                    {(facility.city || facility.address) && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin size={11} />
                        {[facility.address, facility.city, facility.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {facility.jurisdiction && (
                      <span className={`inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        facility.jurisdiction === "Canada"
                          ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
                          : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
                      }`}>
                        {facility.jurisdiction === "Canada" ? "🍁 Canada" : "🇺🇸 United States"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    <Pencil size={13} className="mr-1.5" /> Edit
                  </Button>
                  <Button
                    onClick={() => createAudit.mutate({ facilityId })}
                    disabled={createAudit.isPending}
                  >
                    <Plus size={15} className="mr-1.5" />
                    {createAudit.isPending ? "Starting..." : "New Audit"}
                  </Button>
                </div>
              </div>

              {/* Facility details grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-border">
                {facility.squareFootage && (
                  <div className="text-center p-3 bg-muted/40 rounded-lg">
                    <p className="text-lg font-bold text-foreground">{facility.squareFootage.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">sq. ft.</p>
                  </div>
                )}
                {facility.floors && (
                  <div className="text-center p-3 bg-muted/40 rounded-lg">
                    <p className="text-lg font-bold text-foreground">{facility.floors}</p>
                    <p className="text-xs text-muted-foreground">Floor{facility.floors !== 1 ? "s" : ""}</p>
                  </div>
                )}
                {facility.maxOccupancy && (
                  <div className="text-center p-3 bg-muted/40 rounded-lg">
                    <p className="text-lg font-bold text-foreground">{facility.maxOccupancy}</p>
                    <p className="text-xs text-muted-foreground">Max Occupancy</p>
                  </div>
                )}
                {facility.operatingHours && (
                  <div className="text-center p-3 bg-muted/40 rounded-lg">
                    <Clock size={14} className="mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-foreground font-medium">{facility.operatingHours}</p>
                  </div>
                )}
              </div>

              {/* Flags */}
              <div className="flex flex-wrap gap-2 mt-3">
                {facility.eveningOperations && (
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Evening Operations</span>
                )}
                {facility.multiTenant && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Multi-Tenant</span>
                )}
                {facility.publicAccessWithoutScreening && (
                  <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">Public Access (No Screening)</span>
                )}
                {facility.hasAlleyways && (
                  <span className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">Alleyways Present</span>
                )}
                {facility.hasConcealedAreas && (
                  <span className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">Concealed Areas</span>
                )}
                {facility.usedAfterDark && (
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300">Used After Dark</span>
                )}
                {facility.multiSite && (
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">Multi-Site Org</span>
                )}
                {(facility.publicEntrances != null || facility.staffEntrances != null) && (
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                    {facility.publicEntrances ?? 0} public / {facility.staffEntrances ?? 0} staff entrances
                  </span>
                )}
              </div>

              {facility.emergencyCoordinator && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Emergency Coordinator:</span> {facility.emergencyCoordinator}
                </p>
              )}

              {/* Emergency Roles display */}
              {(() => {
                const parsed = parseRoles(facility.emergencyRoles);
                const entries = EMERGENCY_ROLE_KEYS.map((r) => ({ ...r, val: parsed[r.key] ?? "" })).filter((e) => e.val);
                if (!entries.length) return null;
                return (
                  <div className="mt-3 border border-border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-muted/40 border-b border-border flex items-center gap-1.5">
                      <ShieldAlert size={13} className="text-primary" />
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Assigned Emergency Roles</span>
                    </div>
                    <div className="divide-y divide-border">
                      {entries.map(({ key, label, val }) => {
                        const contacts = val.split(";").map((s) => s.trim()).filter(Boolean);
                        return (
                          <div key={key} className="px-3 py-2">
                            <p className="text-xs font-medium text-foreground">{label}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {contacts.map((c, i) => (
                                <span key={i} className={`text-xs px-2 py-0.5 rounded-full border ${
                                  i === 0 ? "bg-primary/10 text-primary border-primary/20" :
                                  i === 1 ? "bg-muted text-muted-foreground border-border" :
                                  "bg-muted/50 text-muted-foreground border-border"
                                }`}>
                                  {i === 0 ? "Primary" : i === 1 ? "Secondary" : "Tertiary"}: {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* AED display */}
              {facility.aedOnSite && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800">
                  <HeartPulse size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-green-800 dark:text-green-400">AED On-Site</p>
                    {facility.aedLocations && (
                      <p className="text-xs text-green-700 dark:text-green-500 mt-0.5">{facility.aedLocations}</p>
                    )}
                  </div>
                </div>
              )}

              {facility.notes && (
                <p className="mt-3 text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">{facility.notes}</p>
              )}
            </>
          )}
        </div>

        {/* Audit History */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <ClipboardList size={16} /> Audit History
            </h2>
            <span className="text-xs text-muted-foreground">{audits?.length ?? 0} audit{audits?.length !== 1 ? "s" : ""}</span>
          </div>

          {auditsLoading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : !audits?.length ? (
            <div className="text-center py-10 text-muted-foreground">
              <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm mb-3">No audits for this facility yet</p>
              <Button size="sm" onClick={() => createAudit.mutate({ facilityId })} disabled={createAudit.isPending}>
                <Plus size={14} className="mr-1.5" /> Start First Audit
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {audits.map((audit) => (
                <Link
                  key={audit.id}
                  href={audit.status === "completed" ? `/audit/${audit.id}/report` : `/audit/${audit.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                      {audit.status === "completed" ? (
                        <CheckCircle2 size={16} className="text-green-500" />
                      ) : (
                        <AlertCircle size={16} className="text-amber-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Assessment — {new Date(audit.auditDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{audit.status.replace("_", " ")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {audit.overallRiskLevel && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRiskBadgeClass(audit.overallRiskLevel)}`}>
                          {audit.overallRiskLevel} — {audit.overallScore?.toFixed(0)}%
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${audit.status === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {audit.status === "completed" ? "View Report" : "Resume"}
                      </span>
                    </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
