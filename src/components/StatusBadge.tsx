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

/** Count of deliverables waiting on the admin, shown on a deliverable header. */
export function PendingCountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#9A4B04] px-2 py-0.5 text-[11px] font-bold text-white">
      {count} por revisar
    </span>
  );
}
