import LoadingScreen from "@/components/LoadingScreen";
import PlaylistsList from "@/components/PlaylistsList";
import {
  MINI_PLAYER_HEIGHT,
  TAB_BAR_HEIGHT,
  muzaloTheme,
} from "@/constants/tokens";
import { usePlayerStore, usePlaylistStore } from "@/tools/store/usePlayerStore";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const PlaylistScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const loadPlaylists = usePlaylistStore((state) => state.loadPlaylists);
  const isLoading = usePlaylistStore((state) => state.isLoading);
  const setIsLoading = usePlaylistStore((state) => state.setIsLoading);
  const playlists = usePlaylistStore((state) => state.playlists);
  const hasCurrentSong = usePlayerStore((state) => Boolean(state.currentSong));
  const [search, setSearch] = useState("");

  useFocusEffect(
    useCallback(() => {
      const fetchPlaylists = async () => {
        try {
          setIsLoading(true);
          await loadPlaylists("all");
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoading(false);
        }
      };
      void fetchPlaylists();
    }, [loadPlaylists, setIsLoading])
  );

  const filteredPlaylists = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return playlists;
    return playlists.filter(
      (playlist) =>
        playlist.name?.toLowerCase().includes(term) ||
        playlist.description?.toLowerCase().includes(term)
    );
  }, [playlists, search]);

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
            placeholder="Search playlists"
            placeholderTextColor={muzaloTheme.muted}
            selectionColor={muzaloTheme.accent}
            accessibilityLabel="Search playlists"
            autoCorrect={false}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Clear playlist search"
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
      <PlaylistsList
        playlists={filteredPlaylists}
        searchQuery={search}
        onPlaylistPress={(id) =>
          router.push({ pathname: "/playlists/[name]", params: { name: id } })
        }
        contentContainerStyle={{
          paddingBottom:
            insets.bottom +
            TAB_BAR_HEIGHT +
            (hasCurrentSong ? MINI_PLAYER_HEIGHT + 24 : 24),
        }}
      />
    </SafeAreaView>
  );
};

export default PlaylistScreen;
