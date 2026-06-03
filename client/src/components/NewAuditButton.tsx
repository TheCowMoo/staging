/**
 * NewAuditButton
 *
 * Reusable button that creates a new audit for a given facility
 * and navigates to the audit walkthrough.
 */
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Plus } from "lucide-react";
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
  const [, navigate] = useLocation();
  const createAudit = trpc.audit.create.useMutation({
    onSuccess: (audit) => {
      toast.success("New audit started");
      navigate(`/audit/${audit?.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => createAudit.mutate({ facilityId })}
      disabled={createAudit.isPending}
    >
      <Plus size={13} className="mr-1.5" />
      {createAudit.isPending ? "Starting..." : "New Audit"}
    </Button>
  );
}

export default NewAuditButton;