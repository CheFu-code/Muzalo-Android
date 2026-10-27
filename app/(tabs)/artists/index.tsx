import LoadingScreen from "@/components/LoadingScreen";
import {
  MINI_PLAYER_HEIGHT,
  TAB_BAR_HEIGHT,
  muzaloTheme,
} from "@/constants/tokens";
import { processMusicData } from "@/tools/artists";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import { Artist } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

function ArtistListItem({ artist }: { artist: Artist }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const albumCount = new Set(
    artist.songs.map((song) => song.album?.trim().toLowerCase()).filter(Boolean)
  ).size;
  const initials = artist.name
    .split(" ")
    .slice(0, 2)
    .map((part) => Array.from(part)[0] || "")
    .join("")
    .toUpperCase();
  const showArtwork = artist.image && failedImage !== artist.image;

  return (
    <Link
      href={{ pathname: "/artists/[name]", params: { name: artist.name } }}
      asChild
    >
      <TouchableHighlight
        accessibilityRole="button"
        accessibilityLabel={`Open ${artist.name}, ${artist.songs.length} ${artist.songs.length === 1 ? "song" : "songs"}`}
        activeOpacity={0.85}
        underlayColor={muzaloTheme.raised}
        style={{
          minHeight: 64,
          paddingVertical: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: muzaloTheme.accentSoft,
            }}
          >
            {showArtwork ? (
              <Image
                source={{ uri: artist.image! }}
                onError={() => setFailedImage(artist.image)}
                style={{ width: 44, height: 44, borderRadius: 22 }}
                accessibilityIgnoresInvertColors
              />
            ) : artist.name.toLowerCase() === "unknown artist" ? (
              <Ionicons
                name="person-outline"
                size={21}
                color={muzaloTheme.accent}
              />
            ) : (
              <Text
                style={{
                  color: muzaloTheme.accent,
                  fontSize: 16,
                  fontWeight: "600",
                  letterSpacing: 0.5,
                }}
              >
                {initials}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{
                color: muzaloTheme.text,
                fontSize: 15,
                fontWeight: "600",
              }}
            >
              {artist.name}
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: muzaloTheme.muted, fontSize: 12, marginTop: 4 }}
            >
              {artist.songs.length}{" "}
              {artist.songs.length === 1 ? "song" : "songs"}
              {albumCount > 0
                ? ` · ${albumCount} ${albumCount === 1 ? "album" : "albums"}`
                : ""}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={17}
            color={muzaloTheme.muted}
          />
        </View>
      </TouchableHighlight>
    </Link>
  );
}

const ItemSeparator = () => (
  <View style={{ height: StyleSheet.hairlineWidth, marginLeft: 56, backgroundColor: muzaloTheme.border, opacity: 0.6 }} />
);

const ArtistsScreen = () => {
  const files = usePlayerStore((state) => state.files);
  const isLoading = usePlayerStore((state) => state.isLoading);
  const hasCurrentSong = usePlayerStore((state) => Boolean(state.currentSong));
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const artists = useMemo(() => processMusicData(files), [files]);
  const filteredArtists = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? artists.filter((artist) => artist.name.toLowerCase().includes(term))
      : artists;
  }, [artists, search]);
  const isSearching = search.trim().length > 0;

  if (isLoading) return <LoadingScreen />;

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={{ flex: 1, backgroundColor: muzaloTheme.background }}
    >
      <View
        style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: muzaloTheme.border,
            backgroundColor: muzaloTheme.surface,
            paddingLeft: 14,
          }}
        >
          <Ionicons name="search-outline" size={19} color={muzaloTheme.muted} />
          <TextInput
            style={{
              color: muzaloTheme.text,
              fontSize: 15,
              flex: 1,
              minWidth: 0,
              minHeight: 48,
              paddingHorizontal: 10,
              paddingVertical: 12,
            }}
            placeholder="Search artists"
            placeholderTextColor={muzaloTheme.muted}
            selectionColor={muzaloTheme.accent}
            accessibilityLabel="Search artists"
            autoCorrect={false}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Clear artist search"
              onPress={() => setSearch("")}
              style={{
                width: 44,
                minHeight: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="close-circle"
                color={muzaloTheme.muted}
                size={20}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <FlatList
        style={{ flex: 1 }}
        data={filteredArtists}
        keyExtractor={(artist) => artist.name.toLowerCase()}
        ItemSeparatorComponent={ItemSeparator}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom:
            insets.bottom +
            TAB_BAR_HEIGHT +
            (hasCurrentSong ? MINI_PLAYER_HEIGHT + 24 : 24),
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              paddingBottom: 8,
            }}
          >
            <Text style={{ color: muzaloTheme.muted, fontSize: 12 }}>
              {isSearching ? "Search results" : "In your library"}
            </Text>
            <Text style={{ color: muzaloTheme.muted, fontSize: 12 }}>
              {filteredArtists.length}{" "}
              {filteredArtists.length === 1 ? "artist" : "artists"}
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
                name={isSearching ? "search-outline" : "people-outline"}
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
                ? "No matching artists"
                : "Your artists will appear here"}
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
                ? "Try another artist name."
                : "Artist names are collected from the music files in your library."}
            </Text>
          </View>
        }
        renderItem={({ item }) => <ArtistListItem artist={item} />}
      />
    </SafeAreaView>
  );
};

export default ArtistsScreen;
