export const TASK_COLORS = [
  { bg: "#EAF2FF", border: "#CFE3FF", dot: "#0A6DFF" }, // blue
  { bg: "#F4EEFF", border: "#E1D3FF", dot: "#7C4DFF" }, // violet
  { bg: "#EAFBF1", border: "#C7EFD9", dot: "#22A352" }, // green
  { bg: "#FFF4E8", border: "#FFE1B8", dot: "#E08A1E" }, // amber
  { bg: "#FFEDF3", border: "#FFD2E1", dot: "#E0447A" }, // pink
  { bg: "#E8FBFA", border: "#C6F1EE", dot: "#12938A" }, // teal
] as const;

export function getTaskColor(index: number) {
  return TASK_COLORS[index % TASK_COLORS.length];
}
