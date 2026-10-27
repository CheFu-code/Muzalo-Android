import SwipeDismissScreen from "@/components/SwipeDismissScreen";
import TracksList from "@/components/TracksList";
import { EmptyState, ui } from "@/components/ui";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import { Text } from "react-native";

export default function QueueScreen() {
  const queue = usePlayerStore((s) => s.queue);
  return (
    <SwipeDismissScreen title="Play queue">
      <Text style={[ui.muted, { paddingHorizontal: 20, paddingVertical: 12 }]}>
        {queue.length} {queue.length === 1 ? "track" : "tracks"} in your
        listening session
      </Text>
      <TracksList
        tracks={queue}
        isInQueue
        hideQueueControls
        autoScrollToCurrent
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            title="Your queue is quiet"
            message="Play a song from your library to get started."
            icon="list-outline"
          />
        }
      />
    </SwipeDismissScreen>
  );
}
