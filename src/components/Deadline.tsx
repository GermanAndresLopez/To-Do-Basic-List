"use client";

import { useEffect, useState } from "react";
import { ClockIcon } from "@/components/icons";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Turns "2026-09-30" into the last instant of that day, in the local zone. */
export function endOfLocalDay(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

/** Reverse of `endOfLocalDay`, for filling a native date input. */
export function toDateInputValue(timestamp: number) {
  const date = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(timestamp));
}

/** Wording that reads naturally at every distance from the due date. */
function describe(remaining: number) {
  if (remaining <= 0) {
    const overdueDays = Math.floor(-remaining / DAY_MS);
    if (overdueDays === 0) return "Vence hoy";
    return `Vencido hace ${overdueDays} día${overdueDays === 1 ? "" : "s"}`;
  }

  const days = Math.floor(remaining / DAY_MS);
  if (days >= 1) return `Faltan ${days} día${days === 1 ? "" : "s"}`;

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  if (hours >= 1) return `Faltan ${hours} hora${hours === 1 ? "" : "s"}`;

  const minutes = Math.max(1, Math.floor(remaining / (60 * 1000)));
  return `Faltan ${minutes} minuto${minutes === 1 ? "" : "s"}`;
}

function toneOf(remaining: number) {
  if (remaining <= 0) return { bg: "#FDE7E4", text: "#A31B10", ring: "#F6BDB5" };
  if (remaining < 3 * DAY_MS)
    return { bg: "#FDE7E4", text: "#A31B10", ring: "#F6BDB5" };
  if (remaining < 14 * DAY_MS)
    return { bg: "#FFF1DC", text: "#9A4B04", ring: "#FAD5A2" };
  return { bg: "#EEF1F5", text: "#4A5561", ring: "#DCE1E8" };
}

export function Deadline({ deadline }: { deadline: number }) {
  // Recomputed on a timer so the countdown stays honest on a page left open.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const remaining = deadline - now;
  const tone = toneOf(remaining);

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset"
      style={
        {
          backgroundColor: tone.bg,
          color: tone.text,
          "--tw-ring-color": tone.ring,
        } as React.CSSProperties
      }
      title={`Fecha límite: ${formatDate(deadline)}`}
    >
      <ClockIcon className="h-3.5 w-3.5" />
      {describe(remaining)}
      <span className="font-normal opacity-70">
        · {formatDate(deadline)}
      </span>
    </span>
  );
}
