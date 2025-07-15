import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { UserPlus, LogIn, Mail, Lock, User, MapPin, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(5, "Password must be at least 5 characters"),
});

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  location: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

interface AuthPopupProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess: () => void;
}

export function AuthPopup({ isOpen, onOpenChange, onAuthSuccess }: AuthPopupProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const { toast } = useToast();
  const { setUser } = useAuth();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      location: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      if (!response.ok) {
        throw new Error("Login failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Update auth context immediately
      setUser(data);
      
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      
      // Close popup and trigger success handler
      onOpenChange(false);
      loginForm.reset();
      onAuthSuccess();
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupForm) => {
      const response = await apiRequest("POST", "/api/auth/signup", data);
      if (!response.ok) {
        throw new Error("Signup failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Update auth context immediately
      setUser(data);
      
      toast({
        title: "Account created!",
        description: "You have successfully signed up and logged in.",
      });
      
      // Close popup and trigger success handler
      onOpenChange(false);
      signupForm.reset();
      onAuthSuccess();
    },
    onError: (error) => {
      toast({
        title: "Signup failed",
        description: "Please try again with different credentials.",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const handleSignup = (data: SignupForm) => {
    signupMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] w-[95vw] max-h-[95vh] overflow-y-auto p-0">
        <div className="p-6 pb-4">
          <DialogHeader className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-xl font-semibold">Join Skill Swap</DialogTitle>
            <p className="text-sm text-muted-foreground">Connect with others and learn new skills</p>
          </DialogHeader>
        </div>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "signup")} className="w-full">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2 h-11">
              <TabsTrigger value="login" className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
                <span className="sm:hidden">Login</span>
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Up</span>
                <span className="sm:hidden">Sign Up</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="login" className="p-6 pt-4 space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Welcome back</h3>
              <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
            </div>
            
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Enter your email" 
                            className="pl-10 h-11"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="password" 
                            placeholder="Enter your password" 
                            className="pl-10 h-11"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-primary hover:bg-primary/90 transition-colors" 
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="signup" className="p-6 pt-4 space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Create account</h3>
              <p className="text-sm text-muted-foreground">Sign up to start swapping skills</p>
            </div>
            
            <Form {...signupForm}>
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                <FormField
                  control={signupForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Enter your full name" 
                            className="pl-10 h-11"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Enter your email" 
                            className="pl-10 h-11"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="password" 
                            placeholder="Create a password" 
                            className="pl-10 h-11"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Location (optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Enter your location" 
                            className="pl-10 h-11"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-primary hover:bg-primary/90 transition-colors mt-6" 
                  disabled={signupMutation.isPending}
                >
                  {signupMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}