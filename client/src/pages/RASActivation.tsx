/**
 * RASActivation.tsx — Dedicated Response Activation System page
 *
 * Shows 4 large alert-type blocks: Lockdown, Lockout, Fire, Weather
 * Each triggers the activation flow immediately.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Lock, ShieldAlert, AlertTriangle, BellOff, Download,
} from "lucide-react";

const ALERT_BLOCKS = [
  {
    type: "lockdown" as const,
    title: "LOCKDOWN",
    desc: "Secure in place. Lock doors, silence devices, await All Clear.",
    color: "red",
    bgClass: "bg-red-600 hover:bg-red-700",
    borderClass: "border-red-500/30",
    ringColor: "focus:ring-red-500",
    icon: Lock,
  },
  {
    type: "lockout" as const,
    title: "LOCKOUT",
    desc: "Secure the perimeter. Lock exterior doors, restrict entry/exit.",
    color: "green",
    bgClass: "bg-green-600 hover:bg-green-700",
    borderClass: "border-green-500/30",
    ringColor: "focus:ring-green-500",
    icon: ShieldAlert,
  },
  {
    type: "fire" as const,
    title: "FIRE — EVACUATE",
    desc: "Evacuate immediately using the nearest safe exit. Do not use elevators.",
    color: "yellow",
    bgClass: "bg-yellow-500 hover:bg-yellow-600",
    borderClass: "border-yellow-500/30",
    ringColor: "focus:ring-yellow-500",
    icon: AlertTriangle,
  },
  {
    type: "weather" as const,
    title: "SEVERE WEATHER",
    desc: "Seek shelter immediately. Stay away from windows. Monitor for updates.",
    color: "blue",
    bgClass: "bg-blue-600 hover:bg-blue-700",
    borderClass: "border-blue-500/30",
    ringColor: "focus:ring-blue-500",
    icon: AlertTriangle,
  },
];

const TITLES: Record<string, { title: string; desc: string; btn: string }> = {
  lockdown: { title: "Confirm Lockdown", desc: "This will immediately alert all personnel to lock doors, secure positions, and await further instructions.", btn: "Activate LOCKDOWN" },
  lockout: { title: "Confirm Lockout", desc: "This will immediately alert all personnel to secure all exterior access points and prevent entry or exit.", btn: "Activate LOCKOUT" },
  fire: { title: "Confirm FIRE", desc: "This will immediately alert all personnel to evacuate the building using the nearest safe exit.", btn: "Activate FIRE ALARM" },
  weather: { title: "Confirm SEVERE WEATHER", desc: "This will immediately alert all personnel to seek shelter and stay away from windows.", btn: "Activate WEATHER ALERT" },
};

function ActivationConfirmModal({
  alertType,
  facilityId,
  onClose,
  onSuccess,
}: {
  alertType: "lockdown" | "lockout" | "fire" | "weather";
  facilityId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const activate = trpc.ras.activateAlert.useMutation({
    onSuccess: (data) => {
      toast.success(`${alertType.toUpperCase()} activated. Push notifications sent.`);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const t = TITLES[alertType] ?? TITLES.lockdown;
  const isWeather = alertType === "weather";
  const isFire = alertType === "fire";
  const isLockout = alertType === "lockout";
  const btnColor = alertType === "lockdown" ? "bg-red-600 hover:bg-red-700" : isWeather ? "bg-blue-600 hover:bg-blue-700" : isFire ? "bg-yellow-500 hover:bg-yellow-600" : isLockout ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{
            color: alertType === "lockdown" ? "#dc2626" :
                   alertType === "lockout" ? "#16a34a" :
                   alertType === "fire" ? "#ca8a04" :
                   alertType === "weather" ? "#2563eb" : "#dc2626"
          }}>
            <ShieldAlert className="h-5 w-5" />
            {t.title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed pt-1">
            {t.desc} Push notifications will be sent to all registered devices.
          </DialogDescription>
        </DialogHeader>
        <div className={`rounded-md px-4 py-3 text-white text-sm font-semibold ${alertType === "lockdown" ? "bg-red-600" : isWeather ? "bg-blue-600" : isFire ? "bg-yellow-500" : isLockout ? "bg-green-600" : "bg-red-600"}`}>
          {alertType.toUpperCase()} — This action cannot be undone without issuing an All Clear.
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={activate.isPending}>Cancel</Button>
          <Button
            className={`text-white ${btnColor}`}
            onClick={() => activate.mutate({ facilityId, alertType })}
            disabled={activate.isPending}
          >
            {activate.isPending ? "Activating…" : t.btn}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RASActivation() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [pending, setPending] = useState<"lockdown" | "lockout" | "fire" | "weather" | null>(null);

  const { data: facilities } = trpc.facility.list.useQuery(undefined, { enabled: !!user });

  useEffect(() => {
    if (facilities && facilities.length > 0 && !facilityId) {
      setFacilityId((facilities[0] as { id: number }).id);
    }
  }, [facilities, facilityId]);

  const rasRole = (user as Record<string, unknown> | null)?.rasRole as string | null | undefined;

  if (!user || !rasRole) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <BellOff className="h-12 w-12 text-muted-foreground" />
          <div className="space-y-1">
            <div className="text-lg font-semibold">Emergency Alerts Not Enabled</div>
            <p className="text-sm text-muted-foreground max-w-sm">
              Your account is not enrolled in the Response Activation System.
              Contact your administrator to assign you a RAS role.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!facilityId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No facility found. Create a facility first.</p>
        </div>
      </div>
    );
  }

  const { data: installerData, isLoading: installerLoading } = trpc.ras.getInstallerDownload.useQuery(undefined, {
    enabled: !!user && rasRole === "admin",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <ShieldAlert className="h-7 w-7 text-red-500" />
          Response Activation System
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select an alert type to immediately notify all personnel. Push notifications will be sent to all registered devices.
        </p>
      </div>

      {/* Download Desktop Alert (admin only) */}
      {rasRole === "admin" && (
        <div className="mb-8 p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                RAS Desktop Alert v{installerData?.version ?? "1.1.0"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Download the desktop alert monitor for your organization.
                The installer is pre-configured with your org-specific API key.
              </p>
            </div>
            <Button
              size="sm"
              disabled={installerLoading || !installerData?.downloadUrl}
              onClick={() => {
                if (installerData?.downloadUrl) {
                  window.open(installerData.downloadUrl, "_blank");
                } else {
                  toast.error("Installer not yet available. Run the build script first.");
                }
              }}
            >
              {installerLoading ? "Checking..." : "Download Installer"}
            </Button>
          </div>
          {installerData?.downloadUrl && (
            <p className="text-xs text-muted-foreground mt-2">
              Last built for org {installerData.orgId}
            </p>
          )}
        </div>
      )}

      {/* 4 Big Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {ALERT_BLOCKS.map((block) => {
          const Icon = block.icon;
          return (
            <button
              key={block.type}
              onClick={() => setPending(block.type)}
              className={`group relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 ${block.borderClass} bg-card hover:${block.borderClass.replace("/30", "/60")} transition-all p-10 focus:outline-none focus:ring-2 ${block.ringColor} focus:ring-offset-2`}
            >
              <div className={`rounded-2xl ${block.bgClass} p-6 group-hover:scale-110 transition-transform shadow-lg`}>
                <Icon className="h-12 w-12 text-white" />
              </div>
              <div className="text-center">
                <div className={`text-xl font-black tracking-wider ${
                  block.color === "red" ? "text-red-600 dark:text-red-400" :
                  block.color === "green" ? "text-green-600 dark:text-green-400" :
                  block.color === "yellow" ? "text-yellow-500 dark:text-yellow-400" :
                  block.color === "blue" ? "text-blue-600 dark:text-blue-400" :
                  "text-red-600 dark:text-red-400"
                }`}>
                  {block.title}
                </div>
                <p className="text-sm text-muted-foreground mt-2 max-w-[220px]">
                  {block.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info footer */}
      <div className="mt-8 p-4 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground text-center">
        Activating an alert will notify all users with a RAS role in your organization.
        Use the Emergency Alerts dashboard to track acknowledgments and issue an All Clear.
      </div>

      {/* Confirmation modal */}
      {pending && facilityId && (
        <ActivationConfirmModal
          alertType={pending}
          facilityId={facilityId}
          onClose={() => setPending(null)}
          onSuccess={() => {
            setPending(null);
            navigate("/ras");
          }}
        />
      )}
    </div>
  );
}