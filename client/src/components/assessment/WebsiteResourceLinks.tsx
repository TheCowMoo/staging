/**
 * WebsiteResourceLinks
 *
 * Interface component for collecting organization-level website resource
 * links used as regulatory reference context for AI-driven EAP generation.
 *
 * Pre-populated with OSHA EAP checklist URLs. Supports dynamic addition
 * of localized or state-specific web resource links.
 *
 * Scoped to the organization: links stored here are only used when the AI
 * generates an EAP for a facility in this org. Ultra admins can see all orgs'
 * links via the AdminOrgs page.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Globe, Plus, Trash2, ExternalLink } from "lucide-react";

// ─── Props ────────────────────────────────────────────────────────────────────

interface WebsiteResourceLinksProps {
  links: string[];
  onChange: (links: string[]) => void;
  readOnly?: boolean;
}

const DEFAULT_OSHA_LINKS = [
  "https://www.osha.gov/etools/evacuation-plans-procedures/eap/develop-implement/checklists",
  "https://www.osha.gov/etools/evacuation-plans-procedures/eap/develop-implement",
];

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WebsiteResourceLinks({
  links,
  onChange,
  readOnly = false,
}: WebsiteResourceLinksProps) {
  const [newUrl, setNewUrl] = useState("");

  // Separate default OSHA links from user-added links (always show defaults if not in user list)
  const defaultLinks = DEFAULT_OSHA_LINKS.filter(
    (defaultLink) => !links.some((l) => l.toLowerCase() === defaultLink.toLowerCase())
  );
  const allLinks = [...defaultLinks, ...links];

  const handleAddUrl = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) {
      toast.error("Please enter a URL.");
      return;
    }
    if (!isValidUrl(trimmed)) {
      toast.error("Please enter a valid URL (http:// or https://).");
      return;
    }
    if (links.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("This URL has already been added.");
      return;
    }
    onChange([...links, trimmed]);
    setNewUrl("");
    toast.success("Website resource link added. It will be used as AI context for EAP generation.");
  };

  const handleRemoveUrl = (urlToRemove: string) => {
    onChange(links.filter((l) => l !== urlToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddUrl();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Globe size={15} className="text-primary" />
          <CardTitle className="text-sm">Website Resource Links</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Add relevant website resource links that the AI should reference when
          generating Emergency Action Plans for this organization. These URLs are
          passed as structural reference context to the AI — they help ensure the
          generated EAP incorporates local, state, or industry-specific directives.
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          <strong>Org-scoped:</strong> Links are only visible to the AI when generating
          EAPs for this organization. Other organizations cannot access them.
          {readOnly && " (Platform admins can view all organizations' links.)"}
        </p>

        {/* Link list */}
        <div className="space-y-2 mb-4">
          {allLinks.map((url, idx) => {
            const isDefault = DEFAULT_OSHA_LINKS.some(
              (d) => d.toLowerCase() === url.toLowerCase()
            );
            return (
              <div
                key={`${url}_${idx}`}
                className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/30 border border-border"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Globe size={12} className="text-muted-foreground shrink-0" />
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate"
                  >
                    {url}
                  </a>
                  <ExternalLink size={10} className="text-muted-foreground shrink-0" />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isDefault && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      OSHA
                    </span>
                  )}
                  {!isDefault && !readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveUrl(url)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {allLinks.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-2">No resource links configured.</p>
          )}
        </div>

        {/* Add URL input */}
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Paste a URL (e.g. https://www.ilga.gov/...)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-sm flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddUrl}
              className="shrink-0"
            >
              <Plus size={13} className="mr-1" /> Add
            </Button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mt-2">
          URLs are validated on entry. The AI will reference these when generating
          the Emergency Action Plan for any facility in this organization.
        </p>
      </CardContent>
    </Card>
  );
}

export default WebsiteResourceLinks;