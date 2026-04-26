import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary:
    "bg-accent-light dark:bg-accent-dark text-white hover:opacity-90",
  secondary:
    "bg-black/5 dark:bg-white/10 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/15",
  ghost:
    "bg-transparent text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10",
  danger:
    "bg-danger-light dark:bg-danger-dark text-white hover:opacity-90",
};

const sizeClass: Record<Size, string> = {
  sm: "h-7 px-3 text-[13px] rounded-sm",
  md: "h-9 px-4 text-[14px] rounded",
  lg: "h-11 px-5 text-[15px] rounded-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", loading, disabled, children, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium",
        "transition-all duration-base ease-apple-out",
        "active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...rest}
    >
      {loading ? <span className="opacity-70">...</span> : children}
    </button>
  ),
);
Button.displayName = "Button";
