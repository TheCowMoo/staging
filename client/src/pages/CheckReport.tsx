import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Search, CheckCircle2, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const STATUS_CONFIG = {
  new:          { label: "Received",     color: "bg-blue-100 text-blue-800 border-blue-200",    icon: Clock },
  under_review: { label: "Under Review", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Search },
  resolved:     { label: "Resolved",     color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  referred:     { label: "Referred",     color: "bg-purple-100 text-purple-800 border-purple-200", icon: ArrowRight },
};

export default function CheckReport() {
  const [token, setToken] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = trpc.incident.checkStatus.useQuery(
    { token },
    { enabled: submitted && token.length > 0, retry: false }
  );

  const handleCheck = () => {
    if (token.trim().length > 0) setSubmitted(true);
  };

  const StatusIcon = data ? STATUS_CONFIG[data.status as keyof typeof STATUS_CONFIG]?.icon ?? Clock : Clock;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Check Report Status</h1>
              <p className="text-xs text-slate-500">Enter your tracking token</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <Input
              placeholder="Enter your tracking token"
              value={token}
              onChange={(e) => { setToken(e.target.value); setSubmitted(false); }}
              className="font-mono text-center tracking-widest text-lg h-12"
              onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            />
            <Button onClick={handleCheck} disabled={isLoading || !token.trim()} className="w-full">
              {isLoading ? "Checking..." : "Check Status"}
            </Button>
          </div>

          {submitted && error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <AlertTriangle size={20} className="text-red-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-red-800">Report not found</p>
              <p className="text-xs text-red-600 mt-1">Please check your tracking token and try again.</p>
            </div>
          )}

          {data && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${STATUS_CONFIG[data.status as keyof typeof STATUS_CONFIG]?.color}`}>
                  <StatusIcon size={14} />
                  {STATUS_CONFIG[data.status as keyof typeof STATUS_CONFIG]?.label}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Incident Type</span>
                  <span className="font-medium text-slate-900 capitalize">{data.incidentType.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Severity</span>
                  <span className="font-medium text-slate-900 capitalize">{data.severity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Submitted</span>
                  <span className="font-medium text-slate-900">{new Date(data.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Token</span>
                  <span className="font-mono text-xs text-slate-600">{data.trackingToken}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <Link href="/report-incident" className="text-sm text-primary hover:underline">
              Submit a new report
            </Link>
            <span className="text-slate-300 mx-2">·</span>
            <Link href="/" className="text-sm text-slate-500 hover:underline">
              Return home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
