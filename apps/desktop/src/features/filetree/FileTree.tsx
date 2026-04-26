import { useEffect, useState, type DragEvent } from "react";
import { ChevronRight, File, Folder } from "lucide-react";
import { filesIpc } from "@/lib/ipc";
import { useProjectStore } from "@/stores/projectStore";
import type { FileEntry } from "@/lib/types";
import { cn } from "@/lib/cn";

interface NodeProps {
  entry: FileEntry;
  project: string;
  sub: string;
  onPreview: (path: string) => void;
}

function relPathFor(project: string, fullPath: string): string {
  const marker = `/workspace/${project}/`;
  const idx = fullPath.indexOf(marker);
  return idx >= 0 ? fullPath.slice(idx + 1) : fullPath;
}

function Node({ entry, project, sub, onPreview }: NodeProps) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<FileEntry[] | null>(null);

  const onClick = async () => {
    if (entry.is_dir) {
      const next = !open;
      setOpen(next);
      if (next && children === null) {
        const subPath = sub ? `${sub}/${entry.name}` : entry.name;
        const items = await filesIpc.listFiles(project, subPath);
        setChildren(items);
      }
    } else {
      onPreview(entry.path);
    }
  };

  const onDoubleClick = async () => {
    if (!entry.is_dir) await filesIpc.openWithDefault(entry.path);
  };

  const onDragStart = (e: DragEvent<HTMLDivElement>) => {
    if (entry.is_dir) return;
    const rel = relPathFor(project, entry.path);
    e.dataTransfer.setData("text/x-kata-relpath", rel);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div>
      <div
        draggable={!entry.is_dir}
        onDragStart={onDragStart}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        className="px-2 py-1 text-[12.5px] hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer flex items-center gap-1.5 select-none"
      >
        {entry.is_dir
          ? <ChevronRight className={cn("size-3.5 transition-transform duration-fast", open && "rotate-90")} />
          : <span className="w-3.5" />
        }
        {entry.is_dir
          ? <Folder className="size-3.5 opacity-70" />
          : <File className="size-3.5 opacity-70" />
        }
        <span className="truncate">{entry.name}</span>
      </div>
      {open && children && (
        <div className="ml-4">
          {children.map((c) => (
            <Node key={c.path} entry={c} project={project} sub={sub ? `${sub}/${entry.name}` : entry.name} onPreview={onPreview} />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileTreeProps {
  onPreview: (path: string) => void;
}

export function FileTree({ onPreview }: FileTreeProps) {
  const project = useProjectStore((s) => s.current);
  const [entries, setEntries] = useState<FileEntry[]>([]);

  useEffect(() => {
    if (!project) { setEntries([]); return; }
    filesIpc.listFiles(project).then(setEntries);
  }, [project]);

  if (!project) return null;
  return (
    <div className="p-1.5">
      {entries.length === 0
        ? <div className="px-2 py-1 text-[12px] opacity-50">空目录</div>
        : entries.map((e) => (
            <Node key={e.path} entry={e} project={project} sub="" onPreview={onPreview} />
          ))
      }
    </div>
  );
}
