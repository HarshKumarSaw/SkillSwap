import { UserWithSkills } from "@shared/schema";
import { SkillTag } from "./skill-tag";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Clock, Star, MessageSquare, Loader2, User } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { AuthPopup } from "./auth-popup";
import { useAuth } from "@/hooks/use-auth";

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

interface UserCardProps {
  user: UserWithSkills;
  currentPage?: number;
}

export function UserCard({ user, currentPage = 1 }: UserCardProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user: currentUser, isAuthenticated } = useAuth();

  const createSwapRequestMutation = useMutation({
    mutationFn: async (targetId: string) => {
      if (!currentUser) {
        throw new Error("User not authenticated");
      }
      const response = await apiRequest("POST", "/api/swap-requests", {
        requesterId: currentUser.id,
        targetId,
        message: `I'd like to swap skills with you!`,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Swap request sent!",
        description: `Your swap request has been sent to ${user.name}.`,
      });
      setIsRequesting(false);
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

  const handleSwapRequest = () => {
    if (!isAuthenticated) {
      setShowAuthPopup(true);
      return;
    }
    
    // Prevent users from requesting swap with themselves
    if (currentUser?.id === user.id) {
      toast({
        title: "Cannot request swap",
        description: "You cannot request a skill swap with yourself.",
        variant: "destructive",
      });
      return;
    }
    
    setIsRequesting(true);
    createSwapRequestMutation.mutate(user.id);
  };

  const handleAuthSuccess = () => {
    // After successful auth, automatically trigger the swap request
    // Check if user is authenticated and proceed
    if (currentUser) {
      setIsRequesting(true);
      createSwapRequestMutation.mutate(user.id);
    }
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} className="w-3 h-3 fill-yellow-400/50 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} className="w-3 h-3 text-muted-foreground" />);
      }
    }

    return stars;
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <img
              src={user.profilePhoto || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"}
              alt={`${user.name} profile photo`}
              className="w-16 h-16 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-primary transition-all duration-200"
              onClick={() => setLocation(`/profile/${user.id}?page=${currentPage}`)}
            />
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">{user.name}</h3>
              {user.location && (
                <p className="text-muted-foreground text-sm flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {user.location}
                </p>
              )}
              <div className="flex items-center mt-2">
                <div className="flex">
                  {renderStars(parseFloat(user.rating || "0"))}
                </div>
                <span className="text-muted-foreground text-sm ml-2">
                  {parseFloat(user.rating || "0").toFixed(1)} ({user.reviewCount})
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-medium text-foreground mb-2">Skills Offered:</h4>
            <div className="flex flex-wrap gap-1">
              {user.skillsOffered.map((skill) => (
                <SkillTag key={skill.id} skill={skill.name} variant="offered" />
              ))}
            </div>
          </div>

          <div className="mt-3">
            <h4 className="text-sm font-medium text-foreground mb-2">Skills Wanted:</h4>
            <div className="flex flex-wrap gap-1">
              {user.skillsWanted.map((skill) => (
                <SkillTag key={skill.id} skill={skill.name} variant="wanted" />
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-xs text-muted-foreground flex items-center">
                <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="break-words">Available: {formatAvailability(user.availability)}</span>
              </div>
              <Button
                onClick={handleSwapRequest}
                disabled={isRequesting || createSwapRequestMutation.isPending || currentUser?.id === user.id}
                className="px-4 py-2 text-sm w-full sm:w-auto bg-primary dark:bg-[#0b3675] hover:bg-primary/90 dark:hover:bg-[#0b3675]/90 disabled:opacity-50"
              >
                {isRequesting || createSwapRequestMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Requesting...
                  </>
                ) : currentUser?.id === user.id ? (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    Your Profile
                  </>
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Request Swap
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <AuthPopup
        isOpen={showAuthPopup}
        onOpenChange={setShowAuthPopup}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
