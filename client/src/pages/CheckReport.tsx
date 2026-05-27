import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Search, CheckCircle2, Clock, AlertTriangle, ArrowRight, Bell, Send, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

const STATUS_CONFIG = {
  new:          { label: "Received",     color: "bg-blue-100 text-blue-800 border-blue-200",    icon: Clock },
  under_review: { label: "Under Review", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Search },
  resolved:     { label: "Resolved",     color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  referred:     { label: "Referred",     color: "bg-purple-100 text-purple-800 border-purple-200", icon: ArrowRight },
};

export default function CheckReport() {
  const [token, setToken] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  const { data, isLoading, error } = trpc.incident.checkStatus.useQuery(
    { token },
    { enabled: submitted && token.length > 0, retry: false }
  );

  const messagesQuery = trpc.incidentCommunication.getMessagesByToken.useQuery(
    { token },
    { enabled: submitted && !!data, retry: false }
  );

  const sendMessage = trpc.incidentCommunication.sendReporterMessage.useMutation({
    onSuccess: () => {
      setNewMessage("");
      messagesQuery.refetch();
      toast.success("Message sent to the safety team");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCheck = () => {
    if (token.trim().length > 0) setSubmitted(true);
  };

  const StatusIcon = data ? STATUS_CONFIG[data.status as keyof typeof STATUS_CONFIG]?.icon ?? Clock : Clock;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-start justify-center p-4 py-8">
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
            <div className="space-y-4">
              {/* Status */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4 text-sm text-slate-600">
                  <Bell className="w-4 h-4" />
                  <span>
                    Report status updates are emailed to the contact address provided when the report was submitted.
                  </span>
                </div>
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

              {/* Communication Thread */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                  <MessageSquare size={12} /> Messages from the Safety Team
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {messagesQuery.isLoading && <p className="text-xs text-blue-500">Loading messages...</p>}
                  {messagesQuery.data?.length === 0 && (
                    <p className="text-xs text-blue-400 italic">No messages yet. The safety team will contact you here if they need more information.</p>
                  )}
                  {messagesQuery.data?.map((msg) => (
                    <div key={msg.id} className={`flex gap-2 ${msg.isFromAdmin ? "" : "flex-row-reverse"}`}>
                      <div className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${
                        msg.isFromAdmin
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-white border border-blue-200 text-blue-800 rounded-bl-sm"
                      }`}>
                        <p className="text-[11px] font-semibold mb-0.5 opacity-80">
                          {msg.senderName ?? (msg.isFromAdmin ? "Safety Team" : "You")}
                        </p>
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-[10px] mt-0.5 opacity-60">
                          {new Date(msg.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a reply..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="bg-white text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newMessage.trim()) {
                        sendMessage.mutate({ token, message: newMessage.trim() });
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!newMessage.trim()) return;
                      sendMessage.mutate({ token, message: newMessage.trim() });
                    }}
                    disabled={sendMessage.isPending || !newMessage.trim()}
                  >
                    {sendMessage.isPending ? "..." : <Send size={14} />}
                  </Button>
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
