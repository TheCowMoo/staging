/**
 * WebsiteResourceLinks
 *
 * Interface component for collecting website resource links used as
 * regulatory reference context for AI-driven EAP generation.
 *
 * Pre-populated with OSHA EAP checklist URLs. Supports dynamic addition
 * of localized or state-specific web resource links.
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

// Simple URL validation
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

  // Combine default OSHA links with user-added links, deduplicating
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
    // Check for duplicates
    if (links.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("This URL has already been added.");
      return;
    }
    onChange([...links, trimmed]);
    setNewUrl("");
    toast.success("Website resource link added.");
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
          These regulatory reference URLs are injected as structural context into
          the AI when generating the Emergency Action Plan. Base OSHA references
          are pre-populated. Add localized or state-specific directives as needed.
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
          URLs added here are passed as reference context to the AI when generating
          the Emergency Action Plan for this facility.
        </p>
      </CardContent>
    </Card>
  );
}

export default WebsiteResourceLinks;