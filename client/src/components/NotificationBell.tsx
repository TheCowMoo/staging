import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [, navigate] = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount = 0, refetch: refetchCount } = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 15000,
  });

  const { data: notifications = [] } = trpc.notification.list.useQuery({ limit: 5 });

  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => refetchCount(),
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const handleClick = (notif: typeof notifications[0]) => {
    if (!notif.read) {
      markRead.mutate({ notificationId: notif.id });
    }
    setDropdownOpen(false);
    if (notif.link) navigate(notif.link);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="relative inline-flex items-center justify-center rounded-lg border border-border bg-card p-2 text-foreground shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => { setDropdownOpen(false); navigate("/notifications"); }}
            >
              View All
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors",
                    !notif.read && "bg-primary/5"
                  )}
                >
                  <p className="text-sm font-medium text-foreground truncate">{notif.title}</p>
                  {notif.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}