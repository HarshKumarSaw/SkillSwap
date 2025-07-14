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
import { ArrowLeft, Save, X, Plus } from "lucide-react";
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
    availability: {
      dates: [] as string[],
      times: [] as string[]
    }
  });

  const [skillsOffered, setSkillsOffered] = useState<string[]>([]);
  const [skillsWanted, setSkillsWanted] = useState<string[]>([]);

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

  const allSkills = Object.values(skillsByCategory).flat();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(`/profile/${user?.id}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Profile
              </Button>
              <h1 className="text-xl font-bold text-foreground">Edit Profile</h1>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="City, Country"
                />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  placeholder="Tell others about yourself..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="profilePhoto">Profile Photo URL</Label>
                <Input
                  id="profilePhoto"
                  value={formData.profilePhoto}
                  onChange={(e) => handleInputChange("profilePhoto", e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills Offered */}
          <Card>
            <CardHeader>
              <CardTitle>Skills I Can Offer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {allSkills.map((skill) => (
                  <div key={skill.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`offered-${skill.id}`}
                      checked={skillsOffered.includes(skill.name)}
                      onCheckedChange={() => handleSkillToggle(skill.name, 'offered')}
                    />
                    <Label
                      htmlFor={`offered-${skill.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {skill.name}
                    </Label>
                  </div>
                ))}
              </div>
              {skillsOffered.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium">Selected Skills:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {skillsOffered.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      >
                        {skill}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-1 h-4 w-4 p-0"
                          onClick={() => handleSkillToggle(skill, 'offered')}
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
          <Card>
            <CardHeader>
              <CardTitle>Skills I Want to Learn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {allSkills.map((skill) => (
                  <div key={skill.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`wanted-${skill.id}`}
                      checked={skillsWanted.includes(skill.name)}
                      onCheckedChange={() => handleSkillToggle(skill.name, 'wanted')}
                    />
                    <Label
                      htmlFor={`wanted-${skill.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {skill.name}
                    </Label>
                  </div>
                ))}
              </div>
              {skillsWanted.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium">Selected Skills:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {skillsWanted.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        {skill}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-1 h-4 w-4 p-0"
                          onClick={() => handleSkillToggle(skill, 'wanted')}
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
          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Available Days</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["weekends", "weekdays", "everyday"].map((date) => (
                    <div key={date} className="flex items-center space-x-2">
                      <Checkbox
                        id={`date-${date}`}
                        checked={formData.availability.dates.includes(date)}
                        onCheckedChange={() => handleAvailabilityChange('dates', date)}
                      />
                      <Label htmlFor={`date-${date}`} className="text-sm cursor-pointer">
                        {date.charAt(0).toUpperCase() + date.slice(1)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Available Times</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["morning", "evening", "night"].map((time) => (
                    <div key={time} className="flex items-center space-x-2">
                      <Checkbox
                        id={`time-${time}`}
                        checked={formData.availability.times.includes(time)}
                        onCheckedChange={() => handleAvailabilityChange('times', time)}
                      />
                      <Label htmlFor={`time-${time}`} className="text-sm cursor-pointer">
                        {time.charAt(0).toUpperCase() + time.slice(1)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation(`/profile/${user?.id}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}