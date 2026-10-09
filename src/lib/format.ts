import { locale } from "./i18n";
export const formatTime = (s: number) =>
  `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s)) % 60).padStart(2, "0")}`;
export const timeLabel = (milliseconds: number) => {
  const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};
export const display = (value: number | undefined | null, digits = 0) =>
  value === undefined || value === null || !Number.isFinite(value)
    ? "—"
    : value.toLocaleString(locale(), {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
