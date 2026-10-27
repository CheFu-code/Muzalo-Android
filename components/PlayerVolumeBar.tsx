import { muzaloTheme as c } from "@/constants/tokens";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import Slider from "@react-native-community/slider";
import { View } from "react-native";
import { IconButton } from "./ui";
export default function PlayerVolumeBar() {
  const volume = usePlayerStore((s) => s.volume);
  const setVolume = usePlayerStore((s) => s.setVolume);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
      }}
    >
      <IconButton
        icon={volume === 0 ? "volume-mute-outline" : "volume-low-outline"}
        label="Decrease volume"
        color={c.muted}
        onPress={() => setVolume(Math.max(0, volume - 0.05))}
      />
      <Slider
        accessibilityLabel="Volume"
        style={{ flex: 1, height: 44 }}
        minimumValue={0}
        maximumValue={1}
        value={volume}
        onSlidingComplete={setVolume}
        minimumTrackTintColor={c.accent}
        maximumTrackTintColor={c.border}
        thumbTintColor={c.accent}
      />
      <IconButton
        icon="volume-high-outline"
        label="Increase volume"
        color={c.muted}
        onPress={() => setVolume(Math.min(1, volume + 0.05))}
      />
    </View>
  );
}
