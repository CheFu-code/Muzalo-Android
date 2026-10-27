import { muzaloTheme } from "@/constants/tokens";
import { Playlist } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  FlatListProps,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlaylistListItem } from "./PlaylistListItem";

type PlaylistsListProps = Omit<
  FlatListProps<Playlist>,
  "data" | "renderItem" | "ListHeaderComponent" | "ListEmptyComponent"
> & {
  playlists: Playlist[];
  onPlaylistPress: (playlistId: string) => void;
  searchQuery?: string;
};

const ItemDivider = () => <View style={{ height: StyleSheet.hairlineWidth, marginLeft: 56, backgroundColor: muzaloTheme.border, opacity: 0.6 }} />;

const PlaylistsList = ({
  playlists,
  onPlaylistPress,
  searchQuery = "",
  scrollEnabled = true,
  style,
  contentContainerStyle,
  ...flatListProps
}: PlaylistsListProps) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isSearching = searchQuery.trim().length > 0;
  const countLabel = isSearching
    ? `${playlists.length} ${playlists.length === 1 ? "match" : "matches"}`
    : `${playlists.length} ${playlists.length === 1 ? "playlist" : "playlists"}`;

  return (
    <FlatList
      {...flatListProps}
      style={[{ flex: 1 }, style]}
      contentContainerStyle={[
        {
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: insets.bottom + 24,
          flexGrow: 1,
        },
        contentContainerStyle,
      ]}
      data={playlists}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={ItemDivider}
      scrollEnabled={scrollEnabled}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 4,
          }}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Create a playlist"
            onPress={() => router.push("/playlists/create")}
            activeOpacity={0.8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              minHeight: 44,
              paddingRight: 12,
            }}
          >
            <Ionicons
              name="add-outline"
              size={20}
              color={muzaloTheme.accent}
            />
            <Text
              style={{
                color: muzaloTheme.accent,
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              New playlist
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              color: muzaloTheme.muted,
              fontSize: 12,
              flexShrink: 1,
              textAlign: "right",
            }}
          >
            {countLabel}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View
          style={{
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 44,
          }}
        >
          <View
            style={{
              width: 68,
              height: 68,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: muzaloTheme.accentSoft,
              marginBottom: 18,
            }}
          >
            <Ionicons
              name={isSearching ? "search-outline" : "albums-outline"}
              size={30}
              color={muzaloTheme.accent}
            />
          </View>
          <Text
            style={{
              color: muzaloTheme.text,
              fontSize: 19,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            {isSearching
              ? "No matching playlists"
              : "Your next mix starts here"}
          </Text>
          <Text
            style={{
              color: muzaloTheme.muted,
              fontSize: 14,
              lineHeight: 22,
              textAlign: "center",
              marginTop: 8,
            }}
          >
            {isSearching
              ? "Try a different playlist name or description."
              : "Create a playlist and bring your favourite tracks together."}
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <PlaylistListItem
          playlist={item}
          onPress={() => onPlaylistPress(item.id)}
        />
      )}
    />
  );
};

export default PlaylistsList;
