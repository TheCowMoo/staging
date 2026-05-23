import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Shield, BookOpen, CheckCircle2, ChevronDown, ChevronRight,
  Pencil, Save, X, History, RefreshCw, Plus, Trash2, AlertTriangle,
  FileText, Clock, Users, Phone, MapPin, Lock, Eye, Megaphone,
  Activity, ClipboardList, BookMarked, Building2, Loader2, Download,
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

// ── 17-Section EARP Framework ─────────────────────────────────────────────────
const EARP_SECTIONS = [
  {
    id: "s1_purpose",
    title: "Purpose, Scope & Legal Authority",
    icon: FileText,
    color: "text-blue-600",
    description: "Defines the plan's intent, who it covers, and the regulatory/legal basis.",
  },
  {
    id: "s2_facility_profile",
    title: "Facility Profile & Threat Environment",
    icon: Building2,
    color: "text-slate-600",
    description: "Physical description, occupancy, operating hours, and known threat landscape.",
  },
  {
    id: "s3_risk_assessment",
    title: "Risk Assessment Summary",
    icon: AlertTriangle,
    color: "text-orange-600",
    description: "Summary of audit findings, risk levels by category, and top vulnerabilities.",
  },
  {
    id: "s4_roles",
    title: "Roles, Responsibilities & ICS Structure",
    icon: Users,
    color: "text-purple-600",
    description: "Incident Command System roles, primary/backup assignments, and chain of command.",
  },
  {
    id: "s5_communication",
    title: "Communication Protocols",
    icon: Phone,
    color: "text-green-600",
    description: "Internal/external notification chains, mass notification systems, and backup methods.",
  },
  {
    id: "s6_evacuation",
    title: "Evacuation Procedures",
    icon: MapPin,
    color: "text-red-600",
    description: "Primary/secondary evacuation routes, assembly points, accountability procedures.",
  },
  {
    id: "s7_lockdown",
    title: "Lockdown & Lockout Procedures",
    icon: Lock,
    color: "text-red-800",
    description: "Step-by-step lockdown/lockout protocols, door securing, communication during lockdown.",
  },
  {
    id: "s8_actd",
    title: "ACTD Response Framework",
    icon: Shield,
    color: "text-indigo-600",
    description: "Assess → Commit → Take Action (Lockout/Lockdown/Escape/Defend) → Debrief protocol.",
  },
  {
    id: "s9_active_threat",
    title: "Active Threat & Active Shooter Response",
    icon: AlertTriangle,
    color: "text-red-700",
    description: "Specific protocols for active shooter/threat scenarios using the ACTD model.",
  },
  {
    id: "s10_medical",
    title: "Medical Emergency & Casualty Care",
    icon: Activity,
    color: "text-pink-600",
    description: "First aid response, AED locations, triage procedures, and EMS coordination.",
  },
  {
    id: "s11_reunification",
    title: "Family Reunification & Accountability",
    icon: Users,
    color: "text-teal-600",
    description: "Post-incident reunification site, accountability procedures, and family notification.",
  },
  {
    id: "s12_media",
    title: "Media & Public Information Management",
    icon: Megaphone,
    color: "text-amber-600",
    description: "Designated spokesperson, approved messaging, social media protocols.",
  },
  {
    id: "s13_training",
    title: "Training, Drills & Exercise Program",
    icon: ClipboardList,
    color: "text-cyan-600",
    description: "Required drill frequency, exercise types, after-action review process.",
  },
  {
    id: "s14_continuity",
    title: "Business Continuity & Recovery",
    icon: RefreshCw,
    color: "text-lime-600",
    description: "Critical function restoration, alternate site operations, recovery priorities.",
  },
  {
    id: "s15_special_populations",
    title: "Special Populations & Accessibility",
    icon: Eye,
    color: "text-violet-600",
    description: "Procedures for visitors, contractors, individuals with disabilities, and non-English speakers.",
  },
  {
    id: "s16_maintenance",
    title: "Plan Maintenance & Review Schedule",
    icon: BookMarked,
    color: "text-stone-600",
    description: "Annual review cycle, trigger events for immediate revision, version control.",
  },
  {
    id: "s17_appendices",
    title: "Appendices & Supporting Documents",
    icon: BookOpen,
    color: "text-gray-600",
    description: "Contact directories, floor plans, resource lists, mutual aid agreements.",
  },
];

const PRIORITY_COLORS: Record<string, string> = {
  Immediate: "bg-red-100 text-red-800 border-red-300",
  "30 Days": "bg-orange-100 text-orange-800 border-orange-300",
  "60 Days": "bg-amber-100 text-amber-800 border-amber-300",
  "90 Days": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Long-Term": "bg-blue-100 text-blue-800 border-blue-300",
};

const PRIORITY_OPTIONS = ["Immediate", "30 Days", "60 Days", "90 Days", "Long-Term"];

// ── Section Editor Component ──────────────────────────────────────────────────
interface SectionRec { action: string; priority: string; basis: string; }

interface SectionOverride {
  contentOverride: string | null;
  reviewed: boolean;
  applicable: boolean;
  auditorNotes: string | null;
  auditorRecommendations: SectionRec[];
}

function EarpSection({
  auditId,
  sectionDef,
  override,
  llmContent,
  onSaved,
  canEdit,
}: {
  auditId: number;
  sectionDef: typeof EARP_SECTIONS[0];
  override: SectionOverride | null;
  llmContent: string | null;
  onSaved: () => void;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftRecs, setDraftRecs] = useState<SectionRec[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [applicable, setApplicable] = useState(true);
  const [reviewed, setReviewed] = useState(false);

  const { data: versions, refetch: refetchVersions } = trpc.eap.getVersions.useQuery(
    { auditId, sectionId: sectionDef.id },
    { enabled: showVersions }
  );

  const saveSection = trpc.eap.saveSection.useMutation({
    onSuccess: () => {
      toast.success(`Section saved`);
      setEditing(false);
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  const displayContent = override?.contentOverride ?? llmContent ?? "";
  const hasOverride = !!override?.contentOverride;
  const Icon = sectionDef.icon;

  const startEdit = () => {
    setDraftContent(override?.contentOverride ?? llmContent ?? "");
    setDraftNotes(override?.auditorNotes ?? "");
    setDraftRecs(override?.auditorRecommendations ?? []);
    setApplicable(override?.applicable ?? true);
    setReviewed(override?.reviewed ?? false);
    setEditing(true);
  };

  const handleSave = (saveVersion = false) => {
    saveSection.mutate({
      auditId,
      sectionId: sectionDef.id,
      sectionTitle: sectionDef.title,
      contentOverride: draftContent || null,
      reviewed,
      applicable,
      auditorNotes: draftNotes || null,
      auditorRecommendations: draftRecs,
      saveVersion,
      versionLabel: saveVersion ? `Saved ${new Date().toLocaleDateString()}` : undefined,
    });
  };

  const addRec = () => setDraftRecs((r) => [...r, { action: "", priority: "30 Days", basis: "" }]);
  const removeRec = (i: number) => setDraftRecs((r) => r.filter((_, idx) => idx !== i));
  const updateRec = (i: number, field: keyof SectionRec, val: string) =>
    setDraftRecs((r) => r.map((rec, idx) => idx === i ? { ...rec, [field]: val } : rec));

  const currentApplicable = editing ? applicable : (override?.applicable ?? true);
  const currentReviewed = editing ? reviewed : (override?.reviewed ?? false);
  const recCount = (override?.auditorRecommendations?.length ?? 0);

  return (
    <div className={`bg-card border rounded-xl overflow-hidden transition-all ${!currentApplicable ? "opacity-60" : ""}`}>
      {/* Header */}
      <div
        className="w-full flex items-center gap-3 px-5 py-4 bg-muted/20 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon size={15} className={sectionDef.color} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm leading-tight">{sectionDef.title}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sectionDef.description}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {currentReviewed && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-300 font-medium">Reviewed</span>
          )}
          {hasOverride && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 font-medium">Edited</span>
          )}
          {!currentApplicable && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-300 font-medium">N/A</span>
          )}
          {recCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-medium">{recCount} rec{recCount !== 1 ? "s" : ""}</span>
          )}
          {open ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="px-5 py-4 space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {!editing ? (
              <>
                {canEdit ? (
                  <Button size="sm" variant="outline" onClick={startEdit} className="flex items-center gap-1.5 text-xs h-7">
                    <Pencil size={11} /> Edit Section
                  </Button>
                ) : (
                  <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                    <Shield size={10} /> Super-admin only
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setShowVersions(!showVersions); if (!showVersions) refetchVersions(); }}
                  className="flex items-center gap-1.5 text-xs h-7"
                >
                  <History size={11} /> Version History
                </Button>
                <button
                  className={`text-xs px-2 py-1 rounded border transition-colors ${currentApplicable ? "bg-green-50 text-green-700 border-green-300 hover:bg-green-100" : "bg-gray-50 text-gray-500 border-gray-300 hover:bg-gray-100"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    saveSection.mutate({
                      auditId,
                      sectionId: sectionDef.id,
                      sectionTitle: sectionDef.title,
                      applicable: !currentApplicable,
                      reviewed: currentReviewed,
                    });
                    onSaved();
                  }}
                >
                  {currentApplicable ? "Mark N/A" : "Mark Applicable"}
                </button>
                {!currentReviewed && (
                  <button
                    className="text-xs px-2 py-1 rounded border bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 transition-colors flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      saveSection.mutate({
                        auditId,
                        sectionId: sectionDef.id,
                        sectionTitle: sectionDef.title,
                        reviewed: true,
                        applicable: currentApplicable,
                      });
                      onSaved();
                    }}
                  >
                    <CheckCircle2 size={10} /> Mark Reviewed
                  </button>
                )}
              </>
            ) : (
              <>
                <Button size="sm" onClick={() => handleSave(false)} disabled={saveSection.isPending} className="flex items-center gap-1.5 text-xs h-7">
                  {saveSection.isPending ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleSave(true)} disabled={saveSection.isPending} className="flex items-center gap-1.5 text-xs h-7">
                  <History size={11} /> Save as Version
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="flex items-center gap-1.5 text-xs h-7">
                  <X size={11} /> Cancel
                </Button>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer ml-2">
                  <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="rounded" />
                  Mark as reviewed
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={applicable} onChange={(e) => setApplicable(e.target.checked)} className="rounded" />
                  Applicable
                </label>
              </>
            )}
          </div>

          {/* Content */}
          {editing ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-foreground mb-1.5">Section Content</p>
                <Textarea
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  rows={12}
                  className="text-sm font-mono resize-y"
                  placeholder="Enter section content (Markdown supported)..."
                />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground mb-1.5">Auditor Notes (internal, not printed)</p>
                <Textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  rows={3}
                  className="text-xs resize-y"
                  placeholder="Internal notes about this section..."
                />
              </div>
              {/* Recommendations editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-foreground">Section Recommendations</p>
                  <Button size="sm" variant="outline" onClick={addRec} className="text-xs h-6 px-2">
                    <Plus size={10} className="mr-1" /> Add
                  </Button>
                </div>
                {draftRecs.length === 0 && (
                  <p className="text-[10px] text-muted-foreground italic">No recommendations yet. Click Add to create one.</p>
                )}
                <div className="space-y-2">
                  {draftRecs.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 border border-border/60">
                      <div className="flex-1 space-y-1.5">
                        <input
                          className="w-full text-xs border border-border rounded px-2 py-1 bg-background"
                          placeholder="Recommended action..."
                          value={rec.action}
                          onChange={(e) => updateRec(i, "action", e.target.value)}
                        />
                        <div className="flex gap-2">
                          <select
                            className="text-xs border border-border rounded px-2 py-1 bg-background"
                            value={rec.priority}
                            onChange={(e) => updateRec(i, "priority", e.target.value)}
                          >
                            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <input
                            className="flex-1 text-xs border border-border rounded px-2 py-1 bg-background"
                            placeholder="Basis / rationale..."
                            value={rec.basis}
                            onChange={(e) => updateRec(i, "basis", e.target.value)}
                          />
                        </div>
                      </div>
                      <button onClick={() => removeRec(i)} className="text-muted-foreground hover:text-destructive mt-1">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {displayContent ? (
                <div className="text-sm text-foreground eap-prose">
                  <Streamdown>{displayContent}</Streamdown>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/30 border border-dashed border-border">
                  <p className="text-xs text-muted-foreground">No AI content for this section yet. Click <strong>Edit Section</strong> above to add your own content, or use the <strong>Generate EAP</strong> button at the top of the page to auto-populate all sections.</p>
                </div>
              )}
              {/* Auditor notes (read mode) */}
              {override?.auditorNotes && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider mb-1">Auditor Notes (Internal)</p>
                  <p className="text-xs text-amber-900">{override.auditorNotes}</p>
                </div>
              )}
              {/* Recommendations (read mode) */}
              {(override?.auditorRecommendations?.length ?? 0) > 0 && (
                <div className="mt-2 pt-3 border-t border-border">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Section Recommendations</p>
                  <div className="space-y-2">
                    {override!.auditorRecommendations.map((rec, ri) => (
                      <div key={ri} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/60">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 mt-0.5 ${PRIORITY_COLORS[rec.priority] ?? "bg-gray-100 text-gray-800 border-gray-300"}`}>
                          {rec.priority}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{rec.action}</p>
                          {rec.basis && <p className="text-[10px] text-muted-foreground mt-0.5">Basis: {rec.basis}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Version history */}
          {showVersions && (
            <div className="mt-2 pt-3 border-t border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock size={10} /> Version History
              </p>
              {!versions ? (
                <p className="text-xs text-muted-foreground">Loading...</p>
              ) : versions.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No saved versions yet. Use "Save as Version" to create a snapshot.</p>
              ) : (
                <div className="space-y-1.5">
                  {versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/50 text-xs">
                      <div>
                        <span className="font-medium text-foreground">{v.label ?? `Version ${v.id}`}</span>
                        <span className="text-muted-foreground ml-2">{new Date(v.savedAt).toLocaleString()}</span>
                      </div>
                      <button
                        className="text-[10px] text-blue-600 hover:text-blue-800 underline"
                        onClick={() => {
                          setDraftContent(v.contentSnapshot ?? "");
                          setEditing(true);
                          toast.info("Version loaded into editor — save to apply.");
                        }}
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmergencyActionPlan() {
  const params = useParams<{ id: string }>();
  const auditId = parseInt(params.id ?? "0");
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "admin";

  const { data: audit } = trpc.audit.get.useQuery({ id: auditId });
  const { data: savedSections, refetch: refetchSections } = trpc.eap.getSections.useQuery({ auditId });
  // Fetch the LLM-generated EAP to use as baseline content (reads from DB cache)
  const [eapGenerating, setEapGenerating] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  // Always load cached EAP from DB on page open (enabled=true so it runs immediately)
  const { data: eapData, isLoading: eapLoading, refetch: refetchEAP } = trpc.report.getEAP.useQuery(
    { auditId },
    {
      enabled: auditId > 0,
      refetchInterval: eapGenerating ? 3000 : false,
    }
  );
  const generateEAPMutation = trpc.report.generateEAP.useMutation({
    onSuccess: () => {
      setEapGenerating(false);
      refetchEAP();
    },
    onError: (e) => {
      setEapGenerating(false);
      toast.error("EAP generation failed: " + e.message);
    },
  });
  const handleGenerateEAP = () => {
    setEapGenerating(true);
    generateEAPMutation.mutate({ auditId });
  };

  // Build a map of section overrides from DB
  const overrideMap: Record<string, SectionOverride> = {};
  (savedSections ?? []).forEach((s) => {
    overrideMap[s.sectionId] = {
      contentOverride: s.contentOverride ?? null,
      reviewed: s.reviewed,
      applicable: s.applicable,
      auditorNotes: s.auditorNotes ?? null,
      auditorRecommendations: (s.auditorRecommendations as SectionRec[] | null) ?? [],
    };
  });

  // Build a map of LLM-generated content from eapData
  // Sections now use the correct EARP_SECTIONS IDs directly (s1_purpose, s2_facility_profile, etc.)
  const llmMap: Record<string, string> = {};
  if (eapData) {
    const sections = (eapData as any).sections as Array<{ id: string; title: string; content: string; recommendations?: Array<{ action: string; priority: string; basis: string }> }> | undefined;
    sections?.forEach((s) => {
      let content = s.content ?? "";
      if (s.recommendations?.length) {
        content += "\n\n**Recommendations:**\n" + s.recommendations.map((r) => `- **${r.priority}:** ${r.action}${r.basis ? ` *(${r.basis})*` : ""}`).join("\n");
      }
      llmMap[s.id] = content;
    });
  }

  const reviewedCount = EARP_SECTIONS.filter((s) => overrideMap[s.id]?.reviewed).length;
  const editedCount = EARP_SECTIONS.filter((s) => overrideMap[s.id]?.contentOverride).length;
  const naCount = EARP_SECTIONS.filter((s) => overrideMap[s.id]?.applicable === false).length;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/audit/${auditId}/report`}>
            <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-xs h-7">
              <ArrowLeft size={13} /> Back to Report
            </Button>
          </Link>
        </div>

        <div className="bg-gradient-to-r from-red-900 to-slate-900 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={18} className="text-red-300" />
                <span className="text-xs font-semibold text-red-300 uppercase tracking-wider">Emergency Action Response Plan</span>
              </div>
              <h1 className="text-xl font-bold mb-1">{audit ? `Audit — ${new Date(audit.auditDate).toLocaleDateString()}` : "Loading..."}</h1>
              <p className="text-sm text-white/70">17-Section ACTD Framework · Facility-Specific</p>
            </div>
            <div className="flex flex-col items-end gap-3 flex-shrink-0">
              <div className="text-right">
                <div className="text-2xl font-black text-white">{reviewedCount}<span className="text-sm font-normal text-white/60">/{EARP_SECTIONS.length}</span></div>
                <div className="text-[10px] text-white/60">Sections Reviewed</div>
              </div>
              {eapData && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1.5 bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white text-xs"
                  disabled={pdfDownloading}
                  onClick={async () => {
                    if (pdfDownloading) return;
                    setPdfDownloading(true);
                    const MAX_RETRIES = 2;
                    let lastErr: Error | null = null;
                    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                      try {
                        console.log(`[EAP PDF] Download attempt ${attempt}/${MAX_RETRIES}`);
                        const res = await fetch(`/api/eap/${auditId}/pdf`, { credentials: "include" });
                        if (!res.ok) {
                          const body = await res.json().catch(() => ({}));
                          throw new Error(body?.error ?? `Server error: ${res.status}`);
                        }
                        const blob = await res.blob();
                        console.log(`[EAP PDF] Download success — size=${blob.size} bytes`);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `EAP_Audit_${auditId}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        toast.success("EAP PDF downloaded successfully.");
                        lastErr = null;
                        break;
                      } catch (err: any) {
                        lastErr = err;
                        console.error(`[EAP PDF] Attempt ${attempt} failed:`, err);
                        if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1500));
                      }
                    }
                    if (lastErr) toast.error("Report generation failed. Please try again.");
                    setPdfDownloading(false);
                  }}
                >
                  {pdfDownloading
                    ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
                    : <><Download size={13} /> Download Full EAP PDF</>}
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400 rounded-full transition-all duration-500"
                style={{ width: `${(reviewedCount / EARP_SECTIONS.length) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] text-white/60">
              <span>{editedCount} sections edited</span>
              <span>{naCount} marked N/A</span>
            </div>
          </div>
        </div>

        {/* ACTD Banner */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-indigo-700" />
            <h3 className="font-semibold text-indigo-900 text-sm">ACTD Response Framework</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300 font-medium ml-auto">Proprietary Protocol</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { letter: "A", label: "Assess", desc: "Recognize the threat, gather information, determine severity and scope", color: "bg-blue-100 text-blue-900 border-blue-300" },
              { letter: "C", label: "Commit", desc: "Make a decisive commitment to act — activate the EAP and assign roles", color: "bg-yellow-100 text-yellow-900 border-yellow-300" },
              { letter: "T", label: "Take Action", desc: "Lockout · Lockdown · Escape · Defend — choose the appropriate response", color: "bg-orange-100 text-orange-900 border-orange-300" },
              { letter: "D", label: "Debrief", desc: "Post-incident accountability, reporting, recovery, and after-action review", color: "bg-green-100 text-green-900 border-green-300" },
            ].map(({ letter, label, desc, color }) => (
              <div key={letter} className={`rounded-lg border p-2.5 ${color}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base font-black">{letter}</span>
                  <span className="text-xs font-bold">{label}</span>
                </div>
                <p className="text-[10px] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-indigo-700 mt-2 font-medium">
            Take Action options: <strong>LOCKOUT</strong> — Secure perimeter, deny entry · <strong>LOCKDOWN</strong> — Secure in place, barricade · <strong>ESCAPE</strong> — Evacuate via safest route · <strong>DEFEND</strong> — Last resort when other options unavailable
          </p>
        </div>

        {/* Generate / Regenerate EAP button */}
        {!eapLoading && !eapGenerating && (
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                {eapData ? "Regenerate AI Baseline Content" : "Generate AI Baseline Content"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {eapData
                  ? `Last generated: ${eapData.generatedAt ? new Date(eapData.generatedAt).toLocaleString() : "Unknown"}. Regenerating will overwrite the current AI content (your manual edits are preserved).`
                  : "Generate facility-specific content for all sections based on your audit findings. You can then edit each section individually."}
              </p>
            </div>
            <Button onClick={handleGenerateEAP} variant={eapData ? "outline" : "default"} className="flex items-center gap-1.5 flex-shrink-0">
              <Shield size={14} />
              {eapData ? "Regenerate EAP" : "Generate EAP"}
            </Button>
          </div>
        )}
        {(eapLoading || eapGenerating) && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <Loader2 size={16} className="text-blue-600 animate-spin flex-shrink-0" />
            <p className="text-sm text-blue-800">Generating facility-specific Emergency Action Plan across all 17 sections. This may take 30–60 seconds...</p>
          </div>
        )}

        {/* 17 Sections */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Plan Sections</h2>
            <div className="flex items-center gap-2">
              {!isSuperAdmin && (
                <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                  <Shield size={10} /> Section editing requires super-admin access
                </span>
              )}
              <p className="text-xs text-muted-foreground">Click any section to expand</p>
            </div>
          </div>
          {EARP_SECTIONS.map((sectionDef) => (
            <EarpSection
              key={sectionDef.id}
              auditId={auditId}
              sectionDef={sectionDef}
              override={overrideMap[sectionDef.id] ?? null}
              llmContent={llmMap[sectionDef.id] ?? null}
              onSaved={refetchSections}
              canEdit={isSuperAdmin}
            />
          ))}
        </div>

        {/* Footer disclaimer */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-800">
            <strong>Important:</strong> This Emergency Action Response Plan is facility-specific and based on your audit findings. Organizations must validate all procedures with local law enforcement, fire marshal, and emergency management before distribution and implementation. Review annually and after any significant facility change, incident, or drill.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
