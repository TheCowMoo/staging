/**
 * DrillRunner — Live execution view for an ACTD drill session.
 *
 * Guides the facilitator through:
 *   1. Pre-drill briefing (objective, scenario, safety note)
 *   2. ACTD phase cards (Assess → Commit → Take Action → Debrief)
 *   3. Execution instructions step-by-step
 *   4. Participant capture
 *   5. Completion → routes to After-Action
 */
import { useState, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Clock, Play, Pause, RotateCcw, ChevronRight, ChevronLeft,
  Users, CheckCircle2, AlertTriangle, Loader2, Plus, Trash2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

type DrillContent = {
  title: string;
  drillType: string;
  durationMinutes: number;
  objective: string;
  scenario: string;
  actd: {
    assess: { whatToNotice: string[]; signalsThatMatter: string[] };
    commit: { decisionRequired: string; hesitationRisks: string[] };
    takeAction: { availableActions: string[]; adaptabilityNote: string };
    debrief: { whatToDocument: string[]; whatToImprove: string[] };
  };
  executionInstructions: string[];
  expectedOutcomes: string[];
  commonBreakdowns: string[];
  debriefQuestions: string[];
  regulatoryAlignment: string[];
};

type Participant = { name: string; role: string; attended: boolean; observations: string };

const PHASE_COLORS = {
  assess:     { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", badge: "bg-blue-100 text-blue-700" },
  commit:     { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", badge: "bg-amber-100 text-amber-700" },
  takeAction: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", badge: "bg-red-100 text-red-700" },
  debrief:    { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", badge: "bg-green-100 text-green-700" },
};

const STEPS = ["briefing", "assess", "commit", "takeAction", "debrief", "execution", "participants", "complete"] as const;
type Step = typeof STEPS[number];

const STEP_LABELS: Record<Step, string> = {
  briefing:     "Pre-Drill Briefing",
  assess:       "ASSESS",
  commit:       "COMMIT",
  takeAction:   "TAKE ACTION",
  debrief:      "DEBRIEF",
  execution:    "Execution Instructions",
  participants: "Participants",
  complete:     "Complete Drill",
};

export default function DrillRunner() {
  const params = useParams<{ id: string }>();
  const sessionId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();

  const [currentStep, setCurrentStep] = useState<Step>("briefing");
  const [participants, setParticipants] = useState<Participant[]>([{ name: "", role: "", attended: true, observations: "" }]);
  const [facilitatorNotes, setFacilitatorNotes] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [started, setStarted] = useState(false);

  const sessionQuery = trpc.drill.getSession.useQuery({ id: sessionId }, { enabled: !!sessionId });
  const startMutation = trpc.drill.start.useMutation();
  const completeMutation = trpc.drill.complete.useMutation({
    onSuccess: () => {
      toast.success("Drill completed — opening After-Action Report");
      navigate(`/drills/${sessionId}/debrief`);
    },
    onError: e => toast.error(e.message),
  });

  // Timer
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const stepIndex = STEPS.indexOf(currentStep);
  const progress = Math.round((stepIndex / (STEPS.length - 1)) * 100);

  const handleStart = useCallback(() => {
    if (!started) {
      startMutation.mutate({ id: sessionId });
      setStarted(true);
    }
    setTimerRunning(true);
    setCurrentStep("assess");
  }, [started, sessionId, startMutation]);

  const handleComplete = () => {
    const validParticipants = participants.filter(p => p.name.trim());
    completeMutation.mutate({
      id: sessionId,
      participantCount: validParticipants.length,
      facilitatorNotes: facilitatorNotes || undefined,
      participants: validParticipants,
    });
  };

  const addParticipant = () => setParticipants(p => [...p, { name: "", role: "", attended: true, observations: "" }]);
  const removeParticipant = (i: number) => setParticipants(p => p.filter((_, idx) => idx !== i));
  const updateParticipant = (i: number, field: keyof Participant, value: string | boolean) => {
    setParticipants(p => p.map((pt, idx) => idx === i ? { ...pt, [field]: value } : pt));
  };

  if (sessionQuery.isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!sessionQuery.data) {
    return (
      <AppLayout>
        <div className="container max-w-2xl py-16 text-center text-muted-foreground">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Drill session not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/drills")}>Back to Drills</Button>
        </div>
      </AppLayout>
    );
  }

  const { session, template } = sessionQuery.data;
  const content = template?.content as DrillContent | undefined;

  if (!content) {
    return (
      <AppLayout>
        <div className="container max-w-2xl py-16 text-center text-muted-foreground">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Drill template content unavailable</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/drills")}>Back to Drills</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-3xl py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => navigate("/drills")}>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Drills
              </Button>
            </div>
            <h1 className="text-xl font-bold">{content.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs capitalize">{content.drillType}</Badge>
              <Badge variant="outline" className="text-xs gap-1"><Clock className="h-2.5 w-2.5" />{content.durationMinutes} min</Badge>
              <Badge className={`text-xs capitalize ${session.status === "completed" ? "bg-green-100 text-green-700" : session.status === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                {session.status.replace("_", " ")}
              </Badge>
            </div>
          </div>
          {/* Timer */}
          <div className="flex items-center gap-2 bg-card border rounded-xl px-4 py-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-lg font-bold">{formatTime(timerSeconds)}</span>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setTimerRunning(r => !r)}>
                {timerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setTimerSeconds(0); setTimerRunning(false); }}>
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{STEP_LABELS[currentStep]}</span>
            <span>{stepIndex + 1} / {STEPS.length}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* ── Step: Briefing ── */}
        {currentStep === "briefing" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pre-Drill Briefing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold mb-1">⚠ Facilitator Notice</p>
                <p>This is a <strong>planned, announced drill</strong>. Participants are aware this is a training exercise. No surprise elements. No trauma-inducing realism.</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Objective</p>
                <p className="text-sm">{content.objective}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Scenario</p>
                <p className="text-sm text-muted-foreground">{content.scenario}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Expected Duration</p>
                <p className="text-sm">{content.durationMinutes} minutes</p>
              </div>
              <Button className="w-full" onClick={handleStart}>
                <Play className="h-4 w-4 mr-2" /> Start Drill & Begin Timer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── ACTD Phase Steps ── */}
        {(currentStep === "assess" || currentStep === "commit" || currentStep === "takeAction" || currentStep === "debrief") && (
          <div className="space-y-4">
            {currentStep === "assess" && (
              <Card className={`border-2 ${PHASE_COLORS.assess.border}`}>
                <CardHeader className={`${PHASE_COLORS.assess.bg} rounded-t-xl pb-3`}>
                  <CardTitle className={`text-base ${PHASE_COLORS.assess.text}`}>ASSESS — Situational Awareness</CardTitle>
                  <p className={`text-xs ${PHASE_COLORS.assess.text} opacity-80`}>Recognize behavioral and environmental threat indicators. Override denial and hesitation.</p>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">What to Notice</p>
                    <ul className="space-y-1.5">
                      {content.actd.assess.whatToNotice.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-blue-500 mt-0.5 shrink-0">→</span>{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Signals That Matter</p>
                    <ul className="space-y-1.5">
                      {content.actd.assess.signalsThatMatter.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-blue-500 mt-0.5 shrink-0">→</span>{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === "commit" && (
              <Card className={`border-2 ${PHASE_COLORS.commit.border}`}>
                <CardHeader className={`${PHASE_COLORS.commit.bg} rounded-t-xl pb-3`}>
                  <CardTitle className={`text-base ${PHASE_COLORS.commit.text}`}>COMMIT — Make the Decision</CardTitle>
                  <p className={`text-xs ${PHASE_COLORS.commit.text} opacity-80`}>Avoid the freeze response. Accept ownership. Prioritize movement over perfection.</p>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Decision Required</p>
                    <p className="text-sm font-medium">{content.actd.commit.decisionRequired}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Hesitation Risks</p>
                    <ul className="space-y-1.5">
                      {content.actd.commit.hesitationRisks.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === "takeAction" && (
              <Card className={`border-2 ${PHASE_COLORS.takeAction.border}`}>
                <CardHeader className={`${PHASE_COLORS.takeAction.bg} rounded-t-xl pb-3`}>
                  <CardTitle className={`text-base ${PHASE_COLORS.takeAction.text}`}>TAKE ACTION — Execute</CardTitle>
                  <p className={`text-xs ${PHASE_COLORS.takeAction.text} opacity-80`}>Not pre-scripted or linear. Adapt based on environment, threat proximity, exits, and people present.</p>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Available Actions</p>
                    <ul className="space-y-1.5">
                      {content.actd.takeAction.availableActions.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <ArrowRight className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
                    <p className="font-semibold text-xs mb-1">Adaptability Note</p>
                    <p>{content.actd.takeAction.adaptabilityNote}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === "debrief" && (
              <Card className={`border-2 ${PHASE_COLORS.debrief.border}`}>
                <CardHeader className={`${PHASE_COLORS.debrief.bg} rounded-t-xl pb-3`}>
                  <CardTitle className={`text-base ${PHASE_COLORS.debrief.text}`}>DEBRIEF — Capture & Improve</CardTitle>
                  <p className={`text-xs ${PHASE_COLORS.debrief.text} opacity-80`}>Capture what occurred. Identify gaps. Support emotional processing. Feed improvements into the system.</p>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">What to Document</p>
                    <ul className="space-y-1.5">
                      {content.actd.debrief.whatToDocument.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">What to Improve</p>
                    <ul className="space-y-1.5">
                      {content.actd.debrief.whatToImprove.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-green-500 mt-0.5 shrink-0">→</span>{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Common breakdowns (shown for all ACTD steps) */}
            {content.commonBreakdowns.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Common Breakdowns to Watch For</p>
                  <ul className="space-y-1">
                    {content.commonBreakdowns.map((item, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />{item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── Step: Execution Instructions ── */}
        {currentStep === "execution" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Execution Instructions</CardTitle>
              <p className="text-xs text-muted-foreground">Follow these steps during the live drill exercise.</p>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {content.executionInstructions.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
              {content.expectedOutcomes.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Expected Outcomes</p>
                  <ul className="space-y-1.5">
                    {content.expectedOutcomes.map((item, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />{item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Step: Participants ── */}
        {currentStep === "participants" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Participant Log
              </CardTitle>
              <p className="text-xs text-muted-foreground">Record who participated. Names and roles are required for compliance documentation.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {participants.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      placeholder="Full name"
                      value={p.name}
                      onChange={e => updateParticipant(i, "name", e.target.value)}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Role / Title</Label>
                    <Input
                      placeholder="e.g. Manager"
                      value={p.role}
                      onChange={e => updateParticipant(i, "role", e.target.value)}
                    />
                  </div>
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs">Observations (optional)</Label>
                    <Input
                      placeholder="Any notes…"
                      value={p.observations}
                      onChange={e => updateParticipant(i, "observations", e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 pt-6">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeParticipant(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addParticipant}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Participant
              </Button>

              <div className="space-y-1 pt-2">
                <Label>Facilitator Notes (optional)</Label>
                <Textarea
                  placeholder="Overall observations, environmental factors, anything worth noting for the after-action report…"
                  value={facilitatorNotes}
                  onChange={e => setFacilitatorNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step: Complete ── */}
        {currentStep === "complete" && (
          <Card>
            <CardContent className="pt-6 space-y-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <h2 className="text-lg font-bold">Drill Execution Complete</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Timer: <strong>{formatTime(timerSeconds)}</strong> elapsed
                  {participants.filter(p => p.name.trim()).length > 0 && (
                    <> · <strong>{participants.filter(p => p.name.trim()).length}</strong> participants logged</>
                  )}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Click below to save the drill and open the After-Action Report where you will capture debrief responses, gaps, and follow-up actions.
              </p>
              <Button
                className="w-full"
                onClick={handleComplete}
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" />Complete & Open After-Action Report</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Navigation ── */}
        {currentStep !== "briefing" && (
          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(STEPS[stepIndex - 1])}
              disabled={stepIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {currentStep !== "complete" && (
              <Button
                onClick={() => setCurrentStep(STEPS[stepIndex + 1])}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
