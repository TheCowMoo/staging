import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Blocks sandbox / demo users from restricted routes (Training module,
 * RAS activation, etc.). Renders a friendly notice instead of the content.
 */
export default function SandboxBlocked({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role === "sandbox") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <h2 className="text-lg font-semibold">Not available in the Sandbox</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          This feature is disabled in the sandbox environment. Full access requires standard setup.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
