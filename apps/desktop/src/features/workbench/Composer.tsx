import { useState, useEffect, useRef, type DragEvent } from "react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useWorkbenchStore } from "@/stores/workbenchStore";
import { useProjectStore } from "@/stores/projectStore";

export function Composer() {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const project = useProjectStore((s) => s.current);
  const activeTask = useWorkbenchStore((s) => s.activeTask);
  const send = useWorkbenchStore((s) => s.send);
  const stop = useWorkbenchStore((s) => s.stop);

  useEffect(() => { ref.current?.focus(); }, [project]);

  const isActive = activeTask?.status === "running";
  const disabled = !project || isActive;

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const submit = async () => {
    if (!project || !text.trim()) return;
    await send(project, text);
    setText("");
  };

  const onStop = async () => {
    if (project) await stop(project);
  };

  const onDrop = (e: DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const path = e.dataTransfer.getData("text/x-kata-relpath");
    if (path) {
      setText((t) => (t ? `${t} @${path}` : `@${path}`));
      ref.current?.focus();
    }
  };

  const onDragOver = (e: DragEvent<HTMLTextAreaElement>) => {
    if (e.dataTransfer.types.includes("text/x-kata-relpath")) {
      e.preventDefault();
    }
  };

  return (
    <div className="border-t border-black/8 dark:border-white/10 p-3 flex gap-2 items-end">
      <TextField
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        onDrop={onDrop}
        onDragOver={onDragOver}
        rows={3}
        disabled={disabled}
        placeholder={project ? "输入命令或自然语言（Enter 发送，Shift+Enter 换行）" : "请先选择项目"}
      />
      {isActive ? (
        <Button variant="danger" size="md" onClick={onStop} className="self-end">
          <Square className="size-4" />
        </Button>
      ) : (
        <Button variant="primary" size="md" onClick={submit} disabled={disabled || !text.trim()} className="self-end">
          <ArrowUp className="size-4" />
        </Button>
      )}
    </div>
  );
}
