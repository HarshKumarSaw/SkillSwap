import { useState, useEffect } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { UserCard } from "@/components/user-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Loader2 } from "lucide-react";
import { UserWithSkills } from "@shared/schema";

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkillFilters, setSelectedSkillFilters] = useState<string[]>([]);
  const [selectedAvailabilityFilters, setSelectedAvailabilityFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("recent");

  // Fetch users with pagination (load 6 at a time for faster loading)
  const { data: users = [], isLoading: usersLoading, isFetching } = useQuery<UserWithSkills[]>({
    queryKey: ["/api/users"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Fetch skills by category
  const { data: skillsByCategory = {} } = useQuery<Record<string, any[]>>({
    queryKey: ["/api/skills"],
    staleTime: 30 * 60 * 1000, // Cache skills for 30 minutes
  });

  // Fetch filtered users when filters change
  const { data: filteredUsers = [], isLoading: searchLoading } = useQuery<UserWithSkills[]>({
    queryKey: ["/api/users/search", searchTerm, selectedSkillFilters.join(","), selectedAvailabilityFilters.join(",")],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (selectedSkillFilters.length > 0) params.append('skills', selectedSkillFilters.join(','));
      if (selectedAvailabilityFilters.length > 0) params.append('availability', selectedAvailabilityFilters.join(','));
      
      const url = `/api/users/search?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch filtered users');
      }
      return response.json();
    },
    enabled: searchTerm.length > 0 || selectedSkillFilters.length > 0 || selectedAvailabilityFilters.length > 0,
    staleTime: 2 * 60 * 1000, // Cache search results for 2 minutes
  });

  const displayUsers = (searchTerm || selectedSkillFilters.length > 0 || selectedAvailabilityFilters.length > 0) ? filteredUsers : users;
  const isLoading = usersLoading || searchLoading;

  const handleSkillFilterToggle = (category: string) => {
    setSelectedSkillFilters(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleAvailabilityFilterToggle = (availability: string) => {
    setSelectedAvailabilityFilters(prev => 
      prev.includes(availability) 
        ? prev.filter(a => a !== availability)
        : [...prev, availability]
    );
  };

  const skillCategories = Object.keys(skillsByCategory);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-slate-800">SkillSwap</h1>
              <div className="hidden md:block text-sm text-slate-500">Browse & Connect</div>
            </div>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search skills (e.g., Photoshop, Excel)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button className="bg-primary hover:bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Profile
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar Filters */}
          <aside className="lg:w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-md font-semibold text-slate-800 mb-3">Filter by Skills</h3>
                
                <div className="flex flex-wrap gap-1 mb-4">
                  {skillCategories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedSkillFilters.includes(category) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSkillFilterToggle(category)}
                      className="text-xs h-7"
                    >
                      {category}
                    </Button>
                  ))}
                </div>

                <hr className="my-3 border-slate-200" />

                <h4 className="text-sm font-medium text-slate-800 mb-2">Availability</h4>
                <div className="space-y-1">
                  {["weekends", "evenings", "weekdays"].map((availability) => (
                    <div key={availability} className="flex items-center space-x-2">
                      <Checkbox
                        id={availability}
                        checked={selectedAvailabilityFilters.includes(availability)}
                        onCheckedChange={() => handleAvailabilityFilterToggle(availability)}
                      />
                      <label htmlFor={availability} className="text-xs text-slate-600 capitalize">
                        {availability}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Available Users</h2>
                <p className="text-slate-600 mt-1">
                  Showing {displayUsers.length} user{displayUsers.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="skills">Most Skills</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="location">Nearest Location</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Loading State with Skeleton */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="h-12 w-12 bg-slate-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                          <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-slate-200 rounded w-full"></div>
                        <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                      </div>
                      <div className="mt-4 flex space-x-2">
                        <div className="h-6 bg-slate-200 rounded w-16"></div>
                        <div className="h-6 bg-slate-200 rounded w-20"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* No Results State */}
            {!isLoading && displayUsers.length === 0 && (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <Search className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <h3 className="text-lg font-medium text-slate-800 mb-2">No users found</h3>
                  <p className="text-slate-600">Try adjusting your search criteria or filters to find more users.</p>
                </div>
              </div>
            )}

            {/* User Cards Grid */}
            {!isLoading && displayUsers.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {displayUsers.map((user, index) => (
                  <UserCard key={user.id || `user-${index}`} user={user} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
