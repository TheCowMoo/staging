import { ProtectedLayout } from "@/components/ProtectedLayout";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Building2, Plus, MapPin, Clock, ChevronRight } from "lucide-react";
import { FACILITY_TYPES } from "../../../shared/auditFramework";

export default function Facilities() {
  const { data: facilities, isLoading } = trpc.facility.list.useQuery();

  const getFacilityLabel = (type: string) =>
    FACILITY_TYPES.find((f) => f.value === type)?.label ?? type;

  return (
    <ProtectedLayout>

        <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Facilities</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your facility profiles and assessments</p>
          </div>
          <Button asChild className="mt-4">
            <Link href="/facilities/new" className="flex items-center gap-2"><Plus size={16} /> New Facility</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 h-24 animate-pulse" />
            ))}
          </div>
        ) : !facilities?.length ? (
          <div className="text-center py-20 bg-card border border-border rounded-xl">
            <Building2 size={48} className="mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No facilities yet</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Create your first facility profile to begin a workplace violence threat assessment.
            </p>
            <Button asChild>
              <Link href="/facilities/new" className="flex items-center gap-2"><Plus size={16} /> Create First Facility</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {facilities.map((facility) => (
              <Link key={facility.id} href={`/facilities/${facility.id}`} className="flex items-center justify-between p-5 bg-card border border-border rounded-xl hover:shadow-md transition-all hover:border-primary/30 group">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 size={20} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{facility.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{getFacilityLabel(facility.facilityType)}</span>
                        {facility.city && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin size={10} /> {facility.city}{facility.state ? `, ${facility.state}` : ""}
                          </span>
                        )}
                        {facility.operatingHours && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock size={10} /> {facility.operatingHours}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        )}
        </div>

    </ProtectedLayout>
  );
}
