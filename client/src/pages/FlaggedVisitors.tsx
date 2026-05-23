import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus, Trash2, EyeOff, ShieldAlert, Siren, Filter } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function FlaggedVisitors() {
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", reason: "", facilityId: "", flagLevel: "red" as "red" | "yellow" });
  const [filterFacilityId, setFilterFacilityId] = useState<string>("all");
  const [uploadingFor, setUploadingFor] = useState<number | null>(null);

  const { data: flagged = [], refetch } = trpc.flaggedVisitor.list.useQuery({ activeOnly: false });
  const { data: facilities = [] } = trpc.facility.list.useQuery();

  const addMutation = trpc.flaggedVisitor.add.useMutation({
    onSuccess: () => {
      toast.success("Visitor added to watchlist");
      setForm({ name: "", reason: "", facilityId: "", flagLevel: "red" });
      setAddOpen(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deactivateMutation = trpc.flaggedVisitor.deactivate.useMutation({
    onSuccess: () => { toast.success("Entry deactivated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.flaggedVisitor.delete.useMutation({
    onSuccess: () => { toast.success("Entry deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const escalateMutation = trpc.flaggedVisitor.escalate.useMutation({
    onSuccess: () => toast.success("Entry escalated — owner has been notified"),
    onError: (e) => toast.error(e.message),
  });

  const allActive = flagged.filter(f => f.active);
  const allInactive = flagged.filter(f => !f.active);
  const active = filterFacilityId === "all"
    ? allActive
    : allActive.filter(f => filterFacilityId === "none" ? !f.facilityId : f.facilityId === Number(filterFacilityId));
  const inactive = filterFacilityId === "all"
    ? allInactive
    : allInactive.filter(f => filterFacilityId === "none" ? !f.facilityId : f.facilityId === Number(filterFacilityId));

  const facilityName = (id: number | null | undefined) => {
    if (!id) return null;
    return facilities.find(f => f.id === id)?.name ?? null;
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-7 w-7 text-red-500" />
            <div>
              <h1 className="text-2xl font-bold">Visitor Watchlist</h1>
              <p className="text-sm text-muted-foreground">
                Individuals flagged for elevated scrutiny during check-in. Staff are alerted when a name matches.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Note: Only upload publicly available photos (social media, CCTV, press). Do not upload private or sensitive images.
              </p>
            </div>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add to Watchlist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Visitor to Watchlist</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium">Full Name <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="First and last name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Reason / Notes</label>
                  <Textarea
                    placeholder="Describe the concern or basis for flagging (internal use only)"
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Scope to Facility <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <Select
                    value={form.facilityId}
                    onValueChange={v => setForm(f => ({ ...f, facilityId: v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All facilities (org-wide)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All facilities (org-wide)</SelectItem>
                      {facilities.map(fac => (
                        <SelectItem key={fac.id} value={String(fac.id)}>{fac.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave blank to flag across all locations, or select a specific facility.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Flag Level</label>
                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, flagLevel: "red" }))}
                      className={`flex-1 flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                        form.flagLevel === "red"
                          ? "bg-red-50 border-red-400 text-red-800 ring-2 ring-red-300"
                          : "bg-muted/30 border-border hover:bg-muted/50"
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                      Red Flag
                      <span className="text-xs text-muted-foreground ml-auto">High concern</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, flagLevel: "yellow" }))}
                      className={`flex-1 flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                        form.flagLevel === "yellow"
                          ? "bg-yellow-50 border-yellow-400 text-yellow-800 ring-2 ring-yellow-300"
                          : "bg-muted/30 border-border hover:bg-muted/50"
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-yellow-400 flex-shrink-0" />
                      Yellow Flag
                      <span className="text-xs text-muted-foreground ml-auto">Less serious</span>
                    </button>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => addMutation.mutate({
                      name: form.name.trim(),
                      reason: form.reason.trim() || undefined,
                      facilityId: form.facilityId && form.facilityId !== "all" ? Number(form.facilityId) : undefined,
                      flagLevel: form.flagLevel,
                    })}
                    disabled={!form.name.trim() || addMutation.isPending}
                    className={form.flagLevel === "red" ? "bg-red-600 hover:bg-red-700" : "bg-yellow-500 hover:bg-yellow-600 text-black"}
                  >
                    {addMutation.isPending ? "Adding…" : `Add ${form.flagLevel === "red" ? "Red" : "Yellow"} Flag`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Facility filter */}
        {facilities.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={filterFacilityId} onValueChange={setFilterFacilityId}>
              <SelectTrigger className="w-56 h-8 text-sm">
                <SelectValue placeholder="All facilities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All facilities</SelectItem>
                <SelectItem value="none">Org-wide only</SelectItem>
                {facilities.map(fac => (
                  <SelectItem key={fac.id} value={String(fac.id)}>{fac.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterFacilityId !== "all" && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setFilterFacilityId("all")}>Clear</Button>
            )}
          </div>
        )}

        {/* Active entries */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Active Watchlist
              <Badge variant="destructive" className="ml-1">{active.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No active watchlist entries.</p>
            ) : (
              <div className="divide-y">
                {active.map(entry => (
                  <div key={entry.id} className="flex items-start justify-between py-3 gap-4">
                    <div className="flex-1 min-w-0">
                      {entry.photoUrl && (
                        <img src={entry.photoUrl} alt={entry.name} className="w-12 h-12 rounded-md object-cover mr-3 flex-shrink-0" />
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          (entry as any).flagLevel === "yellow" ? "bg-yellow-400" : "bg-red-500"
                        }`} />
                        <p className="font-semibold text-sm">{entry.name}</p>
                        <Badge className={`text-[10px] px-1.5 py-0 ${
                          (entry as any).flagLevel === "yellow"
                            ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                            : "bg-red-100 text-red-800 border-red-300"
                        }`}>
                          {(entry as any).flagLevel === "yellow" ? "Yellow" : "Red"} Flag
                        </Badge>
                      </div>
                      {entry.reason && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{entry.reason}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <p className="text-xs text-muted-foreground mt-1">
                        Added {new Date(entry.createdAt).toLocaleDateString()}
                        {entry.lastEscalatedAt && (
                          <span className="ml-2 text-orange-600">
                            · Escalated {new Date(entry.lastEscalatedAt).toLocaleDateString()}
                            {(entry.escalationCount ?? 0) > 1 && ` (×${entry.escalationCount})`}
                          </span>
                        )}
                      </p>                        {entry.facilityId && facilityName(entry.facilityId) && (
                          <Badge variant="outline" className="text-xs py-0 h-5">
                            {facilityName(entry.facilityId)}
                          </Badge>
                        )}
                        {!entry.facilityId && (
                          <Badge variant="outline" className="text-xs py-0 h-5 text-muted-foreground">
                            Org-wide
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs text-orange-600 hover:text-orange-700 hover:border-orange-300"
                        onClick={() => escalateMutation.mutate({ id: entry.id })}
                        disabled={escalateMutation.isPending}
                        title="Escalate — sends an immediate alert to the platform owner"
                      >
                        <Siren className="h-3 w-3" /> Escalate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => deactivateMutation.mutate({ id: entry.id })}
                        disabled={deactivateMutation.isPending}
                      >
                        <EyeOff className="h-3 w-3" /> Deactivate
                      </Button>
                      {user?.role === "admin" && (
                        <>
                          <input
                            id={`file-${entry.id}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              setUploadingFor(entry.id);
                              try {
                                const fd = new FormData();
                                fd.append('file', f);
                                fd.append('id', String(entry.id));
                                const res = await fetch('/api/upload/flagged-visitor-photo', {
                                  method: 'POST',
                                  body: fd,
                                  credentials: 'include',
                                });
                                const json = await res.json();
                                if (!res.ok) throw new Error(json?.error || 'Upload failed');
                                toast.success('Photo uploaded');
                                refetch();
                              } catch (err: any) {
                                toast.error(err.message || 'Upload failed');
                              } finally {
                                setUploadingFor(null);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }}
                          />
                          <label htmlFor={`file-${entry.id}`}>
                            <Button size="sm" variant="outline" className="gap-1 text-xs">Upload Photo</Button>
                          </label>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs text-red-600 hover:text-red-700"
                            onClick={() => deleteMutation.mutate({ id: entry.id })}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inactive entries */}
        {inactive.length > 0 && (
          <Card className="opacity-70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-muted-foreground">
                Deactivated Entries ({inactive.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {inactive.map(entry => (
                  <div key={entry.id} className="flex items-start justify-between py-3 gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-through text-muted-foreground">{entry.name}</p>
                      {entry.reason && (
                        <p className="text-xs text-muted-foreground mt-0.5">{entry.reason}</p>
                      )}
                      {entry.facilityId && facilityName(entry.facilityId) && (
                        <Badge variant="outline" className="text-xs py-0 h-5 mt-1">
                          {facilityName(entry.facilityId)}
                        </Badge>
                      )}
                    </div>
                    {user?.role === "admin" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs text-red-600 hover:text-red-700 shrink-0"
                        onClick={() => deleteMutation.mutate({ id: entry.id })}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
