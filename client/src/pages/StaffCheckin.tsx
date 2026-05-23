import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users, Plus, Trash2, RefreshCw, MapPin, AlertCircle,
  CheckCircle2, EyeOff, Home, X,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  {
    value: "reunification",
    label: "Reunification",
    description: "Staff member is at the reunification site",
    icon: <Home size={14} />,
    color: "bg-green-100 text-green-800 border-green-300",
    badgeColor: "bg-green-100 text-green-800",
  },
  {
    value: "injured",
    label: "Injured",
    description: "Staff member has been injured — provide location",
    icon: <AlertCircle size={14} />,
    color: "bg-red-100 text-red-800 border-red-300",
    badgeColor: "bg-red-100 text-red-800",
  },
  {
    value: "off_site",
    label: "Off Site",
    description: "Staff member is off site — provide location description",
    icon: <MapPin size={14} />,
    color: "bg-amber-100 text-amber-800 border-amber-300",
    badgeColor: "bg-amber-100 text-amber-800",
  },
  {
    value: "cannot_disclose",
    label: "Cannot Disclose",
    description: "Location cannot be disclosed at this time",
    icon: <EyeOff size={14} />,
    color: "bg-gray-100 text-gray-700 border-gray-300",
    badgeColor: "bg-gray-100 text-gray-700",
  },
] as const;

type StatusValue = typeof STATUS_OPTIONS[number]["value"];

function statusMeta(status: StatusValue) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[3];
}

export default function StaffCheckin() {
  const [staffName, setStaffName] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusValue | null>(null);
  const [location, setLocation] = useState("");

  const { data: checkins, refetch } = trpc.staffCheckin.list.useQuery({});

  const createMutation = trpc.staffCheckin.create.useMutation({
    onSuccess: () => {
      toast.success("Check-in recorded");
      setStaffName("");
      setSelectedStatus(null);
      setLocation("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.staffCheckin.delete.useMutation({
    onSuccess: () => { toast.success("Entry removed"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const clearAllMutation = trpc.staffCheckin.clearAll.useMutation({
    onSuccess: () => { toast.success("All check-ins cleared"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const needsLocation = selectedStatus !== null && selectedStatus !== "cannot_disclose";

  const handleSubmit = () => {
    if (!staffName.trim()) { toast.error("Please enter a staff name"); return; }
    if (!selectedStatus) { toast.error("Please select a status"); return; }
    createMutation.mutate({
      staffName: staffName.trim(),
      status: selectedStatus,
      location: location.trim() || undefined,
    });
  };

  // Summary counts
  const counts = {
    reunification: checkins?.filter((c) => c.status === "reunification").length ?? 0,
    injured: checkins?.filter((c) => c.status === "injured").length ?? 0,
    off_site: checkins?.filter((c) => c.status === "off_site").length ?? 0,
    cannot_disclose: checkins?.filter((c) => c.status === "cannot_disclose").length ?? 0,
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={20} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">Staff Check-In</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Record staff accountability during an emergency or drill. Track reunification, injuries, off-site personnel, and undisclosed locations.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUS_OPTIONS.map((s) => (
            <div key={s.value} className={`rounded-xl border p-3 ${s.color}`}>
              <div className="flex items-center gap-1.5 mb-1">
                {s.icon}
                <span className="text-xs font-semibold">{s.label}</span>
              </div>
              <div className="text-2xl font-black">{counts[s.value]}</div>
            </div>
          ))}
        </div>

        {/* Add check-in form */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Plus size={14} /> Record Check-In
          </h2>

          {/* Staff name */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Staff Member Name</label>
            <Input
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="Enter full name..."
              className="text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {/* Status selection */}
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSelectedStatus(s.value)}
                  className={`flex items-start gap-2 p-3 rounded-lg border text-left transition-all ${
                    selectedStatus === s.value
                      ? `${s.color} ring-2 ring-offset-1 ring-current`
                      : "bg-muted/30 border-border hover:bg-muted/50"
                  }`}
                >
                  <span className="mt-0.5 flex-shrink-0">{s.icon}</span>
                  <div>
                    <div className="text-xs font-semibold">{s.label}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{s.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Location field */}
          {needsLocation && (
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Location{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={
                  selectedStatus === "reunification"
                    ? "e.g. East parking lot assembly area"
                    : selectedStatus === "injured"
                    ? "e.g. Main lobby, near front desk"
                    : "e.g. Off campus — working from home"
                }
                className="text-sm"
              />
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="w-full"
          >
            <CheckCircle2 size={14} className="mr-1.5" />
            {createMutation.isPending ? "Recording..." : "Record Check-In"}
          </Button>
        </div>

        {/* Check-in list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20">
            <h2 className="text-sm font-semibold text-foreground">
              Check-In Log <span className="text-muted-foreground font-normal">({checkins?.length ?? 0})</span>
            </h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => refetch()} className="text-xs h-7">
                <RefreshCw size={11} className="mr-1" /> Refresh
              </Button>
              {(checkins?.length ?? 0) > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm("Clear all check-in records?")) clearAllMutation.mutate({});
                  }}
                  className="text-xs h-7 text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <X size={11} className="mr-1" /> Clear All
                </Button>
              )}
            </div>
          </div>

          {!checkins || checkins.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Users size={28} className="text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">No check-ins recorded yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Use the form above to record staff status.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {checkins.map((c) => {
                const meta = statusMeta(c.status as StatusValue);
                return (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${meta.badgeColor}`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{c.staffName}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${meta.badgeColor}`}>{meta.label}</Badge>
                      </div>
                      {c.location && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-muted-foreground flex-shrink-0" />
                          <span className="text-[11px] text-muted-foreground truncate">{c.location}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate({ id: c.id })}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={11} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
