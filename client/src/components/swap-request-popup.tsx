import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserWithSkills } from "@shared/schema";
import { MessageSquare, Loader2, X, ChevronDown } from "lucide-react";

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
  const [senderDropdownOpen, setSenderDropdownOpen] = useState(false);
  const [receiverDropdownOpen, setReceiverDropdownOpen] = useState(false);

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
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
            <MessageSquare className="w-5 h-5 text-primary" />
            Request Skill Swap with {targetUser.name}
          </DialogTitle>
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
                  {(currentUser.skillsOffered || []).map((skill) => (
                    <div 
                      key={skill.id} 
                      className={`flex items-center space-x-2 p-3 hover:bg-accent cursor-pointer transition-colors ${
                        senderSkills.includes(skill.name) ? 'bg-accent/50' : ''
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSenderSkill(skill.name);
                      }}
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
                  {(!currentUser.skillsOffered || currentUser.skillsOffered.length === 0) && (
                    <p className="text-sm text-muted-foreground p-3">
                      You need to add skills to your profile first.
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
                      className="w-3 h-3 cursor-pointer hover:text-primary/60 transition-colors" 
                      onClick={() => removeSenderSkill(skill)}
                    />
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">What skills do you want from {targetUser.name}?</Label>
            
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
                  {(targetUser.skillsOffered || []).map((skill) => (
                    <div 
                      key={skill.id} 
                      className={`flex items-center space-x-2 p-3 hover:bg-accent cursor-pointer transition-colors ${
                        receiverSkills.includes(skill.name) ? 'bg-accent/50' : ''
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleReceiverSkill(skill.name);
                      }}
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
                  {(!targetUser.skillsOffered || targetUser.skillsOffered.length === 0) && (
                    <p className="text-sm text-muted-foreground p-3">
                      {targetUser.name} hasn't added any skills yet.
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

          <div className="space-y-3 pt-2">
            <Label htmlFor="message" className="text-sm font-medium text-foreground">Message (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message..."
              className="min-h-[100px] resize-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-border">
            <Button type="button" variant="outline" onClick={handleClose} className="px-6">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={senderSkills.length === 0 || receiverSkills.length === 0 || isLoading || (!currentUser.skillsOffered || currentUser.skillsOffered.length === 0) || (!targetUser.skillsOffered || targetUser.skillsOffered.length === 0)}
              className="px-6 bg-primary hover:bg-primary/90"
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