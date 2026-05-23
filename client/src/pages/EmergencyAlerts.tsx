/**
 * EmergencyAlerts.tsx — Response Activation System (RAS) Frontend
 *
 * Renders the correct view based on the user's rasRole and current alert state:
 *
 *  Admin/Responder (no active alert):  Activation screen — Lockdown / Lockout buttons
 *  Admin/Responder (active alert):     Alert status dashboard with recipient tracking
 *  Staff (no active alert):            Push enrollment prompt + readiness status
 *  Staff (active alert):               Mobile alert received view with acknowledge button
 *  No rasRole:                         Access denied / contact admin
 *
 * Push enrollment banner is shown to any rasRole user with no subscription on this device.
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePushSubscription } from "@/lib/usePushSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Lock,
  Shield,
  ShieldAlert,
  Users,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type AlertStatus = "active" | "response_in_progress" | "resolved";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function statusColor(status: AlertStatus) {
  if (status === "active") return "bg-red-600";
  if (status === "response_in_progress") return "bg-amber-500";
  return "bg-green-600";
}

function statusLabel(status: AlertStatus) {
  if (status === "active") return "ACTIVE";
  if (status === "response_in_progress") return "RESPONSE IN PROGRESS";
  return "ALL CLEAR";
}

function alertTypeLabel(type: string) {
  return type === "lockdown" ? "LOCKDOWN" : "LOCKOUT";
}

function alertTypeColor(type: string) {
  return type === "lockdown" ? "bg-red-700" : "bg-orange-600";
}

function formatTime(ts: unknown) {
  if (!ts) return "—";
  return new Date(ts as string | number).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(ts: unknown) {
  if (!ts) return "—";
  return new Date(ts as string | number).toLocaleString();
}

// ─── Push Enrollment Banner ───────────────────────────────────────────────────
function PushEnrollmentBanner() {
  const { status, error, subscribe } = usePushSubscription();

  if (status === "subscribed" || status === "checking" || status === "unsupported") return null;

  if (status === "permission_denied") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
        <BellOff className="h-4 w-4 shrink-0" />
        <span>
          <strong>Alerts disabled on this device.</strong> To receive emergency push notifications,
          re-enable notifications for this site in your browser settings, then reload.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3">
      <div className="flex items-center gap-3 text-sm text-blue-700 dark:text-blue-300">
        <Bell className="h-4 w-4 shrink-0" />
        <span>
          <strong>Enable emergency alerts on this device</strong> — receive instant push notifications
          when a Lockdown or Lockout is activated.
        </span>
      </div>
      <Button
        size="sm"
        onClick={subscribe}
        disabled={status === "subscribing"}
        className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
      >
        {status === "subscribing" ? "Enabling…" : "Enable Alerts"}
      </Button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── Activation Confirmation Modal ───────────────────────────────────────────
function ActivationModal({
  alertType,
  facilityId,
  onClose,
  onSuccess,
}: {
  alertType: "lockdown" | "lockout";
  facilityId: number;
  onClose: () => void;
  onSuccess: (id: number) => void;
}) {
  const activate = trpc.ras.activateAlert.useMutation({
    onSuccess: (data) => {
      toast.success(`${alertTypeLabel(alertType)} activated. Push notifications sent.`);
      onSuccess(data.alertEventId);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const isLockdown = alertType === "lockdown";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <ShieldAlert className="h-5 w-5" />
            Confirm {isLockdown ? "Lockdown" : "Lockout"}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed pt-1">
            {isLockdown
              ? "This will immediately alert all personnel to lock doors, secure positions, and await further instructions. Push notifications will be sent to all registered devices."
              : "This will immediately alert all personnel to secure all exterior access points and prevent entry or exit. Push notifications will be sent to all registered devices."}
          </DialogDescription>
        </DialogHeader>
        <div className={`rounded-md px-4 py-3 text-white text-sm font-semibold ${alertTypeColor(alertType)}`}>
          {alertTypeLabel(alertType)} — This action cannot be undone without issuing an All Clear.
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={activate.isPending}>
            Cancel
          </Button>
          <Button
            className={`${isLockdown ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"} text-white`}
            onClick={() => activate.mutate({ facilityId, alertType })}
            disabled={activate.isPending}
          >
            {activate.isPending ? "Activating…" : `Activate ${alertTypeLabel(alertType)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Activation Screen (Admin / Responder — no active alert) ─────────────────
function ActivationScreen({
  facilityId,
  onActivated,
}: {
  facilityId: number;
  onActivated: () => void;
}) {
  const [pending, setPending] = useState<"lockdown" | "lockout" | null>(null);

  return (
    <div className="space-y-6">
      <PushEnrollmentBanner />

      <div className="rounded-lg border border-border bg-card p-6 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>Response Activation System — Standby</span>
        </div>
        <p className="text-xs text-muted-foreground">
          No active alert. Use the buttons below to initiate a Lockdown or Lockout for this facility.
          All personnel with registered devices will receive an immediate push notification.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Lockdown */}
        <button
          onClick={() => setPending("lockdown")}
          className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-red-500/30 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/60 transition-all p-8 text-left focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <div className="rounded-full bg-red-600 p-4 group-hover:scale-105 transition-transform">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-600 dark:text-red-400 tracking-wide">LOCKDOWN</div>
            <div className="text-xs text-muted-foreground mt-1 max-w-[160px]">
              Secure in place. Lock doors, silence devices, await All Clear.
            </div>
          </div>
        </button>

        {/* Lockout */}
        <button
          onClick={() => setPending("lockout")}
          className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-500/60 transition-all p-8 text-left focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          <div className="rounded-full bg-orange-600 p-4 group-hover:scale-105 transition-transform">
            <ShieldAlert className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400 tracking-wide">LOCKOUT</div>
            <div className="text-xs text-muted-foreground mt-1 max-w-[160px]">
              Secure the perimeter. Lock exterior doors, restrict entry/exit.
            </div>
          </div>
        </button>
      </div>

      {pending && (
        <ActivationModal
          alertType={pending}
          facilityId={facilityId}
          onClose={() => setPending(null)}
          onSuccess={() => { setPending(null); onActivated(); }}
        />
      )}
    </div>
  );
}

// ─── Staff Alert View (mobile-first) ─────────────────────────────────────────
function StaffAlertView({ alert }: { alert: Record<string, unknown> }) {
  const utils = trpc.useUtils();
  const acknowledge = trpc.ras.acknowledge.useMutation({
    onSuccess: () => {
      toast.success("Acknowledged.");
      utils.ras.getActiveAlert.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const recipient = alert.recipient as Record<string, unknown> | null;
  const isAcknowledged = !!recipient?.acknowledgedAt;
  const alertType = alert.alertType as string;
  const alertEventId = alert.id as number;
  const instruction = alert.instruction as string;

  return (
    <div className="space-y-4">
      <PushEnrollmentBanner />

      {/* Alert banner */}
      <div className={`rounded-xl p-6 text-white space-y-3 ${alertTypeColor(alertType)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            <span className="text-2xl font-black tracking-widest">{alertTypeLabel(alertType)}</span>
          </div>
          <span className="text-xs opacity-80">{formatTime(alert.createdAt)}</span>
        </div>
        <div className="text-sm font-medium opacity-90">{alert.messageTitle as string}</div>
      </div>

      {/* Instruction */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Your Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{instruction}</p>
        </CardContent>
      </Card>

      {/* Acknowledge */}
      {!isAcknowledged ? (
        <Button
          className="w-full h-14 text-base font-bold bg-green-600 hover:bg-green-700 text-white"
          onClick={() => acknowledge.mutate({ alertEventId })}
          disabled={acknowledge.isPending}
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          {acknowledge.isPending ? "Confirming…" : "Acknowledge — I Have Received This Alert"}
        </Button>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 py-4 text-green-700 dark:text-green-400 text-sm font-medium">
          <CheckCircle className="h-4 w-4" />
          Acknowledged at {formatTime(recipient?.acknowledgedAt)}
        </div>
      )}

      {/* Status updates */}
      {Array.isArray(alert.statusUpdates) && alert.statusUpdates.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Status Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(alert.statusUpdates as Array<Record<string, unknown>>).map((u, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-muted-foreground shrink-0">{formatTime(u.createdAt)}</span>
                <span>{u.shortMessage as string || u.statusType as string}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Admin Alert Dashboard ────────────────────────────────────────────────────
function AdminAlertDashboard({ alertEventId }: { alertEventId: number }) {
  const utils = trpc.useUtils();
  const [statusMessage, setStatusMessage] = useState("");
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [expandedRecipients, setExpandedRecipients] = useState(false);

  const { data, isLoading } = trpc.ras.getAlertDashboard.useQuery(
    { alertEventId },
    { refetchInterval: 10000 }
  );

  const addUpdate = trpc.ras.addStatusUpdate.useMutation({
    onSuccess: () => {
      toast.success("Status update posted.");
      setStatusMessage("");
      setShowUpdateForm(false);
      utils.ras.getAlertDashboard.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resolve = trpc.ras.resolveAlert.useMutation({
    onSuccess: () => {
      toast.success("All Clear issued. Alert resolved.");
      utils.ras.getActiveAlert.invalidate();
      utils.ras.getAlertDashboard.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const markResponding = trpc.ras.markResponding.useMutation({
    onSuccess: () => {
      toast.success("Marked as responding.");
      utils.ras.getAlertDashboard.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading || !data) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading dashboard…</div>;
  }

  const { alert, recipients, statusUpdates, summary } = data;
  const alertType = alert.alertType as string;
  const alertStatus = alert.alertStatus as AlertStatus;

  // Classify recipients for visibility
  const failedDelivery = (recipients as Array<Record<string, unknown>>).filter(
    (r) => r.deliveryStatus === "failed" || r.deliveryStatus === "pending"
  );
  const noSubscription = (recipients as Array<Record<string, unknown>>).filter(
    (r) => r.deliveryStatus === "pending"
  );

  return (
    <div className="space-y-4">
      <PushEnrollmentBanner />

      {/* Alert header */}
      <div className={`rounded-xl p-4 text-white flex items-center justify-between ${alertTypeColor(alertType)}`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <div className="font-black tracking-widest text-lg">{alertTypeLabel(alertType)}</div>
            <div className="text-xs opacity-80">Activated {formatDateTime(alert.createdAt)}</div>
          </div>
        </div>
        <Badge className={`${statusColor(alertStatus)} text-white border-0 text-xs`}>
          {statusLabel(alertStatus)}
        </Badge>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Targeted" value={summary.total} icon={<Users className="h-4 w-4" />} />
        <SummaryCard
          label="Delivered"
          value={summary.delivered}
          icon={<Wifi className="h-4 w-4" />}
          color="text-green-600"
        />
        <SummaryCard
          label="Failed / No Push"
          value={summary.failed + summary.pending}
          icon={<WifiOff className="h-4 w-4" />}
          color={summary.failed + summary.pending > 0 ? "text-red-500" : undefined}
          alert={summary.failed + summary.pending > 0}
        />
        <SummaryCard
          label="Acknowledged"
          value={summary.acknowledged}
          icon={<CheckCircle className="h-4 w-4" />}
          color="text-blue-600"
        />
      </div>

      {/* Delivery failure visibility — required per spec */}
      {(summary.failed > 0 || summary.pending > 0) && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
            <XCircle className="h-4 w-4" />
            Delivery Issues — {summary.failed + summary.pending} user(s) not confirmed reached
          </div>
          <div className="space-y-1">
            {failedDelivery.slice(0, 5).map((r, i) => (
              <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${r.deliveryStatus === "failed" ? "bg-red-500" : "bg-amber-500"}`} />
                <span>{r.userName as string || `User #${r.userId}`}</span>
                <span className="text-muted-foreground/60">
                  {r.deliveryStatus === "pending" ? "No push subscription on file" : "Push delivery failed"}
                </span>
              </div>
            ))}
            {failedDelivery.length > 5 && (
              <div className="text-xs text-muted-foreground">…and {failedDelivery.length - 5} more</div>
            )}
          </div>
        </div>
      )}

      {/* Mark responding + status update */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => markResponding.mutate({ alertEventId })}
          disabled={markResponding.isPending}
        >
          <Shield className="h-3.5 w-3.5 mr-1.5" />
          Mark Me as Responding
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowUpdateForm(!showUpdateForm)}
        >
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          Post Status Update
        </Button>
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={() => setShowResolveConfirm(true)}
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
          Issue All Clear
        </Button>
      </div>

      {/* Status update form */}
      {showUpdateForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Textarea
              placeholder="Status update (max 120 characters)…"
              maxLength={120}
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{statusMessage.length}/120</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowUpdateForm(false)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={() => addUpdate.mutate({
                    alertEventId,
                    statusType: "response_in_progress",
                    shortMessage: statusMessage || undefined,
                  })}
                  disabled={addUpdate.isPending}
                >
                  Post Update
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status updates timeline */}
      {(statusUpdates as Array<Record<string, unknown>>).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Status Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(statusUpdates as Array<Record<string, unknown>>).map((u, i) => (
              <div key={i} className="flex items-start gap-3 text-xs">
                <span className="text-muted-foreground shrink-0 pt-0.5">{formatTime(u.createdAt)}</span>
                <div>
                  <span className="font-medium">{u.updatedByName as string || "System"}</span>
                  {u.shortMessage != null && <span className="text-muted-foreground"> — {String(u.shortMessage)}</span>}
                  <span className="ml-1 text-muted-foreground/60">({u.statusType as string})</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recipient list (collapsible) */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedRecipients(!expandedRecipients)}>
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Recipients ({(recipients as Array<unknown>).length})
            </span>
            {expandedRecipients ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        {expandedRecipients && (
          <CardContent className="space-y-1.5">
            {(recipients as Array<Record<string, unknown>>).map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    r.deliveryStatus === "delivered" ? "bg-green-500" :
                    r.deliveryStatus === "failed" ? "bg-red-500" : "bg-amber-400"
                  }`} />
                  <span className="font-medium">{r.userName as string || `User #${r.userId}`}</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">{r.rasRoleAtTime as string}</Badge>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  {r.acknowledgedAt ? (
                    <span className="text-green-600 flex items-center gap-0.5">
                      <CheckCircle className="h-3 w-3" /> Ack
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">Pending ack</span>
                  )}
                  {r.responseStatus === "responding" && (
                    <Badge className="bg-blue-600 text-white text-[10px] py-0 px-1.5 border-0">Responding</Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Resolve confirmation dialog */}
      {showResolveConfirm && (
        <Dialog open onOpenChange={() => setShowResolveConfirm(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Issue All Clear
              </DialogTitle>
              <DialogDescription>
                This will mark the alert as resolved and notify all personnel that the situation is clear.
                This action is logged and cannot be reversed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowResolveConfirm(false)}>Cancel</Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  resolve.mutate({ alertEventId });
                  setShowResolveConfirm(false);
                }}
                disabled={resolve.isPending}
              >
                Confirm All Clear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Readiness View (Admin — no active alert) ─────────────────────────────────
function ReadinessView() {
  const { data, isLoading } = trpc.ras.getReadiness.useQuery();

  if (isLoading || !data) {
    return <div className="text-sm text-muted-foreground py-4 text-center">Loading readiness data…</div>;
  }

  const coveragePercent = data.totalUsers > 0
    ? Math.round((data.pushEnabled / data.totalUsers) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          Push Alert Readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coverage bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Push coverage</span>
            <span>{coveragePercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${coveragePercent >= 80 ? "bg-green-500" : coveragePercent >= 50 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${coveragePercent}%` }}
            />
          </div>
        </div>

        {/* Summary grid */}
        <div className="grid grid-cols-2 gap-3">
          <ReadinessStat label="Total RAS Users" value={data.totalUsers} />
          <ReadinessStat label="Push Enabled" value={data.pushEnabled} color="text-green-600" />
          <ReadinessStat
            label="No Push Subscription"
            value={data.noPush}
            color={data.noPush > 0 ? "text-red-500" : undefined}
            alert={data.noPush > 0}
          />
          <ReadinessStat
            label="Responders Without Push"
            value={data.respondersNoPush}
            color={data.respondersNoPush > 0 ? "text-red-500" : undefined}
            alert={data.respondersNoPush > 0}
          />
        </div>

        {/* Users without push */}
        {data.noPush > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">Users without push subscription:</div>
            {data.usersDetail
              .filter((u) => !u.pushEnabled)
              .map((u) => (
                <div key={u.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                  <span>{u.name || u.email}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">{u.rasRole}</Badge>
                    <span className="text-amber-500 flex items-center gap-0.5">
                      <WifiOff className="h-3 w-3" /> No push
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Resolved View ────────────────────────────────────────────────────────────
function ResolvedView({ alert }: { alert: Record<string, unknown> }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-6 text-center space-y-2">
        <CheckCircle className="h-10 w-10 text-green-600 mx-auto" />
        <div className="text-xl font-bold text-green-700 dark:text-green-400">ALL CLEAR</div>
        <div className="text-sm text-muted-foreground">
          {alertTypeLabel(alert.alertType as string)} resolved at {formatDateTime(alert.resolvedAt)}
        </div>
      </div>
      {Array.isArray(alert.statusUpdates) && alert.statusUpdates.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Event Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(alert.statusUpdates as Array<Record<string, unknown>>).map((u, i) => (
              <div key={i} className="flex items-start gap-3 text-xs">
                <span className="text-muted-foreground shrink-0">{formatTime(u.createdAt)}</span>
                <span>{u.shortMessage as string || u.statusType as string}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Small helper components ──────────────────────────────────────────────────
function SummaryCard({
  label, value, icon, color, alert,
}: {
  label: string; value: number; icon: React.ReactNode; color?: string; alert?: boolean;
}) {
  return (
    <div className={`rounded-lg border ${alert ? "border-red-500/30 bg-red-500/5" : "border-border bg-card"} p-3 space-y-1`}>
      <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${color ?? ""}`}>
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color ?? ""}`}>{value}</div>
    </div>
  );
}

function ReadinessStat({
  label, value, color, alert,
}: {
  label: string; value: number; color?: string; alert?: boolean;
}) {
  return (
    <div className={`rounded-lg border ${alert ? "border-red-500/30 bg-red-500/5" : "border-border bg-muted/30"} p-3`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold mt-0.5 ${color ?? ""}`}>{value}</div>
    </div>
  );
}

// ─── RAS Role Management Panel (admin only) ─────────────────────────────────
function RasRoleManagement() {
  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.ras.listRasUsers.useQuery();
  const setRole = trpc.ras.setRasRole.useMutation({
    onSuccess: () => utils.ras.listRasUsers.invalidate(),
  });

  const RAS_ROLE_OPTIONS = [
    { value: "admin",     label: "Admin",     color: "text-red-600" },
    { value: "responder", label: "Responder", color: "text-amber-600" },
    { value: "staff",     label: "Staff",     color: "text-blue-600" },
    { value: null,        label: "None",      color: "text-muted-foreground" },
  ];

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          RAS Role Management
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Assign RAS roles to control who can activate alerts, respond, and receive notifications.
          Users with no role will not receive push alerts.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-4 py-6 text-xs text-muted-foreground text-center">Loading users…</div>
        ) : !users || (users as Array<Record<string, unknown>>).length === 0 ? (
          <div className="px-4 py-6 text-xs text-muted-foreground text-center">No users found in your organisation.</div>
        ) : (
          <div className="divide-y divide-border">
            {(users as Array<Record<string, unknown>>).map((u) => (
              <div key={String(u.id)} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{String(u.name)}</div>
                  <div className="text-xs text-muted-foreground truncate">{String(u.email)}</div>
                </div>
                {/* Push status */}
                <div className="flex items-center gap-1 shrink-0">
                  {Number(u.pushSubscriptionCount) > 0 ? (
                    <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                      <Bell className="h-3 w-3" /> Push
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <BellOff className="h-3 w-3" /> No push
                    </span>
                  )}
                </div>
                {/* Role selector */}
                <select
                  className="text-xs border border-border rounded px-2 py-1 bg-background shrink-0 w-28"
                  value={String(u.rasRole ?? "")}
                  disabled={setRole.isPending}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRole.mutate({
                      targetUserId: Number(u.id),
                      rasRole: val === "" ? null : (val as "admin" | "responder" | "staff"),
                    });
                  }}
                >
                  <option value="">No role</option>
                  {RAS_ROLE_OPTIONS.filter(o => o.value !== null).map(o => (
                    <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── No RAS Role View ─────────────────────────────────────────────────────────
function NoRasRoleView() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <BellOff className="h-10 w-10 text-muted-foreground" />
      <div className="space-y-1">
        <div className="text-base font-semibold">Emergency Alerts Not Enabled</div>
        <div className="text-sm text-muted-foreground max-w-sm">
          Your account is not currently enrolled in the Response Activation System.
          Contact your organization administrator to be assigned a RAS role.
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmergencyAlerts() {
  const { user, loading } = useAuth();
  const [facilityId, setFacilityId] = useState<number | null>(null);

  // Fetch facilities to get the first one for this user
  const { data: facilities } = trpc.facility.list.useQuery(undefined, { enabled: !!user });

  useEffect(() => {
    if (facilities && facilities.length > 0 && !facilityId) {
      setFacilityId((facilities[0] as { id: number }).id);
    }
  }, [facilities, facilityId]);

  const rasRole = (user as Record<string, unknown> | null)?.rasRole as string | null | undefined;

  const { data: activeAlert, isLoading: alertLoading, refetch } = trpc.ras.getActiveAlert.useQuery(
    { facilityId: facilityId ?? undefined },
    {
      enabled: !!user && !!rasRole,
      refetchInterval: 15000,
    }
  );

  if (loading || alertLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) return null;

  if (!rasRole) return <NoRasRoleView />;

  const alertStatus = activeAlert ? (activeAlert as Record<string, unknown>).alertStatus as AlertStatus : null;
  const alertEventId = activeAlert ? (activeAlert as Record<string, unknown>).id as number : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            Emergency Alerts
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Response Activation System
            {rasRole && (
              <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1.5 capitalize">
                {rasRole}
              </Badge>
            )}
          </p>
        </div>
      </div>

      {/* Resolved state */}
      {alertStatus === "resolved" && activeAlert && (
        <ResolvedView alert={activeAlert as Record<string, unknown>} />
      )}

      {/* Active alert — admin/responder dashboard */}
      {alertStatus && alertStatus !== "resolved" && (rasRole === "admin" || rasRole === "responder") && alertEventId && (
        <AdminAlertDashboard alertEventId={alertEventId} />
      )}

      {/* Active alert — staff view */}
      {alertStatus && alertStatus !== "resolved" && rasRole === "staff" && activeAlert && (
        <StaffAlertView alert={activeAlert as Record<string, unknown>} />
      )}

      {/* No active alert — admin/responder activation screen */}
      {!activeAlert && (rasRole === "admin" || rasRole === "responder") && facilityId && (
        <ActivationScreen facilityId={facilityId} onActivated={() => refetch()} />
      )}

      {/* No active alert — staff standby */}
      {!activeAlert && rasRole === "staff" && (
        <div className="space-y-4">
          <PushEnrollmentBanner />
          <div className="rounded-lg border border-border bg-card p-6 text-center space-y-2">
            <Shield className="h-8 w-8 text-muted-foreground mx-auto" />
            <div className="text-sm font-medium">No Active Alert</div>
            <div className="text-xs text-muted-foreground">
              You will receive a push notification immediately if a Lockdown or Lockout is activated.
            </div>
          </div>
        </div>
      )}

      {/* Readiness panel — admin only, no active alert */}
      {!activeAlert && rasRole === "admin" && <ReadinessView />}

      {/* Role management — admin only, always visible */}
      {rasRole === "admin" && <RasRoleManagement />}
    </div>
  );
}
