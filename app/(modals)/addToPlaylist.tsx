import LoadingScreen from "@/components/LoadingScreen";
import PlaylistsList from "@/components/PlaylistsList";
import SwipeDismissScreen from "@/components/SwipeDismissScreen";
import { EmptyState, SearchField, SongHeading, ui } from "@/components/ui";
import { usePlayerStore, usePlaylistStore } from "@/tools/store/usePlayerStore";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";

const decode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};
export default function AddToPlaylist() {
  const { trackUri } = useLocalSearchParams<{ trackUri: string }>();
  const router = useRouter();
  const files = usePlayerStore((s) => s.files);
  const playlists = usePlaylistStore((s) => s.playlists);
  const load = usePlaylistStore((s) => s.loadPlaylists);
  const add = usePlaylistStore((s) => s.addTrackToPlaylist);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const track =
    files.find((t) => t.uri === trackUri) ||
    files.find((t) => decode(t.uri) === decode(trackUri || ""));
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setFailed(false);
      load("user")
        .catch(() => {
          if (active) setFailed(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [load])
  );
  const filtered = useMemo(
    () =>
      playlists.filter((p) =>
        (p.name + " " + (p.description || ""))
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      ),
    [playlists, search]
  );
  const select = async (playlistId: string) => {
    if (!track?.id || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await add(playlistId, track.id);
      router.back();
    } catch {
      Alert.alert("Could not add track", "Please try again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return (
    <SwipeDismissScreen title="Add to playlist">
      {!track?.id ? (
        <EmptyState
          title="Track unavailable"
          message="Go back and choose a track from your library."
        />
      ) : loading ? (
        <LoadingScreen />
      ) : failed ? (
        <EmptyState
          title="Could not load playlists"
          message="Close this screen and try again."
        />
      ) : (
        <View style={{ flex: 1 }} pointerEvents={busy ? "none" : "auto"}>
          <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
            <SongHeading
              title={track.title}
              artist={track.artist}
              coverArt={track.coverArt}
            />
          </View>
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder="Search playlists"
          />
          {busy && (
            <Text
              accessibilityLiveRegion="polite"
              style={[ui.muted, { paddingHorizontal: 20 }]}
            >
              Adding track...
            </Text>
          )}
          <PlaylistsList
            playlists={filtered}
            searchQuery={search}
            onPlaylistPress={select}
          />
        </View>
      )}
    </SwipeDismissScreen>
  );
}
