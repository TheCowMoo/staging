import { useMemo } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, CheckCheck, ArrowLeft, Shield, MessageSquare, AlertTriangle, UserCheck, Flag, History } from "lucide-react";
import { toast } from "sonner";

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  new_incident:     { icon: <AlertTriangle size={16} className="text-red-500" />, label: "New Incident" },
  incident_message: { icon: <MessageSquare size={16} className="text-blue-500" />, label: "Incident Message" },
  staff_checkin:    { icon: <UserCheck size={16} className="text-green-500" />, label: "Staff Check-In" },
  flagged_visitor:  { icon: <Flag size={16} className="text-orange-500" />, label: "Flagged Visitor" },
  ras_alert:        { icon: <Shield size={16} className="text-purple-500" />, label: "RAS Alert" },
};

export default function NotificationsPage() {
  const [, navigate] = useLocation();

  const { data: notifications = [], refetch } = trpc.notification.list.useQuery({ limit: 100 });
  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      toast.success("All notifications marked as read");
      refetch();
    },
  });
  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => refetch(),
  });

  const sorted = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notifications]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
                {unreadCount > 0 && (
                  <Badge className="bg-red-100 text-red-800 border-red-200">{unreadCount} unread</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                System alerts, incident updates, staff check-ins, and more.
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="gap-1.5"
            >
              <CheckCheck size={14} />
              Mark All Read
            </Button>
          )}
        </div>

        {/* List */}
        {sorted.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={40} className="mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Notifications will appear here when events happen — new incident reports, staff check-ins, alerts, and more.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((notif) => {
              const config = TYPE_CONFIG[notif.type] ?? { icon: <Bell size={16} className="text-muted-foreground" />, label: notif.type };

              return (
                <Card
                  key={notif.id}
                  className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                    !notif.read ? "border-l-4 border-l-primary bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    if (!notif.read) markRead.mutate({ notificationId: notif.id });
                    if (notif.link) navigate(notif.link);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{config.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{config.label}</span>
                          {!notif.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                        </div>
                        <p className="text-sm font-medium text-foreground">{notif.title}</p>
                        {notif.body && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                        )}
                        <p className="text-xs text-muted-foreground/60 mt-1 flex items-center gap-1">
                          <History size={10} />
                          {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}