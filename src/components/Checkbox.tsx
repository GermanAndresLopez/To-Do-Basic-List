"use client";

import { motion } from "motion/react";

export function Checkbox({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className="relative -m-2 flex shrink-0 touch-manipulation items-center justify-center rounded-full p-2 transition-transform duration-150 ease-out active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      <span
        className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 transition-colors duration-150 ${
          checked
            ? "border-success bg-success"
            : "border-border-strong bg-surface"
        }`}
      >
        <motion.svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-3.5 w-3.5 text-white"
          initial={false}
          animate={{ scale: checked ? 1 : 0.4, opacity: checked ? 1 : 0 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0.3 }}
        >
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </span>
    </button>
  );
}
