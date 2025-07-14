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
          ? "skill-tag-offered"
          : "skill-tag-wanted",
        className
      )}
    >
      {skill}
    </span>
  );
}
