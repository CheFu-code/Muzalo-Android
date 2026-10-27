import {
  MINI_PLAYER_HEIGHT,
  TAB_BAR_HEIGHT,
  muzaloTheme as c,
} from "@/constants/tokens";
import formatDuration from "@/tools/formatDuration";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import type { Song } from "@/types/types";
import React, { ReactNode, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QueueControls from "./QueueControls";
import TracksList from "./TracksList";
import { AppIcon, Artwork, EmptyState, SearchField, ui } from "./ui";

export default function CollectionTracks({
  title,
  kind,
  tracks,
  artwork,
  subtitle,
  description,
  actions,
  playlistId,
  reservePlayerSpace = true,
  icon,
}: {
  title: string;
  kind: "Playlist" | "Artist" | "Album";
  tracks: Song[];
  artwork?: string | null;
  subtitle?: string;
  description?: string;
  actions?: ReactNode;
  playlistId?: string;
  reservePlayerSpace?: boolean;
  icon?: AppIcon;
}) {
  const [search, setSearch] = useState("");
  const insets = useSafeAreaInsets();
  const hasCurrentSong = usePlayerStore((state) => Boolean(state.currentSong));
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? tracks.filter((track) =>
          `${track.title || ""} ${track.artist || ""} ${track.album || ""}`
            .toLowerCase()
            .includes(term)
        )
      : tracks;
  }, [tracks, search]);
  const duration = tracks.reduce(
    (total, track) =>
      total + (Number.isFinite(track.duration) ? track.duration : 0),
    0
  );
  return (
    <View style={{ flex: 1 }}>
      <SearchField
        value={search}
        onChangeText={setSearch}
        placeholder={`Search this ${kind.toLowerCase()}`}
      />
      <TracksList
        tracks={filtered}
        hideQueueControls
        autoScrollToCurrent={false}
        isInPlaylist={kind === "Playlist"}
        playlistId={playlistId}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom:
            insets.bottom +
            24 +
            (reservePlayerSpace
              ? TAB_BAR_HEIGHT + (hasCurrentSong ? MINI_PLAYER_HEIGHT + 16 : 0)
              : 0),
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <View style={{ paddingBottom: 12 }}>
            <View
              style={{
                alignItems: "center",
                paddingHorizontal: 24,
                paddingTop: 12,
                paddingBottom: 20,
                gap: 10,
              }}
            >
              <Artwork
                uri={artwork}
                size={kind === "Artist" ? 104 : 144}
                round={kind === "Artist"}
                icon={
                  icon ??
                  (kind === "Artist"
                    ? "person-outline"
                    : kind === "Album"
                      ? "disc-outline"
                      : "albums-outline")
                }
              />
              <Text
                style={{
                  color: c.accent,
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 2,
                }}
              >
                {kind.toUpperCase()}
              </Text>
              <Text style={[ui.title, { textAlign: "center" }]}>{title}</Text>
              {subtitle ? (
                <Text style={[ui.muted, { textAlign: "center" }]}>
                  {subtitle}
                </Text>
              ) : null}
              {description ? (
                <Text style={[ui.muted, { textAlign: "center" }]}>
                  {description}
                </Text>
              ) : null}
              <Text style={ui.label}>
                {tracks.length} {tracks.length === 1 ? "song" : "songs"}
                {duration > 0 ? ` / ${formatDuration(duration)}` : ""}
              </Text>
            </View>
            {search.trim() ? (
              <Text
                style={[ui.muted, { paddingHorizontal: 20, paddingBottom: 16 }]}
              >
                {filtered.length} matching{" "}
                {filtered.length === 1 ? "track" : "tracks"}
              </Text>
            ) : (
              <QueueControls tracks={tracks} />
            )}
            {actions ? (
              <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
                {actions}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={search.trim() ? "search-outline" : "musical-notes-outline"}
            title={search.trim() ? "No matching tracks" : "No tracks here yet"}
            message={
              search.trim()
                ? "Try another song, artist or album name."
                : kind === "Playlist"
                  ? "Add tracks from your library to fill this playlist."
                  : "Tracks will appear here when they are available in your library."
            }
          />
        }
      />
    </View>
  );
}
