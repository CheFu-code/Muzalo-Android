export type LyricLine = { time: number; text: string };
export const hasTimestamps = (value: string) =>
  /\[\d+:\d{1,2}(?:\.\d+)?\]/.test(value);

export function parseLRC(lrc: string): LyricLine[] {
  const lines = lrc
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const parsed: LyricLine[] = [];
  for (const line of lines) {
    const timestamps = [...line.matchAll(/\[(\d+):(\d{1,2}(?:\.\d+)?)\]/g)];
    const text = line.replace(/\[\d+:\d{1,2}(?:\.\d+)?\]/g, "").trim();
    for (const match of timestamps) {
      const seconds = Number(match[2]);
      if (seconds < 60)
        parsed.push({ time: Number(match[1]) * 60 + seconds, text });
    }
  }
  return parsed.length
    ? parsed.sort((a, b) => a.time - b.time)
    : lines.map((text) => ({ time: 0, text }));
}
export function formatTimestamp(time: number): string {
  const ticks = Math.max(
    0,
    Math.round((Number.isFinite(time) ? time : 0) * 100)
  );
  const minutes = Math.floor(ticks / 6000),
    seconds = Math.floor(ticks / 100) % 60,
    fraction = ticks % 100;
  return (
    "[" +
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0") +
    "." +
    String(fraction).padStart(2, "0") +
    "]"
  );
}
export function formatLRC(lines: LyricLine[]): string {
  return lines
    .map((line) => formatTimestamp(line.time) + " " + line.text)
    .join("\n");
}
