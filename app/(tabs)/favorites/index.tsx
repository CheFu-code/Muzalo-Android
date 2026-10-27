import TracksList from "@/components/TracksList";
import { EmptyState } from "@/components/ui";
import { MINI_PLAYER_HEIGHT, muzaloTheme as c } from "@/constants/tokens";
import { usePlayerStore, usePlaylistStore } from "@/tools/store/usePlayerStore";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { View } from "react-native";
export default function FavoritesScreen() {
  const files = usePlayerStore((s) => s.files);
  const favorites = usePlaylistStore((s) => s.favorites);
  const hasSong = usePlayerStore((s) => Boolean(s.currentSong));
  const tabHeight = useBottomTabBarHeight();
  const ids = new Set(favorites.map((item) => item.id));
  const songs = files.filter((song) => ids.has(song.id));
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <TracksList
        tracks={songs}
        contentContainerStyle={{
          paddingBottom:
            tabHeight + (hasSong ? MINI_PLAYER_HEIGHT + 16 : 0) + 24,
          flexGrow: 1,
        }}
        ListEmptyComponent={
          <EmptyState
            title="Keep your favourites close"
            message="Tap the heart on a track to find it here."
            icon="heart-outline"
          />
        }
      />
    </View>
  );
}
