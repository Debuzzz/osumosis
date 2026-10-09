export function starColor(stars: number | null) {
  if (stars === null) return "#777f90";

  const stops = [
    [0, "#777f90"],
    [0.1, "#4290fb"],
    [0.5, "#47A3FC"],
    [1, "#4CB7FE"],
    [1.5, "#4FD8F2"],
    [2, "#4FFFD5"],
    [2.5, "#7CFF4F"],
    [3, "#D3F657"],
    [3.5, "#F8DD5F"],
    [4, "#FDA265"],
    [4.5, "#FF6E6B"],
    [5, "#F94D7A"],
    [5.5, "#DB48A4"],
    [6, "#B64DC1"],
    [6.5, "#B64DC1"],
    [7, "#5654CA"],
    [7.5, "#3331A2"],
    [8, "#14117D"],
    [8.5, "#0B095A"],
    [9, "#000000"],
  ] as const;

  const value = Math.max(0, Math.min(stars, 9));
  const i = stops.findIndex(([threshold]) => threshold >= value);
  const [start, startColor] = stops[Math.max(0, i - 1)];
  const [end, endColor] = stops[Math.max(0, i)];

  const startRgb = hexToRgb(startColor);
  const endRgb = hexToRgb(endColor);
  const t = end === start ? 0 : (value - start) / (end - start);

  const channel = (a: number, b: number) =>
    Math.round(a + (b - a) * t)
      .toString(16)
      .padStart(2, "0");

  return `#${channel(startRgb[0], endRgb[0])}${channel(
    startRgb[1],
    endRgb[1],
  )}${channel(startRgb[2], endRgb[2])}`;
}
export function textColor(stars: number | null) {
  if (stars === null) return "#777f90";

  const stops = [
    [6.5, "#F8DD5F"],
    [9, "#F8DD5F"],
    [9.5, "#FDA265"],
    [10, "#FF6E6B"],
    [10.5, "#F94D7A"],
    [11, "#DB48A4"],
    [11.5, "#B64DC1"],
    [12, "#B64DC1"],
    [12.5, "#5654CA"],
    [13, "#3331A2"],
  ] as const;

  // Keep the low difficulties at black, then start the gradient at 6.5★.
  if (stars < 6.5) return "#000000";

  const value = Math.max(6.5, Math.min(stars, 13));
  const i = stops.findIndex(([threshold]) => threshold >= value);
  const [start, startColor] = stops[Math.max(0, i - 1)];
  const [end, endColor] = stops[Math.max(0, i)];

  const startRgb = hexToRgb(startColor);
  const endRgb = hexToRgb(endColor);
  const t = end === start ? 0 : (value - start) / (end - start);

  const channel = (a: number, b: number) =>
    Math.round(a + (b - a) * t)
      .toString(16)
      .padStart(2, "0");

  return `#${channel(startRgb[0], endRgb[0])}${channel(
    startRgb[1],
    endRgb[1],
  )}${channel(startRgb[2], endRgb[2])}`;
}
function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}
