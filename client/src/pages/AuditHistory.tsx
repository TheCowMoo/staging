import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ClipboardList, CheckCircle2, AlertCircle, Building2, ArrowRight } from "lucide-react";
import { getRiskBadgeClass } from "@/lib/riskUtils";

export default function AuditHistory() {
  const { data: audits, isLoading } = trpc.audit.listMine.useQuery();
  const { data: facilities } = trpc.facility.list.useQuery();

  const getFacilityName = (id: number) =>
    facilities?.find((f) => f.id === id)?.name ?? `Facility #${id}`;

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Audit History</h1>
          <p className="text-sm text-muted-foreground mt-1">All assessments across your facilities</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 h-20 animate-pulse" />
            ))}
          </div>
        ) : !audits?.length ? (
          <div className="text-center py-20 bg-card border border-border rounded-xl">
            <ClipboardList size={48} className="mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No audits yet</h2>
            <p className="text-sm text-muted-foreground mb-6">Start by selecting a facility and creating a new assessment.</p>
            <Button asChild>
              <Link href="/facilities" className="flex items-center gap-2"><Building2 size={15} /> Go to Facilities</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {audits.map((audit) => (
              <Link
                key={audit.id}
                href={audit.status === "completed" ? `/audit/${audit.id}/report` : `/audit/${audit.id}`}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:shadow-sm hover:border-primary/30 transition-all group"
              >
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${audit.status === "completed" ? "bg-green-100" : "bg-amber-100"}`}>
                      {audit.status === "completed" ? (
                        <CheckCircle2 size={16} className="text-green-600" />
                      ) : (
                        <AlertCircle size={16} className="text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {getFacilityName(audit.facilityId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(audit.auditDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        {" · "}
                        <span className="capitalize">{audit.status.replace("_", " ")}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {audit.overallRiskLevel && (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getRiskBadgeClass(audit.overallRiskLevel)}`}>
                        {audit.overallRiskLevel} · {audit.overallScore?.toFixed(0)}%
                      </span>
                    )}
                    <ArrowRight size={15} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
