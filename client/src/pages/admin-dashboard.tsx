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
  const banUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/ban`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/actions'] });
      toast({ title: "User banned successfully" });
      setSelectedUser(null);
      setBanReason("");
    },
    onError: () => {
      toast({ title: "Failed to ban user", variant: "destructive" });
    },
  });

  const unbanUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/unban`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/actions'] });
      toast({ title: "User unbanned successfully" });
    },
    onError: () => {
      toast({ title: "Failed to unban user", variant: "destructive" });
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users, content, and platform settings</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.totalCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Swap Requests</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{swapRequests?.totalCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports?.data?.filter((r: Report) => r.status === 'pending').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMessages?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="swap-requests">Swap Requests</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="downloads">Downloads</TabsTrigger>
          <TabsTrigger value="messages">System Messages</TabsTrigger>
          <TabsTrigger value="actions">Admin Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users?.data?.map((user: User) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                        {user.isBanned && (
                          <Badge variant="destructive">Banned</Badge>
                        )}
                      </div>
                      {user.banReason && (
                        <p className="text-xs text-muted-foreground mt-1">Reason: {user.banReason}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {user.isBanned ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unbanUserMutation.mutate(user.id)}
                          disabled={unbanUserMutation.isPending}
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Unban
                        </Button>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Ban className="w-4 h-4 mr-1" />
                              Ban
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Ban User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to ban {selectedUser?.name}? This action will prevent them from accessing the platform.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                              <Label htmlFor="ban-reason">Reason for ban</Label>
                              <Textarea
                                id="ban-reason"
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                placeholder="Enter reason for banning this user..."
                                className="mt-2"
                              />
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => {
                                setSelectedUser(null);
                                setBanReason("");
                              }}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  if (selectedUser && banReason.trim()) {
                                    banUserMutation.mutate({ userId: selectedUser.id, reason: banReason });
                                  }
                                }}
                                disabled={!banReason.trim() || banUserMutation.isPending}
                              >
                                Ban User
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="swap-requests">
          <Card>
            <CardHeader>
              <CardTitle>Swap Requests</CardTitle>
              <CardDescription>Monitor all skill swap requests on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {swapRequests?.data?.map((request: any) => (
                  <div key={request.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          request.status === 'completed' ? 'default' :
                          request.status === 'accepted' ? 'secondary' :
                          request.status === 'rejected' ? 'destructive' : 'outline'
                        }>
                          {request.status}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">
                        {request.requester.name} → {request.target.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Skills: {request.senderSkill} ↔ {request.receiverSkill}
                      </p>
                      {request.message && (
                        <p className="text-sm">{request.message}</p>
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
            <CardHeader>
              <CardTitle>Content Reports</CardTitle>
              <CardDescription>Review and moderate reported content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports?.data?.map((report: Report) => (
                  <div key={report.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={
                        report.status === 'resolved' ? 'default' :
                        report.status === 'reviewed' ? 'secondary' :
                        report.status === 'dismissed' ? 'outline' : 'destructive'
                      }>
                        {report.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">
                        {report.contentType} reported by {report.reporter.name}
                      </p>
                      <p className="text-sm">Reason: {report.reason}</p>
                      {report.description && (
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                      )}
                      {report.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => updateReportMutation.mutate({ reportId: report.id, status: 'resolved' })}
                            disabled={updateReportMutation.isPending}
                          >
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateReportMutation.mutate({ reportId: report.id, status: 'dismissed' })}
                            disabled={updateReportMutation.isPending}
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
            <CardHeader>
              <CardTitle>Download Reports</CardTitle>
              <CardDescription>Download comprehensive reports of platform activity and analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">User Activity Report</CardTitle>
                    <CardDescription>
                      Complete user statistics including signup dates, swap activity, ratings, and account status.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => downloadReport('user-activity', `user-activity-${new Date().toISOString().split('T')[0]}.csv`)}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Feedback Logs</CardTitle>
                    <CardDescription>
                      All user ratings and feedback from completed skill swaps with detailed information.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => downloadReport('feedback-logs', `feedback-logs-${new Date().toISOString().split('T')[0]}.csv`)}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Swap Statistics</CardTitle>
                    <CardDescription>
                      Platform-wide analytics including popular skills, completion rates, and monthly trends.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => downloadReport('swap-stats', `swap-stats-${new Date().toISOString().split('T')[0]}.csv`)}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Report Information</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
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
            <CardHeader>
              <CardTitle>System Messages</CardTitle>
              <CardDescription>Create and manage platform-wide announcements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Message
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create System Message</DialogTitle>
                      <DialogDescription>
                        Create a new announcement or notification for all users
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={newMessage.title}
                          onChange={(e) => setNewMessage({ ...newMessage, title: e.target.value })}
                          placeholder="Message title..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          value={newMessage.message}
                          onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                          placeholder="Message content..."
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">Type</Label>
                        <Select value={newMessage.type} onValueChange={(value) => setNewMessage({ ...newMessage, type: value })}>
                          <SelectTrigger>
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
                    <DialogFooter>
                      <Button
                        onClick={() => createSystemMessageMutation.mutate(newMessage)}
                        disabled={!newMessage.title.trim() || !newMessage.message.trim() || createSystemMessageMutation.isPending}
                      >
                        Create Message
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="space-y-4">
                  {systemMessages?.map((message: SystemMessage) => (
                    <div key={message.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={message.isActive ? 'default' : 'secondary'}>
                            {message.type}
                          </Badge>
                          {!message.isActive && (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-medium mb-1">{message.title}</h3>
                      <p className="text-sm text-muted-foreground">{message.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>Admin Actions Log</CardTitle>
              <CardDescription>View all administrative actions taken on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {adminActions?.data?.map((action: AdminAction) => (
                  <div key={action.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge>{action.action.replace('_', ' ')}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(action.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">Admin: {action.admin.name}</p>
                      <p className="text-sm">Target: {action.targetType} ({action.targetId})</p>
                      {action.reason && (
                        <p className="text-sm text-muted-foreground">Reason: {action.reason}</p>
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