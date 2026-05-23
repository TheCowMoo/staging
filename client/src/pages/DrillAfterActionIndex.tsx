/**
 * DrillAfterActionIndex — Landing page for the Drill After-Action nav link.
 * Lists completed drill sessions so the admin can pick one to debrief.
 */
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ClipboardCheck, AlertTriangle, ChevronRight, TrendingUp } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  scheduled:   "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed:   "bg-green-100 text-green-700",
  cancelled:   "bg-slate-100 text-slate-500",
};

export default function DrillAfterActionIndex() {
  const [, navigate] = useLocation();
  const sessionsQuery = trpc.drill.listSessions.useQuery({});

  const completed = sessionsQuery.data?.filter(s => s.status === "completed") ?? [];
  const inProgress = sessionsQuery.data?.filter(s => s.status === "in_progress") ?? [];
  const all = [...inProgress, ...completed];

  return (
    <AppLayout>
      <div className="container max-w-3xl py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Drill After-Action Reports</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Select a completed or in-progress drill session to open its debrief report.
            </p>
          </div>
        </div>

        {sessionsQuery.isLoading && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading sessions…
          </div>
        )}

        {!sessionsQuery.isLoading && all.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No drill sessions yet</p>
            <p className="text-sm mt-1 mb-4">Generate and run a drill first before completing an after-action report.</p>
            <Button onClick={() => navigate("/drills")}>Go to Drill Planner</Button>
          </div>
        )}

        {all.length > 0 && (
          <div className="space-y-2">
            {all.map(session => (
              <Card
                key={session.id}
                className="cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => navigate(`/drills/${session.id}/debrief`)}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">Drill Session #{session.id}</span>
                      <Badge className={`text-xs capitalize ${STATUS_COLORS[session.status] ?? ""}`}>
                        {session.status.replace("_", " ")}
                      </Badge>
                      {session.status === "completed" && (session as any).debriefData && (
                        <Badge className="text-xs bg-green-50 text-green-700 border-green-200">Debrief complete</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Scheduled: {new Date((session as any).scheduledAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      {(session as any).completedAt && (
                        <> · Completed: {new Date((session as any).completedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {session.status === "completed" ? (
                      <ClipboardCheck className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/drills")}>
            ← Back to Drill Planner
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
