import { CheckIcon, ClockIcon, ReturnIcon } from "@/components/icons";

export type ReviewStatus = "revision" | "aprobado" | "devuelto";

/**
 * Three levels of prominence so the eye lands on what needs action first:
 * returned work shouts, work under review speaks, approved work rests.
 */
const STATUS = {
  devuelto: {
    label: "Retroalimentación",
    bg: "#FDE7E4",
    text: "#A31B10",
    ring: "#F6BDB5",
    Icon: ReturnIcon,
  },
  revision: {
    label: "En revisión",
    bg: "#FFF1DC",
    text: "#9A4B04",
    ring: "#FAD5A2",
    Icon: ClockIcon,
  },
  aprobado: {
    label: "Aprobado",
    bg: "#E3F7EC",
    text: "#0A7A4B",
    ring: "#B4E6CB",
    Icon: CheckIcon,
  },
} as const;

export function StatusBadge({
  status,
  size = "md",
}: {
  status: ReviewStatus;
  size?: "sm" | "md";
}) {
  const { label, bg, text, ring, Icon } = STATUS[status];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset ${
        size === "sm"
          ? "px-2 py-0.5 text-[11px]"
          : "px-2.5 py-1 text-[12px]"
      }`}
      style={{ backgroundColor: bg, color: text, "--tw-ring-color": ring } as React.CSSProperties}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {label}
    </span>
  );
}

/** Same amber as the "En revisión" badge, so every signal reads as one idea. */
export const REVIEW_DOT = "#E8890C";

/**
 * Marks anything holding a deliverable that is waiting on review. It pulses so
 * the pending item is findable without opening or scanning the card.
 */
export function ReviewDot({
  pending,
  color,
  size = 10,
}: {
  pending: boolean;
  /** Resting colour when nothing is pending; omit to hide the dot entirely. */
  color?: string;
  size?: number;
}) {
  if (!pending && !color) return null;

  return (
    <span
      className="relative flex shrink-0"
      style={{ height: size, width: size }}
      title={pending ? "Entrega esperando revisión" : undefined}
    >
      {pending && (
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ backgroundColor: REVIEW_DOT }}
        />
      )}
      <span
        className="relative inline-flex rounded-full"
        style={{
          height: size,
          width: size,
          backgroundColor: pending ? REVIEW_DOT : color,
        }}
      />
    </span>
  );
}

/** Count of deliverables waiting on the admin, shown on a deliverable header. */
export function PendingCountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#9A4B04] px-2 py-0.5 text-[11px] font-bold text-white">
      {count} por revisar
    </span>
  );
}
