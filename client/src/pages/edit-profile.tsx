import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ArrowLeft, Save, X, Plus, ChevronDown, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserWithSkills } from "@shared/schema";

export default function EditProfile() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    location: "",
    bio: "",
    profilePhoto: "",
    isPublic: true,
    availability: {
      dates: [] as string[],
      times: [] as string[]
    }
  });

  const [skillsOffered, setSkillsOffered] = useState<string[]>([]);
  const [skillsWanted, setSkillsWanted] = useState<string[]>([]);
  const [offeredSkillsOpen, setOfferedSkillsOpen] = useState(false);
  const [wantedSkillsOpen, setWantedSkillsOpen] = useState(false);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  // Fetch user profile data
  const { data: userProfile } = useQuery<UserWithSkills>({
    queryKey: ["/api/users", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/users/${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch user profile");
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Fetch all skills
  const { data: skillsByCategory = {} } = useQuery<Record<string, any[]>>({
    queryKey: ["/api/skills"],
    staleTime: 30 * 60 * 1000,
  });

  // Initialize form data when user profile loads
  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || "",
        email: userProfile.email || "",
        location: userProfile.location || "",
        bio: userProfile.bio || "",
        profilePhoto: userProfile.profilePhoto || userProfile.profile_photo || "",
        isPublic: userProfile.isPublic ?? true,
        availability: {
          dates: userProfile.availability?.dates || [],
          times: userProfile.availability?.times || []
        }
      });
      setSkillsOffered(userProfile.skillsOffered.map(skill => skill.name));
      setSkillsWanted(userProfile.skillsWanted.map(skill => skill.name));
    }
  }, [userProfile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/users/${user?.id}`, data);
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated!",
        description: "Your profile has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
      setLocation(`/profile/${user?.id}`);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateProfileMutation.mutateAsync({
        ...formData,
        skillsOffered,
        skillsWanted,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAvailabilityChange = (type: 'dates' | 'times', value: string) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [type]: prev.availability[type].includes(value)
          ? prev.availability[type].filter(item => item !== value)
          : [...prev.availability[type], value]
      }
    }));
  };

  const handleSkillToggle = (skillName: string, type: 'offered' | 'wanted') => {
    if (type === 'offered') {
      setSkillsOffered(prev => 
        prev.includes(skillName) 
          ? prev.filter(skill => skill !== skillName)
          : [...prev, skillName]
      );
    } else {
      setSkillsWanted(prev => 
        prev.includes(skillName) 
          ? prev.filter(skill => skill !== skillName)
          : [...prev, skillName]
      );
    }
  };

  const addSkill = (skillName: string, type: 'offered' | 'wanted') => {
    if (type === 'offered' && !skillsOffered.includes(skillName)) {
      setSkillsOffered(prev => [...prev, skillName]);
      setOfferedSkillsOpen(false);
    } else if (type === 'wanted' && !skillsWanted.includes(skillName)) {
      setSkillsWanted(prev => [...prev, skillName]);
      setWantedSkillsOpen(false);
    }
  };

  const removeSkill = (skillName: string, type: 'offered' | 'wanted') => {
    if (type === 'offered') {
      setSkillsOffered(prev => prev.filter(skill => skill !== skillName));
    } else {
      setSkillsWanted(prev => prev.filter(skill => skill !== skillName));
    }
  };

  const allSkills = Object.values(skillsByCategory).flat();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-Optimized Header */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(`/profile/${user?.id}`)}
                className="p-2 sm:p-3"
              >
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Back to Profile</span>
              </Button>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Edit Profile</h1>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 hidden sm:flex"
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <Card className="border-0 shadow-sm sm:border sm:shadow-md">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-5">
              <div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Your full name"
                    required
                    className="h-11 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="h-11 text-base"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm font-medium">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="City, Country"
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  placeholder="Tell others about yourself..."
                  rows={3}
                  className="text-base resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profilePhoto" className="text-sm font-medium">Profile Photo URL</Label>
                <Input
                  id="profilePhoto"
                  value={formData.profilePhoto}
                  onChange={(e) => handleInputChange("profilePhoto", e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="h-11 text-base"
                />
              </div>
              <div className="flex items-start space-x-3 py-2">
                <Checkbox
                  id="isPublic"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => handleInputChange("isPublic", checked)}
                  className="mt-0.5"
                />
                <Label htmlFor="isPublic" className="text-sm cursor-pointer leading-relaxed">
                  Make my profile public (visible to other users)
                </Label>
              </div>
              {!formData.isPublic && (
                <div className="text-sm text-muted-foreground bg-muted/70 p-4 rounded-lg border">
                  <p>ℹ️ Your profile is currently private. Other users won't be able to see your profile or send you swap requests.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills Offered */}
          <Card className="border-0 shadow-sm sm:border sm:shadow-md">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Skills I Can Offer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Add Skills</Label>
                <Popover open={offeredSkillsOpen} onOpenChange={setOfferedSkillsOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={offeredSkillsOpen}
                      className="w-full justify-between h-11 text-base"
                    >
                      Select skills to offer...
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search skills..." className="h-11" />
                      <CommandList>
                        <CommandEmpty>No skills found.</CommandEmpty>
                        <CommandGroup>
                          {allSkills
                            .filter(skill => !skillsOffered.includes(skill.name))
                            .slice(0, 100)
                            .map((skill) => (
                            <CommandItem
                              key={skill.id}
                              value={skill.name}
                              onSelect={() => addSkill(skill.name, 'offered')}
                              className="cursor-pointer"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  skillsOffered.includes(skill.name) ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {skill.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              {skillsOffered.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground">Selected Skills:</Label>
                  <div className="flex flex-wrap gap-2">
                    {skillsOffered.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-3 py-1.5 text-sm"
                      >
                        {skill}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => removeSkill(skill, 'offered')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills Wanted */}
          <Card className="border-0 shadow-sm sm:border sm:shadow-md">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Skills I Want to Learn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Add Skills</Label>
                <Popover open={wantedSkillsOpen} onOpenChange={setWantedSkillsOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={wantedSkillsOpen}
                      className="w-full justify-between h-11 text-base"
                    >
                      Select skills to learn...
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search skills..." className="h-11" />
                      <CommandList>
                        <CommandEmpty>No skills found.</CommandEmpty>
                        <CommandGroup>
                          {allSkills
                            .filter(skill => !skillsWanted.includes(skill.name))
                            .slice(0, 100)
                            .map((skill) => (
                            <CommandItem
                              key={skill.id}
                              value={skill.name}
                              onSelect={() => addSkill(skill.name, 'wanted')}
                              className="cursor-pointer"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  skillsWanted.includes(skill.name) ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {skill.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              {skillsWanted.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground">Selected Skills:</Label>
                  <div className="flex flex-wrap gap-2">
                    {skillsWanted.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-3 py-1.5 text-sm"
                      >
                        {skill}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => removeSkill(skill, 'wanted')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Availability */}
          <Card className="border-0 shadow-sm sm:border sm:shadow-md">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Available Days</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {["weekends", "weekdays", "everyday"].map((date) => (
                    <div key={date} className="flex items-center space-x-3 py-1">
                      <Checkbox
                        id={`date-${date}`}
                        checked={formData.availability.dates.includes(date)}
                        onCheckedChange={() => handleAvailabilityChange('dates', date)}
                        className="scale-110"
                      />
                      <Label htmlFor={`date-${date}`} className="text-sm sm:text-base cursor-pointer leading-relaxed">
                        {date.charAt(0).toUpperCase() + date.slice(1)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Available Times</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {["morning", "evening", "night"].map((time) => (
                    <div key={time} className="flex items-center space-x-3 py-1">
                      <Checkbox
                        id={`time-${time}`}
                        checked={formData.availability.times.includes(time)}
                        onCheckedChange={() => handleAvailabilityChange('times', time)}
                        className="scale-110"
                      />
                      <Label htmlFor={`time-${time}`} className="text-sm sm:text-base cursor-pointer leading-relaxed">
                        {time.charAt(0).toUpperCase() + time.slice(1)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons - Desktop */}
          <div className="hidden sm:flex justify-end space-x-4 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation(`/profile/${user?.id}`)}
              size="lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90"
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          {/* Mobile Bottom Actions */}
          <div className="sm:hidden pb-20">
            <div className="text-center text-sm text-muted-foreground py-4">
              Use the floating buttons below to save or cancel
            </div>
          </div>
        </form>
      </div>

      {/* Mobile Floating Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border sm:hidden">
        <div className="flex space-x-3 max-w-md mx-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation(`/profile/${user?.id}`)}
            className="flex-1 h-12 text-base font-medium"
            size="lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 h-12 text-base font-medium bg-primary hover:bg-primary/90"
            size="lg"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}