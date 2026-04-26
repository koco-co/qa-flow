import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export type ToastKind = "info" | "success" | "warning" | "danger";

interface ToastProps {
  kind?: ToastKind;
  message: string;
  durationMs?: number;
  onDismiss?: () => void;
}

const kindClass: Record<ToastKind, string> = {
  info: "bg-black/80 dark:bg-white/15 text-white",
  success: "bg-success-light dark:bg-success-dark text-white",
  warning: "bg-warning-light dark:bg-warning-dark text-white",
  danger: "bg-danger-light dark:bg-danger-dark text-white",
};

export function Toast({ kind = "info", message, durationMs = 3200, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onDismiss]);

  if (!visible) return null;
  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md text-[14px] shadow-lg",
        "transition-all duration-base ease-apple-out",
        kindClass[kind],
      )}
      role="status"
    >
      {message}
    </div>
  );
}
