import { unknownTrackImageUri } from "@/constants/images";
import { muzaloTheme as c } from "@/constants/tokens";
import { songKey } from "@/tools/playbackQueue";
import {
  moveQueueItem,
  QUEUE_ROW_HEIGHT as ROW_HEIGHT,
  queueDropIndex,
} from "@/tools/queueReorder";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import type { Song } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Alert, FlatList, Image, Text, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  Pressable,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  scrollTo,
  SharedValue,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { EmptyState, IconButton } from "./ui";

type DragState = {
  from: SharedValue<number>;
  to: SharedValue<number>;
  offset: SharedValue<number>;
  translation: SharedValue<number>;
  startScroll: SharedValue<number>;
  scroll: SharedValue<number>;
  pointer: SharedValue<number>;
  settling: SharedValue<boolean>;
};

function SongDetails({ song, active }: { song: Song; active: boolean }) {
  return (
    <>
      <Image
        source={{ uri: song.coverArt || unknownTrackImageUri }}
        style={{ width: 40, height: 40, borderRadius: 7 }}
      />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text
          numberOfLines={1}
          style={{
            color: active ? c.accent : c.text,
            fontSize: 15,
            fontWeight: "600",
          }}
        >
          {song.title || song.filename}
        </Text>
        <Text numberOfLines={1} style={{ color: c.muted, fontSize: 12 }}>
          {song.artist || "Unknown artist"}
        </Text>
      </View>
    </>
  );
}

function QueueRow({
  song,
  index,
  count,
  active,
  disabled,
  drag,
  onStart,
  onDrop,
  onCancel,
  onOptions,
}: {
  song: Song;
  index: number;
  count: number;
  active: boolean;
  disabled: boolean;
  drag: DragState;
  onStart: (index: number) => void;
  onDrop: (from: number, to: number) => void;
  onCancel: () => void;
  onOptions: (song: Song, delta?: number) => void;
}) {
  const play = usePlayerStore((s) => s.playSongGeneric);
  const remove = usePlayerStore((s) => s.removeFromQueue);
  const pan = Gesture.Pan()
    .enabled(!disabled && count > 1)
    .activateAfterLongPress(180)
    .onStart((event) => {
      drag.from.value = index;
      drag.to.value = index;
      drag.offset.value = 0;
      drag.translation.value = 0;
      drag.startScroll.value = drag.scroll.value;
      drag.pointer.value = event.absoluteY;
      drag.settling.value = false;
      runOnJS(onStart)(index);
    })
    .onUpdate((event) => {
      drag.translation.value = event.translationY;
      drag.pointer.value = event.absoluteY;
      drag.offset.value = Math.max(
        -index * ROW_HEIGHT,
        Math.min(
          (count - index - 1) * ROW_HEIGHT,
          event.translationY + drag.scroll.value - drag.startScroll.value,
        ),
      );
      drag.to.value = queueDropIndex(
        index,
        event.translationY,
        drag.scroll.value - drag.startScroll.value,
        count,
      );
    })
    .onEnd(() => {
      drag.settling.value = true;
      const target = drag.to.value;
      drag.offset.value = withTiming(
        (target - index) * ROW_HEIGHT,
        { duration: 120 },
        (finished) => {
          if (finished) runOnJS(onDrop)(index, target);
        },
      );
    })
    .onFinalize((_, success) => {
      if (!success && drag.from.value === index) runOnJS(onCancel)();
    });
  const style = useAnimatedStyle(() => {
    let shift = 0;
    if (drag.from.value >= 0 && index !== drag.from.value) {
      if (index > drag.from.value && index <= drag.to.value)
        shift = -ROW_HEIGHT;
      else if (index < drag.from.value && index >= drag.to.value)
        shift = ROW_HEIGHT;
    }
    return {
      opacity: drag.from.value === index ? 0 : 1,
      transform: [{ translateY: withTiming(shift, { duration: 120 }) }],
    };
  });
  return (
    <Animated.View
      style={[
        {
          height: ROW_HEIGHT,
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: 16,
          paddingRight: 6,
          backgroundColor: active ? c.accentSoft : c.background,
        },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Play ${song.title || song.filename}`}
        disabled={disabled}
        onPress={() => {
          void play(song);
        }}
        style={({ pressed }) => ({
          flex: 1,
          minWidth: 0,
          minHeight: 56,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          opacity: pressed ? 0.65 : 1,
        })}
      >
        <SongDetails song={song} active={active} />
      </Pressable>
      <GestureDetector gesture={pan}>
        <View collapsable={false}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Reorder ${song.title || song.filename}`}
            accessibilityHint="Hold and drag, or tap for move options"
            disabled={disabled || count < 2}
            accessibilityActions={[
              { name: "increment", label: "Move down" },
              { name: "decrement", label: "Move up" },
            ]}
            onAccessibilityAction={(event) =>
              onOptions(
                song,
                event.nativeEvent.actionName === "increment"
                  ? 1
                  : event.nativeEvent.actionName === "decrement"
                    ? -1
                    : undefined,
              )
            }
            onPress={() => onOptions(song)}
            style={({ pressed }) => ({
              width: 44,
              height: 48,
              alignItems: "center",
              justifyContent: "center",
              opacity: disabled || count < 2 ? 0.35 : pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="reorder-three-outline" size={24} color={c.muted} />
          </Pressable>
        </View>
      </GestureDetector>
      <IconButton
        icon="close-outline"
        label={`Remove ${song.title || song.filename} from queue`}
        color={c.muted}
        disabled={disabled}
        onPress={() => {
          void remove(songKey(song));
        }}
      />
    </Animated.View>
  );
}

export default function DraggableQueueList({
  onInteraction,
}: {
  onInteraction: (active: boolean) => void;
}) {
  const queue = usePlayerStore((s) => s.queue);
  const current = usePlayerStore((s) => s.currentSong);
  const busy = usePlayerStore((s) => s.playbackBusy);
  const move = usePlayerStore((s) => s.moveQueueTrack);
  const [items, setItems] = useState(queue);
  const [dragged, setDragged] = useState<Song | null>(null);
  const [saving, setSaving] = useState(false);
  const interacting = useRef(false);
  const snapshot = useRef(queue);
  const viewport = useRef<View>(null);
  const list = useAnimatedRef<FlatList<Song>>();
  const from = useSharedValue(-1),
    to = useSharedValue(-1),
    offset = useSharedValue(0);
  const translation = useSharedValue(0),
    startScroll = useSharedValue(0),
    scroll = useSharedValue(0);
  const pointer = useSharedValue(0),
    settling = useSharedValue(false);
  const top = useSharedValue(0),
    height = useSharedValue(0),
    count = useSharedValue(queue.length);
  const drag: DragState = {
    from,
    to,
    offset,
    translation,
    startScroll,
    scroll,
    pointer,
    settling,
  };
  useEffect(() => {
    if (!interacting.current) setItems(queue);
    count.value = queue.length;
  }, [queue, count]);
  const onScroll = useAnimatedScrollHandler((event) => {
    scroll.value = event.contentOffset.y;
    if (from.value >= 0 && !settling.value) {
      offset.value = Math.max(
        -from.value * ROW_HEIGHT,
        Math.min(
          (count.value - from.value - 1) * ROW_HEIGHT,
          translation.value + scroll.value - startScroll.value,
        ),
      );
      to.value = queueDropIndex(
        from.value,
        translation.value,
        scroll.value - startScroll.value,
        count.value,
      );
    }
  });
  useFrameCallback((frame) => {
    if (from.value < 0 || settling.value || !height.value) return;
    const distance = pointer.value - top.value;
    const direction = distance < 56 ? -1 : distance > height.value - 56 ? 1 : 0;
    if (!direction) return;
    const next = Math.max(
      0,
      Math.min(
        Math.max(0, count.value * ROW_HEIGHT + 24 - height.value),
        scroll.value +
          direction * Math.min(frame.timeSincePreviousFrame ?? 16, 32) * 0.35,
      ),
    );
    scrollTo(list, 0, next, false);
  });
  const floating = useAnimatedStyle(() => ({
    transform: [
      { translateY: from.value * ROW_HEIGHT - scroll.value + offset.value },
    ],
  }));
  const reset = () => {
    from.value = -1;
    to.value = -1;
    offset.value = 0;
    settling.value = false;
    setDragged(null);
  };
  const cancel = () => {
    interacting.current = false;
    reset();
    setItems(usePlayerStore.getState().queue);
    onInteraction(false);
  };
  const start = (index: number) => {
    interacting.current = true;
    snapshot.current = items;
    setDragged(items[index]);
    onInteraction(true);
  };
  const drop = (oldIndex: number, newIndex: number) => {
    const latest = usePlayerStore.getState().queue;
    const source = snapshot.current[oldIndex],
      target = snapshot.current[newIndex];
    const sourceIndex = source
      ? latest.findIndex((song) => songKey(song) === songKey(source))
      : -1;
    const targetIndex = target
      ? latest.findIndex((song) => songKey(song) === songKey(target))
      : -1;
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      cancel();
      return;
    }
    setItems(moveQueueItem(latest, sourceIndex, targetIndex));
    setSaving(true);
    reset();
    void move(sourceIndex, targetIndex).finally(() => {
      interacting.current = false;
      setItems(usePlayerStore.getState().queue);
      setSaving(false);
      onInteraction(false);
    });
  };
  const options = (song: Song, delta?: number) => {
    const latest = usePlayerStore.getState().queue;
    const index = latest.findIndex((entry) => songKey(entry) === songKey(song));
    if (delta !== undefined) {
      if (index + delta >= 0 && index + delta < latest.length)
        void move(index, index + delta);
      return;
    }
    Alert.alert("Move song", song.title || song.filename, [
      ...(index > 0
        ? [{ text: "Move up", onPress: () => options(song, -1) }]
        : []),
      ...(index < latest.length - 1
        ? [{ text: "Move down", onPress: () => options(song, 1) }]
        : []),
      { text: "Cancel", style: "cancel" },
    ]);
  };
  return (
    <View
      ref={viewport}
      collapsable={false}
      style={{ flex: 1, overflow: "hidden" }}
      onLayout={() =>
        viewport.current?.measureInWindow((_, y, __, h) => {
          top.value = y;
          height.value = h;
        })
      }
    >
      <Animated.FlatList
        ref={list}
        data={items}
        keyExtractor={songKey}
        onScroll={onScroll}
        scrollEventThrottle={16}
        scrollEnabled={!dragged && !saving && !busy}
        removeClippedSubviews={false}
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
        getItemLayout={(_, index) => ({
          index,
          length: ROW_HEIGHT,
          offset: index * ROW_HEIGHT,
        })}
        renderItem={({ item, index }) => (
          <QueueRow
            song={item}
            index={index}
            count={items.length}
            active={!!current && songKey(current) === songKey(item)}
            disabled={
              busy ||
              saving ||
              (!!dragged && songKey(dragged) !== songKey(item))
            }
            drag={drag}
            onStart={start}
            onDrop={drop}
            onCancel={cancel}
            onOptions={options}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="Your queue is quiet"
            message="Choose Play next or Add to queue from a song's menu."
            icon="list-outline"
          />
        }
      />
      {dragged && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: 0,
              right: 0,
              height: ROW_HEIGHT,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingLeft: 16,
              paddingRight: 16,
              backgroundColor: c.raised,
              elevation: 8,
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 8,
            },
            floating,
          ]}
        >
          <SongDetails
            song={dragged}
            active={!!current && songKey(current) === songKey(dragged)}
          />
          <Ionicons
            name="reorder-three-outline"
            size={24}
            color={c.accent}
            style={{ width: 38, textAlign: "center" }}
          />
          <Ionicons
            name="close-outline"
            size={22}
            color={c.muted}
            style={{ width: 32, textAlign: "center" }}
          />
        </Animated.View>
      )}
    </View>
  );
}
