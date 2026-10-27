import DraggableQueueList from "@/components/DraggableQueueList";
import SwipeDismissScreen from "@/components/SwipeDismissScreen";
import { ui } from "@/components/ui";
import { muzaloTheme as c } from "@/constants/tokens";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import { useState } from "react";
import { Alert, Text } from "react-native";
import { Pressable } from "react-native-gesture-handler";

export default function QueueScreen() {
  const queue = usePlayerStore((s) => s.queue);
  const busy = usePlayerStore((s) => s.playbackBusy);
  const clear = usePlayerStore((s) => s.clearQueue);
  const [reordering, setReordering] = useState(false);
  const confirmClear = () =>
    Alert.alert(
      "Clear play queue?",
      "This stops playback. Your library and playlists stay saved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            void clear();
          },
        },
      ],
    );
  return (
    <SwipeDismissScreen
      title="Play queue"
      right={
        <Pressable
          onPress={confirmClear}
          disabled={!queue.length || busy || reordering}
          accessibilityRole="button"
          accessibilityLabel="Clear queue"
          style={({ pressed }) => ({
            minHeight: 44,
            minWidth: 44,
            justifyContent: "center",
            opacity:
              !queue.length || busy || reordering ? 0.4 : pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ color: c.accent, fontWeight: "600" }}>Clear</Text>
        </Pressable>
      }
    >
      <Text
        style={[
          ui.muted,
          {
            paddingHorizontal: 20,
            paddingTop: 6,
            paddingBottom: 12,
            fontSize: 12,
          },
        ]}
      >
        Hold the handle to drag a song. Tap it for move options.
      </Text>
      <DraggableQueueList onInteraction={setReordering} />
    </SwipeDismissScreen>
  );
}
