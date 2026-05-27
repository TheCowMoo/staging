/**
 * ExtendedDrillRunner — Facilitator-led 15-minute drill execution view.
 *
 * Guides the facilitator through:
 *   1. Drill selection (from static data)
 *   2. Pre-drill briefing (core competency, scenario setup)
 *   3. Timer-led execution steps
 *   4. Goes Well / Something Goes Wrong / Defensive Pivot tracking
 *   5. Debrief focus questions
 *   6. Participant capture
 */
import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Clock, Play, Pause, RotateCcw, ChevronRight, ChevronLeft,
  Users, CheckCircle2, AlertTriangle, Loader2, Plus, Trash2,
  Shield, BookOpen, Target, ArrowRight, ListChecks,
} from "lucide-react";
import { EXTENDED_DRILLS, type ExtendedDrill } from "../../../shared/extendedDrillsData";

type Participant = { name: string; role: string };

const STEPS = ["select", "briefing", "execute", "debrief", "complete"] as const;
type Step = typeof STEPS[number];

const STEP_LABELS: Record<Step, string> = {
  select:   "Select Drill",
  briefing: "Pre-Drill Briefing",
  execute:  "Execute Drill",
  debrief:  "Debrief",
  complete: "Complete",
};

export default function ExtendedDrillRunner() {
  const params = useParams<{ drillId?: string }>();
  const [, navigate] = useLocation();

  const rawId = params.drillId ? parseInt(params.drillId, 10) : 0;
  const preSelected = EXTENDED_DRILLS.find(d => d.id === rawId) ?? null;

  const [currentStep, setCurrentStep] = useState<Step>(preSelected ? "briefing" : "select");
  const [selectedDrill, setSelectedDrill] = useState<ExtendedDrill | null>(preSelected);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [notes, setNotes] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([{ name: "", role: "" }]);
  const [drillCompleted, setDrillCompleted] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const stepIndex = STEPS.indexOf(currentStep);
  const progress = Math.round((stepIndex / (STEPS.length - 1)) * 100);

  const addParticipant = () => setParticipants(p => [...p, { name: "", role: "" }]);
  const removeParticipant = (i: number) => setParticipants(p => p.filter((_, idx) => idx !== i));
  const updateParticipant = (i: number, field: keyof Participant, value: string) => {
    setParticipants(p => p.map((pt, idx) => idx === i ? { ...pt, [field]: value } : pt));
  };

  const handleStartDrill = () => {
    setTimerRunning(true);
    setCurrentStep("execute");
    setCurrentStepIdx(0);
  };

  const handleComplete = () => {
    setTimerRunning(false);
    setDrillCompleted(true);
    setCurrentStep("complete");
    toast.success("Drill completed! Debrief data saved.");
  };

  if (!selectedDrill) {
    return (
      <AppLayout>
        <div className="container max-w-3xl py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Extended Drills</h1>
              <p className="text-sm text-muted-foreground mt-1">Select a facilitator-led drill to run (15 min each).</p>
            </div>
          </div>
          <div className="grid gap-3">
            {EXTENDED_DRILLS.map(drill => (
              <button
                key={drill.id}
                onClick={() => { setSelectedDrill(drill); setCurrentStep("briefing"); }}
                className="w-full text-left rounded-lg border p-4 hover:border-primary hover:bg-accent/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">{drill.coreCompetency}</Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-2.5 w-2.5 mr-1" />{drill.durationMinutes} min
                      </Badge>
                    </div>
                    <p className="font-semibold mt-1">{drill.title}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
          {EXTENDED_DRILLS.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No extended drills available</p>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  const d = selectedDrill;

  return (
    <AppLayout>
      <div className="container max-w-3xl py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setSelectedDrill(null); setCurrentStep("select"); setDrillCompleted(false); }}>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Drills
              </Button>
            </div>
            <h1 className="text-xl font-bold">{d.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">{d.coreCompetency}</Badge>
              <Badge variant="outline" className="text-xs">
                <Clock className="h-2.5 w-2.5 mr-1" />{d.durationMinutes} min
              </Badge>
              {drillCompleted && (
                <Badge className="bg-green-100 text-green-700">Completed</Badge>
              )}
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

        {/* ── Briefing ── */}
        {currentStep === "briefing" && (
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50 rounded-t-xl pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                <BookOpen className="h-4 w-4" /> Pre-Drill Briefing
              </CardTitle>
              <p className="text-xs text-blue-700 opacity-80">Read this to participants before starting the drill.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-slate-50 border px-4 py-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Core Competency</p>
                <p className="font-semibold">{d.coreCompetency}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Scenario Setup</p>
                <div className="rounded-lg border bg-card px-4 py-3">
                  <p className="text-sm leading-relaxed">{d.scenarioSetup}</p>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold mb-1">⚠ Facilitator Notice</p>
                <p>This is a <strong>planned, announced drill</strong>. No surprise elements. Estimated time: 15 minutes.</p>
              </div>
              <Button className="w-full" onClick={handleStartDrill}>
                <Play className="h-4 w-4 mr-2" /> Start Drill & Begin Timer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Execute ── */}
        {currentStep === "execute" && (
          <div className="space-y-4">
            {/* Execution Steps */}
            <Card className="border-2 border-red-200">
              <CardHeader className="bg-red-50 rounded-t-xl pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-red-800">
                  <ListChecks className="h-4 w-4" /> Execution Steps
                </CardTitle>
                <p className="text-xs text-red-700 opacity-80">Follow these steps during the drill.</p>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {d.executionSteps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Goes Well */}
            <Card className="border-l-4 border-l-green-400">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-4 w-4" /> Goes Well
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-800">{d.goesWell}</p>
              </CardContent>
            </Card>

            {/* Something Goes Wrong */}
            <Card className="border-l-4 border-l-amber-400">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-4 w-4" /> Something Goes Wrong
                </CardTitle>
                <p className="text-xs text-amber-600">Trainer introduces this complication mid-drill.</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-800">{d.somethingGoesWrong}</p>
              </CardContent>
            </Card>

            {/* Defensive Pivot */}
            <Card className="border-l-4 border-l-red-400">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                  <Shield className="h-4 w-4" /> Defensive Pivot
                </CardTitle>
                <p className="text-xs text-red-600">If the complication escalates further.</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-800">{d.defensivePivot}</p>
              </CardContent>
            </Card>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setCurrentStep("briefing")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back to Briefing
              </Button>
              <Button onClick={() => setCurrentStep("debrief")}>
                Next: Debrief <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Debrief ── */}
        {currentStep === "debrief" && (
          <Card className="border-2 border-green-200">
            <CardHeader className="bg-green-50 rounded-t-xl pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-green-800">
                <Target className="h-4 w-4" /> Debrief
              </CardTitle>
              <p className="text-xs text-green-700 opacity-80">Lead the discussion on these focus areas.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Debrief Focus Questions</p>
                <ul className="space-y-2">
                  {d.debriefFocus.map((q, i) => (
                    <li key={i} className="flex gap-2 text-sm p-3 rounded-lg bg-green-50 border border-green-200">
                      <span className="text-green-600 font-bold shrink-0">{i + 1}.</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <Label>Facilitator Notes</Label>
                <Textarea
                  placeholder="Capture observations, gaps, participant feedback..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Participants</p>
                  <Button variant="outline" size="sm" onClick={addParticipant}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
                {participants.map((p, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start mb-2">
                    <div className="col-span-5">
                      <Input
                        placeholder="Name"
                        value={p.name}
                        onChange={e => updateParticipant(i, "name", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-5">
                      <Input
                        placeholder="Role"
                        value={p.role}
                        onChange={e => updateParticipant(i, "role", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2 pt-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeParticipant(i)} disabled={participants.length <= 1}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button className="w-full" onClick={handleComplete}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Complete Drill
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Complete ── */}
        {currentStep === "complete" && drillCompleted && (
          <Card className="border-2 border-green-300">
            <CardContent className="pt-6 space-y-4 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h2 className="text-xl font-bold">Drill Complete</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Timer: <strong>{formatTime(timerSeconds)}</strong>
                  {participants.filter(p => p.name.trim()).length > 0 && (
                    <> · <strong>{participants.filter(p => p.name.trim()).length}</strong> participants</>
                  )}
                </p>
              </div>
              <div className="text-left space-y-3 bg-slate-50 rounded-lg border p-4">
                <h3 className="text-sm font-semibold">Summary</h3>
                <p className="text-sm"><strong>Drill:</strong> {d.title}</p>
                <p className="text-sm"><strong>Competency:</strong> {d.coreCompetency}</p>
                {notes && <p className="text-sm"><strong>Notes:</strong> {notes}</p>}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setSelectedDrill(null); setCurrentStep("select"); setDrillCompleted(false); setTimerSeconds(0); }}>
                  Back to Drills
                </Button>
                <Button className="flex-1" onClick={() => navigate("/drills")}>
                  Drill Planner
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation for execute/debrief */}
        {currentStep === "execute" && (
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setCurrentStep("briefing")}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={() => setCurrentStep("debrief")}>
              Debrief <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
        {currentStep === "debrief" && !drillCompleted && (
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setCurrentStep("execute")}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}