import { playerSessionStorage, usePlayerStore, usePlaylistStore } from "@/tools/store/usePlayerStore";
import { updateMusicWidget } from "@/tools/services/widgetService";
import { syncLibrary } from "@/tools/syncLibrary";
import { useEffect } from "react";
import { AppState } from "react-native";
import TrackPlayer from "react-native-track-player";

export default function PlayerBinder() {
  const volume = usePlayerStore((s) => s.volume);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const loadPlaylists = usePlaylistStore((s) => s.loadPlaylists);

  useEffect(() => {
    updateMusicWidget(currentSong, isPlaying);
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
    (async () => {
      await TrackPlayer.setVolume(volume);
    })();
  }, [volume]);

  return null;
}
