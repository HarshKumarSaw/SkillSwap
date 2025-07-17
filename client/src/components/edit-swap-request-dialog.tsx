import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { SwapRequestWithUsers } from "@shared/schema";

interface EditSwapRequestDialogProps {
  request: SwapRequestWithUsers;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditSwapRequestDialog({
  request,
  isOpen,
  onOpenChange,
}: EditSwapRequestDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [senderSkill, setSenderSkill] = useState(request.senderSkill);
  const [receiverSkill, setReceiverSkill] = useState(request.receiverSkill);
  const [message, setMessage] = useState(request.message || "");

  // Get skills for dropdowns
  const { data: skillsData = {} } = useQuery({
    queryKey: ["/api/skills"],
  });

  // Get user's skills
  const { data: userData } = useQuery({
    queryKey: ["/api/users", user?.id],
    enabled: !!user?.id,
  });

  const userSkills = userData?.offeredSkills || [];

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSenderSkill(request.senderSkill);
      setReceiverSkill(request.receiverSkill);
      setMessage(request.message || "");
    }
  }, [isOpen, request]);

  const updateRequestMutation = useMutation({
    mutationFn: async (updates: { senderSkill: string; receiverSkill: string; message: string }) => {
      const response = await apiRequest("PATCH", `/api/swap-requests/${request.id}`, updates);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update request");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/swap-requests"] });
      toast({ title: "Request updated successfully" });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast({ 
        title: "Failed to update request", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!senderSkill || !receiverSkill) {
      toast({
        title: "Please select both skills",
        variant: "destructive",
      });
      return;
    }

    updateRequestMutation.mutate({
      senderSkill,
      receiverSkill,
      message,
    });
  };

  // Get all skills as a flat array for the receiver skill dropdown
  const allSkills = Object.values(skillsData).flat();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Swap Request</DialogTitle>
          <DialogDescription>
            Update your swap request to {request.target.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="senderSkill">Skill You Offer</Label>
            <Select value={senderSkill} onValueChange={setSenderSkill}>
              <SelectTrigger>
                <SelectValue placeholder="Select a skill you offer" />
              </SelectTrigger>
              <SelectContent>
                {userSkills.map((skill: string) => (
                  <SelectItem key={skill} value={skill}>
                    {skill}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receiverSkill">Skill You Want</Label>
            <Select value={receiverSkill} onValueChange={setReceiverSkill}>
              <SelectTrigger>
                <SelectValue placeholder="Select a skill you want" />
              </SelectTrigger>
              <SelectContent>
                {allSkills.map((skill: any) => (
                  <SelectItem key={skill.id} value={skill.name}>
                    {skill.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message to your request..."
              className="min-h-[100px]"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateRequestMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateRequestMutation.isPending}
            >
              {updateRequestMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}