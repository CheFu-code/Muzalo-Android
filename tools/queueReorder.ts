export const QUEUE_ROW_HEIGHT = 64;

export function queueDropIndex(
  from: number,
  translation: number,
  scrollDelta: number,
  count: number,
): number {
  "worklet";
  if (count <= 0) return -1;
  return Math.max(
    0,
    Math.min(
      count - 1,
      from + Math.round((translation + scrollDelta) / QUEUE_ROW_HEIGHT),
    ),
  );
}

export function moveQueueItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || to < 0 || from >= next.length || to >= next.length)
    return next;
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}
