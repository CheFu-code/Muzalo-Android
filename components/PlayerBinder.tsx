import { playerSessionStorage, usePlayerStore, usePlaylistStore } from "@/tools/store/usePlayerStore";
import { updateMusicWidget } from "@/tools/services/widgetService";
import { syncLibrary } from "@/tools/syncLibrary";
import { setupPlayer } from "@/tools/services/trackPlayerService";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import TrackPlayer from "react-native-track-player";

export default function PlayerBinder() {
  const volume = usePlayerStore((s) => s.volume);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const loadPlaylists = usePlaylistStore((s) => s.loadPlaylists);
  const restored = useRef(false);

  useEffect(() => {
    try {
      updateMusicWidget(currentSong, isPlaying);
    } catch (error) {
      console.warn("Could not update music widget", error);
    }
  }, [currentSong, isPlaying]);

  useEffect(() => {
    let active = true;
    let previousState = AppState.currentState;

    const initialize = async () => {
      try {
        await syncLibrary();
        if (active) await loadPlaylists("all");
      } catch (err) {
        console.error("❌ Error initializing player:", err);
      }
    };

    initialize();

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") void playerSessionStorage.flush();
      const resumed = previousState !== "active" && state === "active";
      previousState = state;
      if (resumed) void syncLibrary();
    });

    return () => {
      active = false;
      appStateSubscription.remove();
    };
  }, [loadPlaylists]);

  useEffect(() => {
    if (restored.current) return;
    let active = true;
    const restore = async () => {
      if (!usePlayerStore.persist.hasHydrated()) return;
      restored.current = true;
      try {
        await setupPlayer();
        const player = usePlayerStore.getState();
        if (!active || !player.queue.length) return;
        await player.refreshPlaybackQueue();
      } catch (error) {
        restored.current = false;
        console.warn("Could not restore the saved playback queue", error);
      }
    };
    void restore();
    const unsubscribe = usePlayerStore.persist.onFinishHydration(() => {
      void restore();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    void setupPlayer()
      .then(async () => {
        if (active) await TrackPlayer.setVolume(volume);
      })
      .catch((error) => {
        console.warn("Could not apply playback volume", error);
      });
    return () => {
      active = false;
    };
  }, [volume]);

  return null;
}
