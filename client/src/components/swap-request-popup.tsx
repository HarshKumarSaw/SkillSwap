import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserWithSkills } from "@shared/schema";
import { MessageSquare, Loader2 } from "lucide-react";

interface SwapRequestPopupProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: UserWithSkills;
  currentUser: UserWithSkills;
  onSubmit: (data: {
    senderSkill: string;
    receiverSkill: string;
    message: string;
  }) => void;
  isLoading: boolean;
}

export function SwapRequestPopup({ 
  isOpen, 
  onOpenChange, 
  targetUser, 
  currentUser, 
  onSubmit, 
  isLoading 
}: SwapRequestPopupProps) {
  const [senderSkill, setSenderSkill] = useState("");
  const [receiverSkill, setReceiverSkill] = useState("");
  const [message, setMessage] = useState(`Hi ${targetUser.name}! I'd like to swap skills with you.`);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderSkill || !receiverSkill) return;
    
    onSubmit({
      senderSkill,
      receiverSkill,
      message
    });
  };

  const handleClose = () => {
    setSenderSkill("");
    setReceiverSkill("");
    setMessage(`Hi ${targetUser.name}! I'd like to swap skills with you.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Request Skill Swap with {targetUser.name}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sender-skill">What skill do you offer?</Label>
            <Select value={senderSkill} onValueChange={setSenderSkill}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a skill you offer" />
              </SelectTrigger>
              <SelectContent>
                {currentUser.skillsOffered.map((skill) => (
                  <SelectItem key={skill.id} value={skill.name}>
                    {skill.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentUser.skillsOffered.length === 0 && (
              <p className="text-sm text-muted-foreground">
                You need to add skills to your profile first.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="receiver-skill">What skill do you want from {targetUser.name}?</Label>
            <Select value={receiverSkill} onValueChange={setReceiverSkill}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a skill you want to learn" />
              </SelectTrigger>
              <SelectContent>
                {targetUser.skillsOffered.map((skill) => (
                  <SelectItem key={skill.id} value={skill.name}>
                    {skill.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {targetUser.skillsOffered.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {targetUser.name} hasn't added any skills yet.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!senderSkill || !receiverSkill || isLoading || currentUser.skillsOffered.length === 0 || targetUser.skillsOffered.length === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send Request
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}