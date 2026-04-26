import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ProjectsList } from "@/features/projects/ProjectsList";
import { FileTree } from "@/features/filetree/FileTree";
import { TextPreview } from "@/features/filetree/TextPreview";

interface SidebarProps {
  className?: string;
  bottomSlot?: ReactNode;
}

export function Sidebar({ className, bottomSlot }: SidebarProps) {
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  return (
    <aside className={cn(
      "vibrancy-sidebar h-full w-[280px] flex flex-col",
      "border-r border-black/8 dark:border-white/10",
      className,
    )}>
      <div className="px-3 pt-12 pb-2 text-[11px] uppercase tracking-wider opacity-50">Projects</div>
      <div className="flex-shrink-0"><ProjectsList /></div>
      <div className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wider opacity-50">Files</div>
      <div className="flex-1 overflow-y-auto"><FileTree onPreview={setPreviewPath} /></div>
      <TextPreview path={previewPath} />
      {bottomSlot}
    </aside>
  );
}
