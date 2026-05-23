import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { TermsAndConditionsModal } from "./TermsAndConditionsModal";
import { toast } from "sonner";

type ProtectedLayoutProps = {
  children: React.ReactNode;
};

/**
 * ProtectedLayout wraps authenticated pages and ensures users have accepted the Terms and Conditions.
 * Shows a modal requiring terms acceptance before allowing access to the platform.
 */
export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const utils = trpc.useUtils();

  const acceptTermsMutation = trpc.auth.acceptTerms.useMutation({
    onSuccess: () => {
      setAcceptingTerms(false);
      setShowTermsModal(false);
      // Invalidate the user query to refresh the user data
      utils.auth.me.invalidate();
      toast.success("Terms accepted! Welcome to the platform.");
    },
    onError: () => {
      setAcceptingTerms(false);
      toast.error("Failed to accept terms. Please try again.");
    },
  });

  // Check if user needs to accept terms
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !user.termsAcceptedAt) {
      setShowTermsModal(true);
    } else if (!authLoading && isAuthenticated && user && user.termsAcceptedAt) {
      setShowTermsModal(false);
    }
  }, [authLoading, isAuthenticated, user]);

  const handleAcceptTerms = async () => {
    setAcceptingTerms(true);
    try {
      await acceptTermsMutation.mutateAsync();
    } catch (error) {
      console.error("Error accepting terms:", error);
    }
  };

  const handleDeclineTerms = () => {
    // Close without accepting - they can't proceed without accepting
    // The modal will reappear on next page load
    setShowTermsModal(false);
  };

  // Show loading state or prevent access until terms are accepted
  if (authLoading || (isAuthenticated && !user?.termsAcceptedAt && user !== null)) {
    return (
      <>
        <TermsAndConditionsModal
          open={showTermsModal && !authLoading}
          onAccept={handleAcceptTerms}
          onClose={handleDeclineTerms}
          isLoading={acceptingTerms}
        />
        {authLoading && (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}
        {!authLoading && showTermsModal && (
          <div className="min-h-screen flex items-center justify-center bg-gray-50/50" />
        )}
      </>
    );
  }

  // User has accepted terms or is not authenticated, show the page
  return children;
}
