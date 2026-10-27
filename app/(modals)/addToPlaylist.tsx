import DismissPlayerSymbol from "@/components/DismissPlayerSymbol";
import LoadingScreen from "@/components/LoadingScreen";
import PlaylistsList from "@/components/PlaylistsList";
import { muzaloTheme } from "@/constants/tokens";
import { usePlayerStore, usePlaylistStore } from "@/tools/store/usePlayerStore";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function AddToPlaylist() {
  const { trackUri } = useLocalSearchParams<{ trackUri: string }>();
  // const isLoading = usePlayerStore((s) => s.isLoading);
  const isLoading = usePlaylistStore((s) => s.isLoading);
  const setIsLoading = usePlaylistStore((s) => s.setIsLoading);

  const loadPlaylists = usePlaylistStore((s) => s.loadPlaylists);

  useFocusEffect(
    useCallback(() => {
      const fetchPlaylists = async () => {
        try {
          setIsLoading(true);
          await loadPlaylists("user");
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchPlaylists();
    }, [loadPlaylists, setIsLoading])
  );

  const getPlaylists = usePlaylistStore((s) => s.playlists);
  const addTrackToPlaylist = usePlaylistStore((s) => s.addTrackToPlaylist);

  const files = usePlayerStore((s) => s.files);

  const track = files.filter(
    (item) => decodeURIComponent(item.uri) === trackUri
  );

  const [search, setSearch] = useState("");

  const filteredPlaylists = useMemo(() => {
    if (search.trim() === "") return getPlaylists;
    const lowerSearch = search.trim().toLowerCase();
    return getPlaylists.filter(
      (t) =>
        t?.name?.toLowerCase().includes(lowerSearch) ||
        t?.description?.toLowerCase().includes(lowerSearch)
    );
  }, [getPlaylists, search]);

  const translateY = useSharedValue(0);
  const router = useRouter();

  // Background fade style
  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: 1 - translateY.value / SCREEN_HEIGHT,
  }));

  // Card movement style
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!track) {
    return null;
  }

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 150) {
        runOnJS(router.back)();
      } else {
        // Bouncy spring back
        translateY.value = withSpring(0, {
          damping: 12, // less damping = more oscillation
          stiffness: 120, // spring stiffness
          mass: 0.8, // affects bounciness
          overshootClamping: false, // allow it to "go past" and bounce
        });
      }
    });

  const onPlaylistPress = async (playlistId: string) => {
    addTrackToPlaylist(playlistId, track[0].id || "");
    router.dismiss();
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{
        flex: 1,
        backgroundColor: muzaloTheme.background,
      }}
    >
      <Animated.View
        style={[
          {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "rgba(0,0,0,0.5)",
          },
          backgroundStyle,
        ]}
      />
      <GestureDetector gesture={panGesture}>
        <Animated.View
          className="flex-1"
          style={[
            {
              flex: 1,
              backgroundColor: muzaloTheme.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            },
            cardStyle,
          ]}
        >
          <View className="items-center my-8">
            <DismissPlayerSymbol />
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
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
              <Ionicons
                name="search-outline"
                size={19}
                color={muzaloTheme.muted}
              />
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
              />
              {search ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Clear playlist search"
                  style={{
                    width: 44,
                    minHeight: 48,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() => setSearch("")}
                >
                  <Ionicons
                    name="close-circle"
                    color={muzaloTheme.muted}
                    size={20}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <PlaylistsList
              playlists={filteredPlaylists}
              searchQuery={search}
              onPlaylistPress={onPlaylistPress}
              scrollEnabled={true}
            />
          </View>
        </Animated.View>
      </GestureDetector>
    </SafeAreaView>
  );
}
