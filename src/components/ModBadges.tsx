import { t } from "../lib/i18n";

type ModCategory =
  "difficulty-increase" | "difficulty-reduction" | "automation" | "conversion" | "fun" | "system";

const modCategories: Record<string, ModCategory> = {
  AP: "automation",
  AT: "automation",
  BL: "difficulty-increase",
  CL: "conversion",
  DA: "conversion",
  DT: "difficulty-increase",
  EZ: "difficulty-reduction",
  FI: "difficulty-increase",
  FL: "difficulty-increase",
  HD: "difficulty-increase",
  HR: "difficulty-increase",
  HT: "difficulty-reduction",
  MR: "conversion",
  NC: "difficulty-increase",
  NF: "difficulty-reduction",
  PF: "difficulty-increase",
  RX: "automation",
  SD: "difficulty-increase",
  SO: "automation",
  TD: "system",
  TP: "system",
  V2: "system",
};

const modTokens = [
  ...Object.keys(modCategories),
  ...Array.from({ length: 9 }, (_, index) => `${index + 1}K`),
].sort((left, right) => right.length - left.length);

function parseMods(value: string | undefined) {
  const input = value?.trim().toUpperCase();
  if (!input || /^(?:NM|NONE|NO\s*MODS?)$/.test(input)) return ["NM"];

  const compact = input.replace(/[\s,+]/g, "");
  const result: string[] = [];
  for (let offset = 0; offset < compact.length;) {
    const token = modTokens.find((candidate) => compact.startsWith(candidate, offset));
    if (!token) return [input];
    result.push(token);
    offset += token.length;
  }
  return result;
}

export function ModBadges({ mods, className = "" }: { mods?: string; className?: string }) {
  const parsed = parseMods(mods);
  return (
    <span
      className={`osu-mod-list ${className}`.trim()}
      aria-label={t("Mods: {{mods}}", { mods: parsed.join(", ") })}
    >
      {parsed.map((mod, index) => (
        <span
          className={`osu-mod osu-mod-${modCategories[mod] || (/^[1-9]K$/.test(mod) ? "conversion" : "neutral")}`}
          key={`${mod}-${index}`}
        >
          {mod}
        </span>
      ))}
    </span>
  );
}
