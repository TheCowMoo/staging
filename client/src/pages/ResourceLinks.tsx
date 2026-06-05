/**
 * ResourceLinks
 *
 * Standalone page for managing organization-level website resource links
 * used as regulatory reference context for AI-driven EAP generation.
 *
 * Accessible via Admin → Resource Links in the sidebar.
 * Supports managing links for one org at a time (uses the user's primary org).
 */
import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { WebsiteResourceLinks } from "@/components/assessment/WebsiteResourceLinks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Globe, Save, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function ResourceLinks() {
  const { data: memberships, isLoading: membershipsLoading } = trpc.org.myMemberships.useQuery();
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [links, setLinks] = useState<string[]>([]);

  // Auto-select the first org when memberships load
  useEffect(() => {
    if (memberships && memberships.length > 0 && selectedOrgId === null) {
      setSelectedOrgId(memberships[0].orgId);
    }
  }, [memberships, selectedOrgId]);

  // Fetch org data to get current links
  const { data: org, refetch: refetchOrg, isLoading: orgLoading } = trpc.org.get.useQuery(
    { orgId: selectedOrgId ?? 0 },
    { enabled: (selectedOrgId ?? 0) > 0 }
  );

  // Sync links from org data when loaded
  useEffect(() => {
    if (org) {
      const raw = (org as any).websiteResourceLinks;
      if (raw) {
        try {
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (Array.isArray(parsed)) setLinks(parsed);
        } catch {
          setLinks([]);
        }
      } else {
        setLinks([]);
      }
    }
  }, [org]);

  const saveMutation = trpc.org.updateResourceLinks.useMutation({
    onSuccess: () => {
      toast.success("Resource links saved — will be used for next EAP generation.");
      refetchOrg();
    },
    onError: (e) => toast.error("Failed to save: " + e.message),
  });

  const handleSave = () => {
    if (!selectedOrgId) return;
    saveMutation.mutate({ orgId: selectedOrgId, websiteResourceLinks: links });
  };

  // Find the selected org name for display
  const selectedOrgName = memberships?.find((m) => m.orgId === selectedOrgId)?.orgName ?? "Organization";

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Globe size={22} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold">AI Resource Links</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage website resource links that the AI should reference when generating Emergency Action Plans.
            </p>
          </div>
        </div>

        {/* Org selector */}
        {memberships && memberships.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 size={14} className="text-primary" />
                Select Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {memberships.map((m) => (
                  <Button
                    key={m.orgId}
                    variant={selectedOrgId === m.orgId ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedOrgId(m.orgId);
                      setLinks([]);
                    }}
                  >
                    {m.orgName}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {membershipsLoading && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              <Loader2 size={16} className="animate-spin mx-auto mb-2" />
              Loading organizations...
            </CardContent>
          </Card>
        )}

        {!membershipsLoading && !memberships?.length && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Building2 size={24} className="mx-auto mb-2 opacity-40" />
              <p>You are not a member of any organization.</p>
            </CardContent>
          </Card>
        )}

        {(!membershipsLoading && !!memberships?.length) && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 size={16} className="text-primary" />
                    {selectedOrgName}
                  </CardTitle>
                  <CardDescription>
                    Links are org-scoped — they are only used when generating EAPs for facilities in this organization.
                  </CardDescription>
                </div>
                {links.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saveMutation.isPending || !selectedOrgId}
                    className="shrink-0"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin mr-1" />
                    ) : (
                      <Save size={12} className="mr-1" />
                    )}
                    Save Links
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {orgLoading ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin inline mr-1" />
                  Loading links...
                </div>
              ) : (
                <WebsiteResourceLinks links={links} onChange={setLinks} />
              )}

              <p className="text-xs text-muted-foreground mt-4">
                These URLs are passed as structural reference context to the AI when generating Emergency Action Plans.
                Add links to your organization-specific policies, local/state regulations, or industry guidelines.
                The default OSHA EAP checklist links are always included.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}