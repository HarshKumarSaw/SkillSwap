import { UserWithSkills } from "@shared/schema";
import { SkillTag } from "./skill-tag";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Clock, Star } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UserCardProps {
  user: UserWithSkills;
}

export function UserCard({ user }: UserCardProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createSwapRequestMutation = useMutation({
    mutationFn: async (targetId: number) => {
      const response = await apiRequest("POST", "/api/swap-requests", {
        requesterId: 1, // This would come from auth context in a real app
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
    setIsRequesting(true);
    createSwapRequestMutation.mutate(user.id);
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
        stars.push(<Star key={i} className="w-3 h-3 text-slate-300" />);
      }
    }

    return stars;
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <img
            src={user.profilePhoto || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"}
            alt={`${user.name} profile photo`}
            className="w-16 h-16 rounded-full object-cover"
          />
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-800">{user.name}</h3>
            {user.location && (
              <p className="text-slate-500 text-sm flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {user.location}
              </p>
            )}
            <div className="flex items-center mt-2">
              <div className="flex">
                {renderStars(parseFloat(user.rating || "0"))}
              </div>
              <span className="text-slate-500 text-sm ml-2">
                {parseFloat(user.rating || "0").toFixed(1)} ({user.reviewCount})
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-medium text-slate-700 mb-2">Skills Offered:</h4>
          <div className="flex flex-wrap gap-1">
            {user.skillsOffered.map((skill) => (
              <SkillTag key={skill.id} skill={skill.name} variant="offered" />
            ))}
          </div>
        </div>

        <div className="mt-3">
          <h4 className="text-sm font-medium text-slate-700 mb-2">Skills Wanted:</h4>
          <div className="flex flex-wrap gap-1">
            {user.skillsWanted.map((skill) => (
              <SkillTag key={skill.id} skill={skill.name} variant="wanted" />
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              Available: {user.availability || "Not specified"}
            </div>
            <Button
              onClick={handleSwapRequest}
              disabled={isRequesting || createSwapRequestMutation.isPending}
              className="px-4 py-2 text-sm"
            >
              {isRequesting || createSwapRequestMutation.isPending ? "Requesting..." : "Request Swap"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
