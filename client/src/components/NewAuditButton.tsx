/**
 * NewAuditButton
 *
 * Reusable button that opens a modal prompting the user to choose
 * Menu A (CPTED) or Menu B (EAP Development), then creates the audit
 * and navigates to the walkthrough.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Plus, Shield, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

interface NewAuditButtonProps {
  facilityId: number;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function NewAuditButton({
  facilityId,
  variant = "default",
  size = "sm",
  className,
}: NewAuditButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [, navigate] = useLocation();
  const createAudit = trpc.audit.create.useMutation({
    onSuccess: (audit) => {
      toast.success("New audit started");
      setShowModal(false);
      navigate(`/audit/${audit?.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSelect = (selectedMenu: "a" | "b") => {
    createAudit.mutate({ facilityId, selectedMenu });
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setShowModal(true)}
        disabled={createAudit.isPending}
      >
        <Plus size={13} className="mr-1.5" />
        {createAudit.isPending ? "Starting..." : "New Audit"}
      </Button>

      {/* Menu Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Select Audit Scope</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-3">
              <p className="text-sm text-muted-foreground mb-2">
                Choose which section of the assessment to perform. The other section will be
                permanently unavailable for this audit.
              </p>

              {/* Menu A */}
              <button
                onClick={() => handleSelect("a")}
                disabled={createAudit.isPending}
                className="w-full text-left p-5 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-all disabled:opacity-60"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-blue-900 text-sm">Menu A: CPTED</h3>
                    <p className="text-xs text-blue-800 mt-0.5">
                      Crime Prevention Through Environmental Design
                    </p>
                    <p className="text-[11px] text-blue-700/70 mt-1 leading-relaxed">
                      Physical security assessment covering exterior environment, lighting,
                      access control, doors & locks, surveillance, parking areas, and
                      interior layout. Evaluates the built environment for safety weaknesses.
                    </p>
                    <p className="text-[10px] text-blue-600/50 mt-1.5 italic">
                      Excluded from EAP generation
                    </p>
                    <div className="mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 border border-blue-300 font-medium">
                        7 categories
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Menu B */}
              <button
                onClick={() => handleSelect("b")}
                disabled={createAudit.isPending}
                className="w-full text-left p-5 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-400 transition-all disabled:opacity-60"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-red-900 text-sm">Menu B: Emergency Action Plan</h3>
                    <p className="text-xs text-red-800 mt-0.5">
                      EAP Development Assessment
                    </p>
                    <p className="text-[11px] text-red-700/70 mt-1 leading-relaxed">
                      Primary data collection for AI-generated Emergency Action Plan. Covers
                      escape & evacuation, lockdown capability, communication systems,
                      staff training, incident response procedures, operational policies,
                      and vulnerable populations.
                    </p>
                    <p className="text-[10px] text-red-600/50 mt-1.5 italic">
                      Feeds into AI-generated Emergency Action Plan
                    </p>
                    <div className="mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-200 text-red-800 border border-red-300 font-medium">
                        8 categories
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-border bg-muted/20">
              <p className="text-[10px] text-muted-foreground">
                This choice is permanent and cannot be changed after the audit is created.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default NewAuditButton;