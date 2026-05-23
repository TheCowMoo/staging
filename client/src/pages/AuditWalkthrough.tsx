import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation, Link } from "wouter";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Circle, ChevronRight, Shield,
  AlertTriangle, BookOpen, ClipboardCheck, Flag, SkipForward, Smartphone,
  Lock, Users, Paperclip
} from "lucide-react";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";
import {
  AUDIT_CATEGORIES, getQuestionsForFacility, calculateCategoryScore,
  FACILITY_TYPES, REMEDIATION_TIMELINES, CONDITION_TYPES,
  PRIMARY_RESPONSES, CONCERN_LEVELS,
  getDecisionTreeScore,
  type QuestionPolarity, type AuditQuestion,
  type PrimaryResponse, type ConcernLevel, type ConditionType,
} from "../../../shared/auditFramework";
import { getRiskBadgeClass, getResponseScore } from "@/lib/riskUtils";

// ─── Response option sets ────────────────────────────────────────────────────

const POSITIVE_RESPONSE_OPTIONS = [
  { value: "Secure / Yes",          score: 0,    color: "border-green-400 bg-green-50 text-green-800 hover:bg-green-100",   desc: "No concern" },
  { value: "Partial",               score: 1,    color: "border-teal-400 bg-teal-50 text-teal-800 hover:bg-teal-100",       desc: "Partially met" },
  { value: "Minor Concern",         score: 1,    color: "border-lime-400 bg-lime-50 text-lime-800 hover:bg-lime-100",       desc: "Score: 1" },
  { value: "Moderate Concern",      score: 2,    color: "border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100",   desc: "Score: 2" },
  { value: "Serious Vulnerability", score: 3,    color: "border-red-400 bg-red-50 text-red-800 hover:bg-red-100",           desc: "Score: 3" },
  { value: "Unknown",               score: 1,    color: "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100",   desc: "Score: 1" },
  { value: "Not Applicable",        score: null, color: "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",       desc: "Excluded" },
  { value: "Unavoidable",           score: null, color: "border-slate-400 bg-slate-100 text-slate-600 hover:bg-slate-200",  desc: "Structural" },
];

const NEGATIVE_RESPONSE_OPTIONS = [
  { value: "No — Not Present",   score: 0,    color: "border-green-400 bg-green-50 text-green-800 hover:bg-green-100",   desc: "No concern" },
  { value: "Unlikely / Minimal", score: 1,    color: "border-lime-400 bg-lime-50 text-lime-800 hover:bg-lime-100",       desc: "Score: 1" },
  { value: "Partially Present",  score: 2,    color: "border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100",   desc: "Score: 2" },
  { value: "Yes — Present",      score: 3,    color: "border-red-400 bg-red-50 text-red-800 hover:bg-red-100",           desc: "Score: 3" },
  { value: "Unknown",            score: 1,    color: "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100",   desc: "Score: 1" },
  { value: "Not Applicable",     score: null, color: "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",       desc: "Excluded" },
  { value: "Unavoidable",        score: null, color: "border-slate-400 bg-slate-100 text-slate-600 hover:bg-slate-200",  desc: "Structural" },
];

function getResponseOptions(polarity: QuestionPolarity) {
  return polarity === "negative" ? NEGATIVE_RESPONSE_OPTIONS : POSITIVE_RESPONSE_OPTIONS;
}

// ─── Condition type options (from auditFramework.ts CONDITION_TYPES) ─────────

// ─── Gating rules ─────────────────────────────────────────────────────────────

const CATEGORY_GATE_RULES: Record<string, { gateQuestionId: string; gateLabel: string }> = {
  alleyways_concealed: {
    gateQuestionId: "ca_01",
    gateLabel: "No alleyway or concealed pathway adjacent to this building",
  },
  parking_areas: {
    gateQuestionId: "pa_01",
    gateLabel: "No dedicated parking area associated with this facility",
  },
};

function isGateNegative(response: string | undefined): boolean {
  // Supports both legacy responses and new decision-tree primaryResponse
  return response === "No — Not Present" || response === "Not Applicable" || response === "No";
}

// ─── Cross-fill rules ─────────────────────────────────────────────────────────

const CROSS_FILL_RULES: Array<{ sourceId: string; targetId: string; label: string }> = [
  { sourceId: "lv_02", targetId: "pa_05", label: "Parking lighting (from Lighting category)" },
  { sourceId: "sm_04", targetId: "pa_06", label: "Parking camera coverage (from Surveillance category)" },
  { sourceId: "ee_07", targetId: "ca_01", label: "Alleyway presence (from Exterior Environment)" },
  { sourceId: "lv_04", targetId: "ca_04", label: "Alleyway lighting (from Lighting category)" },
  { sourceId: "sm_05", targetId: "ca_06", label: "Alleyway camera coverage (from Surveillance category)" },
];

// ─── EAP Contacts type ────────────────────────────────────────────────────────

interface EapContacts {
  primaryName?: string;
  primaryTitle?: string;
  primaryPhone?: string;
  backupName?: string;
  backupTitle?: string;
  backupPhone?: string;
  afterHoursContact?: string;
  otherNotes?: string;
}

// ─── State types ──────────────────────────────────────────────────────────────

interface QuestionState {
  // Decision-tree fields (new model)
  primaryResponse?: PrimaryResponse;   // Step 1: Yes | No | Unknown | Not Applicable
  concernLevel?: ConcernLevel;         // Step 2: Minor | Moderate | Serious (shown when deficiency)
  conditionType?: ConditionType;       // Step 3: primary condition descriptor
  conditionTypes?: ConditionType[];    // Step 3: multi-select condition types
  addToEap?: boolean;                  // Step 4: flag this finding for EAP inclusion
  // Legacy field kept for backward compat with old saved responses
  response?: string;
  isUnavoidable?: boolean;
  notes: string;
  recommendedActionNotes?: string;     // separate recommended action text
  remediationTimeline?: string;        // 30 days | 60 days | 90 days | Long-Term
  followUpResponse?: string;           // conditional follow-up answer
  autoFilled?: boolean;
}

// Virtual category ID for the EAP contacts step
const EAP_CONTACTS_VIRTUAL_IDX = -1;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditWalkthrough() {
  const params = useParams<{ id: string }>();
  const auditId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();

  const { data: audit, isLoading: auditLoading } = trpc.audit.get.useQuery({ id: auditId });
  const { data: existingResponses } = trpc.audit.getResponses.useQuery({ auditId });
  const { data: facility } = trpc.facility.get.useQuery(
    { id: audit?.facilityId ?? 0 },
    { enabled: !!audit?.facilityId }
  );
  const { data: savedEapContacts } = trpc.audit.getEapContacts.useQuery({ auditId });

  // activeCategoryIdx: 0..categories.length-1 = normal categories; categories.length = EAP contacts step
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, QuestionState>>({});
  const [completing, setCompleting] = useState(false);
  const [eapContacts, setEapContacts] = useState<EapContacts>({});
  const [eapSaving, setEapSaving] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [sectionEapNotes, setSectionEapNotes] = useState<Record<string, string>>({});
  const [sectionEapSaving, setSectionEapSaving] = useState(false);

  const mainContentRef = useRef<HTMLDivElement>(null);

  const saveResponse = trpc.audit.saveResponse.useMutation();
  const saveEapContactsMutation = trpc.audit.saveEapContacts.useMutation();
  const saveSectionEapNotesMutation = trpc.audit.saveSectionEapNotes.useMutation();
  const { data: savedSectionEapNotes } = trpc.audit.getSectionEapNotes.useQuery({ auditId });
  const completeAudit = trpc.audit.complete.useMutation({
    onSuccess: () => {
      toast.success("Audit completed! Generating report...");
      navigate(`/audit/${auditId}/report`);
    },
    onError: (e) => toast.error(e.message),
  });

  const categories = useMemo(() => {
    if (!facility) return AUDIT_CATEGORIES;
    return getQuestionsForFacility(facility.facilityType);
  }, [facility]);

  // Total steps = categories + EAP contacts step
  const totalSteps = categories.length + 1;
  const isEapContactsStep = activeCategoryIdx === categories.length;

  // Load existing responses — restores ALL decision-tree fields from DB on page load
  useEffect(() => {
    if (existingResponses?.length) {
      const loaded: Record<string, QuestionState> = {};
      for (const r of existingResponses) {
        // conditionTypes is stored as JSON in DB; parse if it's a string
        let conditionTypes: ConditionType[] | undefined;
        const rawCT = (r as any).conditionTypes;
        if (Array.isArray(rawCT)) conditionTypes = rawCT as ConditionType[];
        else if (typeof rawCT === "string") {
          try { conditionTypes = JSON.parse(rawCT) as ConditionType[]; } catch { conditionTypes = undefined; }
        }

        loaded[r.questionId] = {
          primaryResponse: (r as any).primaryResponse as PrimaryResponse | undefined,
          concernLevel: (r as any).concernLevel as ConcernLevel | undefined,
          conditionType: r.conditionType as ConditionType | undefined,
          conditionTypes,
          addToEap: (r as any).addToEap ?? false,
          // Legacy field
          response: r.response ?? undefined,
          isUnavoidable: (r as any).isUnavoidable ?? false,
          notes: r.notes ?? "",
          recommendedActionNotes: (r as any).recommendedActionNotes ?? "",
          remediationTimeline: (r as any).remediationTimeline ?? undefined,
          followUpResponse: (r as any).followUpResponse ?? undefined,
        };
      }
      setResponses(loaded);
    }
  }, [existingResponses]);

  // Load saved EAP contacts
  useEffect(() => {
    if (savedEapContacts) {
      setEapContacts(savedEapContacts as EapContacts);
    }
  }, [savedEapContacts]);

  // Load saved section EAP notes
  useEffect(() => {
    if (savedSectionEapNotes && Object.keys(savedSectionEapNotes).length > 0) {
      setSectionEapNotes(savedSectionEapNotes);
    }
  }, [savedSectionEapNotes]);

  // Auto-populate section EAP notes from Step 4 flagged findings on load
  // This runs once after both responses and categories are available
  useEffect(() => {
    if (!existingResponses?.length || !categories.length) return;
    const flagged = existingResponses.filter((r: any) => r.addToEap);
    if (!flagged.length) return;
    setSectionEapNotes((prev) => {
      const updated = { ...prev };
      for (const r of flagged as any[]) {
        // Find which category this question belongs to
        const cat = categories.find((c) => c.questions.some((q) => q.id === r.questionId));
        if (!cat) continue;
        const eapEntry = `\u2022 ${r.questionText}${r.notes ? ` \u2014 ${r.notes}` : ""}`;
        const existing = updated[cat.id] ?? "";
        if (!existing.includes(eapEntry)) {
          updated[cat.id] = existing ? `${existing}\n${eapEntry}` : eapEntry;
        }
      }
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingResponses, categories]);

  // Scroll to top when step changes
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeCategoryIdx]);

  const activeCategory = isEapContactsStep ? null : categories[activeCategoryIdx];

  const categoryGateRule = activeCategory ? CATEGORY_GATE_RULES[activeCategory.id] : undefined;
  const isCategoryGated = useMemo(() => {
    if (!categoryGateRule) return false;
    const gateState = responses[categoryGateRule.gateQuestionId];
    const gateResponse = gateState?.primaryResponse ?? gateState?.response;
    return isGateNegative(gateResponse);
  }, [categoryGateRule, responses]);

  const visibleQuestions = useMemo(() => {
    if (!activeCategory) return [];
    if (!categoryGateRule) return activeCategory.questions;
    const gateState = responses[categoryGateRule.gateQuestionId];
    const gateResponse = gateState?.primaryResponse ?? gateState?.response;
    if (isGateNegative(gateResponse)) {
      return activeCategory.questions.filter((q) => q.id === categoryGateRule.gateQuestionId);
    }
    return activeCategory.questions;
  }, [activeCategory, categoryGateRule, responses]);

  const activeCategoryScore = useMemo(() => {
    if (!activeCategory) return null;
    const catResponses = activeCategory.questions.map((q) => ({
      score: responses[q.id]?.primaryResponse
        ? getDecisionTreeScore(responses[q.id].primaryResponse!, responses[q.id].concernLevel, q.polarity)
        : responses[q.id]?.response
          ? getResponseScore(responses[q.id].response!, q.polarity)
          : null,
    }));
    return calculateCategoryScore(catResponses);
  }, [activeCategory, responses]);

  const answeredInCategory = visibleQuestions.filter(
    (q) => q.inputType === "scored" && (responses[q.id]?.primaryResponse || responses[q.id]?.response)
  ).length;
  const totalInCategory = visibleQuestions.filter((q) => q.inputType === "scored").length;

  const totalAnswered = Object.keys(responses).filter((k) => responses[k]?.primaryResponse || responses[k]?.response).length;
  const totalQuestions = categories.reduce(
    (sum, c) => sum + c.questions.filter((q) => q.inputType === "scored").length, 0
  );

  const getFacilityFieldValue = (field?: string): string => {
    if (!field || !facility) return "Not recorded";
    const val = (facility as Record<string, unknown>)[field];
    if (val === null || val === undefined) return "Not recorded";
    if (typeof val === "boolean") return val ? "Yes" : "No";
    if (field === "facilityType") return FACILITY_TYPES.find((f) => f.value === val)?.label ?? String(val);
    return String(val);
  };

  // Core save helper — persists the FULL current state of a question to the server.
  // Always uses primaryResponse + concernLevel (new model); also writes legacy response for compat.
  const persistResponse = useCallback(async (
    questionId: string,
    questionText: string,
    categoryName: string,
    polarity: QuestionPolarity,
    state: QuestionState
  ) => {
    const pr = state.primaryResponse;
    const cl = state.concernLevel;
    const score = pr
      ? getDecisionTreeScore(pr, cl, polarity)
      : state.response
        ? getResponseScore(state.response, polarity)
        : null;
    await saveResponse.mutateAsync({
      auditId,
      categoryName,
      questionId,
      questionText,
      // New decision-tree fields
      primaryResponse: pr,
      concernLevel: cl,
      // Legacy field (kept for backward compat)
      response: (pr ?? state.response) as Parameters<typeof saveResponse.mutateAsync>[0]["response"],
      conditionType: state.conditionType as any,
      conditionTypes: state.conditionTypes as any,
      isUnavoidable: state.isUnavoidable,
      addToEap: state.addToEap,
      score: score ?? undefined,
      notes: state.notes ?? "",
      recommendedActionNotes: state.recommendedActionNotes ?? "",
      remediationTimeline: state.remediationTimeline as Parameters<typeof saveResponse.mutateAsync>[0]["remediationTimeline"],
      followUpResponse: state.followUpResponse ?? "",
    });
  }, [auditId, saveResponse]);

  // Cross-fill
  const applyCrossFill = useCallback(async (questionId: string, response: string) => {
    const rules = CROSS_FILL_RULES.filter((r) => r.sourceId === questionId);
    for (const rule of rules) {
      if (!responses[rule.targetId]?.primaryResponse && !responses[rule.targetId]?.response) {
        for (const cat of categories) {
          const targetQ = cat.questions.find((q) => q.id === rule.targetId);
          if (targetQ) {
            const autoState: QuestionState = { response, notes: `Auto-filled from ${rule.label}`, autoFilled: true };
            setResponses((prev) => ({ ...prev, [rule.targetId]: autoState }));
            await persistResponse(rule.targetId, targetQ.text, cat.name, targetQ.polarity, autoState);
            toast.info(`Auto-filled: "${targetQ.text.substring(0, 50)}..." based on your earlier answer.`, { duration: 3000 });
            break;
          }
        }
      }
    }
  }, [responses, categories, persistResponse]);

  // Auto-skip gated questions
  const autoSkipGatedQuestions = useCallback(async (gateQuestionId: string, response: string, categoryId: string) => {
    if (!isGateNegative(response)) return;
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    const questionsToSkip = cat.questions.filter((q) => q.id !== gateQuestionId && !responses[q.id]?.primaryResponse && !responses[q.id]?.response);
    for (const q of questionsToSkip) {
      const skipState: QuestionState = { primaryResponse: "Not Applicable", response: "Not Applicable", notes: "Auto-skipped: feature not present at this facility", autoFilled: true };
      setResponses((prev) => ({ ...prev, [q.id]: skipState }));
      await persistResponse(q.id, q.text, cat.name, q.polarity, skipState);
    }
    if (questionsToSkip.length > 0) {
      toast.success(`${questionsToSkip.length} follow-up question${questionsToSkip.length > 1 ? "s" : ""} automatically marked N/A.`);
    }
  }, [categories, responses, persistResponse]);

  const handleResponse = async (
    questionId: string, questionText: string, categoryName: string,
    categoryId: string, polarity: QuestionPolarity, response: string
  ) => {
    const current = responses[questionId] ?? { notes: "" };
    const updated = { ...current, response, autoFilled: false };
    setResponses((prev) => ({ ...prev, [questionId]: updated }));
    await persistResponse(questionId, questionText, categoryName, polarity, updated);
    const gateRule = CATEGORY_GATE_RULES[categoryId];
    if (gateRule?.gateQuestionId === questionId) {
      await autoSkipGatedQuestions(questionId, response, categoryId);
    }
    await applyCrossFill(questionId, response);
  };

  // Multi-select condition type toggle (now uses persistResponse for full save)
  const handleConditionTypeToggle = (
    questionId: string, questionText: string, categoryName: string,
    polarity: QuestionPolarity, conditionType: ConditionType
  ) => {
    const current = responses[questionId] ?? { notes: "" };
    const existing = current.conditionTypes ?? (current.conditionType ? [current.conditionType] : []);
    const newTypes = existing.includes(conditionType)
      ? existing.filter((t) => t !== conditionType)
      : [...existing, conditionType];
    const updated = { ...current, conditionTypes: newTypes, conditionType: newTypes[0] };
    setResponses((prev) => ({ ...prev, [questionId]: updated }));
    if (updated.primaryResponse || updated.response) {
      persistResponse(questionId, questionText, categoryName, polarity, updated);
    }
  };

  // Unavoidable toggle (now uses persistResponse for full save)
  const handleUnavoidableToggle = (
    questionId: string, questionText: string, categoryName: string, polarity: QuestionPolarity
  ) => {
    const current = responses[questionId] ?? { notes: "" };
    const newVal = !current.isUnavoidable;
    const updated = { ...current, isUnavoidable: newVal };
    setResponses((prev) => ({ ...prev, [questionId]: updated }));
    if (updated.primaryResponse || updated.response) {
      persistResponse(questionId, questionText, categoryName, polarity, updated);
    }
    toast.info(newVal
      ? "Marked as unavoidable — this item will be excluded from corrective action recommendations."
      : "Unavoidable flag removed — this item will appear in corrective action recommendations.");
  };

  const handleNotes = (questionId: string, notes: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: { ...(prev[questionId] ?? { notes: "" }), notes } }));
  };

  const handleRecommendedActionNotes = (questionId: string, val: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: { ...(prev[questionId] ?? { notes: "" }), recommendedActionNotes: val } }));
  };

  const handleRemediationTimeline = async (
    questionId: string, questionText: string, categoryName: string, polarity: QuestionPolarity, val: string
  ) => {
    const current = responses[questionId] ?? { notes: "" };
    const updated = { ...current, remediationTimeline: val };
    setResponses((prev) => ({ ...prev, [questionId]: updated }));
    if (updated.primaryResponse || updated.response) {
      await persistResponse(questionId, questionText, categoryName, polarity, updated);
    }
  };

  const handleFollowUpResponse = async (
    questionId: string, questionText: string, categoryName: string, polarity: QuestionPolarity, val: string
  ) => {
    const current = responses[questionId] ?? { notes: "" };
    const updated = { ...current, followUpResponse: val };
    setResponses((prev) => ({ ...prev, [questionId]: updated }));
    if (updated.primaryResponse || updated.response) {
      await persistResponse(questionId, questionText, categoryName, polarity, updated);
    }
  };

  // Save notes on blur — uses primaryResponse (new) OR legacy response field
  const handleNotesSave = async (
    questionId: string, questionText: string, categoryName: string, polarity: QuestionPolarity
  ) => {
    const current = responses[questionId];
    // Only save if the question has been answered (either new or legacy model)
    if (!current?.primaryResponse && !current?.response) return;
    await persistResponse(questionId, questionText, categoryName, polarity, current);
  };

  const handleCategoryChange = (idx: number) => {
    setActiveCategoryIdx(idx);
  };

  const handleEapContactChange = (field: keyof EapContacts, value: string) => {
    setEapContacts((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEapContacts = async () => {
    setEapSaving(true);
    try {
      await saveEapContactsMutation.mutateAsync({ auditId, eapContacts });
      toast.success("Emergency contacts saved.");
    } catch {
      toast.error("Failed to save contacts.");
    } finally {
      setEapSaving(false);
    }
  };

  const handleSaveSectionEapNotes = async (categoryId: string) => {
    setSectionEapSaving(true);
    try {
      await saveSectionEapNotesMutation.mutateAsync({ auditId, sectionEapNotes });
      toast.success("Section EAP notes saved.");
    } catch {
      toast.error("Failed to save EAP notes.");
    } finally {
      setSectionEapSaving(false);
    }
  };

  const handleComplete = () => {
    setCompleting(true);
    completeAudit.mutate({ auditId });
  };

  if (auditLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-64">
          <Shield className="text-primary animate-pulse" size={36} />
        </div>
      </AppLayout>
    );
  }

  if (audit?.status === "completed") {
    return (
      <AppLayout>
        <div className="p-6 text-center max-w-md mx-auto mt-20">
          <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
          <h2 className="text-xl font-bold mb-2">Audit Completed</h2>
          <p className="text-muted-foreground mb-6">This audit has been completed. View the full report below.</p>
          <Button asChild>
            <Link href={`/audit/${auditId}/report`}>View Report</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-0px)] overflow-hidden">
        {/* Category Sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-border bg-card overflow-y-auto hidden md:flex flex-col">
          <div className="p-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Progress</p>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-foreground font-medium">{totalAnswered} / {totalQuestions}</span>
              <span className="text-muted-foreground">{Math.round((totalAnswered / Math.max(totalQuestions, 1)) * 100)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(totalAnswered / Math.max(totalQuestions, 1)) * 100}%` }} />
            </div>
          </div>
          <nav className="flex-1 p-2">
            {categories.map((cat, idx) => {
              // info-type questions (facility profile) are pre-populated from the facility record
              // and never stored in responses — treat the whole category as complete
              const isInfoCategory = cat.questions.every((q) => q.inputType === "info");
              const scoredQuestions = cat.questions.filter((q) => q.inputType === "scored");
              const catAnswered = isInfoCategory
                ? cat.questions.length
                : scoredQuestions.filter((q) => responses[q.id]?.response).length;
              const catTotal = isInfoCategory ? cat.questions.length : scoredQuestions.length;
              const isActive = idx === activeCategoryIdx && !isEapContactsStep;
              const isComplete = isInfoCategory || catAnswered === catTotal;
              const gateRule = CATEGORY_GATE_RULES[cat.id];
              const isGated = gateRule ? isGateNegative(responses[gateRule.gateQuestionId]?.response) : false;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(idx)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg mb-0.5 transition-colors ${
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isGated ? (
                      <SkipForward size={13} className="text-slate-400 flex-shrink-0" />
                    ) : isComplete ? (
                      <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle size={13} className="flex-shrink-0 opacity-40" />
                    )}
                    <span className="text-xs font-medium truncate">{cat.name}</span>
                  </div>
                  {isGated ? (
                    <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1">N/A</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">{catAnswered}/{catTotal}</span>
                  )}
                </button>
              );
            })}
            {/* EAP Contacts step */}
            <button
              onClick={() => { handleCategoryChange(categories.length); setShowAttachments(false); }}
              className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg mb-0.5 transition-colors ${
                isEapContactsStep && !showAttachments ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Users size={13} className="flex-shrink-0 opacity-70" />
                <span className="text-xs font-medium truncate">Emergency Contacts</span>
              </div>
            </button>
            {/* Attachments */}
            <button
              onClick={() => setShowAttachments(true)}
              className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg mb-0.5 transition-colors ${
                showAttachments ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip size={13} className="flex-shrink-0 opacity-70" />
                <span className="text-xs font-medium truncate">Photos & Documents</span>
              </div>
            </button>
          </nav>
          <div className="p-3 border-t border-border">
            <Button
              className="w-full"
              size="sm"
              onClick={handleComplete}
              disabled={completing || completeAudit.isPending}
            >
              <Flag size={13} className="mr-1.5" />
              {completing ? "Completing..." : "Complete Audit"}
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto" ref={mainContentRef}>
          <div className="p-6 max-w-3xl mx-auto">

            {/* ── ATTACHMENTS VIEW ── */}
            {showAttachments ? (
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Link href={`/facilities/${audit?.facilityId}`} className="hover:text-primary">{facility?.name ?? "Facility"}</Link>
                  <ChevronRight size={12} />
                  <span>Assessment</span>
                  <ChevronRight size={12} />
                  <span className="text-foreground font-medium">Photos & Documents</span>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Paperclip size={16} className="text-primary" />
                    <h1 className="text-lg font-bold text-foreground">Photos & Documents</h1>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload floor plans, interior and exterior photos, or any relevant documents. Images will be analyzed by AI to identify safety observations that enhance the Emergency Action Plan.
                  </p>
                  {audit && facility && (
                    <AttachmentsPanel auditId={auditId} facilityId={facility.id} />
                  )}
                </div>
                {/* Complete Audit button at bottom of attachments page */}
                <div className="mt-5 flex justify-end">
                  <Button
                    onClick={handleComplete}
                    disabled={completing || completeAudit.isPending}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Flag size={15} /> {completing ? "Completing..." : "Complete Audit"}
                  </Button>
                </div>
              </div>
            ) : null}

            {/* ── EAP CONTACTS STEP ── */}
            {!showAttachments && isEapContactsStep ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Link href={`/facilities/${audit?.facilityId}`} className="hover:text-primary">{facility?.name ?? "Facility"}</Link>
                    <ChevronRight size={12} />
                    <span>Assessment</span>
                    <ChevronRight size={12} />
                    <span className="text-foreground font-medium">Emergency Contacts</span>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-5 mb-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={16} className="text-primary" />
                    <h1 className="text-lg font-bold text-foreground">Emergency Action Plan — Contacts</h1>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">
                    Capture the key contacts for this facility's Emergency Action Plan. This information will be injected directly into the generated EAP document. All fields are optional — fill in what is known.
                  </p>

                  {/* Primary Coordinator */}
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Shield size={12} className="text-primary" /> Primary Emergency Coordinator
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
                        <Input placeholder="e.g. Jane Smith" value={eapContacts.primaryName ?? ""} onChange={(e) => handleEapContactChange("primaryName", e.target.value)} className="text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Title / Role</label>
                        <Input placeholder="e.g. Office Manager" value={eapContacts.primaryTitle ?? ""} onChange={(e) => handleEapContactChange("primaryTitle", e.target.value)} className="text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Phone / Extension</label>
                        <Input placeholder="e.g. (555) 123-4567" value={eapContacts.primaryPhone ?? ""} onChange={(e) => handleEapContactChange("primaryPhone", e.target.value)} className="text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Backup Coordinator */}
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Shield size={12} className="text-muted-foreground" /> Backup / Secondary Coordinator
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
                        <Input placeholder="e.g. John Doe" value={eapContacts.backupName ?? ""} onChange={(e) => handleEapContactChange("backupName", e.target.value)} className="text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Title / Role</label>
                        <Input placeholder="e.g. HR Director" value={eapContacts.backupTitle ?? ""} onChange={(e) => handleEapContactChange("backupTitle", e.target.value)} className="text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Phone / Extension</label>
                        <Input placeholder="e.g. (555) 987-6543" value={eapContacts.backupPhone ?? ""} onChange={(e) => handleEapContactChange("backupPhone", e.target.value)} className="text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* After Hours */}
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Lock size={12} className="text-muted-foreground" /> After-Hours Emergency Contact
                    </p>
                    <Input placeholder="Name, phone, or instructions for after-hours emergencies" value={eapContacts.afterHoursContact ?? ""} onChange={(e) => handleEapContactChange("afterHoursContact", e.target.value)} className="text-sm" />
                  </div>

                  {/* Other / Additional Notes */}
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Other / Additional Information</p>
                    <Textarea
                      placeholder="Any other specific contacts, assembly points, special instructions, or facility-specific emergency information to include in the EAP..."
                      value={eapContacts.otherNotes ?? ""}
                      onChange={(e) => handleEapContactChange("otherNotes", e.target.value)}
                      className="text-sm min-h-[100px] resize-none"
                      rows={4}
                    />
                  </div>

                  <Button onClick={handleSaveEapContacts} disabled={eapSaving} className="w-full sm:w-auto">
                    {eapSaving ? "Saving..." : "Save Emergency Contacts"}
                  </Button>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => handleCategoryChange(categories.length - 1)} className="flex items-center gap-2">
                    <ArrowLeft size={15} /> Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">Step {categories.length + 1} of {totalSteps}</span>
                  <Button onClick={handleComplete} disabled={completing || completeAudit.isPending} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                    <Flag size={15} /> Complete Audit
                  </Button>
                </div>
              </div>
            ) : !showAttachments && activeCategory ? (
              <>
                {/* Breadcrumb */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Link href={`/facilities/${audit?.facilityId}`} className="hover:text-primary">
                      {facility?.name ?? "Facility"}
                    </Link>
                    <ChevronRight size={12} />
                    <span>Assessment</span>
                    <ChevronRight size={12} />
                    <span className="text-foreground font-medium">{activeCategory.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{answeredInCategory} / {totalInCategory} answered</span>
                    <Link href={`/audit/${auditId}/walkthrough`}>
                      <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs h-7">
                        <Smartphone size={12} /> Mobile Mode
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Category header */}
                <div className="bg-card border border-border rounded-xl p-5 mb-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-lg font-bold text-foreground">{activeCategory.name}</h1>
                      <p className="text-sm text-muted-foreground mt-1">{activeCategory.description}</p>
                      <p className="text-xs text-muted-foreground mt-1 italic">Standards: {activeCategory.standardsRef}</p>
                    </div>
                    {activeCategoryScore && activeCategoryScore.maxScore > 0 && (
                      <div className="text-center flex-shrink-0">
                        <div className={`text-sm font-bold px-3 py-1 rounded-full ${getRiskBadgeClass(activeCategoryScore.riskLevel)}`}>
                          {activeCategoryScore.riskLevel}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{activeCategoryScore.percentage}%</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(answeredInCategory / Math.max(totalInCategory, 1)) * 100}%` }} />
                    </div>
                  </div>
                </div>

                {/* Facility Profile */}
                {activeCategory.id === "facility_profile" ? (
                  <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield size={15} className="text-primary" />
                      <p className="text-sm font-semibold text-foreground">Facility Profile — Pre-populated from facility record</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      The information below was recorded when this facility was created. Review it for accuracy before proceeding.
                      If any details are incorrect, update the facility profile before continuing.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeCategory.questions.map((question) => (
                        <div key={question.id} className="p-3 bg-muted/40 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-0.5">{question.text}</p>
                          <p className="text-sm font-semibold text-foreground">{getFacilityFieldValue(question.facilityField)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-border flex justify-end">
                      <Button onClick={() => handleCategoryChange(activeCategoryIdx + 1)} className="flex items-center gap-2">
                        Begin Assessment <ArrowRight size={15} />
                      </Button>
                    </div>
                  </div>
                ) : isCategoryGated && categoryGateRule ? (
                  <div className="space-y-4">
                    {activeCategory.questions
                      .filter((q) => q.id === categoryGateRule.gateQuestionId)
                      .map((question) => {
                        const state = responses[question.id] ?? { notes: "" };
                        const responseOptions = getResponseOptions(question.polarity);
                        return (
                          <div key={question.id} className="bg-card border border-border rounded-xl p-5">
                            <div className="flex items-start gap-3 mb-4">
                              <span className="text-xs font-mono text-muted-foreground mt-0.5 flex-shrink-0 w-6">1.</span>
                              <p className="text-sm font-medium text-foreground leading-relaxed">{question.text}</p>
                              {state.response && <CheckCircle2 size={14} className="text-green-500 flex-shrink-0 mt-0.5" />}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {responseOptions.map((opt) => (
                                <button
                                  key={opt.value}
                                  onClick={() => handleResponse(question.id, question.text, activeCategory.name, activeCategory.id, question.polarity, opt.value)}
                                  className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                                    state.response === opt.value
                                      ? `${opt.color} ring-2 ring-offset-1 ring-current`
                                      : `border-border bg-background text-muted-foreground ${opt.color.split(" ").slice(-1)[0]}`
                                  }`}
                                >
                                  <span className="block font-semibold">{opt.value}</span>
                                  <span className="text-[10px] opacity-70">{opt.desc}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-start gap-3">
                      <SkipForward size={18} className="text-slate-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Remaining questions skipped</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {categoryGateRule.gateLabel}. The {activeCategory.questions.length - 1} follow-up questions in this category have been automatically marked Not Applicable and will not affect the risk score.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                      <Button variant="outline" onClick={() => handleCategoryChange(Math.max(0, activeCategoryIdx - 1))} disabled={activeCategoryIdx === 0} className="flex items-center gap-2">
                        <ArrowLeft size={15} /> Previous
                      </Button>
                      <span className="text-xs text-muted-foreground">Category {activeCategoryIdx + 1} of {categories.length}</span>
                      <Button onClick={() => handleCategoryChange(activeCategoryIdx + 1)} className="flex items-center gap-2">
                        Next <ArrowRight size={15} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="space-y-4">
                      {visibleQuestions.map((question, qIdx) => {
                        const state = responses[question.id] ?? { notes: "" };
                        const primaryResp = state.primaryResponse;
                        const isAnswered = !!primaryResp;
                        const scoredIdx = visibleQuestions.filter((q, i) => q.inputType === "scored" && i <= qIdx).length;

                        // Determine if this response indicates a deficiency (triggers Step 2)
                        const isDeficiency =
                          (question.polarity === "positive" && primaryResp === "No") ||
                          (question.polarity === "negative" && primaryResp === "Yes") ||
                          primaryResp === "Unknown";

                        // Positive answer (no deficiency) → skip Step 2 & condition types, show notes only
                        const isPositiveAnswer = isAnswered && !isDeficiency && primaryResp !== "Not Applicable";

                        // Determine if Step 3 (condition + notes) should show
                        // Positive answer: show notes-only immediately
                        // Deficiency: show after concern level is selected
                        // Not Applicable: show notes only
                        const showStep3 = isAnswered && (
                          isPositiveAnswer ||
                          primaryResp === "Not Applicable" ||
                          (isDeficiency && !!state.concernLevel)
                        );

                        // Condition types only shown for deficiency answers
                        const showConditionTypes = showStep3 && isDeficiency;

                        // Determine if recommended action should show
                        const showRecommendedAction = showStep3 && question.recommendedActionEnabled && isDeficiency;

                        // Response label for display
                        const responseLabel = !primaryResp ? null
                          : primaryResp === "Not Applicable" ? "Not Applicable"
                          : primaryResp === "Unknown" ? "Unknown"
                          : isDeficiency
                            ? `${primaryResp} — ${state.concernLevel ?? "(select concern level)"}`
                            : question.polarity === "positive" ? "Yes — Secure" : "No — Not Present";

                        // Color for the response label badge
                        const responseBadgeClass = !primaryResp ? ""
                          : primaryResp === "Not Applicable" ? "bg-slate-100 text-slate-600 border-slate-300"
                          : primaryResp === "Unknown" ? "bg-amber-50 text-amber-700 border-amber-300"
                          : isDeficiency
                            ? state.concernLevel === "Serious" ? "bg-red-50 text-red-700 border-red-300"
                            : state.concernLevel === "Moderate" ? "bg-amber-50 text-amber-700 border-amber-300"
                            : state.concernLevel === "Minor" ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                            : "bg-orange-50 text-orange-700 border-orange-300"
                          : "bg-green-50 text-green-700 border-green-300";

                        return (
                          <div
                            key={question.id}
                            className={`bg-card border rounded-xl p-5 transition-all ${
                              state.autoFilled ? "border-blue-200 bg-blue-50/30" : isAnswered ? "border-border" : "border-border/60"
                            }`}
                          >
                            {/* Auto-fill badge */}
                            {state.autoFilled && (
                              <div className="mb-2 px-2.5 py-1 bg-blue-100 border border-blue-200 rounded-lg inline-flex items-center gap-1.5">
                                <CheckCircle2 size={11} className="text-blue-600" />
                                <p className="text-[11px] text-blue-700 font-medium">Auto-filled from a related answer — review and adjust if needed</p>
                              </div>
                            )}

                            {/* Question text + answered badge */}
                            <div className="flex items-start gap-3 mb-3">
                              <span className="text-xs font-mono text-muted-foreground mt-0.5 flex-shrink-0 w-6">{scoredIdx}.</span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground leading-relaxed">{question.text}</p>
                                {responseLabel && (
                                  <span className={`inline-block mt-1.5 px-2 py-0.5 rounded border text-[11px] font-semibold ${responseBadgeClass}`}>
                                    {responseLabel}
                                  </span>
                                )}
                              </div>
                              {isAnswered && !state.autoFilled && <CheckCircle2 size={14} className="text-green-500 flex-shrink-0 mt-0.5" />}
                            </div>

                            {/* ─── STEP 1: Primary Response Dropdown ────────────────────────────────── */}
                            <div className="mb-3">
                              <p className="text-xs text-muted-foreground mb-1.5 font-semibold uppercase tracking-wide">
                                Step 1 — {question.polarity === "negative" ? "Is this condition present?" : "Is this condition in place?"}
                              </p>
                              <Select
                                value={primaryResp ?? ""}
                                onValueChange={(val) => {
                                  const pr = val as PrimaryResponse;
                                  const updated = { ...(responses[question.id] ?? { notes: "" }), primaryResponse: pr, concernLevel: undefined, response: pr };
                                  setResponses((prev) => ({ ...prev, [question.id]: updated }));
                                  // Persist immediately; score will be recalculated when concern level is set
                                  const score = getDecisionTreeScore(pr, undefined, question.polarity);
                                  saveResponse.mutate({
                                    auditId, categoryName: activeCategory.name, questionId: question.id, questionText: question.text,
                                    response: pr as any, primaryResponse: pr, concernLevel: undefined,
                                    conditionType: updated.conditionType as any, score, notes: updated.notes,
                                  });
                                  // Gate / cross-fill logic
                                  const gateRule = CATEGORY_GATE_RULES[activeCategory.id];
                                  if (gateRule?.gateQuestionId === question.id) {
                                    autoSkipGatedQuestions(question.id, pr, activeCategory.id);
                                  }
                                  applyCrossFill(question.id, pr);
                                }}
                              >
                                <SelectTrigger className="text-sm h-9 bg-background">
                                  <SelectValue placeholder="Select a response..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Yes" className="text-sm">
                                    {question.polarity === "negative" ? "Yes — Present" : "Yes — In place"}
                                  </SelectItem>
                                  <SelectItem value="No" className="text-sm">
                                    {question.polarity === "negative" ? "No — Not present" : "No — Not in place"}
                                  </SelectItem>
                                  <SelectItem value="Unknown" className="text-sm">Unknown — Unable to determine</SelectItem>
                                  <SelectItem value="Not Applicable" className="text-sm">Not Applicable — Does not apply</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* ─── STEP 2: Concern Level (only when deficiency) ─────────────────── */}
                            {isAnswered && isDeficiency && (
                              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-xs text-amber-800 mb-1.5 font-semibold uppercase tracking-wide">
                                  Step 2 — Concern Level
                                </p>
                                <Select
                                  value={state.concernLevel ?? ""}
                                  onValueChange={(val) => {
                                    const cl = val as ConcernLevel;
                                    const updated = { ...(responses[question.id] ?? { notes: "" }), concernLevel: cl };
                                    setResponses((prev) => ({ ...prev, [question.id]: updated }));
                                    const score = getDecisionTreeScore(primaryResp!, cl, question.polarity);
                                    saveResponse.mutate({
                                      auditId, categoryName: activeCategory.name, questionId: question.id, questionText: question.text,
                                      response: primaryResp as any, primaryResponse: primaryResp, concernLevel: cl,
                                      conditionType: updated.conditionType as any, score, notes: updated.notes,
                                    });
                                  }}
                                >
                                  <SelectTrigger className="text-sm h-9 bg-white">
                                    <SelectValue placeholder="How serious is this concern?" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Minor" className="text-sm">Minor — Low-level concern, monitor</SelectItem>
                                    <SelectItem value="Moderate" className="text-sm">Moderate — Requires scheduled action</SelectItem>
                                    <SelectItem value="Serious" className="text-sm">Serious — Requires immediate action</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* ─── STEP 3: Condition Type + Notes ─────────────────────────────── */}
                            {showStep3 && (
                              <div className="space-y-3">
                                {/* Condition Type multi-select checkboxes (only for deficiency answers) */}
                                {showConditionTypes && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Step 3 — Condition Type <span className="font-normal normal-case">(select all that apply)</span></p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {CONDITION_TYPES.map((ct) => {
                                        const selectedTypes = state.conditionTypes ?? (state.conditionType ? [state.conditionType] : []);
                                        const isSelected = selectedTypes.includes(ct);
                                        return (
                                          <button
                                            key={ct}
                                            type="button"
                                            onClick={() => {
                                              const existing = state.conditionTypes ?? (state.conditionType ? [state.conditionType] : []);
                                              const newTypes = existing.includes(ct)
                                                ? existing.filter((t) => t !== ct)
                                                : [...existing, ct];
                                              const updated = { ...(responses[question.id] ?? { notes: "" }), conditionTypes: newTypes, conditionType: newTypes[0] };
                                              setResponses((prev) => ({ ...prev, [question.id]: updated }));
                                              const score = getDecisionTreeScore(primaryResp!, state.concernLevel, question.polarity);
                                              saveResponse.mutate({
                                                auditId, categoryName: activeCategory.name, questionId: question.id, questionText: question.text,
                                                response: primaryResp as any, primaryResponse: primaryResp, concernLevel: state.concernLevel,
                                                conditionType: newTypes[0] as any, conditionTypes: newTypes as any, score, notes: updated.notes,
                                              });
                                            }}
                                            className={`text-left px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                              isSelected
                                                ? "bg-primary/10 border-primary text-primary"
                                                : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                            }`}
                                          >
                                            {isSelected && <span className="mr-1">✓</span>}{ct}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Conditional follow-up question */}
                                {question.conditionalFollowUp && (() => {
                                  const cfu = question.conditionalFollowUp!;
                                  const triggers = Array.isArray(cfu.trigger) ? cfu.trigger : [cfu.trigger];
                                  const isTriggered = triggers.some((t) =>
                                    t === primaryResp ||
                                    t === state.concernLevel ||
                                    t === state.response
                                  );
                                  if (!isTriggered) return null;
                                  return (
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                      <p className="text-xs font-medium text-blue-800 mb-2">
                                        <span className="font-semibold">Follow-up:</span> {cfu.followUpText}
                                      </p>
                                      {cfu.followUpType === "select" || cfu.followUpType === "multiselect" ? (
                                        <Select
                                          value={state.followUpResponse ?? ""}
                                          onValueChange={(val) => handleFollowUpResponse(question.id, question.text, activeCategory.name, question.polarity, val)}
                                        >
                                          <SelectTrigger className="text-xs h-8 bg-white">
                                            <SelectValue placeholder="Select..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {(cfu.followUpOptions ?? []).map((opt) => (
                                              <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        <Input
                                          className="text-xs h-8 bg-white"
                                          placeholder="Enter details..."
                                          value={state.followUpResponse ?? ""}
                                          onChange={(e) => setResponses((prev) => ({ ...prev, [question.id]: { ...(prev[question.id] ?? { notes: "" }), followUpResponse: e.target.value } }))}
                                          onBlur={() => handleNotesSave(question.id, question.text, activeCategory.name, question.polarity)}
                                        />
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Observation Notes */}
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1 font-medium">Observation Notes:</p>
                                  <Textarea
                                    placeholder="Add notes, observations, or context for this finding..."
                                    value={state.notes}
                                    onChange={(e) => handleNotes(question.id, e.target.value)}
                                    onBlur={() => handleNotesSave(question.id, question.text, activeCategory.name, question.polarity)}
                                    className="text-xs min-h-[60px] resize-none"
                                    rows={2}
                                  />
                                </div>

                                {/* Recommended Action Notes + Timeline */}
                                {showRecommendedAction && (
                                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
                                    <p className="text-xs font-semibold text-green-800 flex items-center gap-1.5">
                                      <ClipboardCheck size={12} /> Recommended Action
                                    </p>
                                    <Textarea
                                      placeholder="Describe the recommended corrective action for this finding..."
                                      value={state.recommendedActionNotes ?? ""}
                                      onChange={(e) => handleRecommendedActionNotes(question.id, e.target.value)}
                                      onBlur={() => handleNotesSave(question.id, question.text, activeCategory.name, question.polarity)}
                                      className="text-xs min-h-[60px] resize-none bg-white"
                                      rows={2}
                                    />
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs text-green-700 font-medium whitespace-nowrap">Remediation Timeline:</p>
                                      <Select
                                        value={state.remediationTimeline ?? ""}
                                        onValueChange={(val) => handleRemediationTimeline(question.id, question.text, activeCategory.name, question.polarity, val)}
                                      >
                                        <SelectTrigger className="text-xs h-7 bg-white flex-1">
                                          <SelectValue placeholder="Select timeline..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {REMEDIATION_TIMELINES.map((t) => (
                                            <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                )}

                                {/* ─── STEP 4: Add to Emergency Action Plan ───────────────── */}
                                <div className="pt-2 border-t border-border">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = responses[question.id] ?? { notes: "" };
                                      const newVal = !current.addToEap;
                                      const updated = { ...current, addToEap: newVal };
                                      setResponses((prev) => ({ ...prev, [question.id]: updated }));
                                      const score = getDecisionTreeScore(primaryResp!, state.concernLevel, question.polarity);
                                      saveResponse.mutate({
                                        auditId, categoryName: activeCategory.name, questionId: question.id, questionText: question.text,
                                        response: primaryResp as any, primaryResponse: primaryResp, concernLevel: state.concernLevel,
                                        conditionType: state.conditionType as any, conditionTypes: state.conditionTypes as any,
                                        score, notes: state.notes, addToEap: newVal,
                                      });
                                      if (newVal) {
                                        // Auto-append this finding to the section EAP notes
                                        const eapEntry = `• ${question.text}${state.notes ? ` — ${state.notes}` : ""}`;
                                        setSectionEapNotes((prev) => {
                                          const existing = prev[activeCategory.id] ?? "";
                                          if (existing.includes(eapEntry)) return prev;
                                          return { ...prev, [activeCategory.id]: existing ? `${existing}\n${eapEntry}` : eapEntry };
                                        });
                                        toast.success("Finding added to Emergency Action Plan section.");
                                      } else {
                                        toast.info("Finding removed from Emergency Action Plan.");
                                      }
                                    }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all w-full ${
                                      (responses[question.id] as any)?.addToEap
                                        ? "bg-red-50 border-red-300 text-red-700"
                                        : "bg-background border-border text-muted-foreground hover:border-red-300 hover:text-red-600"
                                    }`}
                                  >
                                    <Flag size={12} />
                                    <span>Step 4 — {(responses[question.id] as any)?.addToEap ? "Added to Emergency Action Plan ✓" : "Add to Emergency Action Plan"}</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Section EAP Notes Block */}
                    {activeCategory && activeCategory.section !== "profile" && (
                      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Flag size={14} className="text-red-600" />
                          <p className="text-xs font-semibold text-red-800">Emergency Action Plan — Section Notes</p>
                          <span className="text-[10px] text-red-600 font-normal ml-auto">Auto-connected to final EAP output</span>
                        </div>
                        <p className="text-[11px] text-red-700 mb-2">
                          Based on findings in this section, note any EAP considerations, gaps, or recommended procedures to include in the Emergency Action Plan.
                        </p>
                        <Textarea
                          placeholder="e.g. Evacuation routes need updating; no posted assembly point signs observed; staff unaware of lockdown protocol..."
                          value={sectionEapNotes[activeCategory.id] ?? ""}
                          onChange={(e) => setSectionEapNotes((prev) => ({ ...prev, [activeCategory.id]: e.target.value }))}
                          onBlur={() => handleSaveSectionEapNotes(activeCategory.id)}
                          className="text-xs min-h-[80px] resize-none bg-white border-red-200"
                          rows={3}
                        />
                        <div className="flex justify-end mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveSectionEapNotes(activeCategory.id)}
                            disabled={sectionEapSaving}
                            className="text-xs h-7 border-red-300 text-red-700 hover:bg-red-100"
                          >
                            {sectionEapSaving ? "Saving..." : "Save EAP Notes"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        onClick={() => handleCategoryChange(Math.max(0, activeCategoryIdx - 1))}
                        disabled={activeCategoryIdx === 0}
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft size={15} /> Previous
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Category {activeCategoryIdx + 1} of {categories.length}
                      </span>
                      <Button
                        onClick={() => handleCategoryChange(activeCategoryIdx + 1)}
                        className="flex items-center gap-2"
                      >
                        Next <ArrowRight size={15} />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
