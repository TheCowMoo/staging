/**
 * ApiKeys.tsx — API Key management page
 *
 * Allows org admins and platform admins to create, list, and revoke API keys.
 * Keys are shown only once at creation time.
 */
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Key, Plus, Shield, Trash2, Check, AlertTriangle, Clock } from "lucide-react";
import { useLocation } from "wouter";

export default function ApiKeys() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Guard: only platform admins or org admins
  const isAdmin = user?.role === "admin" || user?.role === "ultra_admin";
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Admin access required.</p>
          <Button variant="link" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return <ApiKeysContent />;
}

function ApiKeysContent() {
  const { data: keys, refetch } = trpc.apiKeys.list.useQuery();
  const createKey = trpc.apiKeys.create.useMutation({
    onSuccess: () => { refetch(); },
  });
  const revokeKey = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => { refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(365);
  const [newKeyToken, setNewKeyToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!label.trim()) {
      toast.warning("Please enter a label for this key.");
      return;
    }
    try {
      const result = await createKey.mutateAsync({
        label: label.trim(),
        expiresInDays: expiresInDays > 0 ? expiresInDays : undefined,
      });
      setNewKeyToken(result.token);
      setLabel("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create key");
    }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm("Revoke this API key? This cannot be undone. Any services using this key will lose access immediately.")) return;
    await revokeKey.mutateAsync({ id });
    toast.success("API key revoked");
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="w-6 h-6 text-primary" />
            API Keys
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage API keys for external integrations like the RAS Desktop Alert.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Key
        </Button>
      </div>

      {/* Info card */}
      <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="pt-4 pb-3 px-4">
          <p className="text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <span className="text-amber-800 dark:text-amber-200">
              <strong>Store your key securely.</strong> For security reasons, the full key is shown only once at creation time.
              If you lose a key, revoke it and create a new one.
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Existing keys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your API Keys</CardTitle>
          <CardDescription>
            {keys?.length ? `${keys.length} key(s) configured` : "No API keys created yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!keys ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No API keys. Create one to use with the RAS Desktop Alert.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => {
                const isRevoked = !!key.revokedAt;
                const isExpired = key.expiresAt && new Date(key.expiresAt) < new Date();
                return (
                  <div
                    key={key.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isRevoked
                        ? "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Key className={`w-4 h-4 ${isRevoked ? "text-red-400" : "text-primary"}`} />
                        <span className="font-medium text-sm truncate">{key.label || "Unnamed key"}</span>
                        {isRevoked && (
                          <Badge variant="destructive" className="text-[10px] h-5">Revoked</Badge>
                        )}
                        {isExpired && !isRevoked && (
                          <Badge variant="outline" className="text-[10px] h-5 border-amber-300 text-amber-700">
                            Expired
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Created {new Date(key.createdAt).toLocaleDateString()}</span>
                        {key.expiresAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expires {new Date(key.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                        {key.orgId && <span>Org #{key.orgId}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!isRevoked && !isExpired && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRevoke(key.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        if (!open) { setCreateOpen(false); setNewKeyToken(null); setCopied(false); }
      }}>
        <DialogContent className="sm:max-w-md">
          {newKeyToken ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-600">
                  <Check className="w-5 h-5" />
                  API Key Created
                </DialogTitle>
                <DialogDescription>
                  <strong>Copy this key now.</strong> It will not be shown again.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg border">
                  <code className="text-xs break-all font-mono select-all block">
                    {newKeyToken}
                  </code>
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={() => copyToClipboard(newKeyToken)}
                  variant={copied ? "secondary" : "default"}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => { setCreateOpen(false); setNewKeyToken(null); setCopied(false); }}>
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  Give this key a label so you can identify it later. The key will be shown once.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="label">Label</Label>
                  <Input
                    id="label"
                    placeholder="e.g. RAS Desktop Alert - Office Laptop"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expires in (days)</Label>
                  <Input
                    id="expiry"
                    type="number"
                    min={1}
                    max={3650}
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Leave at 365 for a 1-year key. 0 = never expires.</p>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createKey.isPending}>
                  {createKey.isPending ? "Creating..." : "Create Key"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}