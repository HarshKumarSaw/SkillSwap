import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogIn, LogOut, User, Settings, Edit, ArrowRightLeft, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthPopup } from "./auth-popup";
import { useLocation } from "wouter";

export function UserMenu() {
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleAuthSuccess = () => {
    // No additional action needed after login
  };

  if (!isAuthenticated) {
    return (
      <>
        <Button 
          onClick={() => setShowAuthPopup(true)}
          className="bg-primary dark:bg-[#0b3675] hover:bg-primary/90 dark:hover:bg-[#0b3675]/90 text-sm px-3 sm:px-4"
        >
          <LogIn className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Login</span>
          <span className="sm:hidden">Login</span>
        </Button>
        
        <AuthPopup
          isOpen={showAuthPopup}
          onOpenChange={setShowAuthPopup}
          onAuthSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.profilePhoto || user?.profile_photo} alt={user?.name || "User"} />
            <AvatarFallback>
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium">{user?.name}</p>
            <p className="w-[200px] truncate text-sm text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setLocation(`/profile/${user?.id}`)}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocation(`/edit-profile`)}>
          <Edit className="mr-2 h-4 w-4" />
          <span>Edit Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocation(`/swap-requests`)}>
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          <span>Swap Requests</span>
        </DropdownMenuItem>
        {user?.role === 'admin' && (
          <DropdownMenuItem onClick={() => setLocation(`/admin`)}>
            <Shield className="mr-2 h-4 w-4" />
            <span>Admin Dashboard</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}