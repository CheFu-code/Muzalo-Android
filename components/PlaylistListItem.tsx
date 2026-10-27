import { muzaloTheme } from "@/constants/tokens";
import { Playlist } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import React, { ComponentProps } from "react";
import {
  Image,
  Text,
  TouchableHighlight,
  TouchableHighlightProps,
  View,
} from "react-native";

type PlaylistListItemProps = { playlist: Playlist } & TouchableHighlightProps;
const collectionIcons: Record<string, ComponentProps<typeof Ionicons>["name"]> =
  {
    favorites: "heart-outline",
    recent: "sparkles-outline",
    "most-played": "trending-up-outline",
    downloads: "download-outline",
    history: "time-outline",
  };

function formatPlaylistDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const remainder = minutes % 60;
  return `${Math.floor(minutes / 60)} hr${remainder ? ` ${remainder} min` : ""}`;
}

export const PlaylistListItem = ({
  playlist,
  style,
  ...props
}: PlaylistListItemProps) => {
  const songCount = playlist.songs?.length ?? playlist.songsLength ?? 0;
  const collectionIcon = collectionIcons[playlist.id];
  const hasDuration =
    Number.isFinite(playlist.duration) && playlist.duration > 0;

  return (
    <TouchableHighlight
      accessibilityRole="button"
      accessibilityLabel={`${playlist.name}, ${songCount} ${songCount === 1 ? "song" : "songs"}`}
      activeOpacity={0.85}
      underlayColor={muzaloTheme.raised}
      {...props}
      style={[
        {
          padding: 12,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: muzaloTheme.border,
          backgroundColor: muzaloTheme.surface,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 15,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: collectionIcon
              ? muzaloTheme.accentSoft
              : muzaloTheme.raised,
          }}
        >
          {!collectionIcon && playlist.coverArt ? (
            <Image
              source={{ uri: playlist.coverArt }}
              style={{ width: 64, height: 64 }}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Ionicons
              name={collectionIcon || "albums-outline"}
              size={27}
              color={muzaloTheme.accent}
            />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ color: muzaloTheme.text, fontSize: 16, fontWeight: "600" }}
          >
            {playlist.name}
          </Text>
          {playlist.description ? (
            <Text
              numberOfLines={1}
              style={{ color: muzaloTheme.muted, fontSize: 12, marginTop: 4 }}
            >
              {playlist.description}
            </Text>
          ) : null}
          <Text
            style={{ color: muzaloTheme.muted, fontSize: 11, marginTop: 6 }}
          >
            {songCount} {songCount === 1 ? "song" : "songs"}
            {hasDuration
              ? ` / ${formatPlaylistDuration(playlist.duration)}`
              : ""}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={17} color={muzaloTheme.muted} />
      </View>
    </TouchableHighlight>
  );
};
