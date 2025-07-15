import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import type { SwapRequestWithUsers } from "@shared/schema";

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  swapRequest: SwapRequestWithUsers;
  onRatingSubmitted: () => void;
}

export function RatingDialog({
  open,
  onOpenChange,
  swapRequest,
  onRatingSubmitted,
}: RatingDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  const otherUser = swapRequest.requesterId === user?.id ? swapRequest.target : swapRequest.requester;
  const isRequester = swapRequest.requesterId === user?.id;
  const isCompleted = swapRequest.status === "completed";

  // Determine rating type based on request status and user role
  const ratingType = isCompleted ? "post_completion" : "post_request";
  const isInitialFeedback = !isCompleted && isRequester;

  const submitRatingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/swap-requests/${swapRequest.id}/rating`, {
        method: "POST",
        body: JSON.stringify({
          ratedId: otherUser.id,
          rating,
          feedback: feedback.trim() || undefined,
          ratingType,
        }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      const successMessage = isInitialFeedback 
        ? "Feedback submitted successfully!" 
        : "Rating submitted successfully!";
      toast({ title: successMessage });
      queryClient.invalidateQueries({ queryKey: ["/api/swap-requests"] });
      onRatingSubmitted();
      // Reset form
      setRating(0);
      setHoveredRating(0);
      setFeedback("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit rating",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast({
        title: "Please select a rating",
        description: "You must give a star rating before submitting",
        variant: "destructive",
      });
      return;
    }
    submitRatingMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isInitialFeedback ? "Give Initial Feedback" : "Rate Your Swap Experience"}
          </DialogTitle>
          <DialogDescription>
            {isInitialFeedback 
              ? `Share your initial thoughts about connecting with ${otherUser.name}`
              : `How was your skill swap with ${otherUser.name}?`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 hover:scale-110 transition-transform"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                {rating === 1 && "Poor experience"}
                {rating === 2 && "Fair experience"}
                {rating === 3 && "Good experience"}
                {rating === 4 && "Great experience"}
                {rating === 5 && "Excellent experience"}
              </p>
            )}
          </div>

          {/* Feedback */}
          <div className="space-y-2">
            <Label htmlFor="feedback">
              {isInitialFeedback ? "Initial Feedback (Optional)" : "Feedback (Optional)"}
            </Label>
            <Textarea
              id="feedback"
              placeholder={
                isInitialFeedback 
                  ? "Share your initial thoughts about this user..."
                  : "Share your experience with this skill swap..."
              }
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitRatingMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitRatingMutation.isPending}
          >
            {submitRatingMutation.isPending 
              ? "Submitting..." 
              : isInitialFeedback 
                ? "Submit Feedback" 
                : "Submit Rating"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}