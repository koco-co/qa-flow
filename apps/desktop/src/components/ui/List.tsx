import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ListItemProps {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

export function ListItem({ selected, onClick, children, className }: ListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full text-left px-3 py-2 text-[14px] rounded",
        "transition-all duration-fast ease-apple-out",
        "hover:bg-black/5 dark:hover:bg-white/10",
        selected && "bg-black/8 dark:bg-white/15",
        className,
      )}
    >
      {selected && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-accent-light dark:bg-accent-dark" />
      )}
      {children}
    </button>
  );
}

export function List({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-0.5", className)}>{children}</div>;
}
