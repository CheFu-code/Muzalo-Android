import { usePlayerStore } from "@/tools/store/usePlayerStore";
import type { Song } from "@/types/types";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

export function useSongDetails(id?: string) {
  const getSongInfo = usePlayerStore((state) => state.getSongInfo);
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(false);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      let cancelled = false;
      setLoading(true);
      setError(null);
      void (async () => {
        try {
          const result = id ? await getSongInfo(id) : null;
          if (!cancelled) setSong(result);
        } catch {
          if (!cancelled) {
            setSong(null);
            setError("We could not load this track. Go back and try again.");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
        active.current = false;
      };
    }, [getSongInfo, id])
  );
  const refresh = useCallback(async () => {
    const result = id ? await getSongInfo(id) : null;
    if (active.current) setSong(result);
    return result;
  }, [getSongInfo, id]);
  return { song, loading, error, refresh };
}
