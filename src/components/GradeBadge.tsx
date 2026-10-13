import { t } from "../lib/i18n";

const grades: Record<string, { label: string; color: string }> = {
  A: { label: "A", color: "a" },
  B: { label: "B", color: "b" },
  C: { label: "C", color: "c" },
  D: { label: "D", color: "d" },
  F: { label: "F", color: "f" },
  S: { label: "S", color: "s" },
  SH: { label: "S", color: "sh" },
  X: { label: "SS", color: "ss" },
  XH: { label: "SS", color: "ssh" },
};

export function GradeBadge({ rank, className = "" }: { rank?: string; className?: string }) {
  const value = rank?.trim().toUpperCase() || "—";
  const grade = grades[value];
  return (
    <span
      className={`osu-grade osu-grade-${grade?.color || "unknown"} ${className}`.trim()}
      aria-label={grade ? t("Grade: {{grade}}", { grade: value }) : t("No grade")}
    >
      {grade?.label || value}
    </span>
  );
}
