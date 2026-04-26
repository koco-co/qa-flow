import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-md bg-white/60 dark:bg-black/40 backdrop-blur-sm",
        "border border-black/5 dark:border-white/10",
        className,
      )}
      {...rest}
    />
  ),
);
Card.displayName = "Card";
