import LoadingScreen from "@/components/LoadingScreen";
import { PlaylistTracksList } from "@/components/PlaylistTracksList";
import { Screen, ScreenHeader, EmptyState } from "@/components/ui";
import { usePlaylistStore } from "@/tools/store/usePlayerStore";
import { Playlist } from "@/types/types";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";

export default function PlaylistScreen() {
  const { name: playlistId } = useLocalSearchParams<{ name: string }>();
  const playlists = usePlaylistStore((s) => s.playlists);
  const getSystem = usePlaylistStore((s) => s.getSpeceficSystemPlaylist);
  const [playlist, setPlaylist] = useState<Playlist | null>();
  const [error, setError] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(false);
      (async () => {
        try {
          const result =
            playlistId === "most-played" ||
            playlistId === "recent" ||
            playlistId === "history"
              ? await getSystem(playlistId)
              : playlists.find((p) => p.id === playlistId);
          if (active) setPlaylist(result ?? null);
        } catch {
          if (active) {
            setError(true);
            setPlaylist(null);
          }
        }
      })();
      return () => {
        active = false;
      };
    }, [playlistId, playlists, getSystem])
  );
  if (playlist === undefined) return <LoadingScreen />;
  return (
    <Screen>
      <ScreenHeader title="Playlist" />
      {playlist ? (
        <PlaylistTracksList playlist={playlist} playlistName={playlist.name} />
      ) : (
        <EmptyState
          title={error ? "Could not load playlist" : "Playlist not found"}
          message="Go back to your playlists and try again."
          icon="albums-outline"
        />
      )}
    </Screen>
  );
}
