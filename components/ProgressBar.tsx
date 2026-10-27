import { muzaloTheme as c } from "@/constants/tokens";
import formatDuration from "@/tools/formatDuration";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import Slider from "@react-native-community/slider";
import React from "react";
import { Text, View } from "react-native";
import { useProgress } from "react-native-track-player";
import { ui } from "./ui";

const ProgressBar = React.memo(
  ({ queueIndex }: { queueIndex: string | number }) => {
    const seek = usePlayerStore((s) => s.handleChangeSongPosition);
    const { position, duration } = useProgress();
    const end = Number.isFinite(duration) && duration > 0 ? duration : 0;
    const value = Number.isFinite(position)
      ? Math.max(0, Math.min(position, end))
      : 0;
    return (
      <View>
        <Slider
          accessibilityLabel="Track position"
          style={{ width: "100%", height: 44 }}
          minimumValue={0}
          maximumValue={end || 1}
          value={value}
          disabled={!end}
          onSlidingComplete={seek}
          minimumTrackTintColor={c.accent}
          maximumTrackTintColor={c.border}
          thumbTintColor={c.accent}
        />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 12,
          }}
        >
          <Text style={ui.label}>{formatDuration(value)}</Text>
          {queueIndex ? <Text style={ui.label}>{queueIndex}</Text> : null}
          <Text style={ui.label}>{formatDuration(end)}</Text>
        </View>
      </View>
    );
  }
);
ProgressBar.displayName = "ProgressBar";
export default ProgressBar;
