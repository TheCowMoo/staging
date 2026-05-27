/**
 * MicroDrillRunner — Interactive drill execution view.
 *
 * Guides the trainee through:
 *   1. Scenario display
 *   2. Step 1 (Assess): Two choices (A/B)
 *   3. Step 2 (Act): Response options based on Step 1 choice
 *   4. Considerations: 2-3 reflection points that must be read and checked off
 *   5. Completion → confirmation sent back to the assigner
 *
 * Supports redo with different choices.
 */
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Loader2,
  AlertTriangle, Target, Brain, BookOpen, RotateCcw,
  Shield, ShieldAlert, Play,
} from "lucide-react";
import { MICRO_DRILLS, type MicroDrillScenario, type MicroDrillStep2Option } from "../../../shared/microDrillsData";

const STEPS = ["scenario", "step1", "step2", "considerations", "complete"] as const;
type Step = typeof STEPS[number];

const STEP_LABELS: Record<Step, string> = {
  scenario:       "Scenario",
  step1:          "Step 1 — Assess",
  step2:          "Step 2 — Act",
  considerations: "Reflection Points",
  complete:       "Complete",
};

export default function MicroDrillRunner() {
  const params = useParams<{ assignmentId: string }>();
  const [, navigate] = useLocation();
  const assignmentId = parseInt(params.assignmentId ?? "", 10);

  const [currentStep, setCurrentStep] = useState<Step>("scenario");
  const [step1Choice, setStep1Choice] = useState<string | null>(null);
  const [step2Choices, setStep2Choices] = useState<string[]>([]);
  const [considerationsChecked, setConsiderationsChecked] = useState<boolean[]>([]);
  const [completed, setCompleted] = useState(false);
  const [started, setStarted] = useState(false);

  // Fetch assignment
  const assignmentQuery = trpc.microDrill.getAssignment.useQuery(
    { id: assignmentId },
    { enabled: !!assignmentId }
  );
  const startMutation = trpc.microDrill.startAssignment.useMutation();
  const completeMutation = trpc.microDrill.completeAssignment.useMutation({
    onSuccess: () => {
      toast.success("Drill completed! Confirmation has been sent.");
      setCompleted(true);
    },
    onError: (err) => toast.error(err.message),
  });

  const assignment = assignmentQuery.data;
  const userName = assignment?.assignedToName || "Trainee";

  // Get the drill from static data
  const drill = MICRO_DRILLS.find(d => d.id === assignment?.drillId) ?? null;

  // Set considerations array length when drill loads
  useEffect(() => {
    if (drill) {
      setConsiderationsChecked(new Array(drill.considerations.length).fill(false));
    }
  }, [drill]);

  // Step progression
  const stepIndex = STEPS.indexOf(currentStep);
  const progress = Math.round((stepIndex / (STEPS.length - 1)) * 100);

  // Step 2 options based on Step 1 choice
  const step2Options: MicroDrillStep2Option[] = step1Choice === "A" ? (drill?.step2A ?? []) : (drill?.step2B ?? []);

  const handleStart = async () => {
    if (!started) {
      try {
        await startMutation.mutateAsync({ id: assignmentId });
      } catch {}
      setStarted(true);
    }
    setCurrentStep("step1");
  };

  const handleStep1Choice = (choice: string) => {
    setStep1Choice(choice);
    setStep2Choices([]);
  };

  const toggleStep2Choice = (label: string) => {
    setStep2Choices(prev =>
      prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label]
    );
  };

  const toggleConsideration = (index: number) => {
    setConsiderationsChecked(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const handleComplete = () => {
    if (!drill || !step1Choice) return;

    completeMutation.mutate({
      id: assignmentId,
      step1Choice,
      step2Choices,
      considerationsChecked,
      completedByName: userName,
    });
  };

  const handleRedo = () => {
    setCurrentStep("scenario");
    setStep1Choice(null);
    setStep2Choices([]);
    setConsiderationsChecked(drill ? new Array(drill.considerations.length).fill(false) : []);
    setCompleted(false);
    setStarted(false);
  };

  // Loading state
  if (assignmentQuery.isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  // Assignment not found
  if (!assignment || !drill) {
    return (
      <AppLayout>
        <div className="container max-w-2xl py-16 text-center text-muted-foreground">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Drill assignment not found</p>
          <p className="text-sm mt-1">This assignment may have been removed or the link is invalid.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/micro-drills")}>
            Back to Drills
          </Button>
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
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => navigate("/micro-drills")}>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Drills
              </Button>
            </div>
            <h1 className="text-xl font-bold">{drill.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs">{drill.category}</Badge>
              <Badge variant="outline" className="text-xs">
                <Target className="h-2.5 w-2.5 mr-1" />2-3 min
              </Badge>
              <Badge className={`text-xs ${
                completed ? "bg-green-100 text-green-700" :
                assignment.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                "bg-amber-100 text-amber-700"
              }`}>
                {completed ? "Completed" : assignment.status?.replace("_", " ")}
              </Badge>
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

        {/* ── Step: Scenario ── */}
        {currentStep === "scenario" && (
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50 rounded-t-xl pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                <BookOpen className="h-4 w-4" /> Scenario
              </CardTitle>
              <p className="text-xs text-blue-700 opacity-80">
                Read the scenario carefully. You will be asked to make decisions based on the situation.
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="rounded-lg border bg-card px-4 py-4">
                <p className="text-sm leading-relaxed">{drill.scenario}</p>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold mb-1">⏱ Estimated Time</p>
                <p>This drill should take approximately 2-3 minutes to complete. Read the scenario, make your decisions, and reflect on the consideration points.</p>
              </div>
              <Button className="w-full" onClick={handleStart}>
                <Play className="h-4 w-4 mr-2" /> Begin Drill
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Step 1: Assess ── */}
        {currentStep === "step1" && (
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50 rounded-t-xl pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                <Target className="h-4 w-4" /> Step 1 — Assess
              </CardTitle>
              <p className="text-xs text-blue-700 opacity-80">{drill.step1Question}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-slate-50 border px-4 py-3 mb-2">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Scenario Recap</p>
                <p className="text-sm text-muted-foreground">{drill.scenario}</p>
              </div>

              <p className="text-sm font-semibold">{drill.step1Question}</p>

              <div className="grid gap-3">
                <button
                  onClick={() => handleStep1Choice("A")}
                  className={`w-full text-left rounded-lg border p-4 transition-all ${
                    step1Choice === "A"
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : "border-border hover:border-primary/40 hover:bg-accent/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">A</span>
                    <div>
                      <p className="font-semibold text-sm">{drill.step1A.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{drill.step1A.description}</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleStep1Choice("B")}
                  className={`w-full text-left rounded-lg border p-4 transition-all ${
                    step1Choice === "B"
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : "border-border hover:border-primary/40 hover:bg-accent/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">B</span>
                    <div>
                      <p className="font-semibold text-sm">{drill.step1B.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{drill.step1B.description}</p>
                    </div>
                  </div>
                </button>
              </div>

              {step1Choice && (
                <Button className="w-full" onClick={() => setCurrentStep("step2")}>
                  Next: Choose Actions <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Act ── */}
        {currentStep === "step2" && (
          <Card className="border-2 border-red-200">
            <CardHeader className="bg-red-50 rounded-t-xl pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-red-800">
                <Shield className="h-4 w-4" /> Step 2 — Act
              </CardTitle>
              <p className="text-xs text-red-700 opacity-80">
                Based on your assessment that the threat is{" "}
                <strong>{step1Choice === "A" ? "confirmed" : "unconfirmed"}</strong>, 
                select the response actions you would take. You may select multiple actions.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-slate-50 border px-4 py-3 mb-2">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Your Assessment</p>
                <p className="text-sm">
                  {step1Choice === "A" ? drill.step1A.label : drill.step1B.label}
                </p>
              </div>

              <p className="text-sm font-semibold">
                {step1Choice === "A" ? "The threat is confirmed. What action do you take?" : "The threat is unconfirmed. What action do you take?"}
              </p>

              <div className="space-y-2">
                {step2Options.map((option, i) => {
                  const isSelected = step2Choices.includes(option.label);
                  return (
                    <button
                      key={i}
                      onClick={() => toggleStep2Choice(option.label)}
                      className={`w-full text-left rounded-lg border p-3 transition-all ${
                        isSelected
                          ? "border-red-400 bg-red-50 ring-1 ring-red-400"
                          : "border-border hover:border-red-300 hover:bg-red-50/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg shrink-0 mt-0.5">{option.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{option.label}</p>
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {step2Choices.length > 0 && (
                <Button className="w-full" onClick={() => setCurrentStep("considerations")}>
                  Next: Reflection Points <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Considerations ── */}
        {currentStep === "considerations" && (
          <Card className="border-2 border-green-200">
            <CardHeader className="bg-green-50 rounded-t-xl pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-green-800">
                <Brain className="h-4 w-4" /> Reflection Points
              </CardTitle>
              <p className="text-xs text-green-700 opacity-80">
                Read each reflection point carefully and check it off after you have considered it.
                These are designed to reinforce critical thinking and situational awareness.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {drill.considerations.map((consideration, i) => (
                <button
                  key={i}
                  onClick={() => toggleConsideration(i)}
                  className={`w-full text-left rounded-lg border p-4 transition-all ${
                    considerationsChecked[i]
                      ? "border-green-300 bg-green-50"
                      : "border-border hover:border-green-200 hover:bg-green-50/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all ${
                      considerationsChecked[i]
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-muted-foreground"
                    }`}>
                      {considerationsChecked[i] ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-relaxed">{consideration}</p>
                    </div>
                  </div>
                </button>
              ))}

              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold mb-1">💡 Did You Know?</p>
                <p>Reflection after a drill is one of the most effective ways to improve decision-making under pressure. These questions help you identify patterns in your response instincts.</p>
              </div>

              <Button
                className="w-full"
                onClick={handleComplete}
                disabled={completeMutation.isPending || considerationsChecked.some(c => !c)}
              >
                {completeMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Completing…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" /> Complete Drill</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Complete ── */}
        {currentStep === "complete" && completed && (
          <Card className="border-2 border-green-300">
            <CardContent className="pt-6 space-y-4 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h2 className="text-xl font-bold">Drill Complete!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your responses have been recorded and a completion confirmation has been sent.
                </p>
              </div>

              {/* Summary */}
              <div className="text-left space-y-3 bg-slate-50 rounded-lg border p-4">
                <h3 className="text-sm font-semibold">Your Decision Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Step 1</Badge>
                    <span>{step1Choice === "A" ? drill.step1A.label : drill.step1B.label}</span>
                  </div>
                  <div>
                    <Badge variant="outline" className="text-xs mb-1">Step 2 — Actions Selected</Badge>
                    <ul className="space-y-1 mt-1">
                      {step2Choices.map((choice, i) => {
                        const opt = step2Options.find(o => o.label === choice);
                        return (
                          <li key={i} className="flex items-center gap-2 text-xs">
                            <span>{opt?.icon ?? "•"}</span>
                            {choice}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div>
                    <Badge variant="outline" className="text-xs mb-1">Reflection Points</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {considerationsChecked.filter(Boolean).length} of {drill.considerations.length} checked
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleRedo}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Redo with Different Choices
                </Button>
                <Button className="flex-1" onClick={() => navigate("/micro-drills")}>
                  Back to Drills
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Navigation (between steps) ── */}
        {currentStep !== "scenario" && currentStep !== "complete" && !completed && (
          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(STEPS[stepIndex - 1])}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {currentStep === "step1" && step1Choice && (
              <Button onClick={() => setCurrentStep("step2")}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {currentStep === "step2" && step2Choices.length > 0 && (
              <Button onClick={() => setCurrentStep("considerations")}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}