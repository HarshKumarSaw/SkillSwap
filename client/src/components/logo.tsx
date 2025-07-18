import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showTagline?: boolean;
  className?: string;
}

export function Logo({ 
  size = "md", 
  showIcon = true, 
  showTagline = true, 
  className 
}: LogoProps) {
  const sizes = {
    sm: {
      icon: "w-6 h-6",
      iconInner: "w-3 h-3",
      iconDot: "w-1.5 h-1.5",
      text: "text-lg",
      tagline: "text-xs"
    },
    md: {
      icon: "w-8 h-8 sm:w-10 sm:h-10",
      iconInner: "w-4 h-4 sm:w-5 sm:h-5",
      iconDot: "w-2 h-2 sm:w-2.5 sm:h-2.5",
      text: "text-xl sm:text-2xl",
      tagline: "text-xs"
    },
    lg: {
      icon: "w-12 h-12",
      iconInner: "w-6 h-6",
      iconDot: "w-3 h-3",
      text: "text-3xl",
      tagline: "text-sm"
    }
  };

  const currentSize = sizes[size];

  return (
    <div className={cn("flex items-center space-x-3", className)}>
      {showIcon && (
        <div className="relative">
          <div className={cn(
            "bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg",
            currentSize.icon
          )}>
            <div className={cn(
              "bg-white rounded-sm transform rotate-45 opacity-90",
              currentSize.iconInner
            )}></div>
            <div className={cn(
              "absolute top-1 left-1 bg-white rounded-full",
              currentSize.iconDot
            )}></div>
          </div>
        </div>
      )}
      
      <div className="flex flex-col">
        <h1 className={cn(
          "font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent leading-none",
          currentSize.text
        )}>
          SkillSwap
        </h1>
        {showTagline && (
          <div className={cn(
            "hidden sm:block text-muted-foreground font-medium tracking-wide",
            currentSize.tagline
          )}>
            Connect & Learn
          </div>
        )}
      </div>
    </div>
  );
}