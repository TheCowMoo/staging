import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";
import { Link } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sun, Moon, Type, User, Bell, Shield, Eye, Palette,
  Download, Trash2, KeyRound, LogOut, FileText, Lock,
  Monitor, Contrast, Zap, Globe, Layout, Keyboard,
  CheckCircle, AlertTriangle, Info, ChevronRight,
} from "lucide-react";

// ─── Preference Storage Helpers ──────────────────────────────────────────────
function getPref<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(`pref_${key}`);
    return v !== null ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function setPref<T>(key: string, value: T) {
  localStorage.setItem(`pref_${key}`, JSON.stringify(value));
}

// ─── Font Size Application ────────────────────────────────────────────────────
const FONT_SIZES: Record<string, string> = {
  small:   "13px",
  medium:  "15px",
  large:   "17px",
  xlarge:  "19px",
};

function applyFontSize(size: string) {
  document.documentElement.style.fontSize = FONT_SIZES[size] ?? "15px";
}

// ─── Density Application ─────────────────────────────────────────────────────
function applyDensity(density: string) {
  const root = document.documentElement;
  root.classList.remove("density-compact", "density-comfortable", "density-spacious");
  root.classList.add(`density-${density}`);
}

// ─── Accessibility Application ────────────────────────────────────────────────
function applyAccessibility(highContrast: boolean, reducedMotion: boolean) {
  const root = document.documentElement;
  root.classList.toggle("high-contrast", highContrast);
  root.classList.toggle("reduce-motion", reducedMotion);
}

// ─── Section Wrapper ─────────────────────────────────────────────────────────
function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="text-primary">{icon}</span>
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────
function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-primary" : "bg-input"
        }`}
      >
        <span
          className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme, switchable } = useTheme();
  const utils = trpc.useUtils();

  // ── Appearance ──────────────────────────────────────────────────────────────
  const [fontSize, setFontSize] = useState<string>(() => getPref("fontSize", "medium"));
  const [density, setDensity] = useState<string>(() => getPref("density", "comfortable"));

  // ── Accessibility ────────────────────────────────────────────────────────────
  const [highContrast, setHighContrast] = useState<boolean>(() => getPref("highContrast", false));
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => getPref("reducedMotion", false));

  // ── Notifications ────────────────────────────────────────────────────────────
  const [notifyRas, setNotifyRas] = useState<boolean>(() => getPref("notifyRas", true));
  const [notifyDrills, setNotifyDrills] = useState<boolean>(() => getPref("notifyDrills", true));
  const [notifyIncidents, setNotifyIncidents] = useState<boolean>(() => getPref("notifyIncidents", true));
  const [notifyDigest, setNotifyDigest] = useState<boolean>(() => getPref("notifyDigest", false));

  // ── Profile ──────────────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(user?.name ?? "");
  const [nameEditing, setNameEditing] = useState(false);

  // ── Security ─────────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // ── Dialogs ───────────────────────────────────────────────────────────────────
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);

  // ── Apply preferences on mount ───────────────────────────────────────────────
  useEffect(() => {
    applyFontSize(fontSize);
    applyDensity(density);
    applyAccessibility(highContrast, reducedMotion);
  }, []);

  // ── Sync name from user ───────────────────────────────────────────────────────
  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
  }, [user?.name]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleFontSize(size: string) {
    setFontSize(size);
    setPref("fontSize", size);
    applyFontSize(size);
    toast.success("Font size updated");
  }

  function handleDensity(d: string) {
    setDensity(d);
    setPref("density", d);
    applyDensity(d);
    toast.success("Display density updated");
  }

  function handleHighContrast(v: boolean) {
    setHighContrast(v);
    setPref("highContrast", v);
    applyAccessibility(v, reducedMotion);
  }

  function handleReducedMotion(v: boolean) {
    setReducedMotion(v);
    setPref("reducedMotion", v);
    applyAccessibility(highContrast, v);
  }

  function handleNotifPref(key: string, setter: (v: boolean) => void, v: boolean) {
    setter(v);
    setPref(key, v);
    toast.success("Notification preference saved");
  }

  const updateNameMutation = trpc.settings.updateName.useMutation({
    onSuccess: () => {
      toast.success("Display name updated successfully");
      setNameEditing(false);
      utils.auth.me.invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update name"),
  });

  const changePasswordMutation = trpc.settings.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to change password"),
  });

  const requestDataExportMutation = trpc.settings.requestDataExport.useMutation({
    onSuccess: () => toast.success("Data export request submitted. You will receive an email shortly."),
    onError: (err: any) => toast.error(err?.message || "Failed to submit export request"),
  });

  function handleSaveName() {
    if (!displayName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    updateNameMutation.mutate({ name: displayName.trim() });
  }

  function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  }

  const isDark = theme === "dark";

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Palette size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account preferences, appearance, and privacy settings
          </p>
        </div>
      </div>

      {/* ── Profile ─────────────────────────────────────────────────────────── */}
      <SettingsSection
        icon={<User size={16} />}
        title="Profile"
        description="Update your display name and account information"
      >
        <div className="space-y-2">
          <Label htmlFor="display-name">Display Name</Label>
          <div className="flex gap-2">
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setNameEditing(true);
              }}
              placeholder="Your full name"
              className="flex-1"
            />
            {nameEditing && (
              <Button
                size="sm"
                onClick={handleSaveName}
                disabled={updateNameMutation.isPending}
              >
                {updateNameMutation.isPending ? "Saving…" : "Save"}
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">Email</Label>
          <p className="text-sm text-foreground">{user?.email ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Email cannot be changed here. Contact support to update your email address.</p>
        </div>
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">Platform Role</Label>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize text-xs">{user?.role ?? "user"}</Badge>
            <span className="text-xs text-muted-foreground">Assigned by your administrator</span>
          </div>
        </div>
      </SettingsSection>

      {/* ── Appearance ──────────────────────────────────────────────────────── */}
      <SettingsSection
        icon={<Palette size={16} />}
        title="Appearance"
        description="Customize how the platform looks and feels"
      >
        {/* Dark Mode */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Color Theme</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Switch between light and dark mode
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border p-1">
            <button
              onClick={() => isDark && toggleTheme?.()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                !isDark
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun size={13} />
              Light
            </button>
            <button
              onClick={() => !isDark && toggleTheme?.()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isDark
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon size={13} />
              Dark
            </button>
          </div>
        </div>

        <Separator />

        {/* Font Size */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Type size={14} className="text-muted-foreground" />
            <Label>Font Size</Label>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: "small",  label: "Small",   preview: "Aa" },
              { key: "medium", label: "Medium",  preview: "Aa" },
              { key: "large",  label: "Large",   preview: "Aa" },
              { key: "xlarge", label: "X-Large", preview: "Aa" },
            ].map(({ key, label, preview }) => (
              <button
                key={key}
                onClick={() => handleFontSize(key)}
                className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors ${
                  fontSize === key
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span
                  style={{ fontSize: FONT_SIZES[key] }}
                  className="font-semibold leading-none"
                >
                  {preview}
                </span>
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Display Density */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Layout size={14} className="text-muted-foreground" />
            <Label>Display Density</Label>
          </div>
          <Select value={density} onValueChange={handleDensity}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compact — more content, tighter spacing</SelectItem>
              <SelectItem value="comfortable">Comfortable — balanced spacing (default)</SelectItem>
              <SelectItem value="spacious">Spacious — relaxed, easier to read</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingsSection>

      {/* ── Accessibility ────────────────────────────────────────────────────── */}
      <SettingsSection
        icon={<Contrast size={16} />}
        title="Accessibility"
        description="Improve readability and reduce visual strain"
      >
        <ToggleRow
          label="High Contrast Mode"
          description="Increases color contrast for better readability"
          checked={highContrast}
          onChange={handleHighContrast}
        />
        <ToggleRow
          label="Reduce Motion"
          description="Minimizes animations and transitions throughout the interface"
          checked={reducedMotion}
          onChange={handleReducedMotion}
        />
      </SettingsSection>

      {/* ── Notifications ────────────────────────────────────────────────────── */}
      <SettingsSection
        icon={<Bell size={16} />}
        title="Notification Preferences"
        description="Control which alerts and updates you receive"
      >
        <ToggleRow
          label="RAS Alerts"
          description="Receive push and email notifications for Response Activation System alerts"
          checked={notifyRas}
          onChange={(v) => handleNotifPref("notifyRas", setNotifyRas, v)}
        />
        <ToggleRow
          label="Drill Reminders"
          description="Get notified before scheduled drills and when after-action reports are due"
          checked={notifyDrills}
          onChange={(v) => handleNotifPref("notifyDrills", setNotifyDrills, v)}
        />
        <ToggleRow
          label="Incident Report Updates"
          description="Notifications when incident reports are submitted or updated in your organization"
          checked={notifyIncidents}
          onChange={(v) => handleNotifPref("notifyIncidents", setNotifyIncidents, v)}
        />
        <ToggleRow
          label="Weekly Safety Digest"
          description="A weekly summary of your organization's safety activity and upcoming tasks"
          checked={notifyDigest}
          onChange={(v) => handleNotifPref("notifyDigest", setNotifyDigest, v)}
        />
      </SettingsSection>

      {/* ── Security ─────────────────────────────────────────────────────────── */}
      <SettingsSection
        icon={<KeyRound size={16} />}
        title="Account Security"
        description="Manage your password and account access"
      >
        <div className="space-y-3">
          <p className="text-sm font-medium">Change Password</p>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Input
              type="password"
              placeholder="New password (min. 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button
            size="sm"
            onClick={handleChangePassword}
            disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
          >
            {changePasswordMutation.isPending ? "Updating…" : "Update Password"}
          </Button>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Two-Factor Authentication</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add an extra layer of security to your account</p>
          </div>
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
            Coming Soon
          </Badge>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Active Sessions</p>
            <p className="text-xs text-muted-foreground mt-0.5">View and revoke active login sessions</p>
          </div>
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
            Coming Soon
          </Badge>
        </div>
      </SettingsSection>

      {/* ── Data & Privacy ───────────────────────────────────────────────────── */}
      <SettingsSection
        icon={<Shield size={16} />}
        title="Data & Privacy"
        description="Control your data and understand how it is used"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Export My Data</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Download a copy of all your account data in JSON format
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => requestDataExportMutation.mutate()}
            disabled={requestDataExportMutation.isPending}
          >
            <Download size={13} />
            {requestDataExportMutation.isPending ? "Requesting…" : "Request Export"}
          </Button>
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Privacy Policy</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Read how Five Stones Technology collects and uses your data
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild className="gap-1 shrink-0">
            <Link href="/legal/privacy">
              View <ChevronRight size={13} />
            </Link>
          </Button>
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Terms of Service</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review the terms governing your use of the platform
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild className="gap-1 shrink-0">
            <Link href="/legal/terms">
              View <ChevronRight size={13} />
            </Link>
          </Button>
        </div>

        <Separator />

        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} className="text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">Delete Account</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently delete your account and all associated data. This action cannot be undone.
                Your organization's data will not be affected.
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 size={13} className="mr-1.5" />
            Request Account Deletion
          </Button>
        </div>
      </SettingsSection>

      {/* ── Keyboard Shortcuts ───────────────────────────────────────────────── */}
      <SettingsSection
        icon={<Keyboard size={16} />}
        title="Keyboard Shortcuts"
        description="Speed up your workflow with keyboard shortcuts"
      >
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setShortcutsDialogOpen(true)}
        >
          <Keyboard size={13} />
          View All Shortcuts
        </Button>
      </SettingsSection>

      {/* ── About ────────────────────────────────────────────────────────────── */}
      <SettingsSection
        icon={<Info size={16} />}
        title="About"
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Platform</p>
            <p className="font-medium">Five Stones Safety Platform</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Version</p>
            <p className="font-medium">2.0.0-staging</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Company</p>
            <p className="font-medium">Five Stones Technology</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Support</p>
            <a
              href="mailto:info@fivestonestechnology.com"
              className="font-medium text-primary hover:underline"
            >
              info@fivestonestechnology.com
            </a>
          </div>
        </div>
      </SettingsSection>

      {/* ── Delete Account Dialog ─────────────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 size={16} />
              Request Account Deletion
            </DialogTitle>
            <DialogDescription>
              This will submit a deletion request to our support team. Your account will be
              reviewed and permanently deleted within 30 days. You will receive a confirmation email.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
            <strong>Note:</strong> Deleting your account will remove your personal data but will
            not affect your organization's safety records, audits, or incident reports.
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => {
                toast.success("Account deletion request submitted. You will receive a confirmation email within 24 hours.");
                setDeleteDialogOpen(false);
              }}
            >
              Submit Deletion Request
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Keyboard Shortcuts Dialog ─────────────────────────────────────────── */}
      <Dialog open={shortcutsDialogOpen} onOpenChange={setShortcutsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard size={16} />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {[
              { keys: ["G", "D"], label: "Go to Dashboard" },
              { keys: ["G", "F"], label: "Go to Facilities" },
              { keys: ["G", "I"], label: "Go to Incidents" },
              { keys: ["G", "S"], label: "Go to Settings" },
              { keys: ["?"],      label: "Show this help" },
              { keys: ["Esc"],    label: "Close dialog / cancel" },
            ].map(({ keys, label }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-muted-foreground">{label}</span>
                <div className="flex items-center gap-1">
                  {keys.map((k, i) => (
                    <span key={i} className="inline-flex items-center">
                      <kbd className="px-2 py-0.5 text-xs font-semibold bg-muted border border-border rounded">
                        {k}
                      </kbd>
                      {i < keys.length - 1 && (
                        <span className="mx-1 text-muted-foreground text-xs">then</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setShortcutsDialogOpen(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
