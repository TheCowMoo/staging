import { trpc } from "@/lib/trpc";
import { useParams, useLocation, Link } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Shield, Flag, X,
  ChevronLeft, ChevronRight, Smartphone, AlertTriangle
} from "lucide-react";
import {
  AUDIT_CATEGORIES, getQuestionsForFacility, type QuestionPolarity
} from "../../../shared/auditFramework";
import { getResponseScore } from "@/lib/riskUtils";

// ─── Response option sets ─────────────────────────────────────────────────────

const POSITIVE_RESPONSE_OPTIONS = [
  { value: "Secure / Yes",          score: 0,    color: "bg-green-500 text-white border-green-500",   label: "Secure / Yes",          sub: "No concern" },
  { value: "Minor Concern",         score: 1,    color: "bg-lime-500 text-white border-lime-500",     label: "Minor Concern",         sub: "Low risk" },
  { value: "Moderate Concern",      score: 2,    color: "bg-amber-500 text-white border-amber-500",   label: "Moderate Concern",      sub: "Needs attention" },
  { value: "Serious Vulnerability", score: 3,    color: "bg-red-600 text-white border-red-600",       label: "Serious Vulnerability", sub: "Immediate action" },
  { value: "Unknown",               score: 1,    color: "bg-slate-500 text-white border-slate-500",   label: "Unknown",               sub: "Cannot determine" },
  { value: "Not Applicable",        score: null, color: "bg-slate-200 text-slate-600 border-slate-200", label: "Not Applicable",      sub: "Skip this question" },
];

const NEGATIVE_RESPONSE_OPTIONS = [
  { value: "No — Not Present",   score: 0,    color: "bg-green-500 text-white border-green-500",   label: "No — Not Present",   sub: "No concern" },
  { value: "Unlikely / Minimal", score: 1,    color: "bg-lime-500 text-white border-lime-500",     label: "Unlikely / Minimal", sub: "Low risk" },
  { value: "Partially Present",  score: 2,    color: "bg-amber-500 text-white border-amber-500",   label: "Partially Present",  sub: "Moderate risk" },
  { value: "Yes — Present",      score: 3,    color: "bg-red-600 text-white border-red-600",       label: "Yes — Present",      sub: "Vulnerability found" },
  { value: "Unknown",            score: 1,    color: "bg-slate-500 text-white border-slate-500",   label: "Unknown",            sub: "Cannot determine" },
  { value: "Not Applicable",     score: null, color: "bg-slate-200 text-slate-600 border-slate-200", label: "Not Applicable",   sub: "Skip this question" },
];

function getResponseOptions(polarity: QuestionPolarity) {
  return polarity === "negative" ? NEGATIVE_RESPONSE_OPTIONS : POSITIVE_RESPONSE_OPTIONS;
}

// ─── Gating rules (same as AuditWalkthrough) ─────────────────────────────────

const CATEGORY_GATE_RULES: Record<string, { gateQuestionId: string }> = {
  alleyways_concealed: { gateQuestionId: "ca_01" },
  parking_areas: { gateQuestionId: "pa_01" },
};

function isGateNegative(response: string | undefined): boolean {
  return response === "No — Not Present" || response === "Not Applicable";
}

interface QuestionState {
  response?: string;
  notes: string;
}

export default function WalkthroughMode() {
  const params = useParams<{ id: string }>();
  const auditId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();

  const { data: audit } = trpc.audit.get.useQuery({ id: auditId });
  const { data: existingResponses } = trpc.audit.getResponses.useQuery({ auditId });
  const { data: facility } = trpc.facility.get.useQuery(
    { id: audit?.facilityId ?? 0 },
    { enabled: !!audit?.facilityId }
  );

  const [responses, setResponses] = useState<Record<string, QuestionState>>({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [completing, setCompleting] = useState(false);

  const saveResponse = trpc.audit.saveResponse.useMutation();
  const completeAudit = trpc.audit.complete.useMutation({
    onSuccess: () => {
      toast.success("Audit completed!");
      navigate(`/audit/${auditId}/report`);
    },
    onError: (e) => toast.error(e.message),
  });

  const categories = useMemo(() => {
    if (!facility) return AUDIT_CATEGORIES;
    return getQuestionsForFacility(facility.facilityType);
  }, [facility]);

  // Flatten all scored questions across all categories (skip facility_profile)
  const allQuestions = useMemo(() => {
    const questions: Array<{
      question: typeof categories[0]["questions"][0];
      categoryName: string;
      categoryId: string;
      globalIdx: number;
    }> = [];
    let idx = 0;
    for (const cat of categories) {
      if (cat.id === "facility_profile") continue;
      for (const q of cat.questions) {
        if (q.inputType !== "scored") continue;
        questions.push({ question: q, categoryName: cat.name, categoryId: cat.id, globalIdx: idx });
        idx++;
      }
    }
    return questions;
  }, [categories]);

  // Filter out gated questions
  const visibleQuestions = useMemo(() => {
    return allQuestions.filter(({ question, categoryId }) => {
      const gateRule = CATEGORY_GATE_RULES[categoryId];
      if (!gateRule) return true;
      if (question.id === gateRule.gateQuestionId) return true;
      return !isGateNegative(responses[gateRule.gateQuestionId]?.response);
    });
  }, [allQuestions, responses]);

  // Load existing responses
  useEffect(() => {
    if (existingResponses?.length) {
      const loaded: Record<string, QuestionState> = {};
      for (const r of existingResponses) {
        loaded[r.questionId] = { response: r.response ?? undefined, notes: r.notes ?? "" };
      }
      setResponses(loaded);
    }
  }, [existingResponses]);

  const currentItem = visibleQuestions[currentQuestionIdx];
  const totalVisible = visibleQuestions.length;
  const answeredCount = visibleQuestions.filter((q) => responses[q.question.id]?.response).length;
  const progress = Math.round((answeredCount / Math.max(totalVisible, 1)) * 100);

  const handleResponse = async (response: string) => {
    if (!currentItem) return;
    const { question, categoryName, categoryId } = currentItem;
    const current = responses[question.id] ?? { notes: "" };
    setResponses((prev) => ({ ...prev, [question.id]: { ...current, response } }));

    const score = getResponseScore(response, question.polarity);
    await saveResponse.mutateAsync({
      auditId,
      categoryName,
      questionId: question.id,
      questionText: question.text,
      response: response as Parameters<typeof saveResponse.mutateAsync>[0]["response"],
      score,
      notes: current.notes,
    });

    // Auto-advance after a short delay if not last question
    if (currentQuestionIdx < totalVisible - 1) {
      setTimeout(() => {
        setCurrentQuestionIdx((prev) => prev + 1);
        setShowNotes(false);
      }, 350);
    }

    // Handle gating: auto-skip remaining category questions
    const gateRule = CATEGORY_GATE_RULES[categoryId];
    if (gateRule?.gateQuestionId === question.id && isGateNegative(response)) {
      const cat = categories.find((c) => c.id === categoryId);
      if (cat) {
        const toSkip = cat.questions.filter((q) => q.id !== question.id && !responses[q.id]?.response);
        for (const q of toSkip) {
          setResponses((prev) => ({ ...prev, [q.id]: { response: "Not Applicable", notes: "Auto-skipped: feature not present" } }));
          await saveResponse.mutateAsync({
            auditId,
            categoryName,
            questionId: q.id,
            questionText: q.text,
            response: "Not Applicable",
            score: null,
            notes: "Auto-skipped: feature not present",
          });
        }
        if (toSkip.length > 0) {
          toast.success(`${toSkip.length} follow-up questions skipped automatically.`);
        }
      }
    }
  };

  const handleNotesSave = async () => {
    if (!currentItem) return;
    const { question, categoryName } = currentItem;
    const current = responses[question.id];
    if (!current?.response) return;
    const score = getResponseScore(current.response, question.polarity);
    await saveResponse.mutateAsync({
      auditId,
      categoryName,
      questionId: question.id,
      questionText: question.text,
      response: current.response as Parameters<typeof saveResponse.mutateAsync>[0]["response"],
      score,
      notes: current.notes,
    });
    toast.success("Note saved");
    setShowNotes(false);
  };

  const handleComplete = () => {
    setCompleting(true);
    completeAudit.mutate({ auditId });
  };

  if (!currentItem) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <Shield size={48} className="mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading walkthrough...</p>
        </div>
      </div>
    );
  }

  const { question, categoryName } = currentItem;
  const state = responses[question.id] ?? { notes: "" };
  const responseOptions = getResponseOptions(question.polarity);
  const isAnswered = !!state.response;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <Link href={`/audit/${auditId}`} className="text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <Smartphone size={14} className="text-primary" />
          <span className="text-xs font-semibold text-white">Walkthrough Mode</span>
        </div>
        <span className="text-xs text-slate-400">{currentQuestionIdx + 1} / {totalVisible}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-700">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Category label */}
      <div className="px-4 pt-4 pb-1">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">{categoryName}</span>
      </div>

      {/* Question card */}
      <div className="flex-1 px-4 py-3 flex flex-col">
        {/* Polarity warning */}
        {question.polarity === "negative" && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-amber-900/40 border border-amber-700/50 rounded-lg">
            <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-300">"Yes — Present" = vulnerability (higher risk)</p>
          </div>
        )}

        {/* Question text */}
        <div className="mb-6">
          <p className="text-lg font-semibold text-white leading-relaxed">{question.text}</p>
        </div>

        {/* Response buttons — large tap targets */}
        <div className="flex flex-col gap-3 mb-6">
          {responseOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleResponse(opt.value)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 text-left transition-all active:scale-98 ${
                state.response === opt.value
                  ? `${opt.color} ring-2 ring-white/30`
                  : "bg-slate-800 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500"
              }`}
            >
              <div>
                <span className="block text-sm font-bold">{opt.label}</span>
                <span className="text-xs opacity-70">{opt.sub}</span>
              </div>
              {state.response === opt.value && (
                <CheckCircle2 size={20} className="flex-shrink-0 opacity-80" />
              )}
            </button>
          ))}
        </div>

        {/* Notes toggle */}
        {isAnswered && !showNotes && (
          <button
            onClick={() => setShowNotes(true)}
            className="text-xs text-slate-400 hover:text-slate-200 underline text-center mb-4"
          >
            {state.notes ? "Edit note" : "+ Add note or observation"}
          </button>
        )}

        {showNotes && (
          <div className="mb-4">
            <Textarea
              placeholder="Add notes, observations, or context..."
              value={state.notes}
              onChange={(e) => setResponses((prev) => ({
                ...prev,
                [question.id]: { ...prev[question.id], notes: e.target.value }
              }))}
              className="bg-slate-800 border-slate-600 text-white text-sm resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={handleNotesSave} className="flex-1">Save Note</Button>
              <Button size="sm" variant="outline" onClick={() => setShowNotes(false)} className="flex-1 border-slate-600 text-slate-300">Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="px-4 pb-6 pt-2 bg-slate-900 border-t border-slate-800">
        <div className="flex items-center justify-between gap-3 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setCurrentQuestionIdx((p) => Math.max(0, p - 1)); setShowNotes(false); }}
            disabled={currentQuestionIdx === 0}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <ChevronLeft size={16} />
          </Button>

          <div className="flex-1 text-center">
            <span className="text-xs text-slate-400">{answeredCount} of {totalVisible} answered</span>
          </div>

          {currentQuestionIdx < totalVisible - 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setCurrentQuestionIdx((p) => p + 1); setShowNotes(false); }}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <ChevronRight size={16} />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={completing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Flag size={14} />
            </Button>
          )}
        </div>

        {/* Jump to desktop mode */}
        <div className="text-center">
          <Link href={`/audit/${auditId}`} className="text-xs text-slate-500 hover:text-slate-300 underline">
            Switch to desktop view
          </Link>
        </div>
      </div>
    </div>
  );
}
