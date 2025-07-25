import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Trash2, ArrowLeft, MessageSquare, Edit } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import type { SwapRequestWithUsers } from "@shared/schema";
import EditSwapRequestDialog from "@/components/edit-swap-request-dialog";

export default function SwapRequests() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRequest, setEditingRequest] = useState<SwapRequestWithUsers | null>(null);


  const { data: swapRequests = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/swap-requests"],
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Always refetch fresh data
  });

  // Force refetch when component mounts or user changes
  useEffect(() => {
    if (isAuthenticated) {
      refetch();
    }
  }, [isAuthenticated, refetch]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/swap-requests/${requestId}/status`, { status });
      if (!response.ok) {
        throw new Error("Failed to update request");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/swap-requests"] });
      toast({ title: "Request updated successfully" });
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast({ title: "Failed to update request", variant: "destructive" });
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await apiRequest("DELETE", `/api/swap-requests/${requestId}`);
      if (!response.ok) {
        throw new Error("Failed to delete request");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/swap-requests"] });
      toast({ title: "Request deleted successfully" });
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast({ title: "Failed to delete request", variant: "destructive" });
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <p className="text-muted-foreground">You need to be logged in to view your swap requests.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your swap requests...</p>
        </div>
      </div>
    );
  }

  const sentRequests = swapRequests.filter((request: SwapRequestWithUsers) => request.requesterId === user?.id);
  const receivedRequests = swapRequests.filter((request: SwapRequestWithUsers) => request.targetId === user?.id);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending": return "secondary";
      case "accepted": return "default";
      case "completed": return "default";
      case "rejected": return "destructive";
      case "cancelled": return "outline";
      default: return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-orange-600";
      case "accepted": return "text-green-600";
      case "completed": return "text-blue-600 dark:text-[#6ba6f5]";
      case "rejected": return "text-red-600";
      case "cancelled": return "text-gray-600";
      default: return "text-gray-600";
    }
  };

  const handleAccept = (requestId: string) => {
    updateStatusMutation.mutate({ requestId, status: "accepted" });
  };

  const handleReject = (requestId: string) => {
    updateStatusMutation.mutate({ requestId, status: "rejected" });
  };

  const handleComplete = (requestId: string) => {
    updateStatusMutation.mutate({ requestId, status: "completed" });
  };



  const handleDelete = (requestId: string) => {
    deleteRequestMutation.mutate(requestId);
  };



  const renderRequestCard = (request: SwapRequestWithUsers, type: "sent" | "received") => {
    const otherUser = type === "sent" ? request.target : request.requester;
    const isOwner = type === "sent";
    
    return (
      <Card key={request.id} className="border-0 shadow-sm sm:border sm:shadow-md">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="relative">
            {/* Edit and Delete buttons positioned in upper right corner */}
            {(request.status === "pending" || request.status === "rejected") && isOwner && (
              <div className="absolute top-0 right-0 flex gap-2">
                {/* Edit button - only for pending requests */}
                {request.status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingRequest(request)}
                    className="h-10 w-10 p-0 hover:bg-accent"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                
                {/* Delete button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-10 w-10 p-0 hover:bg-destructive/90"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm sm:max-w-md p-6 rounded-lg border bg-background shadow-lg">
                    <AlertDialogHeader className="space-y-3">
                      <AlertDialogTitle className="text-lg font-semibold">Delete Swap Request</AlertDialogTitle>
                      <AlertDialogDescription className="text-sm text-muted-foreground">
                        Are you sure you want to delete this swap request? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-2 pt-6">
                      <AlertDialogCancel className="w-full sm:w-auto h-10">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(request.id)}
                        className="w-full sm:w-auto h-10 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 pr-20">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                  <AvatarImage src={otherUser.profilePhoto || ""} />
                  <AvatarFallback className="text-sm sm:text-base">{otherUser.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base sm:text-lg truncate">{otherUser.name}</CardTitle>
                  <Badge variant={getStatusBadgeVariant(request.status)} className={`${getStatusColor(request.status)} text-xs sm:text-sm mt-1`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-2 justify-end sm:justify-start">
              {request.status === "pending" && !isOwner && (
                <>
                  <Button size="sm" onClick={() => handleAccept(request.id)} variant="default" className="h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm">
                    <CheckCircle className="h-3 w-3 mr-1 sm:h-4 sm:w-4" />
                    Accept
                  </Button>
                  <Button size="sm" onClick={() => handleReject(request.id)} variant="destructive" className="h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm">
                    <XCircle className="h-3 w-3 mr-1 sm:h-4 sm:w-4" />
                    Reject
                  </Button>
                </>
              )}
              {request.status === "accepted" && (
                <Button size="sm" onClick={() => handleComplete(request.id)} variant="default" className="h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm">
                  <CheckCircle className="h-3 w-3 mr-1 sm:h-4 sm:w-4" />
                  Complete
                </Button>
              )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2 sm:pt-3">
          <div className="space-y-3 sm:space-y-2">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0">
              <div className="text-xs sm:text-sm">
                <span className="font-medium text-muted-foreground">{type === "sent" ? "You offer:" : "They offer:"}</span>
                <span className="ml-1 text-foreground">{type === "sent" ? request.senderSkill : request.receiverSkill}</span>
              </div>
              <div className="text-xs sm:text-sm">
                <span className="font-medium text-muted-foreground">{type === "sent" ? "You want:" : "You provide:"}</span>
                <span className="ml-1 text-foreground">{type === "sent" ? request.receiverSkill : request.senderSkill}</span>
              </div>
            </div>
            {request.message && (
              <div className="bg-muted p-3 rounded-md">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-3 w-3 mt-0.5 text-muted-foreground sm:h-4 sm:w-4" />
                  <p className="text-xs sm:text-sm leading-relaxed">{request.message}</p>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {type === "sent" ? "Sent" : "Received"} {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "Recently"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex items-center gap-3 mb-6 sm:mb-8 px-1">
        <Link href="/">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 sm:h-9 sm:w-9">
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold">My Swap Requests</h1>
      </div>
      
      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 sm:h-10">
          <TabsTrigger value="received" className="text-sm sm:text-base">
            Received ({receivedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="text-sm sm:text-base">
            Sent ({sentRequests.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="received" className="mt-4 sm:mt-6">
          {receivedRequests.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-muted-foreground text-sm sm:text-base">No swap requests received yet.</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {receivedRequests.map((request) => renderRequestCard(request, "received"))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="sent" className="mt-4 sm:mt-6">
          {sentRequests.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-muted-foreground text-sm sm:text-base">No swap requests sent yet.</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {sentRequests.map((request) => renderRequestCard(request, "sent"))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit swap request dialog */}
      {editingRequest && (
        <EditSwapRequestDialog
          request={editingRequest}
          isOpen={!!editingRequest}
          onOpenChange={(open) => !open && setEditingRequest(null)}
        />
      )}
    </div>
  );
}