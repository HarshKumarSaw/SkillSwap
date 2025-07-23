import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import type { Notification } from "@shared/schema";

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch notifications to get unread count
  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: isAuthenticated,
    refetchInterval: 60000, // Reduced to 1 minute to prevent conflicts
    staleTime: 30000, // 30 seconds stale time
  });

  // Handle both boolean and string representations of isRead from PostgreSQL
  const unreadCount = notifications?.filter((n: Notification) => {
    const isRead = typeof n.isRead === 'string' ? n.isRead === 'true' || n.isRead === 't' : n.isRead;
    return !isRead;
  }).length || 0;

  // Don't render for unauthenticated users
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative p-2"
      onClick={() => setLocation("/notifications")}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 hover:bg-red-600 min-w-[1.25rem]"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
}