"use client";

import { useState } from "react";
import { buildSubtaskName, parseSubtaskName } from "@/lib/subtaskFormat";

/**
 * Splits the stored name into its two halves so the task wording and the
 * people accountable for it can be edited without touching each other.
 */
export function SubtaskEditor({
  name,
  onRename,
}: {
  name: string;
  onRename: (name: string) => void;
}) {
  const parsed = parseSubtaskName(name);
  const [text, setText] = useState(parsed.text);
  const [responsibles, setResponsibles] = useState(parsed.responsiblesRaw);

  function commit() {
    if (!text.trim()) return;
    const next = buildSubtaskName(text, responsibles);
    if (next !== name) onRename(next);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        placeholder="Nombre de la tarea"
        className="w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-[14px] text-ink outline-none focus:border-accent"
      />
      <input
        value={responsibles}
        onChange={(e) => setResponsibles(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        placeholder="Responsables"
        className="w-full rounded-md border border-border bg-surface px-2 py-1 text-[12px] text-ink-secondary outline-none focus:border-accent"
      />
    </div>
  );
}
