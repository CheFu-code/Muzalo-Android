import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { usePlaylistStore } from "@/tools/store/usePlayerStore";
import { Playlist } from "@/types/types";
import CollectionTracks from "./CollectionTracks";
import { ActionButton } from "./ui";

const systemPlaylists = [
  "downloads",
  "recent",
  "most-played",
  "favorites",
  "history",
];
export const PlaylistTracksList = ({
  playlist,
  playlistName,
}: {
  playlist: Playlist;
  playlistName: string;
}) => {
  const router = useRouter();
  const removePlaylist = usePlaylistStore((s) => s.removePlaylist);
  const clearHistory = usePlaylistStore((s) => s.clearHistory);
  const isHistory = playlist.id === "history";
  const confirmRemoval = () =>
    Alert.alert(
      isHistory ? "Clear listening history?" : "Delete playlist?",
      isHistory
        ? "This removes your playback history. Your music files will stay on your device."
        : "This removes the playlist. Your music files will stay on your device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isHistory ? "Clear" : "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (isHistory) await clearHistory();
              else await removePlaylist(playlist.id);
              router.back();
            } catch {
              Alert.alert("Could not complete action", "Please try again.");
            }
          },
        },
      ]
    );
  return (
    <CollectionTracks
      title={playlist.name || playlistName}
      kind="Playlist"
      tracks={playlist.songs ?? []}
      artwork={playlist.coverArt || playlist.songs?.[0]?.coverArt}
      playlistId={playlist.id}
      subtitle={playlist.userName ? "By " + playlist.userName : undefined}
      description={playlist.description}
      actions={
        !systemPlaylists.includes(playlist.id) ||
        (isHistory && playlist.songs.length > 0) ? (
          <ActionButton
            label={isHistory ? "Clear listening history" : "Delete playlist"}
            icon="trash-outline"
            variant="danger"
            onPress={confirmRemoval}
          />
        ) : undefined
      }
    />
  );
};
