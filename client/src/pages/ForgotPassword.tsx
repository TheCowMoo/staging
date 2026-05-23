import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-[#1a1a19] rounded-2xl flex items-center justify-center mb-4">
            <Shield className="text-white w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a19] tracking-tight">Liability Defense System</h1>
          <p className="text-sm text-gray-500 mt-1">Workplace Safety Assessment Platform</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>
              {sent
                ? "Check your inbox for a password reset link."
                : "Enter your email address and we'll send you a link to reset your password."}
            </CardDescription>
          </CardHeader>

          {sent ? (
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center py-6 space-y-3 text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm text-gray-600">
                  If an account exists for <strong>{email}</strong>, a password reset link has been sent. Please check your inbox and spam folder.
                </p>
                <p className="text-xs text-gray-400">The link expires in 1 hour.</p>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="forgot-email">Email Address</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending…" : "Send Reset Link"}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>

        <button
          onClick={() => setLocation("/login")}
          className="mt-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </button>
      </div>
    </div>
  );
}
