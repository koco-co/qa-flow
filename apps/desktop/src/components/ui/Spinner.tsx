import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block w-4 h-4 border-2 rounded-full",
        "border-current border-r-transparent animate-spin",
        className,
      )}
      role="status"
      aria-label="loading"
    />
  );
}
