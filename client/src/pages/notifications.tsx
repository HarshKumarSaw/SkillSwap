import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, MessageSquare, Users, Star, Info, Check, CheckCheck, ArrowLeft, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";

export default function NotificationsPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: isAuthenticated,
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
      return response.json();
    },
    onSuccess: () => {
      // Refresh the notifications data immediately
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.refetchQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Mark all notifications as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", "/api/notifications/read-all");
      return response.json();
    },
    onSuccess: () => {
      // Refresh the notifications data immediately
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.refetchQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare className="h-4 w-4" />;
      case "swap_request":
        return <Users className="h-4 w-4" />;
      case "rating":
        return <Star className="h-4 w-4" />;
      case "system":
        return <Info className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "message":
        return "bg-blue-500 dark:bg-[#0b3675]";
      case "swap_request":
        return "bg-green-500";
      case "rating":
        return "bg-yellow-500";
      case "system":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    // Optimistic update - immediately mark as read in UI
    queryClient.setQueryData<Notification[]>(["/api/notifications"], (oldData = []) => {
      return oldData.map(notif => 
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      );
    });
    
    markAsReadMutation.mutate(notificationId);
  };

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    // Mark as read when clicked
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown date";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return "Invalid date";
    }
  };

  const unreadCount = notifications.filter((n: Notification) => !n.isRead).length || 0;

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-lg sm:text-xl">Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <p>Please log in to view your notifications.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="p-2 flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl flex-1 min-w-0">
              <Bell className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs flex-shrink-0">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
          </div>
          {unreadCount > 0 && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Optimistic update - immediately mark all as read in UI
                  queryClient.setQueryData<Notification[]>(["/api/notifications"], (oldData = []) => {
                    return oldData.map(notif => ({ ...notif, isRead: true }));
                  });
                  markAllAsReadMutation.mutate();
                }}
                disabled={markAllAsReadMutation.isPending}
                className="flex items-center gap-2 text-xs sm:text-sm"
              >
                <CheckCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Mark all as read</span>
                <span className="sm:hidden">Mark all</span>
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <ScrollArea className="h-[calc(100vh-280px)] sm:h-[600px]">
            {isLoading ? (
              <div className="space-y-3 sm:space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-start space-x-3 p-3 sm:p-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0"></div>
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        <div className="h-2 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 sm:py-12 px-4">
                <Bell className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-sm sm:text-base">No notifications yet</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                  You'll receive notifications when users send you messages, swap requests, and more.
                </p>
              </div>
            ) : (
              <div className="space-y-1 sm:space-y-2">
                {notifications.map((notification: Notification, index: number) => (
                  <div key={notification.id}>
                    <div
                      className={`flex items-start space-x-3 p-3 sm:p-4 rounded-lg transition-colors cursor-pointer ${
                        !notification.isRead
                          ? "bg-muted/50 border-l-4 border-primary"
                          : "hover:bg-muted/30"
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div
                        className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-white flex-shrink-0 ${getNotificationColor(
                          notification.type
                        )}`}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm sm:text-base overflow-hidden text-ellipsis">{notification.title}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1 overflow-hidden line-clamp-2">
                              {notification.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDate(notification.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationClick(notification);
                              }}
                              className="text-xs p-1 sm:p-2"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                                disabled={markAsReadMutation.isPending}
                                className="text-xs p-1 sm:p-2"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < notifications.length - 1 && <Separator className="my-1 sm:my-2" />}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Notification Detail Modal */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-white flex-shrink-0 ${getNotificationColor(
                  selectedNotification?.type || ''
                )}`}
              >
                {getNotificationIcon(selectedNotification?.type || '')}
              </div>
              {selectedNotification?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="capitalize">{selectedNotification?.type.replace('_', ' ')}</span>
              <span>•</span>
              <span>{formatDate(selectedNotification?.createdAt || null)}</span>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap leading-relaxed">
                {selectedNotification?.content}
              </p>
            </div>
            {selectedNotification && !selectedNotification.isRead && (
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={() => {
                    handleMarkAsRead(selectedNotification.id);
                    setSelectedNotification(null);
                  }}
                  size="sm"
                  disabled={markAsReadMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark as Read
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}