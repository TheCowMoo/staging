import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function JoinOrg() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "accepting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    setToken(t);
  }, []);

  const acceptMutation = trpc.org.acceptInvite.useMutation({
    onSuccess: (data) => {
      setStatus("success");
      setTimeout(() => navigate(`/org/${data.orgId}`), 2000);
    },
    onError: (err) => {
      setStatus("error");
      setErrorMsg(err.message);
    },
  });

  const handleAccept = () => {
    if (!token) return;
    setStatus("accepting");
    acceptMutation.mutate({ token });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Building2 className="h-10 w-10 text-primary mx-auto mb-2" />
            <CardTitle>You have been invited</CardTitle>
            <CardDescription>
              Please sign in to accept your invitation and join the organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => {
                // Store the token in sessionStorage so we can auto-accept after login
              sessionStorage.setItem("pendingInviteToken", token ?? "");
              window.location.href = getLoginUrl();
              }}
            >
              Sign in to Accept Invite
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <CardTitle>Welcome to the organization!</CardTitle>
            <CardDescription>You have successfully joined. Redirecting you now…</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" />
            <CardTitle>Invite Error</CardTitle>
            <CardDescription>{errorMsg || "This invite link is invalid or has expired."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Building2 className="h-10 w-10 text-primary mx-auto mb-2" />
          <CardTitle>Accept Organization Invite</CardTitle>
          <CardDescription>
            You have been invited to join an organization on SafeGuard. Click below to accept.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!token ? (
            <p className="text-sm text-destructive text-center">No invite token found in the URL.</p>
          ) : (
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={status === "accepting"}
            >
              {status === "accepting" ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Accepting…</>
              ) : (
                "Accept Invite"
              )}
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
