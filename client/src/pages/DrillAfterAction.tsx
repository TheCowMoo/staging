/**
 * DrillAfterAction — After-Action Report for a completed ACTD drill session.
 *
 * Sections:
 *   1. Debrief questions (from drill template) with free-text answers
 *   2. Gaps identified during the drill
 *   3. Follow-up actions / corrective tasks
 *   4. System intelligence (AI-generated next drill recommendation, progression)
 */
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, Loader2, AlertTriangle, CheckCircle2,
  Sparkles, ClipboardCheck, TrendingUp, ListChecks,
} from "lucide-react";
import { toast } from "sonner";

type DrillContent = {
  title: string;
  drillType: string;
  durationMinutes: number;
  debriefQuestions: string[];
  regulatoryAlignment: string[];
};

type SystemIntelligence = {
  nextRecommendedDrill?: string;
  skillProgressionSuggestion?: string;
  trainingGapsIdentified?: string[];
  overallAssessment?: string;
};

export default function DrillAfterAction() {
  const params = useParams<{ id: string }>();
  const sessionId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [gapsIdentified, setGapsIdentified] = useState("");
  const [followUpActions, setFollowUpActions] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [systemIntelligence, setSystemIntelligence] = useState<SystemIntelligence | null>(null);

  const sessionQuery = trpc.drill.getSession.useQuery({ id: sessionId }, { enabled: !!sessionId });

  const debriefMutation = trpc.drill.debrief.useMutation({
    onSuccess: (data) => {
      setSubmitted(true);
      setSystemIntelligence(data.systemIntelligence as SystemIntelligence ?? null);
      toast.success("After-action report saved");
    },
    onError: e => toast.error(e.message),
  });

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

  const { session, template, participants } = sessionQuery.data;
  const content = template?.content as DrillContent | undefined;
  const debriefData = session.debriefData as { answers?: Record<string, string>; gapsIdentified?: string; followUpActions?: string } | null;
  const savedIntelligence = session.systemIntelligence as SystemIntelligence | null;

  // If already submitted, show saved data
  const isAlreadySubmitted = session.status === "completed" && !!debriefData?.answers;
  const displayAnswers = submitted ? answers : (debriefData?.answers ?? {});
  const displayGaps = submitted ? gapsIdentified : (debriefData?.gapsIdentified ?? "");
  const displayActions = submitted ? followUpActions : (debriefData?.followUpActions ?? "");
  const displayIntelligence = submitted ? systemIntelligence : savedIntelligence;

  const handleSubmit = () => {
    if (!content) return;
    debriefMutation.mutate({
      id: sessionId,
      debriefAnswers: answers,
      gapsIdentified: gapsIdentified || undefined,
      followUpActions: followUpActions || undefined,
    });
  };

  // Pre-populate form from saved data when viewing existing report
  const initFromSaved = () => {
    if (debriefData?.answers) setAnswers(debriefData.answers);
    if (debriefData?.gapsIdentified) setGapsIdentified(debriefData.gapsIdentified);
    if (debriefData?.followUpActions) setFollowUpActions(debriefData.followUpActions);
  };

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
            <h1 className="text-xl font-bold">After-Action Report</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-muted-foreground">{content?.title ?? `Session #${sessionId}`}</span>
              <Badge variant="outline" className="text-xs capitalize">{content?.drillType}</Badge>
              <Badge className="text-xs bg-green-100 text-green-700">Completed</Badge>
            </div>
          </div>
        </div>

        {/* Session summary */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-sm font-semibold">{session.completedAt ? new Date(session.completedAt).toLocaleDateString() : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm font-semibold">{content?.durationMinutes ?? "—"} min</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Participants</p>
                <p className="text-sm font-semibold">{session.participantCount ?? participants.length ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Regulatory</p>
                <p className="text-sm font-semibold">{content?.regulatoryAlignment?.slice(0, 2).join(", ") ?? "—"}</p>
              </div>
            </div>
            {session.facilitatorNotes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Facilitator Notes</p>
                <p className="text-sm text-muted-foreground">{session.facilitatorNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participants */}
        {participants.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <ListChecks className="h-4 w-4" /> Participant Log ({participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {participants.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-3.5 w-3.5 ${p.attended ? "text-green-500" : "text-muted-foreground"}`} />
                      <span className="font-medium">{p.name}</span>
                      {p.role && <span className="text-muted-foreground text-xs">· {p.role}</span>}
                    </div>
                    {p.observations && <span className="text-xs text-muted-foreground max-w-[200px] truncate">{p.observations}</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debrief questions */}
        {content?.debriefQuestions && content.debriefQuestions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <ClipboardCheck className="h-4 w-4" /> Debrief Questions
              </CardTitle>
              <p className="text-xs text-muted-foreground">Answer each question based on what occurred during the drill.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.debriefQuestions.map((q, i) => (
                <div key={i} className="space-y-1.5">
                  <Label className="text-sm font-medium">{i + 1}. {q}</Label>
                  <Textarea
                    placeholder="Your response…"
                    value={isAlreadySubmitted ? (displayAnswers[q] ?? "") : (answers[q] ?? "")}
                    onChange={e => setAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                    rows={2}
                    disabled={isAlreadySubmitted && !submitted}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Gaps & follow-up */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Gaps & Follow-Up Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Gaps Identified</Label>
              <Textarea
                placeholder="Describe any gaps in awareness, decision-making, communication, or execution observed during this drill…"
                value={isAlreadySubmitted ? displayGaps : gapsIdentified}
                onChange={e => setGapsIdentified(e.target.value)}
                rows={3}
                disabled={isAlreadySubmitted && !submitted}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Follow-Up Actions</Label>
              <Textarea
                placeholder="List specific corrective actions, additional training needs, or policy changes required based on this drill…"
                value={isAlreadySubmitted ? displayActions : followUpActions}
                onChange={e => setFollowUpActions(e.target.value)}
                rows={3}
                disabled={isAlreadySubmitted && !submitted}
              />
            </div>
          </CardContent>
        </Card>

        {/* System intelligence */}
        {displayIntelligence && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" /> System Intelligence
              </CardTitle>
              <p className="text-xs text-muted-foreground">AI-generated training progression analysis based on this drill's debrief data.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayIntelligence.overallAssessment && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Overall Assessment</p>
                  <p className="text-sm">{displayIntelligence.overallAssessment}</p>
                </div>
              )}
              {displayIntelligence.nextRecommendedDrill && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Next Recommended Drill</p>
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm">{displayIntelligence.nextRecommendedDrill}</p>
                  </div>
                </div>
              )}
              {displayIntelligence.skillProgressionSuggestion && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Skill Progression</p>
                  <p className="text-sm">{displayIntelligence.skillProgressionSuggestion}</p>
                </div>
              )}
              {displayIntelligence.trainingGapsIdentified && displayIntelligence.trainingGapsIdentified.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Training Gaps Identified</p>
                  <ul className="space-y-1.5">
                    {displayIntelligence.trainingGapsIdentified.map((gap, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />{gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate("/drills")}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Schedule Next Drill
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Submit / actions */}
        {!isAlreadySubmitted && !submitted && (
          <div className="flex gap-3 pb-8">
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={debriefMutation.isPending}
            >
              {debriefMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving & Generating Intelligence…</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" />Save After-Action Report</>
              )}
            </Button>
            <Button variant="outline" onClick={() => navigate("/drills")}>Cancel</Button>
          </div>
        )}

        {(isAlreadySubmitted || submitted) && !displayIntelligence && (
          <div className="flex gap-3 pb-8">
            <Button variant="outline" onClick={() => navigate("/drills")}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to Drills
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
