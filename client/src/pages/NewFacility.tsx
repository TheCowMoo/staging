import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { OperatingHoursSelector } from "@/components/OperatingHoursSelector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState } from "react";
import { Building2, ArrowLeft } from "lucide-react";
import { FACILITY_TYPES } from "../../../shared/auditFramework";
import { ALL_STATE_PROVINCES } from "../../../shared/stateProvinces";
import { Link } from "wouter";

export default function NewFacility() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    name: "",
    facilityType: "",
    address: "",
    city: "",
    state: "",
    jurisdiction: "United States",
    squareFootage: "",
    floors: "",
    maxOccupancy: "",
    operatingHours: "",
    eveningOperations: false,
    multiTenant: false,
    publicAccessWithoutScreening: false,
    publicEntrances: "",
    staffEntrances: "",
    hasAlleyways: false,
    hasConcealedAreas: false,
    usedAfterDark: false,
    multiSite: false,
    emergencyCoordinator: "",
    notes: "",
  });

  const createFacility = trpc.facility.create.useMutation({
    onSuccess: (facility) => {
      toast.success("Facility created successfully");
      navigate(`/facilities/${facility?.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.facilityType) {
      toast.error("Facility name and type are required");
      return;
    }
    createFacility.mutate({
      name: form.name,
      facilityType: form.facilityType,
      address: form.address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      jurisdiction: form.jurisdiction || undefined,
      squareFootage: form.squareFootage ? parseInt(form.squareFootage) : undefined,
      floors: form.floors ? parseInt(form.floors) : undefined,
      maxOccupancy: form.maxOccupancy ? parseInt(form.maxOccupancy) : undefined,
      operatingHours: form.operatingHours || undefined,
      eveningOperations: form.eveningOperations,
      multiTenant: form.multiTenant,
      publicAccessWithoutScreening: form.publicAccessWithoutScreening,
      publicEntrances: form.publicEntrances ? parseInt(form.publicEntrances) : undefined,
      staffEntrances: form.staffEntrances ? parseInt(form.staffEntrances) : undefined,
      hasAlleyways: form.hasAlleyways,
      hasConcealedAreas: form.hasConcealedAreas,
      usedAfterDark: form.usedAfterDark,
      multiSite: form.multiSite,
      emergencyCoordinator: form.emergencyCoordinator || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/facilities" className="flex items-center gap-1"><ArrowLeft size={15} /> Back</Link>
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">New Facility</h1>
              <p className="text-sm text-muted-foreground">Create a facility profile to begin an assessment</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Basic Information</h2>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Facility Name *</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Street Community Center" className="mt-1" required />
                </div>
                <div>
                  <Label htmlFor="type">Facility Type *</Label>
                  <Select value={form.facilityType} onValueChange={(v) => setForm({ ...form, facilityType: v })}>
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
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Location</h2>
              {/* Jurisdiction */}
              <div>
                <Label htmlFor="jurisdiction">Jurisdiction</Label>
                <Select value={form.jurisdiction} onValueChange={(v) => setForm({ ...form, jurisdiction: v })}>
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
                <Label htmlFor="address">Street Address</Label>
                <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main Street" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="state">State / Province</Label>
                  <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
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
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Physical Characteristics</h2>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="sqft">Square Footage</Label>
                  <Input id="sqft" type="number" value={form.squareFootage} onChange={(e) => setForm({ ...form, squareFootage: e.target.value })} placeholder="e.g. 5000" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="floors">Floors</Label>
                  <Input id="floors" type="number" value={form.floors} onChange={(e) => setForm({ ...form, floors: e.target.value })} placeholder="e.g. 2" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="occupancy">Max Occupancy</Label>
                  <Input id="occupancy" type="number" value={form.maxOccupancy} onChange={(e) => setForm({ ...form, maxOccupancy: e.target.value })} placeholder="e.g. 100" className="mt-1" />
                </div>
              </div>
              <div>
                <OperatingHoursSelector
                  value={form.operatingHours}
                  onChange={(value) => setForm({ ...form, operatingHours: value })}
                />
              </div>
            </div>

            {/* Operational Flags */}
            <div className="space-y-4 pt-2 border-t border-border">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Operational Characteristics</h2>
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
                      checked={form[flag.key as keyof typeof form] as boolean}
                      onCheckedChange={(v) => setForm({ ...form, [flag.key]: v })}
                    />
                  </div>
                ))}
              </div>
              {/* Entrance counts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="publicEntrances">Number of Public Entrances</Label>
                  <Input id="publicEntrances" type="number" min="0" value={form.publicEntrances} onChange={(e) => setForm({ ...form, publicEntrances: e.target.value })} placeholder="e.g. 2" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="staffEntrances">Number of Staff-Only Entrances</Label>
                  <Input id="staffEntrances" type="number" min="0" value={form.staffEntrances} onChange={(e) => setForm({ ...form, staffEntrances: e.target.value })} placeholder="e.g. 1" className="mt-1" />
                </div>
              </div>
              {/* Emergency Coordinator */}
              <div>
                <Label htmlFor="emergencyCoordinator">Emergency Coordinator Name &amp; Contact</Label>
                <Input id="emergencyCoordinator" value={form.emergencyCoordinator} onChange={(e) => setForm({ ...form, emergencyCoordinator: e.target.value })} placeholder="e.g. Jane Smith — (555) 123-4567" className="mt-1" />
              </div>
            </div>

            {/* Notes */}
            <div className="pt-2 border-t border-border">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional context about this facility..." className="mt-1" rows={3} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createFacility.isPending} className="flex-1">
                {createFacility.isPending ? "Creating..." : "Create Facility"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/facilities">Cancel</Link>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
