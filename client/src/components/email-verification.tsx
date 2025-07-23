import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Mail, Clock, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

interface EmailVerificationProps {
  email: string;
  userName?: string;
  onVerificationComplete: () => void;
  onCancel?: () => void;
}

export function EmailVerification({ 
  email, 
  userName, 
  onVerificationComplete, 
  onCancel 
}: EmailVerificationProps) {
  const [otpCode, setOtpCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [isExpired, setIsExpired] = useState(false);
  const { setUser } = useAuth();

  // Start countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup timer on component unmount
    return () => clearInterval(timer);
  }, []);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Send OTP mutation
  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/send-otp", {
        email,
        userName
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send verification code");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Code sent!",
        description: "A new verification code has been sent to your email.",
      });
      setTimeLeft(600); // Reset timer
      setIsExpired(false);
      setOtpCode("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verify OTP mutation
  const verifyOtpMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/auth/verify-otp", {
        email,
        otpCode: code
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Invalid verification code");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Update auth context with the logged-in user
      if (data.user) {
        setUser(data.user);
      }
      
      toast({
        title: "Email verified!",
        description: "Your account has been successfully verified.",
      });
      onVerificationComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
      setOtpCode("");
    },
  });

  const handleVerifyOtp = () => {
    if (otpCode.length === 6) {
      verifyOtpMutation.mutate(otpCode);
    }
  };

  const handleResendCode = () => {
    sendOtpMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription className="text-center">
            We've sent a 6-digit verification code to<br />
            <strong className="text-foreground">{email}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* OTP Input */}
          <div className="space-y-4">
            <div className="text-center">
              <label className="text-sm font-medium">Enter verification code:</label>
            </div>
            
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
                disabled={verifyOtpMutation.isPending || isExpired}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          {/* Timer and Status */}
          <div className="text-center space-y-2">
            {!isExpired ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Code expires in {formatTime(timeLeft)}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>Verification code has expired</span>
              </div>
            )}
          </div>

          {/* Verify Button */}
          <Button
            onClick={handleVerifyOtp}
            disabled={otpCode.length !== 6 || verifyOtpMutation.isPending || isExpired}
            className="w-full"
            size="lg"
          >
            {verifyOtpMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify Email
              </>
            )}
          </Button>

          {/* Resend Code */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?
            </p>
            <Button
              variant="outline"
              onClick={handleResendCode}
              disabled={sendOtpMutation.isPending || (!isExpired && timeLeft > 540)} // Allow resend after 1 minute
              className="w-full"
            >
              {sendOtpMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send New Code
                </>
              )}
            </Button>
          </div>

          {/* Cancel/Back Button */}
          {onCancel && (
            <Button
              variant="ghost"
              onClick={onCancel}
              className="w-full"
            >
              Cancel
            </Button>
          )}

          {/* Help Text */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>Check your spam folder if you don't see the email.</p>
            <p>The verification code is case-sensitive.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}