/**
 * DuplicateAuditButton
 *
 * Creates a new audit for the same facility, copying all responses
 * from the source audit. Useful for creating a new EAP based on an
 * existing audit's responses.
 */
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface DuplicateAuditButtonProps {
  auditId: number;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function DuplicateAuditButton({
  auditId,
  variant = "outline",
  size = "sm",
  className,
}: DuplicateAuditButtonProps) {
  const [, navigate] = useLocation();
  const duplicateAudit = trpc.audit.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success("Audit duplicated — all responses copied");
      navigate(`/audit/${data.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => duplicateAudit.mutate({ auditId })}
      disabled={duplicateAudit.isPending}
    >
      <Copy size={13} className="mr-1.5" />
      {duplicateAudit.isPending ? "Duplicating..." : "Duplicate Audit"}
    </Button>
  );
}

export default DuplicateAuditButton;