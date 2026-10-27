import CollectionTracks from "@/components/CollectionTracks";
import LoadingScreen from "@/components/LoadingScreen";
import { EmptyState, Screen, ScreenHeader } from "@/components/ui";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import { Song } from "@/types/types";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

export default function AlbumScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const getAlbum = usePlayerStore((s) => s.getAlbum);
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setSongs(null);
    setFailed(false);
    (async () => {
      try {
        // Older player links used plus signs for spaces; prefer the exact name.
        let result = await getAlbum(name || "Unknown Album");
        if (!result?.length && name?.includes("+"))
          result = await getAlbum(name.replaceAll("+", " "));
        if (active) setSongs(result ?? []);
      } catch {
        if (active) {
          setFailed(true);
          setSongs([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [name, getAlbum]);
  if (!songs) return <LoadingScreen />;
  const artists = [...new Set(songs.map((s) => s.artist).filter(Boolean))].join(
    ", "
  );
  return (
    <Screen>
      <ScreenHeader title="Album" />
      {songs.length ? (
        <CollectionTracks
          title={songs[0].album || name || "Unknown album"}
          kind="Album"
          tracks={songs}
          artwork={songs.find((s) => s.coverArt)?.coverArt}
          subtitle={artists || undefined}
          reservePlayerSpace={false}
        />
      ) : (
        <EmptyState
          title={failed ? "Could not load album" : "No tracks found"}
          message="Go back and choose an album from your library."
          icon="disc-outline"
        />
      )}
    </Screen>
  );
}
