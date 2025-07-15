import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { UserWithSkills } from "@shared/schema";
import { MessageSquare, Loader2, X } from "lucide-react";

interface SwapRequestPopupProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: UserWithSkills;
  currentUser: UserWithSkills;
  onSubmit: (data: {
    senderSkills: string[];
    receiverSkills: string[];
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
  const [senderSkills, setSenderSkills] = useState<string[]>([]);
  const [receiverSkills, setReceiverSkills] = useState<string[]>([]);
  const [message, setMessage] = useState(`Hi ${targetUser.name}! I'd like to swap skills with you.`);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (senderSkills.length === 0 || receiverSkills.length === 0) return;
    
    onSubmit({
      senderSkills,
      receiverSkills,
      message
    });
  };

  const handleClose = () => {
    setSenderSkills([]);
    setReceiverSkills([]);
    setMessage(`Hi ${targetUser.name}! I'd like to swap skills with you.`);
    onOpenChange(false);
  };

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
          <div className="space-y-3">
            <Label>What skills do you offer? (Select at least one)</Label>
            
            {/* Selected skills display */}
            {senderSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {senderSkills.map((skill) => (
                  <span key={skill} className="bg-primary/10 text-primary px-2 py-1 rounded-md text-sm flex items-center gap-1">
                    {skill}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-primary/60" 
                      onClick={() => removeSenderSkill(skill)}
                    />
                  </span>
                ))}
              </div>
            )}

            {/* Skills checklist */}
            <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
              {(currentUser.skillsOffered || []).map((skill) => (
                <div key={skill.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`sender-${skill.id}`}
                    checked={senderSkills.includes(skill.name)}
                    onCheckedChange={() => toggleSenderSkill(skill.name)}
                  />
                  <Label htmlFor={`sender-${skill.id}`} className="text-sm font-normal cursor-pointer">
                    {skill.name}
                  </Label>
                </div>
              ))}
            </div>
            
            {(!currentUser.skillsOffered || currentUser.skillsOffered.length === 0) && (
              <p className="text-sm text-muted-foreground">
                You need to add skills to your profile first.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label>What skills do you want from {targetUser.name}? (Select at least one)</Label>
            
            {/* Selected skills display */}
            {receiverSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {receiverSkills.map((skill) => (
                  <span key={skill} className="bg-secondary/10 text-secondary-foreground px-2 py-1 rounded-md text-sm flex items-center gap-1">
                    {skill}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-muted-foreground" 
                      onClick={() => removeReceiverSkill(skill)}
                    />
                  </span>
                ))}
              </div>
            )}

            {/* Skills checklist */}
            <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
              {(targetUser.skillsOffered || []).map((skill) => (
                <div key={skill.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`receiver-${skill.id}`}
                    checked={receiverSkills.includes(skill.name)}
                    onCheckedChange={() => toggleReceiverSkill(skill.name)}
                  />
                  <Label htmlFor={`receiver-${skill.id}`} className="text-sm font-normal cursor-pointer">
                    {skill.name}
                  </Label>
                </div>
              ))}
            </div>
            
            {(!targetUser.skillsOffered || targetUser.skillsOffered.length === 0) && (
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
              disabled={senderSkills.length === 0 || receiverSkills.length === 0 || isLoading || (!currentUser.skillsOffered || currentUser.skillsOffered.length === 0) || (!targetUser.skillsOffered || targetUser.skillsOffered.length === 0)}
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