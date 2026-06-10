import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Building2, Plus, Trash2, Settings, ExternalLink, Globe, Mail, Users, ChevronRight, Shield
} from "lucide-react";
import { toast } from "sonner";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function AdminOrgsContent() {
  const [, navigate] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", contactEmail: "" });

  const { data: orgs, refetch } = trpc.org.listAll.useQuery();

  const createMutation = trpc.org.create.useMutation({
    onSuccess: () => {
      refetch();
      setCreateOpen(false);
      setForm({ name: "", slug: "", contactEmail: "" });
      toast.success("Organization created");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.org.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Organization deleted"); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in-up">
      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="metal-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">Total Organizations</p>
            <p className="text-3xl font-bold text-foreground">{orgs?.length ?? 0}</p>
          </div>
        </div>
        <div className="metal-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
            <Globe size={22} />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">Active Portals</p>
            <p className="text-3xl font-bold text-foreground">{orgs?.filter(o => o.slug).length ?? 0}</p>
          </div>
        </div>
        <div className="metal-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
            <Mail size={22} />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-muted-foreground">With Contact</p>
            <p className="text-3xl font-bold text-foreground">{orgs?.filter(o => o.contactEmail).length ?? 0}</p>
          </div>
        </div>
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            Organizations
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage client organizations and their incident report portals
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              New Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Create Organization
              </DialogTitle>
              <DialogDescription>
                Create a new client organization with its own incident reporting portal.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  placeholder="e.g. Acme Security Agency"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">
                  Portal Slug
                  <span className="text-muted-foreground text-xs ml-2 font-normal">Used in the incident report URL</span>
                </Label>
                <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 border border-border">
                  <span className="text-sm text-muted-foreground font-mono whitespace-nowrap">/report/</span>
                  <Input
                    id="org-slug"
                    placeholder="acme-security"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    className="border-0 bg-transparent px-0 font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-email">Contact Email <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                <Input
                  id="org-email"
                  type="email"
                  placeholder="admin@acme.com"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                />
              </div>
              <Button
                className="w-full"
                disabled={!form.name || !form.slug || createMutation.isPending}
                onClick={() => createMutation.mutate({
                  name: form.name,
                  slug: form.slug,
                  contactEmail: form.contactEmail || undefined,
                })}
                size="lg"
              >
                {createMutation.isPending ? "Creating…" : "Create Organization"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Org Grid ── */}
      {!orgs || orgs.length === 0 ? (
        <div className="metal-card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-5">
            <Building2 className="h-8 w-8 text-primary/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Organizations Yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
            Create your first organization to set up an incident reporting portal for a client.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Your First Organization
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <div
              key={org.id}
              className="metal-card overflow-hidden group transition-all duration-200 hover:shadow-md"
            >
              {/* Top accent bar */}
              <div className="h-2 bg-gradient-to-r from-primary to-primary/60" />

              <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Building2 size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{org.name}</h3>
                      {org.slug && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                          /report/{org.slug}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive/40 hover:text-destructive hover:bg-destructive/10 h-8 w-8 -mr-1 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Delete ${org.name}`}
                    onClick={() => {
                      if (confirm(`Permanently delete "${org.name}"? This cannot be undone.`)) {
                        deleteMutation.mutate({ id: org.id });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Details */}
                <div className="space-y-2.5 mb-5">
                  {org.contactEmail && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Mail size={14} className="shrink-0" />
                      <span className="truncate">{org.contactEmail}</span>
                    </div>
                  )}
                  {org.slug && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Globe size={14} className="shrink-0" />
                      <code className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-mono truncate">
                        /report/{org.slug}
                      </code>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 gap-1.5"
                    onClick={() => navigate(`/org/${org.id}`)}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Manage
                    <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-60" />
                  </Button>
                  {org.slug && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => window.open(`/report/${org.slug}`, "_blank")}
                      aria-label={`Open incident portal for ${org.name}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Portal
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminOrgs() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (user?.role !== "admin" && user?.role !== "ultra_admin" && user?.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Platform admin access required.</p>
          <Button variant="link" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return <AdminOrgsContent />;
}