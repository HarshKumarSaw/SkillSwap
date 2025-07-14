import { useState, useEffect } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { UserCard } from "@/components/user-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Plus, Loader2, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { UserWithSkills } from "@shared/schema";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkillFilters, setSelectedSkillFilters] = useState<string[]>([]);
  const [selectedDateFilters, setSelectedDateFilters] = useState<string[]>([]);
  const [selectedTimeFilters, setSelectedTimeFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(8); // 8 users per page for optimized loading
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Fetch users with pagination
  const { data: paginatedUsers, isLoading: usersLoading, isFetching } = useQuery<{
    data: UserWithSkills[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }>({
    queryKey: ["/api/users", currentPage, usersPerPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', usersPerPage.toString());
      
      const url = `/api/users?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const users = paginatedUsers?.data || [];

  // Fetch skills by category
  const { data: skillsByCategory = {} } = useQuery<Record<string, any[]>>({
    queryKey: ["/api/skills"],
    staleTime: 30 * 60 * 1000, // Cache skills for 30 minutes
  });

  // Fetch filtered users when filters change
  const { data: filteredUsers = [], isLoading: searchLoading } = useQuery<UserWithSkills[]>({
    queryKey: ["/api/users/search", searchTerm, selectedSkillFilters.join(","), selectedDateFilters.join(","), selectedTimeFilters.join(",")],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (selectedSkillFilters.length > 0) params.append('skills', selectedSkillFilters.join(','));
      if (selectedDateFilters.length > 0) params.append('dates', selectedDateFilters.join(','));
      if (selectedTimeFilters.length > 0) params.append('times', selectedTimeFilters.join(','));
      
      const url = `/api/users/search?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch filtered users');
      }
      return response.json();
    },
    enabled: searchTerm.length > 0 || selectedSkillFilters.length > 0 || selectedDateFilters.length > 0 || selectedTimeFilters.length > 0,
    staleTime: 30 * 1000, // Cache search results for 30 seconds (shorter to see sorting changes faster)
  });

  // Sort users based on selected criteria
  const sortUsers = (users: UserWithSkills[]) => {
    const sorted = [...users];
    
    switch (sortBy) {
      case "recent":
        // Sort by ID (assuming higher ID = more recent)
        return sorted.sort((a, b) => b.id.localeCompare(a.id));
      
      case "skills":
        // Sort by total number of skills (offered + wanted)
        return sorted.sort((a, b) => {
          const totalSkillsA = a.skillsOffered.length + a.skillsWanted.length;
          const totalSkillsB = b.skillsOffered.length + b.skillsWanted.length;
          return totalSkillsB - totalSkillsA;
        });
      
      case "rating":
        // Sort by rating (highest first)
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      
      case "location":
        // Sort alphabetically by location
        return sorted.sort((a, b) => {
          const locationA = a.location || "ZZZ"; // Put null locations at the end
          const locationB = b.location || "ZZZ";
          return locationA.localeCompare(locationB);
        });
      
      default:
        return sorted;
    }
  };

  const baseUsers = (searchTerm || selectedSkillFilters.length > 0 || selectedDateFilters.length > 0 || selectedTimeFilters.length > 0) ? filteredUsers : users;
  const displayUsers = sortUsers(baseUsers);
  const isLoading = usersLoading || searchLoading;
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSkillFilters, selectedDateFilters, selectedTimeFilters]);

  const handleSkillFilterToggle = (category: string) => {
    setSelectedSkillFilters(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleDateFilterToggle = (date: string) => {
    setSelectedDateFilters(prev => {
      const isSelected = prev.includes(date);
      
      if (isSelected) {
        // Remove the selected date
        return prev.filter(d => d !== date);
      } else {
        // Add the selected date with logic constraints
        let newSelection = [...prev, date];
        
        if (date === "everyday") {
          // If selecting "everyday", remove weekdays and weekends
          newSelection = ["everyday"];
        } else if (date === "weekdays" || date === "weekends") {
          // Remove "everyday" if it exists
          newSelection = newSelection.filter(d => d !== "everyday");
          
          // Check if both weekdays and weekends are now selected
          if (newSelection.includes("weekdays") && newSelection.includes("weekends")) {
            // Replace with "everyday"
            newSelection = ["everyday"];
          }
        }
        
        return newSelection;
      }
    });
  };

  const handleTimeFilterToggle = (time: string) => {
    setSelectedTimeFilters(prev => 
      prev.includes(time) 
        ? prev.filter(t => t !== time)
        : [...prev, time]
    );
  };

  const skillCategories = Object.keys(skillsByCategory);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">SkillSwap</h1>
              <div className="hidden lg:block text-sm text-muted-foreground">Browse & Connect</div>
            </div>
            


            <div className="flex items-center space-x-2 flex-shrink-0">
              <ThemeToggle />
              <Button className="bg-primary dark:bg-[#0b3675] hover:bg-primary/90 dark:hover:bg-[#0b3675]/90 text-sm px-3 sm:px-4">
                <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Add Profile</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Controls Panel - Mobile First Layout */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6 shadow-sm">
          {/* Search Bar - Top on Mobile */}
          <div className="mb-4 sm:hidden">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm w-full border-gray-300 dark:border-gray-600 focus:ring-[#0053d6] focus:border-[#0053d6]"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            </div>
          </div>

          {/* Filter and Sort Row - Below Search on Mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-4 min-w-0 flex-1">
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {(selectedSkillFilters.length > 0 || selectedDateFilters.length > 0 || selectedTimeFilters.length > 0) && (
                  <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                    {selectedSkillFilters.length + selectedDateFilters.length + selectedTimeFilters.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Filters</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsFilterOpen(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Skills Filter */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Skills</label>
                  <Select 
                    value={selectedSkillFilters.length > 0 ? selectedSkillFilters[0] : ""} 
                    onValueChange={(value) => {
                      if (value && !selectedSkillFilters.includes(value)) {
                        setSelectedSkillFilters(prev => [...prev, value]);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Select skill" />
                    </SelectTrigger>
                    <SelectContent>
                      {skillCategories.map((category) => (
                        <SelectItem key={category} value={category} className="text-xs">
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dates Filter */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Dates</label>
                  <Select 
                    value={selectedDateFilters.length > 0 ? selectedDateFilters[0] : ""} 
                    onValueChange={(value) => {
                      if (value) {
                        handleDateFilterToggle(value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Select dates" />
                    </SelectTrigger>
                    <SelectContent>
                      {["weekends", "weekdays", "everyday"].map((date) => (
                        <SelectItem key={date} value={date} className="text-xs">
                          {date.charAt(0).toUpperCase() + date.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Times Filter */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Times</label>
                  <Select 
                    value={selectedTimeFilters.length > 0 ? selectedTimeFilters[0] : ""} 
                    onValueChange={(value) => {
                      if (value && !selectedTimeFilters.includes(value)) {
                        setSelectedTimeFilters(prev => [...prev, value]);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Select times" />
                    </SelectTrigger>
                    <SelectContent>
                      {["morning", "evening", "night"].map((time) => (
                        <SelectItem key={time} value={time} className="text-xs">
                          {time.charAt(0).toUpperCase() + time.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear All Filters */}
                {(selectedSkillFilters.length > 0 || selectedDateFilters.length > 0 || selectedTimeFilters.length > 0) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setSelectedSkillFilters([]);
                      setSelectedDateFilters([]);
                      setSelectedTimeFilters([]);
                    }}
                    className="w-full"
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Active Filter Tags */}
          <div className="flex flex-wrap gap-1">
            {selectedSkillFilters.map((skill) => (
              <Badge 
                key={skill} 
                variant="secondary" 
                className="text-xs px-2 py-1 cursor-pointer hover:bg-red-100"
                onClick={() => handleSkillFilterToggle(skill)}
              >
                {skill} ×
              </Badge>
            ))}
            {selectedDateFilters.map((date) => (
              <Badge 
                key={date} 
                variant="outline" 
                className="text-xs px-2 py-1 cursor-pointer hover:bg-red-100"
                onClick={() => handleDateFilterToggle(date)}
              >
                {date.charAt(0).toUpperCase() + date.slice(1)} ×
              </Badge>
            ))}
            {selectedTimeFilters.map((time) => (
              <Badge 
                key={time} 
                variant="outline" 
                className="text-xs px-2 py-1 cursor-pointer hover:bg-red-100"
                onClick={() => handleTimeFilterToggle(time)}
              >
                {time.charAt(0).toUpperCase() + time.slice(1)} ×
              </Badge>
            ))}
          </div>

              {/* Sort Button - Same row as filter on mobile */}
              <div className="sm:hidden">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-auto min-w-[120px]">
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
            </div>

            {/* Desktop Layout - Search Bar and Sort Button */}
            <div className="hidden sm:flex items-center gap-4">
              {/* Search Bar - Hidden on Mobile, Visible on Desktop */}
              <div className="flex-shrink-0 w-full sm:w-auto sm:max-w-xs">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search skills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-sm w-full border-gray-300 dark:border-gray-600 focus:ring-[#0053d6] focus:border-[#0053d6]"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                </div>
              </div>

              {/* Sort Button */}
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
          </div>
        </div>

        {/* Main Content */}
        <main className="w-full">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-[#0053d6]">Available Users</h2>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              {paginatedUsers && !searchTerm && selectedSkillFilters.length === 0 && selectedDateFilters.length === 0 && selectedTimeFilters.length === 0
                ? `Showing ${((currentPage - 1) * usersPerPage) + 1}-${Math.min(currentPage * usersPerPage, paginatedUsers.totalCount)} of ${paginatedUsers.totalCount} users`
                : `Showing ${displayUsers.length} user${displayUsers.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>

          {/* Loading State with Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
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
                <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
                <p className="text-muted-foreground">Try adjusting your search criteria or filters to find more users.</p>
              </div>
            </div>
          )}

          {/* User Cards Grid - Optimized for 8 users */}
          {!isLoading && displayUsers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {displayUsers.map((user, index) => (
                <UserCard key={user.id || `user-${index}`} user={user} />
              ))}
            </div>
          )}

          {/* Pagination Controls - only show when not filtering */}
          {!isLoading && paginatedUsers && !searchTerm && selectedSkillFilters.length === 0 && selectedDateFilters.length === 0 && selectedTimeFilters.length === 0 && paginatedUsers.totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={!paginatedUsers.hasPreviousPage || isFetching}
                className="flex items-center gap-1 dark:hover:bg-[#0b3675]/20"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: paginatedUsers.totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    disabled={isFetching}
                    className={`w-8 h-8 p-0 ${page === currentPage ? 'bg-primary dark:bg-[#0b3675] hover:bg-primary/90 dark:hover:bg-[#0b3675]/90' : 'dark:hover:bg-[#0b3675]/20'}`}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(paginatedUsers.totalPages, prev + 1))}
                disabled={!paginatedUsers.hasNextPage || isFetching}
                className="flex items-center gap-1 dark:hover:bg-[#0b3675]/20"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
