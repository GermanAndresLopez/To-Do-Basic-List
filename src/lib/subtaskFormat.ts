const RESPONSIBLE_SEPARATOR = " — ";

/**
 * Subtasks are stored as "description — Responsable A y Responsable B".
 * `responsiblesRaw` keeps the wording untouched for editing, while `people`
 * is the split-up version used to render one chip per person.
 */
export function parseSubtaskName(raw: string): {
  text: string;
  responsiblesRaw: string;
  people: string[];
} {
  const idx = raw.lastIndexOf(RESPONSIBLE_SEPARATOR);
  if (idx === -1) return { text: raw, responsiblesRaw: "", people: [] };

  const text = raw.slice(0, idx).trim();
  const responsiblesRaw = raw.slice(idx + RESPONSIBLE_SEPARATOR.length).trim();
  if (!text || !responsiblesRaw) {
    return { text: raw, responsiblesRaw: "", people: [] };
  }

  const people = responsiblesRaw
    .split(/,|\sy\s/i)
    .map((person) => person.trim())
    .filter(Boolean);

  return { text, responsiblesRaw, people };
}

/** Rebuilds the stored name from the two separate edit fields. */
export function buildSubtaskName(text: string, responsibles: string) {
  const trimmedText = text.trim();
  const trimmedResponsibles = responsibles.trim();
  if (!trimmedResponsibles) return trimmedText;
  return `${trimmedText}${RESPONSIBLE_SEPARATOR}${trimmedResponsibles}`;
}

/**
 * One quiet, uniform chip for every responsible person. Colour is reserved for
 * review state, so names stay readable without competing for attention.
 */
export const PERSON_CHIP_CLASS =
  "rounded-full bg-black/[0.045] px-2 py-0.5 text-[11px] font-medium text-ink-secondary";
