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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base mt-1">
                Comprehensive platform management and insights
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-[#0b3675]/20 dark:to-[#0b3675]/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-semibold text-blue-800 dark:text-[#6ba6f5]">Total Users</CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 dark:bg-[#0b3675] text-white shadow-md">
                <Users className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900 dark:text-[#6ba6f5] mb-1">
                {users?.totalCount || 0}
              </div>
              <p className="text-xs text-blue-700 dark:text-[#6ba6f5]/80">Active platform members</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-semibold text-green-800 dark:text-green-200">Swap Requests</CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-600 text-white shadow-md">
                <TrendingUp className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900 dark:text-green-100 mb-1">
                {swapRequests?.totalCount || 0}
              </div>
              <p className="text-xs text-green-700 dark:text-green-300">Total skill exchanges</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-semibold text-orange-800 dark:text-orange-200">Pending Reports</CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-600 text-white shadow-md">
                <Shield className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-900 dark:text-orange-100 mb-1">
                {reports?.data?.filter((r: Report) => r.status === 'pending').length || 0}
              </div>
              <p className="text-xs text-orange-700 dark:text-orange-300">Awaiting review</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-semibold text-purple-800 dark:text-purple-200">System Messages</CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-600 text-white shadow-md">
                <MessageSquare className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-1">
                {systemMessages?.length || 0}
              </div>
              <p className="text-xs text-purple-700 dark:text-purple-300">Active announcements</p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <div className="overflow-x-auto pb-2">
            <TabsList className="flex w-max min-w-full lg:grid lg:grid-cols-6 gap-1 bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-xl shadow-sm backdrop-blur-sm h-auto">
              <TabsTrigger value="users" className="data-[state=active]:bg-blue-600 dark:data-[state=active]:bg-[#0b3675] data-[state=active]:text-white rounded-lg font-medium transition-all flex-shrink-0 text-xs px-2 py-2.5 min-w-[60px] sm:min-w-0 sm:px-4">
                <Users className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-1">Users</span>
              </TabsTrigger>
              <TabsTrigger value="swap-requests" className="data-[state=active]:bg-green-600 data-[state=active]:text-white rounded-lg font-medium transition-all flex-shrink-0 text-xs px-2 py-2.5 min-w-[60px] sm:min-w-0 sm:px-4">
                <TrendingUp className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-1">Requests</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-lg font-medium transition-all flex-shrink-0 text-xs px-2 py-2.5 min-w-[60px] sm:min-w-0 sm:px-4">
                <Shield className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-1">Reports</span>
              </TabsTrigger>
              <TabsTrigger value="downloads" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all flex-shrink-0 text-xs px-2 py-2.5 min-w-[60px] sm:min-w-0 sm:px-4">
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-1">Downloads</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg font-medium transition-all flex-shrink-0 text-xs px-2 py-2.5 min-w-[60px] sm:min-w-0 sm:px-4">
                <MessageSquare className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-1">Messages</span>
              </TabsTrigger>
              <TabsTrigger value="actions" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white rounded-lg font-medium transition-all flex-shrink-0 text-xs px-2 py-2.5 min-w-[60px] sm:min-w-0 sm:px-4">
                <UserCheck className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline ml-1">Actions</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="users">
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200/50 dark:border-slate-700/50 pb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 dark:bg-[#0b3675] text-white">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">User Management</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">
                      Manage user accounts, permissions, and platform access
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {users?.data?.map((user: User) => (
                    <div key={user.id} className="group flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-all duration-200 bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 dark:from-[#0b3675] to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">{user.name}</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 break-all">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge 
                            variant={user.role === 'admin' ? 'default' : 'secondary'} 
                            className={user.role === 'admin' ? 'bg-blue-600 dark:bg-[#0b3675] hover:bg-blue-700 dark:hover:bg-[#0b3675]/90' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}
                          >
                            {user.role}
                          </Badge>
                          {user.isBanned && (
                            <Badge variant="destructive" className="bg-red-600 hover:bg-red-700">
                              Banned
                            </Badge>
                          )}
                        </div>
                        {user.banReason && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 italic">
                            Reason: {user.banReason}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-3 mt-4 sm:mt-0 sm:ml-6">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setSelectedUser(user)}
                              className="bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all"
                            >
                              <Ban className="w-4 h-4 mr-2" />
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
                    <Button className="w-full sm:w-auto text-xs sm:text-sm bg-blue-600 dark:bg-[#0b3675] hover:bg-blue-700 dark:hover:bg-[#0b3675]/90">
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
                        className="w-full sm:w-auto text-sm bg-blue-600 dark:bg-[#0b3675] hover:bg-blue-700 dark:hover:bg-[#0b3675]/90"
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
    </div>
  );
}