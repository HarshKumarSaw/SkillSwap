import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { UserWithSkills } from "@shared/schema";
import { SkillTag } from "@/components/skill-tag";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Clock, Star, ArrowLeft, MessageSquare, Loader2, User, Flag } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AuthPopup } from "@/components/auth-popup";
import { SwapRequestPopup } from "@/components/swap-request-popup";
import { RatingDialog } from "@/components/rating-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Helper function to format availability
const formatAvailability = (availability: any): string => {
  if (!availability) return "Not specified";
  
  // Handle the new structure with dates and times
  if (typeof availability === 'object' && !Array.isArray(availability)) {
    const parts: string[] = [];
    
    // Add dates if available
    if (availability.dates && Array.isArray(availability.dates)) {
      const dateText = availability.dates.map((date: string) => 
        date.charAt(0).toUpperCase() + date.slice(1)
      ).join(', ');
      if (dateText) parts.push(dateText);
    }
    
    // Add times if available
    if (availability.times && Array.isArray(availability.times)) {
      const timeText = availability.times.map((time: string) => 
        time.charAt(0).toUpperCase() + time.slice(1)
      ).join(', ');
      if (timeText) parts.push(`(${timeText})`);
    }
    
    return parts.length > 0 ? parts.join(' ') : "Not specified";
  }
  
  // Handle legacy array format
  if (Array.isArray(availability)) {
    return availability.length > 0 ? availability.map(item => 
      item.charAt(0).toUpperCase() + item.slice(1)
    ).join(', ') : "Not specified";
  }
  
  // Handle string format (try to parse as JSON)
  if (typeof availability === 'string') {
    try {
      const parsed = JSON.parse(availability);
      return formatAvailability(parsed); // Recursive call with parsed object
    } catch {
      return availability;
    }
  }
  
  return "Not specified";
};

export default function UserProfile() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user: currentUser, isAuthenticated } = useAuth();
  
  // Get the page parameter from URL to know where to return
  const urlParams = new URLSearchParams(window.location.search);
  const returnPage = urlParams.get('page') || '1';
  

  const [isRequesting, setIsRequesting] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [showSwapPopup, setShowSwapPopup] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // First try to find user in cache from current page
  const { data: users } = useQuery<{data: UserWithSkills[]}>({
    queryKey: ['/api/users'],
    enabled: false // Don't refetch, just check cache
  });

  // Try to find user in cached data first
  let user = users?.data?.find(u => u.id === id);

  // If not found in cache, fetch the specific user by ID
  const { data: fetchedUser, isLoading: userLoading } = useQuery<UserWithSkills>({
    queryKey: ['/api/users', id],
    queryFn: async () => {
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('User not found');
        }
        throw new Error('Failed to fetch user');
      }
      return response.json();
    },
    enabled: !user && !!id, // Only fetch if user not found in cache
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 1, // Only retry once to avoid delays
    refetchOnWindowFocus: false, // Don't refetch when window focus changes
  });

  // Use user from cache or from API fetch
  if (!user && fetchedUser) {
    user = fetchedUser;
  }

  const isLoading = userLoading;

  const { data: feedback = [], isLoading: feedbackLoading } = useQuery({
    queryKey: [`/api/users/${id}/feedback`],
    enabled: !!id,
  });

  // Check if current user can give feedback to this user
  const { data: canGiveFeedbackData } = useQuery({
    queryKey: [`/api/users/${id}/can-give-feedback`],
    enabled: !!id && !!currentUser && currentUser.id !== id,
  });

  const canGiveFeedback = canGiveFeedbackData?.canGiveFeedback || false;

  // Fetch current user with skills when needed for swap popup
  const { data: currentUserWithSkills, isLoading: isLoadingCurrentUser } = useQuery({
    queryKey: ['/api/users', currentUser?.id],
    enabled: isAuthenticated && !!currentUser?.id && showSwapPopup,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createSwapRequestMutation = useMutation({
    mutationFn: async (data: {
      senderSkill: string;
      receiverSkill: string;
      message: string;
    }) => {
      if (!currentUser || !user) {
        throw new Error("User not authenticated");
      }
      const response = await apiRequest("POST", "/api/swap-requests", {
        requesterId: currentUser.id,
        targetId: user.id,
        senderSkill: data.senderSkill,
        receiverSkill: data.receiverSkill,
        message: data.message,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Swap request sent!",
        description: `Your swap request has been sent to ${user?.name}.`,
      });
      setIsRequesting(false);
      setShowSwapPopup(false);
    },
    onError: (error) => {
      console.error("Error creating swap request:", error);
      toast({
        title: "Error",
        description: "Failed to send swap request. Please try again.",
        variant: "destructive",
      });
      setIsRequesting(false);
    },
  });

  const createReportMutation = useMutation({
    mutationFn: async (data: {
      contentType: string;
      contentId: string;
      reason: string;
      description?: string;
    }) => {
      const response = await apiRequest("POST", "/api/reports", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Report submitted",
        description: `Your report about ${user?.name} has been submitted to the admin team.`,
      });
      setShowReportDialog(false);
      setReportReason("");
      setReportDescription("");
    },
    onError: (error) => {
      console.error("Error creating report:", error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleReport = () => {
    if (!isAuthenticated) {
      setShowAuthPopup(true);
      return;
    }
    setShowReportDialog(true);
  };

  const handleReportSubmit = () => {
    if (!reportReason || !user) return;
    
    createReportMutation.mutate({
      contentType: "user",
      contentId: user.id,
      reason: reportReason,
      description: reportDescription || undefined,
    });
  };

  const handleSwapRequest = () => {
    if (!user) return;
    
    // If viewing own profile, navigate to edit profile
    if (currentUser?.id === user.id) {
      setLocation(`/edit-profile`);
      return;
    }
    
    if (!isAuthenticated) {
      setShowAuthPopup(true);
      return;
    }
    
    // Show the swap request popup instead of directly sending the request
    setShowSwapPopup(true);
  };

  const handleAuthSuccess = () => {
    // After successful auth, show the swap request popup
    setShowSwapPopup(true);
  };

  const handleSwapRequestSubmit = (data: {
    senderSkills: string[];
    receiverSkills: string[];
    message: string;
  }) => {
    setIsRequesting(true);
    createSwapRequestMutation.mutate({
      senderSkill: data.senderSkills.join(', '),
      receiverSkill: data.receiverSkills.join(', '),
      message: data.message
    });
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400/50 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} className="w-4 h-4 text-muted-foreground" />);
      }
    }

    return stars;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => setLocation(`/?page=${returnPage}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Browse
          </Button>
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Loading user profile...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show user not found
  if (!user) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => setLocation(`/?page=${returnPage}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Browse
          </Button>
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                User not found (ID: {id})
                <br />
                <small>Available users: {users?.data?.length || 0}</small>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => setLocation(`/?page=${returnPage}`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Browse
        </Button>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
              <img
                src={user.profilePhoto}
                alt={`${user.name} profile photo`}
                className="w-32 h-32 rounded-full object-cover mx-auto sm:mx-0"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200";
                }}
              />
              
              <div className="flex-1 text-center sm:text-left">
                <CardTitle className="text-2xl mb-2">{user.name}</CardTitle>
                {user.location && (
                  <p className="text-muted-foreground flex items-center justify-center sm:justify-start mb-3">
                    <MapPin className="w-4 h-4 mr-2" />
                    {user.location}
                  </p>
                )}
                <div className="flex items-center justify-center sm:justify-start mb-4">
                  <div className="flex">
                    {renderStars(parseFloat(user.rating || "0"))}
                  </div>
                  <span className="text-muted-foreground ml-2">
                    {parseFloat(user.rating || "0").toFixed(1)} ({user.reviewCount} reviews)
                  </span>
                </div>
                <div className="flex items-center justify-center sm:justify-start text-muted-foreground">
                  <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>Available: {formatAvailability(user.availability)}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          
          {user.bio && (
            <CardContent className="pt-0">
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  About
                </h3>
                <p className="text-muted-foreground leading-relaxed">{user.bio}</p>
              </div>
            </CardContent>
          )}

          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Skills Offered</h3>
              {user.skillsOffered.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.skillsOffered.map((skill) => (
                    <SkillTag key={skill.id} skill={skill.name} variant="offered" />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No skills offered yet</p>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Skills Wanted</h3>
              {user.skillsWanted.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.skillsWanted.map((skill) => (
                    <SkillTag key={skill.id} skill={skill.name} variant="wanted" />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No skills wanted yet</p>
              )}
            </div>

            {/* Feedback Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Feedback & Reviews</h3>
                {canGiveFeedback && currentUser && (
                  <Button
                    onClick={() => setShowRatingDialog(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Star className="h-4 w-4" />
                    Give Feedback
                  </Button>
                )}
              </div>
              {feedbackLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading feedback...</span>
                </div>
              ) : feedback.length > 0 ? (
                <div className="space-y-3">
                  {feedback.map((item: any) => (
                    <div key={item.id} className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={item.rater.profilePhoto || ""} />
                          <AvatarFallback>{item.rater.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{item.rater.name}</span>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < item.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {item.ratingType === 'post_request' ? 'Initial' : 'Completed'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.feedback}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No feedback available yet</p>
              )}
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleSwapRequest}
                  disabled={isRequesting || createSwapRequestMutation.isPending}
                  className="w-full sm:w-auto bg-primary dark:bg-[#0b3675] hover:bg-primary/90 dark:hover:bg-[#0b3675]/90 disabled:opacity-50"
                  size="lg"
                >
                  {isRequesting || createSwapRequestMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Requesting...
                    </>
                  ) : currentUser?.id === user.id ? (
                    <>
                      <User className="mr-2 h-4 w-4" />
                      Edit Profile
                    </>
                  ) : (
                    <>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Request Skill Swap
                    </>
                  )}
                </Button>
                
                {/* Only show report button when viewing another user's profile */}
                {currentUser?.id !== user.id && (
                  <Button
                    onClick={handleReport}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    <Flag className="mr-2 h-4 w-4" />
                    Report User
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <AuthPopup
        isOpen={showAuthPopup}
        onOpenChange={setShowAuthPopup}
        onAuthSuccess={handleAuthSuccess}
      />
      
      {currentUser && currentUserWithSkills && user && (
        <SwapRequestPopup
          isOpen={showSwapPopup}
          onOpenChange={setShowSwapPopup}
          targetUser={user}
          currentUser={currentUserWithSkills}
          onSubmit={handleSwapRequestSubmit}
          isLoading={isRequesting || createSwapRequestMutation.isPending || isLoadingCurrentUser}
        />
      )}

      {currentUser && user && (
        <RatingDialog
          open={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          swapRequest={{
            id: "dummy-request",
            requesterId: currentUser.id,
            targetId: user.id,
            senderSkill: "General Skill",
            receiverSkill: "General Skill",
            status: "accepted",
            message: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            requester: {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
              profilePhoto: currentUser.profilePhoto,
            },
            target: {
              id: user.id,
              name: user.name,
              email: user.email,
              profilePhoto: user.profilePhoto,
            }
          }}
          onRatingSubmitted={() => {
            setShowRatingDialog(false);
            // Refresh feedback data
            queryClient.invalidateQueries({ queryKey: [`/api/users/${id}/feedback`] });
          }}
        />
      )}

      {/* Report User Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="w-[95vw] max-w-[425px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="space-y-3 pb-4">
            <DialogTitle className="text-lg font-semibold">Report User</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Report {user?.name} to the admin team. Please provide a reason for the report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium">
                Reason for report *
              </Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inappropriate_content">Inappropriate Content</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="harassment">Harassment</SelectItem>
                  <SelectItem value="fake_profile">Fake Profile</SelectItem>
                  <SelectItem value="scam">Scam or Fraudulent Activity</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Additional details (optional)
              </Label>
              <Textarea
                id="description"
                placeholder="Provide additional details about the issue..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-6">
            <Button
              variant="outline"
              onClick={() => setShowReportDialog(false)}
              disabled={createReportMutation.isPending}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReportSubmit}
              disabled={!reportReason || createReportMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 w-full sm:w-auto order-1 sm:order-2"
            >
              {createReportMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}