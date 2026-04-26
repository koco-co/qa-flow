import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface TextFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const TextField = forwardRef<HTMLTextAreaElement, TextFieldProps>(
  ({ className, invalid, ...rest }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full px-3 py-2 text-[14px] rounded resize-none",
        "bg-white/70 dark:bg-black/30 border",
        invalid
          ? "border-danger-light dark:border-danger-dark"
          : "border-black/10 dark:border-white/15",
        "focus:outline-none focus:ring-2 focus:ring-accent-light/50 dark:focus:ring-accent-dark/50",
        "transition-all duration-fast ease-apple-out",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      {...rest}
    />
  ),
);
TextField.displayName = "TextField";
