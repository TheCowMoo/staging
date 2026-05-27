/**
 * MassNotification.tsx — Admin page to send mass notifications to all users
 *
 * Requires admin/super_admin/ultra_admin role.
 * Sends email via GHL and stores in-app notifications in the database.
 */
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Send, Bell, CheckCircle2, XCircle, History } from "lucide-react";

export default function MassNotification() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "ultra_admin" || user?.role === "super_admin";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sentNotifications, setSentNotifications] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const sendMutation = trpc.massNotification.send.useMutation({
    onSuccess: (data) => {
      toast.success(`Notification sent to ${data.totalUsers} users (${data.emailsSent} emails delivered)`);
      setTitle("");
      setContent("");
      // Refresh history
      listSentQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send notification");
    },
  });

  const listSentQuery = trpc.massNotification.listSent.useQuery(undefined, {
    enabled: showHistory,
    retry: false,
  });

  const handleSend = () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    sendMutation.mutate({ title: title.trim(), content: content.trim() });
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-6 py-12 text-center">
          <Bell className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Admin Access Required</h1>
          <p className="text-muted-foreground">Only administrators can send mass notifications.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6" />
              Mass Notification
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Send an email and in-app notification to all platform users.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="w-4 h-4 mr-2" />
            {showHistory ? "Hide History" : "Sent History"}
          </Button>
        </div>

        <Separator />

        {/* Compose Card */}
        <Card>
          <CardHeader>
            <CardTitle>Compose Notification</CardTitle>
            <CardDescription>
              This will be sent as an email to all users with a registered email address,
              and stored as an in-app notification visible in their dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input
                placeholder="e.g., Emergency Drill Scheduled for Friday"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={500}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Content</label>
              <Textarea
                placeholder="Write your notification message here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                maxLength={10000}
              />
              <p className="text-xs text-muted-foreground mt-1">{content.length}/10000 characters</p>
            </div>
            <Button
              onClick={handleSend}
              disabled={sendMutation.isPending || !title.trim() || !content.trim()}
              className="w-full"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send to All Users
                </>
              )}
            </Button>

            {/* Send result */}
            {sendMutation.data && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-700 font-medium">
                  <CheckCircle2 className="w-5 h-5" />
                  Notification sent successfully
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="secondary">Total users: {sendMutation.data.totalUsers}</Badge>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Emails sent: {sendMutation.data.emailsSent}
                  </Badge>
                  {sendMutation.data.emailsFailed > 0 && (
                    <Badge variant="secondary" className="bg-red-100 text-red-700">
                      Emails failed: {sendMutation.data.emailsFailed}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {sendMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
                <XCircle className="w-5 h-5" />
                {sendMutation.error.message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sent History */}
        {showHistory && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sent Notifications</CardTitle>
              <CardDescription>Recent notifications sent to all users.</CardDescription>
            </CardHeader>
            <CardContent>
              {listSentQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : listSentQuery.data && listSentQuery.data.length > 0 ? (
                <div className="space-y-3">
                  {listSentQuery.data.map((n: any) => (
                    <div key={n.id} className="border rounded-lg p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{n.title}</h3>
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{n.content}</p>
                      {n.senderName && (
                        <p className="text-xs text-muted-foreground">Sent by: {n.senderName}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No notifications sent yet.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
