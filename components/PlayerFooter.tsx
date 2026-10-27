import { usePlayerStore } from "@/tools/store/usePlayerStore";
import { Song } from "@/types/types";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { AppIcon, IconButton, ui } from "./ui";
export default function PlayerFooter({
  currentSong,
}: {
  currentSong: Song | null;
}) {
  const router = useRouter();
  const show = usePlayerStore((s) => s.showLyrics);
  const toggle = usePlayerStore((s) => s.toggleShowLyrics);
  const buttons: {
    icon: AppIcon;
    label: string;
    onPress: () => void;
    active?: boolean;
  }[] = [
    {
      icon: "add-circle-outline",
      label: "Playlist",
      onPress: () =>
        router.push({
          pathname: "/(modals)/addToPlaylist",
          params: { trackUri: currentSong?.uri },
        }),
    },
    {
      icon: "chatbox-ellipses-outline",
      label: "Lyrics",
      onPress: toggle,
      active: show,
    },
    {
      icon: "person-outline",
      label: "Artist",
      onPress: () =>
        router.navigate({
          pathname: "/(tabs)/artists/[name]",
          params: { name: currentSong?.artist || "Unknown Artist" },
        }),
    },
  ];
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
      {buttons.map((button) => (
        <View key={button.label} style={{ alignItems: "center" }}>
          <IconButton {...button} disabled={!currentSong} />
          <Text style={ui.label}>{button.label}</Text>
        </View>
      ))}
    </View>
  );
}
