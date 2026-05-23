import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Trash2, Settings, ExternalLink } from "lucide-react";
import { toast } from "sonner";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function AdminOrgs() {
  const { user } = useAuth();
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

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Platform admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Organizations
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage client organizations and their portals
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  placeholder="Acme Security Agency"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">
                  Portal Slug
                  <span className="text-muted-foreground text-xs ml-2">Used in the incident report URL</span>
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">/report/</span>
                  <Input
                    id="org-slug"
                    placeholder="acme-security"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-email">Contact Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
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
              >
                {createMutation.isPending ? "Creating…" : "Create Organization"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orgs?.map((org) => (
          <Card key={org.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{org.name}</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground font-mono">/report/{org.slug}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {org.contactEmail && (
                <p className="text-sm text-muted-foreground truncate">{org.contactEmail}</p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1"
                  onClick={() => navigate(`/org/${org.id}`)}
                >
                  <Settings className="h-3 w-3" />
                  Manage
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => window.open(`/report/${org.slug}`, "_blank")}
                  aria-label={`Open incident portal for ${org.name}`}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive h-8 w-8"
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
            </CardContent>
          </Card>
        ))}
        {!orgs?.length && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No organizations yet. Create the first one above.
          </div>
        )}
      </div>
    </div>
  );
}
