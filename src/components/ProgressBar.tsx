"use client";

import { motion } from "motion/react";
import { useJustCompleted } from "@/lib/useJustCompleted";

export function ProgressBar({
  completed,
  total,
  size = "md",
}: {
  completed: number;
  total: number;
  size?: "sm" | "md";
}) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  const isComplete = total > 0 && completed === total;
  const celebrate = useJustCompleted(isComplete, 400);

  return (
    <div className="flex items-center gap-3">
      <motion.div
        className={`relative flex-1 overflow-hidden rounded-full bg-border ${
          size === "sm" ? "h-1.5" : "h-2"
        }`}
        animate={celebrate ? { scaleY: [1, 1.8, 1] } : {}}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <motion.div
          className={`h-full rounded-full ${
            isComplete ? "bg-success" : "bg-accent"
          }`}
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
        />
      </motion.div>
      <span className="w-9 shrink-0 text-right text-[13px] font-medium tabular-nums text-ink-secondary">
        {percent}%
      </span>
    </div>
  );
}
