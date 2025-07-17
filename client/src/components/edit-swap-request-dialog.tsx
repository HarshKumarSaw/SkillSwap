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
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, X, ChevronDown } from "lucide-react";
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
  
  // Parse the current skills from the request (they might be comma-separated)
  const [senderSkills, setSenderSkills] = useState<string[]>([]);
  const [receiverSkills, setReceiverSkills] = useState<string[]>([]);
  const [message, setMessage] = useState(request.message || "");
  const [senderDropdownOpen, setSenderDropdownOpen] = useState(false);
  const [receiverDropdownOpen, setReceiverDropdownOpen] = useState(false);

  // Get skills for dropdowns
  const { data: skillsData = {} } = useQuery({
    queryKey: ["/api/skills"],
  });

  // Get user's skills
  const { data: userData } = useQuery({
    queryKey: ["/api/users", user?.id],
    enabled: !!user?.id,
  });

  // Get target user's skills
  const { data: targetUserData } = useQuery({
    queryKey: ["/api/users", request.target.id],
    enabled: !!request.target.id,
  });

  const userSkills = userData?.skillsOffered || [];
  const targetUserSkills = targetUserData?.skillsOffered || [];

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Parse comma-separated skills
      setSenderSkills(request.senderSkill ? request.senderSkill.split(', ').filter(s => s.trim()) : []);
      setReceiverSkills(request.receiverSkill ? request.receiverSkill.split(', ').filter(s => s.trim()) : []);
      setMessage(request.message || "");
    }
  }, [isOpen, request]);

  const toggleSenderSkill = (skillName: string) => {
    setSenderSkills(prev => 
      prev.includes(skillName) 
        ? prev.filter(s => s !== skillName)
        : [...prev, skillName]
    );
  };

  const toggleReceiverSkill = (skillName: string) => {
    setReceiverSkills(prev => 
      prev.includes(skillName) 
        ? prev.filter(s => s !== skillName)
        : [...prev, skillName]
    );
  };

  const removeSenderSkill = (skillName: string) => {
    setSenderSkills(prev => prev.filter(s => s !== skillName));
  };

  const removeReceiverSkill = (skillName: string) => {
    setReceiverSkills(prev => prev.filter(s => s !== skillName));
  };

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
      queryClient.refetchQueries({ queryKey: ["/api/swap-requests"] });
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
    
    if (senderSkills.length === 0 || receiverSkills.length === 0) {
      toast({
        title: "Please select skills",
        description: "You must select at least one skill you offer and one skill you want.",
        variant: "destructive",
      });
      return;
    }

    updateRequestMutation.mutate({
      senderSkill: senderSkills.join(', '),
      receiverSkill: receiverSkills.join(', '),
      message,
    });
  };

  // Get all skills as a flat array for the receiver skill dropdown
  const allSkills = Object.values(skillsData).flat();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-[520px] max-h-[90vh] overflow-y-auto my-4 sm:my-0 rounded-lg">
        <DialogHeader>
          <DialogTitle>Edit Swap Request</DialogTitle>
          <DialogDescription>
            Update your swap request to {request.target.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">What skills do you offer?</Label>
            
            <Popover open={senderDropdownOpen} onOpenChange={setSenderDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {senderSkills.length === 0 
                    ? "Select at least one skill" 
                    : `${senderSkills.length} skill${senderSkills.length > 1 ? 's' : ''} selected`}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <div className="max-h-48 overflow-y-auto">
                  {userSkills.map((skill: any) => (
                    <div
                      key={skill.id}
                      className="flex items-center space-x-2 p-3 hover:bg-accent cursor-pointer"
                      onClick={() => toggleSenderSkill(skill.name)}
                    >
                      <Checkbox 
                        checked={senderSkills.includes(skill.name)}
                        readOnly
                        className="pointer-events-none"
                      />
                      <span className="text-sm flex-1">
                        {skill.name}
                      </span>
                    </div>
                  ))}
                  {(!userSkills || userSkills.length === 0) && (
                    <p className="text-sm text-muted-foreground p-3">
                      You haven't added any skills yet. Update your profile to add skills.
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Selected skills display */}
            {senderSkills.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border">
                {senderSkills.map((skill) => (
                  <span key={skill} className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm flex items-center gap-2 border border-primary/20">
                    {skill}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-muted-foreground transition-colors" 
                      onClick={() => removeSenderSkill(skill)}
                    />
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">What skills do you want from {request.target.name}?</Label>
            
            <Popover open={receiverDropdownOpen} onOpenChange={setReceiverDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {receiverSkills.length === 0 
                    ? "Select at least one skill" 
                    : `${receiverSkills.length} skill${receiverSkills.length > 1 ? 's' : ''} selected`}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <div className="max-h-48 overflow-y-auto">
                  {targetUserSkills.map((skill: any) => (
                    <div
                      key={skill.id}
                      className="flex items-center space-x-2 p-3 hover:bg-accent cursor-pointer"
                      onClick={() => toggleReceiverSkill(skill.name)}
                    >
                      <Checkbox 
                        checked={receiverSkills.includes(skill.name)}
                        readOnly
                        className="pointer-events-none"
                      />
                      <span className="text-sm flex-1">
                        {skill.name}
                      </span>
                    </div>
                  ))}
                  {(!targetUserSkills || targetUserSkills.length === 0) && (
                    <p className="text-sm text-muted-foreground p-3">
                      {request.target.name} hasn't added any skills yet.
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Selected skills display */}
            {receiverSkills.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border">
                {receiverSkills.map((skill) => (
                  <span key={skill} className="bg-secondary/10 text-secondary-foreground px-3 py-1.5 rounded-full text-sm flex items-center gap-2 border border-secondary/20">
                    {skill}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-muted-foreground transition-colors" 
                      onClick={() => removeReceiverSkill(skill)}
                    />
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Message (Optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message to your request..."
              className="min-h-[100px] text-sm"
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
              disabled={updateRequestMutation.isPending || senderSkills.length === 0 || receiverSkills.length === 0}
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