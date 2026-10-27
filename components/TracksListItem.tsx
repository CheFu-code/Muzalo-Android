import { unknownTrackImageUri } from "@/constants/images";
import { muzaloTheme } from "@/constants/tokens";
import formatDuration from "@/tools/formatDuration";
import { Song } from "@/types/types";
import { Entypo, Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Image, Text, TouchableHighlight, View } from "react-native";
import TrackShortcutsMenu from "./TrackShortcutsMenu";

export type TrackListItemProps = {
  handlePlaySong: (track: Song) => void | Promise<void>;
  track: Song;
  isActive: boolean;
  isInPlaylist: boolean;
  index: number;
  playlistId?: string;
};

function formatRelativeTime(timestamp?: number | null): string | null {
  if (!timestamp || timestamp <= 0) return null;
  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

const TracksListItem = memo(
  ({
    track,
    handlePlaySong,
    isActive,
    index,
    isInPlaylist,
    playlistId,
  }: TrackListItemProps) => {
    const duration =
      Number.isFinite(track.duration) && track.duration > 0
        ? formatDuration(track.duration)
        : null;
    const getSubtitle = () => {
      const artist = track.artist ? track.artist : "Unknown Artist";
      if (
        playlistId === "most-played" &&
        track.playCount &&
        track.playCount > 0
      ) {
        return `${artist} • ${track.playCount} play${track.playCount > 1 ? "s" : ""}`;
      }
      if (
        playlistId === "history" &&
        track.lastPlayedAt &&
        track.lastPlayedAt > 0
      ) {
        const rel = formatRelativeTime(track.lastPlayedAt);
        if (rel) return `${artist} • ${rel}`;
      }
      if (playlistId === "recent" && track.date && track.date > 0) {
        const rel = formatRelativeTime(track.date);
        if (rel) return `${artist} • Added ${rel}`;
      }
      return artist;
    };

    return (
      <TouchableHighlight
        style={{
          height: 66,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderLeftWidth: 3,
          borderLeftColor: isActive ? muzaloTheme.accent : "transparent",
          backgroundColor: isActive ? muzaloTheme.accentSoft : "transparent",
        }}
        underlayColor={muzaloTheme.surface}
        accessibilityRole="button"
        accessibilityLabel={`Play ${track.title || "Unknown title"} by ${track.artist || "Unknown artist"}${duration ? `, duration ${duration}` : ""}`}
        onPress={() => {
          handlePlaySong(track);
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View>
            <Image
              source={{
                uri: track.coverArt ?? unknownTrackImageUri,
              }}
              style={{
                width: 50,
                height: 50,
                borderRadius: 12,
                opacity: isActive ? 0.65 : 1,
              }}
            />
            {isActive && (
              <View
                style={{
                  position: "absolute",
                  inset: 0,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="volume-medium"
                  size={21}
                  color={muzaloTheme.accent}
                />
              </View>
            )}
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{
                color: isActive ? muzaloTheme.accent : muzaloTheme.text,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              {track.title ? track.title : "Unknown Title"}
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: muzaloTheme.muted, fontSize: 13, marginTop: 4 }}
            >
              {getSubtitle()}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ alignItems: "flex-end", minWidth: 32, gap: 3 }}>
              <Text
                style={{
                  color: muzaloTheme.muted,
                  fontSize: 11,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {index + 1}
              </Text>
            </View>
            <TrackShortcutsMenu
              track={track}
              isInPlaylist={isInPlaylist}
              playlistId={playlistId}
            >
              <View
                style={{
                  width: 44,
                  height: 50,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                }}
              >
                <Entypo
                  name="dots-three-horizontal"
                  size={18}
                  color={muzaloTheme.muted}
                />
                {duration && (
                  <Text style={{ color: muzaloTheme.muted, fontSize: 11, lineHeight: 14, fontVariant: ["tabular-nums"] }}>
                    {duration}
                  </Text>
                )}
              </View>
            </TrackShortcutsMenu>
          </View>
        </View>
      </TouchableHighlight>
    );
  },
);

TracksListItem.displayName = "TracksListItem";

export default TracksListItem;
