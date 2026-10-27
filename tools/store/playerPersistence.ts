import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PersistStorage, StorageValue } from "zustand/middleware";
import { toast } from "sonner-native";
import type { PlayerStore } from "./usePlayerStore";

type Session = Pick<
  PlayerStore,
  | "currentSong"
  | "currentSongIndex"
  | "queue"
  | "queueOrder"
  | "queueContext"
  | "repeat"
  | "shuffle"
  | "showLyrics"
  | "volume"
  | "position"
  | "duration"
>;

// Progress events should not stringify and write an entire large queue every second.
// Queue/settings changes save promptly; position-only changes save every five seconds.
export function createPlayerStorage(
  delay = 5000,
): PersistStorage<Session> & { flush: () => Promise<void> } {
  let pending: { name: string; value: StorageValue<Session> } | null = null;
  let previous: Session | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let writes: Promise<void> = Promise.resolve();
  let warned = false;
  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!pending) return writes;
    const next = pending;
    pending = null;
    writes = writes
      .then(async () => {
        await AsyncStorage.setItem(next.name, JSON.stringify(next.value));
        warned = false;
      })
      .catch(() => {
        if (!warned)
          toast.error(
            "Playback preferences could not be saved. They may reset when you reopen Muzalo.",
          );
        warned = true;
      });
    return writes;
  };
  return {
    getItem: async (name) => {
      const value = await AsyncStorage.getItem(name);
      return value ? JSON.parse(value) : null;
    },
    setItem: (name, value) => {
      const state = value.state;
      const changed =
        !previous ||
        Object.keys(state).some(
          (key) =>
            state[key as keyof Session] !== previous![key as keyof Session],
        );
      if (!changed) return;
      const important =
        !previous ||
        [
          "currentSong",
          "queue",
          "queueOrder",
          "queueContext",
          "repeat",
          "shuffle",
          "showLyrics",
          "volume",
        ].some(
          (key) =>
            state[key as keyof Session] !== previous![key as keyof Session],
        );
      previous = state;
      pending = { name, value };
      if (important) return flush();
      if (!timer) {
        timer = setTimeout(() => {
          void flush();
        }, delay);
        (timer as unknown as { unref?: () => void }).unref?.();
      }
    },
    removeItem: async (name) => {
      await flush();
      await AsyncStorage.removeItem(name);
      previous = null;
    },
    flush,
  };
}
