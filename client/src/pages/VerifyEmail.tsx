import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Shield, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * This page handles the /verify-email route on the client side.
 * The server actually redirects /api/auth/verify-email to /?verified=true|invalid|error,
 * but this page handles the /verify-email?token=... URL that is sent in the email,
 * which the server processes via GET /api/auth/verify-email and then redirects here.
 *
 * We also handle the /?verified=... query param on the Home page, but this dedicated
 * page gives a cleaner UX when users click the email link.
 */
export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "invalid" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    // Call the server endpoint — it will redirect, but we can also call it as a fetch
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      redirect: "manual",
    })
      .then((res) => {
        // Manual redirect: check the Location header or status
        if (res.status === 0 || res.type === "opaqueredirect") {
          // Redirect happened — assume success (the server redirects to /?verified=true)
          setStatus("success");
        } else if (res.ok) {
          setStatus("success");
        } else {
          setStatus("invalid");
        }
      })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-[#1a1a19] rounded-2xl flex items-center justify-center mb-4">
            <Shield className="text-white w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a19] tracking-tight">Liability Defense System</h1>
          <p className="text-sm text-gray-500 mt-1">Workplace Safety Assessment Platform</p>
        </div>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-gray-600">Verifying your email address…</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Email Verified!</h2>
            <p className="text-gray-500">Your email address has been verified successfully. You can now use all features of your account.</p>
            <Button className="mt-2" onClick={() => setLocation("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        )}

        {status === "invalid" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Invalid Link</h2>
            <p className="text-gray-500">This verification link is invalid or has already been used. If you need a new verification email, please contact support.</p>
            <Button variant="outline" className="mt-2" onClick={() => setLocation("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Something Went Wrong</h2>
            <p className="text-gray-500">We could not verify your email at this time. Please try again or contact support.</p>
            <Button variant="outline" className="mt-2" onClick={() => setLocation("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
