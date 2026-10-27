import { muzaloTheme as c } from "@/constants/tokens";
import { hasTimestamps, parseLRC } from "@/tools/parseLyrics";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useProgress } from "react-native-track-player";
export default function SyncedLyrics({
  lrc,
  toggleShowLyrics,
}: {
  lrc: string;
  toggleShowLyrics: () => void;
}) {
  const lyrics = useMemo(() => parseLRC(lrc), [lrc]);
  const synced = hasTimestamps(lrc);
  const seek = usePlayerStore((s) => s.handleChangeSongPosition);
  const { position } = useProgress(100);
  const list = useRef<ScrollView>(null);
  const offsets = useRef<number[]>([]);
  const viewport = useRef(0);
  const [manual, setManual] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = lyrics.findIndex(
    (line, i) =>
      position >= line.time &&
      (i === lyrics.length - 1 || position < lyrics[i + 1].time)
  );
  useEffect(() => {
    offsets.current = [];
  }, [lrc]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  const scrollToActive = useCallback(() => {
    if (
      synced &&
      !manual &&
      active >= 0 &&
      offsets.current[active] !== undefined
    )
      list.current?.scrollTo({
        y: Math.max(0, offsets.current[active] - viewport.current * 0.35),
        animated: true,
      });
  }, [active, manual, synced]);
  useEffect(scrollToActive, [scrollToActive]);
  const onDrag = () => {
    if (timer.current) clearTimeout(timer.current);
    setManual(true);
    timer.current = setTimeout(() => setManual(false), 5000);
  };
  // A bounded ScrollView can also sit inside the player's scrolling layout.
  return (
    <View
      style={{ flex: 1 }}
      onLayout={(e) => {
        viewport.current = e.nativeEvent.layout.height;
        scrollToActive();
      }}
    >
      <ScrollView
        ref={list}
        nestedScrollEnabled
        onScrollBeginDrag={onDrag}
        onMomentumScrollEnd={onDrag}
        contentContainerStyle={{ paddingVertical: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {lyrics.map((item, index) => (
          <Text
            key={index}
            accessibilityRole={synced ? "button" : undefined}
            accessibilityLabel={item.text}
            onLayout={(e) => {
              offsets.current[index] = e.nativeEvent.layout.y;
              if (index === active) scrollToActive();
            }}
            onPress={() => synced && seek(item.time)}
            onLongPress={toggleShowLyrics}
            style={{
              color: synced && active === index ? c.accent : c.muted,
              fontSize: 19,
              lineHeight: 29,
              fontWeight: synced && active === index ? "700" : "500",
              textAlign: "center",
              paddingHorizontal: 20,
              paddingVertical: 12,
            }}
          >
            {item.text || " "}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}
