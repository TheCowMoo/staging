import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  UserPlus,
  LogOut,
  Trash2,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Users,
  Building2,
  ArrowLeft,
} from "lucide-react";

const ID_TYPES = [
  "Driver's License",
  "State ID",
  "Passport",
  "Military ID",
  "Employee Badge",
  "Other Government ID",
];

const PURPOSE_OPTIONS = [
  "Meeting / Appointment",
  "Delivery",
  "Maintenance / Repair",
  "Interview",
  "Vendor / Contractor",
  "Tour / Inspection",
  "Training",
  "Other",
];

type FormState = {
  visitorName: string;
  company: string;
  purposeOfVisit: string;
  hostName: string;
  idVerified: boolean;
  idType: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  visitorName: "",
  company: "",
  purposeOfVisit: "",
  hostName: "",
  idVerified: false,
  idType: "",
  notes: "",
});

export default function VisitorManagement() {
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [watchlistName, setWatchlistName] = useState("");

  const utils = trpc.useUtils();

  // Real-time watchlist check — fires when name has 3+ chars
  const { data: watchlistResult } = trpc.flaggedVisitor.checkName.useQuery(
    { name: watchlistName },
    { enabled: watchlistName.length >= 3 }
  );
  const { data: visitors = [], isLoading } = trpc.visitor.list.useQuery({});

  const createVisitor = trpc.visitor.create.useMutation({
    onSuccess: () => {
      utils.visitor.list.invalidate();
      toast.success("Visitor logged in successfully.");
      setForm(emptyForm());
      setDialogOpen(false);
    },
    onError: () => toast.error("Failed to log visitor."),
  });

  const checkOut = trpc.visitor.checkOut.useMutation({
    onSuccess: () => {
      utils.visitor.list.invalidate();
      toast.success("Visitor checked out.");
    },
    onError: () => toast.error("Failed to check out visitor."),
  });

  const deleteVisitor = trpc.visitor.delete.useMutation({
    onSuccess: () => {
      utils.visitor.list.invalidate();
      toast.success("Visitor record deleted.");
    },
    onError: () => toast.error("Failed to delete record."),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.visitorName.trim()) { toast.error("Visitor name is required."); return; }
    if (!form.purposeOfVisit.trim()) { toast.error("Purpose of visit is required."); return; }
    setSubmitting(true);
    try {
      await createVisitor.mutateAsync({
        visitorName: form.visitorName.trim(),
        company: form.company.trim() || undefined,
        purposeOfVisit: form.purposeOfVisit.trim(),
        hostName: form.hostName.trim() || undefined,
        idVerified: form.idVerified,
        idType: form.idType || undefined,
        notes: form.notes.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Split into active (no timeOut) and past
  const activeVisitors = visitors.filter((v) => !v.timeOut);
  const pastVisitors = visitors.filter((v) => !!v.timeOut);

  const formatTime = (ts: Date | string | null | undefined) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleString(undefined, {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const formatDuration = (timeIn: Date | string, timeOut: Date | string | null | undefined) => {
    if (!timeOut) return null;
    const ms = new Date(timeOut).getTime() - new Date(timeIn).getTime();
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Back + Header */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={15} />
            Dashboard
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users size={24} className="text-primary" />
              Visitor Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Log and track all facility visitors, verify photo ID, and record time in/out.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus size={16} />
                Log Visitor In
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus size={18} className="text-primary" />
                  Log New Visitor
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                {/* Visitor Name */}
                <div className="space-y-1">
                  <Label htmlFor="visitorName">Visitor Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="visitorName"
                    placeholder="Full name"
                    value={form.visitorName}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, visitorName: e.target.value }));
                      setWatchlistName(e.target.value);
                    }}
                    required
                  />
                  {watchlistResult?.flagged && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-400 rounded-lg flex items-start gap-2">
                      <span className="text-red-600 text-lg leading-none">⚠️</span>
                      <div>
                        <p className="text-sm font-bold text-red-700">WATCHLIST ALERT</p>
                        <p className="text-xs text-red-600 mt-0.5">
                          This name matches a flagged visitor entry.
                          {watchlistResult.entry?.reason && (
                            <> Reason: <strong>{watchlistResult.entry.reason}</strong></>
                          )}
                        </p>
                        <p className="text-xs text-red-500 mt-1">Do not proceed without supervisor authorization.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Company */}
                <div className="space-y-1">
                  <Label htmlFor="company">Company / Organization</Label>
                  <Input
                    id="company"
                    placeholder="Optional"
                    value={form.company}
                    onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                  />
                </div>

                {/* Purpose of Visit */}
                <div className="space-y-1">
                  <Label>Purpose of Visit <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.purposeOfVisit}
                    onValueChange={(v) => setForm((p) => ({ ...p, purposeOfVisit: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select purpose..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PURPOSE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.purposeOfVisit === "Other" && (
                    <Input
                      className="mt-1"
                      placeholder="Describe purpose..."
                      onChange={(e) => setForm((p) => ({ ...p, purposeOfVisit: e.target.value }))}
                    />
                  )}
                </div>

                {/* Host Name */}
                <div className="space-y-1">
                  <Label htmlFor="hostName">Host / Person Being Visited</Label>
                  <Input
                    id="hostName"
                    placeholder="Name of employee or department"
                    value={form.hostName}
                    onChange={(e) => setForm((p) => ({ ...p, hostName: e.target.value }))}
                  />
                </div>

                {/* Time In */}
                <div className="p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock size={14} />
                    <span>Time In will be recorded automatically as: <strong className="text-foreground">{new Date().toLocaleString()}</strong></span>
                  </div>
                </div>

                {/* Photo ID Verification */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <p className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                    <ShieldCheck size={14} />
                    Photo ID Verification <span className="font-normal text-blue-600">(optional)</span>
                  </p>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="idVerified"
                      checked={form.idVerified}
                      onCheckedChange={(checked) => setForm((p) => ({ ...p, idVerified: !!checked }))}
                    />
                    <Label htmlFor="idVerified" className="text-sm cursor-pointer">
                      Photo ID was presented and verified
                    </Label>
                  </div>

                  {form.idVerified && (
                    <div className="space-y-2 pt-1">
                      <div className="space-y-1">
                        <Label className="text-xs text-blue-700">ID Type</Label>
                        <Select
                          value={form.idType}
                          onValueChange={(v) => setForm((p) => ({ ...p, idType: v }))}
                        >
                          <SelectTrigger className="h-8 text-sm bg-white">
                            <SelectValue placeholder="Select ID type..." />
                          </SelectTrigger>
                          <SelectContent>
                            {ID_TYPES.map((t) => (
                              <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                    </div>
                  )}
                </div>

                {/* General Notes */}
                <div className="space-y-1">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional observations or notes..."
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    className="min-h-[60px] resize-none text-sm"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? "Logging in..." : "Log Visitor In"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setForm(emptyForm()); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Users size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeVisitors.length}</p>
              <p className="text-xs text-muted-foreground">Currently On-Site</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{visitors.filter((v) => v.idVerified).length}</p>
              <p className="text-xs text-muted-foreground">ID Verified Today</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Building2 size={18} className="text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{visitors.length}</p>
              <p className="text-xs text-muted-foreground">Total Logged</p>
            </div>
          </div>
        </div>

        {/* Active Visitors */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-green-50/50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-foreground">Currently On-Site</h2>
            <Badge variant="secondary" className="ml-auto text-xs">{activeVisitors.length}</Badge>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : activeVisitors.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No visitors currently on-site. Use "Log Visitor In" to add one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>ID Verified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeVisitors.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.visitorName}</TableCell>
                    <TableCell className="text-muted-foreground">{v.company ?? "—"}</TableCell>
                    <TableCell>{v.purposeOfVisit}</TableCell>
                    <TableCell className="text-muted-foreground">{v.hostName ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatTime(v.timeIn)}</TableCell>
                    <TableCell>
                      {v.idVerified ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                          <CheckCircle2 size={10} /> Verified{v.idType ? ` — ${v.idType}` : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not verified</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => checkOut.mutate({ id: v.id })}
                        >
                          <LogOut size={11} />
                          Check Out
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Delete this visitor record?")) deleteVisitor.mutate({ id: v.id });
                          }}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Visitor History */}
        {pastVisitors.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Clock size={14} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Visitor History</h2>
              <Badge variant="secondary" className="ml-auto text-xs">{pastVisitors.length}</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Time Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>ID Verified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastVisitors.map((v) => (
                  <TableRow key={v.id} className="text-muted-foreground">
                    <TableCell className="font-medium text-foreground">{v.visitorName}</TableCell>
                    <TableCell>{v.company ?? "—"}</TableCell>
                    <TableCell>{v.purposeOfVisit}</TableCell>
                    <TableCell className="text-sm">{formatTime(v.timeIn)}</TableCell>
                    <TableCell className="text-sm">{formatTime(v.timeOut)}</TableCell>
                    <TableCell className="text-sm">
                      {formatDuration(v.timeIn, v.timeOut) ?? "—"}
                    </TableCell>
                    <TableCell>
                      {v.idVerified ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                          <CheckCircle2 size={10} /> Yes
                        </span>
                      ) : (
                        <span className="text-xs">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Delete this visitor record?")) deleteVisitor.mutate({ id: v.id });
                        }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
