import { useEffect, useState } from "react";
import { filesIpc } from "@/lib/ipc";

export function TextPreview({ path }: { path: string | null }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) { setText(null); setError(null); return; }
    filesIpc.readFileText(path).then(setText).catch((e) => setError(String(e)));
  }, [path]);

  if (!path) return null;
  return (
    <div className="border-t border-black/8 dark:border-white/10 max-h-64 overflow-auto p-3">
      <div className="text-[11px] opacity-50 mb-1.5 font-mono truncate">{path}</div>
      {error
        ? <div className="text-[12px] text-danger-light dark:text-danger-dark">{error}</div>
        : <pre className="text-[12px] font-mono whitespace-pre-wrap">{text ?? "…"}</pre>
      }
    </div>
  );
}
