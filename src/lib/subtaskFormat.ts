const RESPONSIBLE_SEPARATOR = " — ";

/** Subtasks are stored as "description — Responsable A y Responsable B". */
export function parseSubtaskName(raw: string): {
  text: string;
  people: string[];
} {
  const idx = raw.lastIndexOf(RESPONSIBLE_SEPARATOR);
  if (idx === -1) return { text: raw, people: [] };

  const text = raw.slice(0, idx).trim();
  const peopleRaw = raw.slice(idx + RESPONSIBLE_SEPARATOR.length).trim();
  if (!text || !peopleRaw) return { text: raw, people: [] };

  const people = peopleRaw
    .split(/,|\sy\s/i)
    .map((person) => person.trim())
    .filter(Boolean);

  return { text, people: people.length > 0 ? people : [] };
}

/**
 * One quiet, uniform chip for every responsible person. Colour is reserved for
 * review state, so names stay readable without competing for attention.
 */
export const PERSON_CHIP_CLASS =
  "rounded-full bg-black/[0.045] px-2 py-0.5 text-[11px] font-medium text-ink-secondary";
