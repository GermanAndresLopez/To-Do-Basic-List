"use client";

import { useEffect, useRef, useState } from "react";

/** Flips `true` for `durationMs` the moment `isComplete` transitions false → true. */
export function useJustCompleted(isComplete: boolean, durationMs = 400) {
  const wasComplete = useRef(isComplete);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (isComplete && !wasComplete.current) {
      wasComplete.current = true;
      setJustCompleted(true);
      const timer = setTimeout(() => setJustCompleted(false), durationMs);
      return () => clearTimeout(timer);
    }
    wasComplete.current = isComplete;
  }, [isComplete, durationMs]);

  return justCompleted;
}
