import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Trash2, Star, MessageSquare } from "lucide-react";
import { RatingDialog } from "@/components/rating-dialog";
import { useState } from "react";
import type { SwapRequestWithUsers } from "@shared/schema";

export default function SwapRequests() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SwapRequestWithUsers | null>(null);

  const { data: swapRequests = [], isLoading } = useQuery({
    queryKey: ["/api/swap-requests"],
    enabled: isAuthenticated,
  });

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
      case "completed": return "text-blue-600";
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

  const handleRate = (request: SwapRequestWithUsers) => {
    setSelectedRequest(request);
    setRatingDialogOpen(true);
  };

  const renderRequestCard = (request: SwapRequestWithUsers, type: "sent" | "received") => {
    const otherUser = type === "sent" ? request.target : request.requester;
    const isOwner = type === "sent";
    
    return (
      <Card key={request.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={otherUser.profilePhoto || ""} />
                <AvatarFallback>{otherUser.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{otherUser.name}</CardTitle>
                <Badge variant={getStatusBadgeVariant(request.status)} className={getStatusColor(request.status)}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {request.status === "pending" && !isOwner && (
                <>
                  <Button size="sm" onClick={() => handleAccept(request.id)} variant="default">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button size="sm" onClick={() => handleReject(request.id)} variant="destructive">
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </>
              )}
              {request.status === "accepted" && (
                <Button size="sm" onClick={() => handleComplete(request.id)} variant="default">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Complete
                </Button>
              )}
              {(request.status === "pending" || request.status === "rejected") && isOwner && (
                <Button size="sm" onClick={() => handleDelete(request.id)} variant="destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
              {/* Allow feedback on any sent request */}
              {isOwner && (
                <Button size="sm" onClick={() => handleRate(request)} variant="outline">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Give Feedback
                </Button>
              )}
              {/* Traditional rating for completed requests */}
              {request.status === "completed" && !isOwner && (
                <Button size="sm" onClick={() => handleRate(request)} variant="outline">
                  <Star className="h-4 w-4 mr-1" />
                  Rate Experience
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span><strong>{type === "sent" ? "You offer:" : "They offer:"}</strong> {type === "sent" ? request.senderSkill : request.receiverSkill}</span>
              <span><strong>{type === "sent" ? "You want:" : "You provide:"}</strong> {type === "sent" ? request.receiverSkill : request.senderSkill}</span>
            </div>
            {request.message && (
              <div className="bg-muted p-3 rounded-md">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-sm">{request.message}</p>
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Swap Requests</h1>
      
      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">Received ({receivedRequests.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sentRequests.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="received" className="mt-6">
          {receivedRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No swap requests received yet.</p>
            </div>
          ) : (
            <div>
              {receivedRequests.map((request) => renderRequestCard(request, "received"))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="sent" className="mt-6">
          {sentRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No swap requests sent yet.</p>
            </div>
          ) : (
            <div>
              {sentRequests.map((request) => renderRequestCard(request, "sent"))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedRequest && (
        <RatingDialog
          open={ratingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          swapRequest={selectedRequest}
          onRatingSubmitted={() => {
            setRatingDialogOpen(false);
            setSelectedRequest(null);
          }}
        />
      )}
    </div>
  );
}