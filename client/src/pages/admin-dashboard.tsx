import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, MessageSquare, Shield, TrendingUp, Ban, UserCheck, Plus, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isBanned: boolean;
  banReason?: string;
  createdAt: string;
}

interface AdminAction {
  id: string;
  action: string;
  targetId: string;
  targetType: string;
  reason?: string;
  createdAt: string;
  admin: {
    name: string;
    email: string;
  };
}

interface SystemMessage {
  id: string;
  title: string;
  message: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
}

interface Report {
  id: string;
  contentType: string;
  contentId: string;
  reason: string;
  description?: string;
  status: string;
  createdAt: string;
  reporter: {
    name: string;
    email: string;
  };
  reviewer?: {
    name: string;
    email: string;
  };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState("");
  const [newMessage, setNewMessage] = useState({ title: "", message: "", type: "announcement" });

  // Fetch admin data - Always call hooks first
  const { data: users } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest("GET", "/api/admin/users").then(res => res.json()),
    enabled: !!(user && user.role === 'admin'),
  });

  const { data: swapRequests } = useQuery({
    queryKey: ['/api/admin/swap-requests'],
    queryFn: () => apiRequest("GET", "/api/admin/swap-requests").then(res => res.json()),
    enabled: !!(user && user.role === 'admin'),
  });

  const { data: adminActions } = useQuery({
    queryKey: ['/api/admin/actions'],
    queryFn: () => apiRequest("GET", "/api/admin/actions").then(res => res.json()),
    enabled: !!(user && user.role === 'admin'),
  });

  const { data: reports } = useQuery({
    queryKey: ['/api/admin/reports'],
    queryFn: () => apiRequest("GET", "/api/admin/reports").then(res => res.json()),
    enabled: !!(user && user.role === 'admin'),
  });

  const { data: systemMessages } = useQuery({
    queryKey: ['/api/system-messages'],
    queryFn: () => apiRequest("GET", "/api/system-messages").then(res => res.json()),
    enabled: !!(user && user.role === 'admin'),
  });

  // Download functions
  const downloadReport = async (reportType: string, filename: string) => {
    try {
      const response = await fetch(`/api/admin/download/${reportType}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to download report');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "Report downloaded successfully" });
    } catch (error) {
      toast({ title: "Failed to download report", variant: "destructive" });
    }
  };

  // Mutations - Call all hooks before conditional returns
  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/actions'] });
      toast({ title: "User account deleted successfully" });
      setSelectedUser(null);
      setBanReason("");
    },
    onError: () => {
      toast({ title: "Failed to delete user account", variant: "destructive" });
    },
  });

  const createSystemMessageMutation = useMutation({
    mutationFn: async (message: typeof newMessage) => {
      const response = await apiRequest("POST", "/api/admin/system-messages", message);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-messages'] });
      toast({ title: "System message created successfully" });
      setNewMessage({ title: "", message: "", type: "announcement" });
    },
    onError: () => {
      toast({ title: "Failed to create system message", variant: "destructive" });
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/reports/${reportId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reports'] });
      toast({ title: "Report updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update report", variant: "destructive" });
    },
  });

  // Check if user is admin - After all hooks are called
  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need admin privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage users, content, and platform settings</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Users</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{users?.totalCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Swap Requests</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{swapRequests?.totalCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending Reports</CardTitle>
            <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">
              {reports?.data?.filter((r: Report) => r.status === 'pending').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">System Messages</CardTitle>
            <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{systemMessages?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-2 h-auto p-1">
          <TabsTrigger value="users" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Users</TabsTrigger>
          <TabsTrigger value="swap-requests" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Requests</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Reports</TabsTrigger>
          <TabsTrigger value="downloads" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Downloads</TabsTrigger>
          <TabsTrigger value="messages" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Messages</TabsTrigger>
          <TabsTrigger value="actions" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
              <CardTitle className="text-lg sm:text-xl">User Management</CardTitle>
              <CardDescription className="text-sm">Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="space-y-3 sm:space-y-4">
                {users?.data?.map((user: User) => (
                  <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg space-y-3 sm:space-y-0">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm sm:text-base">{user.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground break-all">{user.email}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                          {user.role}
                        </Badge>
                        {user.isBanned && (
                          <Badge variant="destructive" className="text-xs">Banned</Badge>
                        )}
                      </div>
                      {user.banReason && (
                        <p className="text-xs text-muted-foreground mt-1">Reason: {user.banReason}</p>
                      )}
                    </div>
                    <div className="flex gap-2 sm:ml-4 justify-end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setSelectedUser(user)}
                            className="text-xs sm:text-sm px-2 sm:px-3"
                          >
                            <Ban className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[95%] sm:w-full max-w-md mx-auto">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-lg">Remove User Account</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                              Are you sure you want to permanently delete {selectedUser?.name}'s account? This action cannot be undone and will remove all their data including profile, skills, swap requests, and messages.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="py-4">
                            <Label htmlFor="removal-reason" className="text-sm">Reason for removal</Label>
                            <Textarea
                              id="removal-reason"
                              value={banReason}
                              onChange={(e) => setBanReason(e.target.value)}
                              placeholder="Enter reason for removing this user account..."
                              className="mt-2 text-sm"
                            />
                          </div>
                          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                            <AlertDialogCancel onClick={() => {
                              setSelectedUser(null);
                              setBanReason("");
                            }} className="w-full sm:w-auto text-sm">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                if (selectedUser && banReason.trim()) {
                                  deleteUserMutation.mutate({ userId: selectedUser.id, reason: banReason });
                                }
                              }}
                              disabled={!banReason.trim() || deleteUserMutation.isPending}
                              className="w-full sm:w-auto text-sm bg-red-600 hover:bg-red-700"
                            >
                              Remove User
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="swap-requests">
          <Card>
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
              <CardTitle className="text-lg sm:text-xl">Swap Requests</CardTitle>
              <CardDescription className="text-sm">Monitor all skill swap requests on the platform</CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="space-y-3 sm:space-y-4">
                {swapRequests?.data?.map((request: any) => (
                  <div key={request.id} className="p-3 sm:p-4 border rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          request.status === 'completed' ? 'default' :
                          request.status === 'accepted' ? 'secondary' :
                          request.status === 'rejected' ? 'destructive' : 'outline'
                        } className="text-xs">
                          {request.status}
                        </Badge>
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm sm:text-base">
                        {request.requester.name} → {request.target.name}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">
                        Skills: {request.senderSkill} ↔ {request.receiverSkill}
                      </p>
                      {request.message && (
                        <p className="text-xs sm:text-sm break-words">{request.message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
              <CardTitle className="text-lg sm:text-xl">Content Reports</CardTitle>
              <CardDescription className="text-sm">Review and moderate reported content</CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="space-y-3 sm:space-y-4">
                {reports?.data?.map((report: Report) => (
                  <div key={report.id} className="p-3 sm:p-4 border rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                      <Badge variant={
                        report.status === 'resolved' ? 'default' :
                        report.status === 'reviewed' ? 'secondary' :
                        report.status === 'dismissed' ? 'outline' : 'destructive'
                      } className="text-xs self-start">
                        {report.status}
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium text-sm sm:text-base">
                        {report.contentType} reported by {report.reporter.name}
                      </p>
                      <p className="text-xs sm:text-sm break-words">Reason: {report.reason}</p>
                      {report.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground break-words">{report.description}</p>
                      )}
                      {report.status === 'pending' && (
                        <div className="flex flex-col sm:flex-row gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => updateReportMutation.mutate({ reportId: report.id, status: 'resolved' })}
                            disabled={updateReportMutation.isPending}
                            className="w-full sm:w-auto text-xs sm:text-sm"
                          >
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateReportMutation.mutate({ reportId: report.id, status: 'dismissed' })}
                            disabled={updateReportMutation.isPending}
                            className="w-full sm:w-auto text-xs sm:text-sm"
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="downloads">
          <Card>
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
              <CardTitle className="text-lg sm:text-xl">Download Reports</CardTitle>
              <CardDescription className="text-sm">Download comprehensive reports of platform activity and analytics</CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
                <Card>
                  <CardHeader className="px-3 sm:px-4 py-3 sm:py-4">
                    <CardTitle className="text-sm sm:text-lg">User Activity Report</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Complete user statistics including signup dates, swap activity, ratings, and account status.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                    <Button 
                      onClick={() => downloadReport('user-activity', `user-activity-${new Date().toISOString().split('T')[0]}.csv`)}
                      className="w-full text-xs sm:text-sm"
                      size="sm"
                    >
                      <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      Download CSV
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="px-3 sm:px-4 py-3 sm:py-4">
                    <CardTitle className="text-sm sm:text-lg">Feedback Logs</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      All user ratings and feedback from completed skill swaps with detailed information.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                    <Button 
                      onClick={() => downloadReport('feedback-logs', `feedback-logs-${new Date().toISOString().split('T')[0]}.csv`)}
                      className="w-full text-xs sm:text-sm"
                      size="sm"
                    >
                      <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      Download CSV
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="px-3 sm:px-4 py-3 sm:py-4">
                    <CardTitle className="text-sm sm:text-lg">Swap Statistics</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Platform-wide analytics including popular skills, completion rates, and monthly trends.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                    <Button 
                      onClick={() => downloadReport('swap-stats', `swap-stats-${new Date().toISOString().split('T')[0]}.csv`)}
                      className="w-full text-xs sm:text-sm"
                      size="sm"
                    >
                      <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      Download CSV
                    </Button>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2 text-sm sm:text-base">Report Information</h4>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                  <li>• All reports are generated in CSV format for easy analysis</li>
                  <li>• Data includes current timestamp and is filtered for relevant information</li>
                  <li>• User Activity: Includes registration dates, activity metrics, and account status</li>
                  <li>• Feedback Logs: Contains all ratings and reviews from completed swaps</li>
                  <li>• Swap Statistics: Provides insights into platform usage and trending skills</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
              <CardTitle className="text-lg sm:text-xl">System Messages</CardTitle>
              <CardDescription className="text-sm">Create and manage platform-wide announcements</CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="space-y-4 sm:space-y-6">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto text-xs sm:text-sm">
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      Create Message
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95%] sm:w-full max-w-md mx-auto">
                    <DialogHeader>
                      <DialogTitle className="text-lg">Create System Message</DialogTitle>
                      <DialogDescription className="text-sm">
                        Create a new announcement or notification for all users
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title" className="text-sm">Title</Label>
                        <Input
                          id="title"
                          value={newMessage.title}
                          onChange={(e) => setNewMessage({ ...newMessage, title: e.target.value })}
                          placeholder="Message title..."
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="message" className="text-sm">Message</Label>
                        <Textarea
                          id="message"
                          value={newMessage.message}
                          onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                          placeholder="Message content..."
                          rows={4}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="type" className="text-sm">Type</Label>
                        <Select value={newMessage.type} onValueChange={(value) => setNewMessage({ ...newMessage, type: value })}>
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="announcement">Announcement</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="update">Update</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                      <Button
                        onClick={() => createSystemMessageMutation.mutate(newMessage)}
                        disabled={!newMessage.title.trim() || !newMessage.message.trim() || createSystemMessageMutation.isPending}
                        className="w-full sm:w-auto text-sm"
                      >
                        Create Message
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="space-y-3 sm:space-y-4">
                  {systemMessages?.map((message: SystemMessage) => (
                    <div key={message.id} className="p-3 sm:p-4 border rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={message.isActive ? 'default' : 'secondary'} className="text-xs">
                            {message.type}
                          </Badge>
                          {!message.isActive && (
                            <Badge variant="outline" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-medium mb-1 text-sm sm:text-base">{message.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">{message.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
              <CardTitle className="text-lg sm:text-xl">Admin Actions Log</CardTitle>
              <CardDescription className="text-sm">View all administrative actions taken on the platform</CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="space-y-3 sm:space-y-4">
                {adminActions?.data?.map((action: AdminAction) => (
                  <div key={action.id} className="p-3 sm:p-4 border rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                      <Badge className="text-xs self-start">{action.action.replace('_', ' ')}</Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {new Date(action.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm sm:text-base">Admin: {action.admin.name}</p>
                      <p className="text-xs sm:text-sm break-words">Target: {action.targetType} ({action.targetId})</p>
                      {action.reason && (
                        <p className="text-xs sm:text-sm text-muted-foreground break-words">Reason: {action.reason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}