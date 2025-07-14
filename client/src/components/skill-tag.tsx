import { cn } from "@/lib/utils";

interface SkillTagProps {
  skill: string;
  variant?: "offered" | "wanted";
  className?: string;
}

export function SkillTag({ skill, variant = "offered", className }: SkillTagProps) {
  return (
    <span
      className={cn(
        "px-2 py-1 text-xs rounded-full font-medium",
        variant === "offered"
          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
          : "bg-indigo-50 text-indigo-600 border border-indigo-200",
        className
      )}
    >
      {skill}
    </span>
  );
}
