import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { EmailVerification } from "@/components/email-verification";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft } from "lucide-react";

export function VerifyEmailPage() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/verify-email");
  const [isVerified, setIsVerified] = useState(false);
  
  // Get email from URL params or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email') || localStorage.getItem('pendingVerificationEmail') || '';
  const userName = urlParams.get('name') || localStorage.getItem('pendingVerificationName') || '';

  useEffect(() => {
    // If no email, redirect to home
    if (!email) {
      setLocation('/');
    }
  }, [email, setLocation]);

  const handleVerificationComplete = () => {
    setIsVerified(true);
    // Clear pending verification data
    localStorage.removeItem('pendingVerificationEmail');
    localStorage.removeItem('pendingVerificationName');
    
    // Redirect to home after a brief success message
    setTimeout(() => {
      setLocation('/');
    }, 3000);
  };

  const handleCancel = () => {
    // Clear pending verification data
    localStorage.removeItem('pendingVerificationEmail');
    localStorage.removeItem('pendingVerificationName');
    setLocation('/');
  };

  if (!email) {
    return null; // Will redirect
  }

  if (isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl text-green-700 dark:text-green-400">
              Email Verified!
            </CardTitle>
            <CardDescription>
              Your account has been successfully verified. You can now access all features of SkillSwap.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Redirecting you to the homepage in a few seconds...
            </p>
            <Button 
              onClick={() => setLocation('/')}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Continue to SkillSwap
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <EmailVerification
      email={email}
      userName={userName}
      onVerificationComplete={handleVerificationComplete}
      onCancel={handleCancel}
    />
  );
}