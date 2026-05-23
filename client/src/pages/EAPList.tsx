import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight, Building2, Calendar, Loader2, FileText } from "lucide-react";

export default function EAPList() {
  const { data: audits, isLoading } = trpc.audit.listMine.useQuery();

  const completedAudits = (audits ?? []).filter((a: any) => a.status === "completed");
  const inProgressAudits = (audits ?? []).filter((a: any) => a.status === "in_progress");

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 to-slate-900 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={18} className="text-red-300" />
            <span className="text-xs font-semibold text-red-300 uppercase tracking-wider">Emergency Action Plans</span>
          </div>
          <h1 className="text-xl font-bold mb-1">Emergency Action Response Plans</h1>
          <p className="text-sm text-white/70">17-Section ACTD Framework · Facility-Specific Plans</p>
          <p className="text-xs text-white/50 mt-2">Select an audit below to open or create its Emergency Action Plan. Plans are generated from your audit findings and can be fully edited per section.</p>
        </div>

        {/* ACTD quick reference */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { letter: "A", label: "Assess", color: "bg-blue-50 border-blue-200 text-blue-900" },
            { letter: "C", label: "Commit", color: "bg-yellow-50 border-yellow-200 text-yellow-900" },
            { letter: "T", label: "Take Action", color: "bg-orange-50 border-orange-200 text-orange-900" },
            { letter: "D", label: "Debrief", color: "bg-green-50 border-green-200 text-green-900" },
          ].map(({ letter, label, color }) => (
            <div key={letter} className={`rounded-lg border p-2.5 text-center ${color}`}>
              <div className="text-xl font-black">{letter}</div>
              <div className="text-[10px] font-semibold">{label}</div>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-muted-foreground animate-spin" />
          </div>
        ) : (
          <>
            {completedAudits.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  Completed Audits
                </h2>
                <div className="space-y-2">
                  {completedAudits.map((audit: any) => (
                    <AuditEAPCard key={audit.id} audit={audit} />
                  ))}
                </div>
              </div>
            )}

            {inProgressAudits.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  In-Progress Audits
                </h2>
                <div className="space-y-2">
                  {inProgressAudits.map((audit: any) => (
                    <AuditEAPCard key={audit.id} audit={audit} />
                  ))}
                </div>
              </div>
            )}

            {(audits?.length ?? 0) === 0 && (
              <div className="text-center py-16">
                <FileText size={32} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No audits yet</p>
                <p className="text-xs text-muted-foreground mt-1">Complete an audit to generate an Emergency Action Plan.</p>
                <Link href="/facilities">
                  <Button size="sm" className="mt-4">Go to Facilities</Button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

function AuditEAPCard({ audit }: { audit: any }) {
  const { data: facility } = trpc.facility.get.useQuery({ id: audit.facilityId });
  const { data: eapSections } = trpc.eap.getSections.useQuery({ auditId: audit.id });

  const reviewedCount = eapSections?.filter((s) => s.reviewed).length ?? 0;
  const totalSections = 17;

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/40 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Building2 size={18} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{facility?.name ?? `Facility #${audit.facilityId}`}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar size={9} /> {new Date(audit.auditDate).toLocaleDateString()}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            audit.status === "completed"
              ? "bg-green-100 text-green-800"
              : "bg-amber-100 text-amber-800"
          }`}>{audit.status === "completed" ? "Completed" : "In Progress"}</span>
          {reviewedCount > 0 && (
            <span className="text-[10px] text-muted-foreground">{reviewedCount}/{totalSections} sections reviewed</span>
          )}
        </div>
        {reviewedCount > 0 && (
          <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden w-32">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${(reviewedCount / totalSections) * 100}%` }}
            />
          </div>
        )}
      </div>
      <Link href={`/audit/${audit.id}/eap`}>
        <Button size="sm" variant="outline" className="flex items-center gap-1.5 flex-shrink-0 text-xs">
          <Shield size={12} /> {reviewedCount > 0 ? "Continue EAP" : "Open EAP"} <ArrowRight size={11} />
        </Button>
      </Link>
    </div>
  );
}
