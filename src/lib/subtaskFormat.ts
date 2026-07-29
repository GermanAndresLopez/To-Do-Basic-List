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

const PERSON_COLORS = [
  { bg: "#FFE4E9", text: "#C22753" }, // rose
  { bg: "#FFEAD1", text: "#B4560B" }, // orange
  { bg: "#FBF0C2", text: "#8A6D00" }, // yellow
  { bg: "#E3F7D3", text: "#3F7D0F" }, // lime
  { bg: "#D6F5E8", text: "#0C8F63" }, // teal-green
  { bg: "#D8F1FF", text: "#0B6FA8" }, // sky
  { bg: "#E2E4FF", text: "#4A4FCE" }, // indigo
  { bg: "#F1DFFF", text: "#8034C4" }, // purple
  { bg: "#FFE0F3", text: "#C22E92" }, // magenta
  { bg: "#FDEBD8", text: "#B25E12" }, // peach
] as const;

export function getPersonColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PERSON_COLORS[hash % PERSON_COLORS.length];
}
