import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ClipboardList, Star, CheckCircle2, AlertTriangle,
  Clock, ChevronLeft, Send, HelpCircle
} from "lucide-react";
import { Link } from "wouter";

// ─── Star Rating Component ────────────────────────────────────────────────────
function StarRating({
  value,
  onChange,
  labels,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  labels: string[];
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                star <= (hovered || value || 0)
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>
      {(hovered || value) ? (
        <p className="text-xs text-muted-foreground">
          {labels[(hovered || value || 1) - 1]}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground/50">Click to rate</p>
      )}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, description }: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TesterFeedback() {
  const params = useParams<{ id: string }>();
  const auditId = parseInt(params.id || "0");
  const [, navigate] = useLocation();

  const { data: audit } = trpc.audit.get.useQuery({ id: auditId }, { enabled: !!auditId });
  const { data: facility } = trpc.facility.get.useQuery(
    { id: audit?.facilityId ?? 0 },
    { enabled: !!audit?.facilityId }
  );
  const { data: existingFeedback } = trpc.feedback.getFeedbackForAudit.useQuery(
    { auditId },
    { enabled: !!auditId }
  );

  const submitFeedback = trpc.feedback.submitFeedback.useMutation({
    onSuccess: () => {
      toast.success("Feedback submitted successfully. Thank you for helping improve the platform.");
      navigate(`/audit/${auditId}/report`);
    },
    onError: (err) => toast.error(err.message),
  });

  // ─── Form State ──────────────────────────────────────────────────────────
  const [completionTime, setCompletionTime] = useState<string>("");
  const [overallReportQuality, setOverallReportQuality] = useState<number | undefined>();
  const [scoringAccuracy, setScoringAccuracy] = useState<number | undefined>();
  const [correctiveActionRealism, setCorrectiveActionRealism] = useState<number | undefined>();
  const [eapCompleteness, setEapCompleteness] = useState<number | undefined>();
  const [questionRelevance, setQuestionRelevance] = useState<number | undefined>();
  const [missingQuestions, setMissingQuestions] = useState("");
  const [irrelevantQuestions, setIrrelevantQuestions] = useState("");
  const [correctiveActionIssues, setCorrectiveActionIssues] = useState("");
  const [scoringDisagreements, setScoringDisagreements] = useState("");
  const [eapFeedback, setEapFeedback] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [wouldUseForClient, setWouldUseForClient] = useState<boolean | undefined>();

  const alreadySubmitted = existingFeedback && existingFeedback.length > 0;

  const handleSubmit = () => {
    if (!auditId || !audit) return;
    submitFeedback.mutate({
      auditId,
      facilityId: audit.facilityId,
      facilityType: facility?.facilityType,
      completionTimeMinutes: completionTime ? parseInt(completionTime) : undefined,
      overallReportQuality,
      scoringAccuracy,
      correctiveActionRealism,
      eapCompleteness,
      questionRelevance,
      missingQuestions: missingQuestions || undefined,
      irrelevantQuestions: irrelevantQuestions || undefined,
      correctiveActionIssues: correctiveActionIssues || undefined,
      scoringDisagreements: scoringDisagreements || undefined,
      eapFeedback: eapFeedback || undefined,
      generalNotes: generalNotes || undefined,
      wouldUseForClient,
    });
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/audit/${auditId}/report`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
Back to Report
          </Button>
        </Link>
      </div>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tester Feedback Form</h1>
            <p className="text-muted-foreground mt-1">
              Help improve the platform by rating this audit session. Your feedback directly shapes the question framework, scoring calibration, and report quality.
            </p>
            {facility && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{facility.name}</Badge>
                <Badge variant="secondary" className="capitalize">{facility.facilityType?.replace(/_/g, " ")}</Badge>
                {audit?.status === "completed" && (
                  <Badge className="bg-green-100 text-green-700 border-green-200">Completed Audit</Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {alreadySubmitted && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm font-medium">Feedback already submitted for this audit. Submitting again will add a new entry.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 1: Completion Time */}
        <Card>
          <CardHeader className="pb-3">
            <SectionHeader
              icon={Clock}
              title="Audit Completion Time"
              description="How long did the walkthrough take from start to finish?"
            />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={600}
                value={completionTime}
                onChange={(e) => setCompletionTime(e.target.value)}
                placeholder="e.g. 45"
                className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This helps calibrate expected audit duration for different facility types and sizes.
            </p>
          </CardContent>
        </Card>

        {/* Section 2: Quantitative Ratings */}
        <Card>
          <CardHeader className="pb-3">
            <SectionHeader
              icon={Star}
              title="Quality Ratings"
              description="Rate each dimension of the audit experience on a 1–5 scale."
            />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6">
              {[
                {
                  label: "Overall Report Quality",
                  description: "Does the final report look professional and complete enough to deliver to a client?",
                  value: overallReportQuality,
                  onChange: setOverallReportQuality,
                  labels: ["Not usable", "Needs major work", "Acceptable", "Good", "Client-ready"],
                },
                {
                  label: "Scoring Accuracy",
                  description: "Does the overall risk rating and category scoring match your professional judgment of this facility?",
                  value: scoringAccuracy,
                  onChange: setScoringAccuracy,
                  labels: ["Very inaccurate", "Often wrong", "Partially accurate", "Mostly accurate", "Spot on"],
                },
                {
                  label: "Corrective Action Realism",
                  description: "Are the corrective action recommendations operationally feasible for a real organization?",
                  value: correctiveActionRealism,
                  onChange: setCorrectiveActionRealism,
                  labels: ["Unrealistic", "Often impractical", "Mixed", "Mostly practical", "Highly actionable"],
                },
                {
                  label: "EAP Completeness",
                  description: "Is the Emergency Action Plan thorough enough to serve as a real facility EAP framework?",
                  value: eapCompleteness,
                  onChange: setEapCompleteness,
                  labels: ["Skeleton only", "Missing major sections", "Adequate", "Thorough", "Comprehensive"],
                },
                {
                  label: "Question Relevance",
                  description: "Were the questions appropriate and relevant for this specific facility type and size?",
                  value: questionRelevance,
                  onChange: setQuestionRelevance,
                  labels: ["Many irrelevant", "Some irrelevant", "Mostly relevant", "Relevant", "Perfectly tailored"],
                },
              ].map(({ label, description, value, onChange, labels }) => (
                <div key={label} className="space-y-2">
                  <div>
                    <Label className="text-sm font-medium">{label}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                  <StarRating value={value} onChange={onChange} labels={labels} />
                  <Separator />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Qualitative Feedback */}
        <Card>
          <CardHeader className="pb-3">
            <SectionHeader
              icon={HelpCircle}
              title="Detailed Qualitative Feedback"
              description="These open-ended fields are the most valuable data for improving the platform. Be as specific as possible."
            />
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              {
                label: "Missing Questions",
                description: "What important security topics were NOT covered that should have been asked?",
                placeholder: "e.g. 'No questions about visitor sign-in procedures' or 'Missing questions about after-hours key control'",
                value: missingQuestions,
                onChange: setMissingQuestions,
              },
              {
                label: "Irrelevant or Poorly Worded Questions",
                description: "Which questions did not apply to this facility, felt confusing, or had the wrong response options?",
                placeholder: "e.g. 'Question about loading dock did not apply to this office' or 'Response options for Q12 did not make sense'",
                value: irrelevantQuestions,
                onChange: setIrrelevantQuestions,
              },
              {
                label: "Corrective Action Issues",
                description: "Which corrective action recommendations were unrealistic, impractical, or did not acknowledge real-world constraints?",
                placeholder: "e.g. 'Recommendation to remove parking was not operationally feasible' or 'Cost estimate for camera system was too low'",
                value: correctiveActionIssues,
                onChange: setCorrectiveActionIssues,
              },
              {
                label: "Scoring Disagreements",
                description: "Where did the platform's risk rating NOT match your professional assessment? What would you have rated differently?",
                placeholder: "e.g. 'Access Control was rated Moderate but I would rate it Elevated given the lack of badge readers' or 'Overall score seems too low'",
                value: scoringDisagreements,
                onChange: setScoringDisagreements,
              },
              {
                label: "EAP Feedback",
                description: "What was missing, incorrect, or insufficient in the Emergency Action Plan output?",
                placeholder: "e.g. 'No mention of shelter-in-place procedures' or 'Communication tree section needs more detail'",
                value: eapFeedback,
                onChange: setEapFeedback,
              },
              {
                label: "General Notes",
                description: "Any other observations, suggestions, or issues not covered above.",
                placeholder: "e.g. 'The walkthrough UI was easy to use' or 'The report took too long to generate'",
                value: generalNotes,
                onChange: setGeneralNotes,
              },
            ].map(({ label, description, placeholder, value, onChange }) => (
              <div key={label} className="space-y-2">
                <Label className="text-sm font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{description}</p>
                <Textarea
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={placeholder}
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Section 4: Client Readiness */}
        <Card>
          <CardHeader className="pb-3">
            <SectionHeader
              icon={CheckCircle2}
              title="Client Readiness Assessment"
              description="The most important single question in the feedback form."
            />
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
              <Switch
                checked={wouldUseForClient ?? false}
                onCheckedChange={setWouldUseForClient}
                className="mt-0.5"
              />
              <div>
                <Label className="text-base font-semibold cursor-pointer">
                  Would you deliver this report to a paying client today?
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Toggle on if the report, corrective action plan, and EAP are of sufficient quality to present to a real client without significant manual editing.
                </p>
                {wouldUseForClient !== undefined && (
                  <Badge className={`mt-2 ${wouldUseForClient ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                    {wouldUseForClient ? "Yes — Client Ready" : "No — Needs Improvement"}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-between pb-8">
          <p className="text-xs text-muted-foreground max-w-sm">
            All feedback is stored securely and reviewed by the Five Stones Technology development team. Your input directly improves the platform.
          </p>
          <Button
            onClick={handleSubmit}
            disabled={submitFeedback.isPending}
            size="lg"
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {submitFeedback.isPending ? "Submitting..." : "Submit Feedback"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
