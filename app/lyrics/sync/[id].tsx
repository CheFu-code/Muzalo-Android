import LoadingScreen from "@/components/LoadingScreen";
import { PlayPauseButton } from "@/components/PlayerControls";
import {
  ActionButton,
  EmptyState,
  IconButton,
  Screen,
  ScreenHeader,
  SongHeading,
  ui,
} from "@/components/ui";
import { muzaloTheme as c } from "@/constants/tokens";
import { useSongDetails } from "@/hooks/useSongDetails";
import { formatLRC, formatTimestamp, parseLRC } from "@/tools/parseLyrics";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import TrackPlayer, { useProgress } from "react-native-track-player";

type TimedLine = { index: number; time: number; text: string };
export default function SyncLyricsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { song, loading, error } = useSongDetails(id);
  const current = usePlayerStore((s) => s.currentSong);
  const play = usePlayerStore((s) => s.playSongGeneric);
  const seek = usePlayerStore((s) => s.handleChangeSongPosition);
  const saveLyrics = usePlayerStore((s) => s.updateSongSyncedLyrics);
  const router = useRouter();
  const [lyrics, setLyrics] = useState<string[]>([]);
  const [synced, setSynced] = useState<TimedLine[]>([]);
  const [busy, setBusy] = useState(false);
  const marking = useRef(false);
  const list = useRef<FlatList<string>>(null);
  const { position, duration } = useProgress(100);
  const matching = Boolean(song && current?.uri === song.uri);
  const next = lyrics.findIndex(
    (_, i) => !synced.some((line) => line.index === i)
  );
  useEffect(() => {
    if (!song) return;
    if (song.syncedLyrics) {
      const parsed = parseLRC(song.syncedLyrics);
      setLyrics(parsed.map((line) => line.text));
      setSynced(parsed.map((line, index) => ({ ...line, index })));
    } else {
      setLyrics(
        (song.lyrics || "")
          .split("\n")
          .map((t) => t.trim())
          .filter(Boolean)
      );
      setSynced([]);
    }
  }, [song]);
  const start = async () => {
    if (!song || busy) return;
    setBusy(true);
    try {
      await play(song);
      await seek(0);
    } catch {
      Alert.alert("Could not play this track", "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const mark = async (index: number) => {
    if (!matching || index < 0 || busy || marking.current) return;
    marking.current = true;
    try {
      const { position: time } = await TrackPlayer.getProgress();
      setSynced((prev) => [
        ...prev.filter((line) => line.index < index && line.time <= time),
        { index, time, text: lyrics[index] },
      ]);
      if (index + 1 < lyrics.length)
        list.current?.scrollToIndex({
          index: index + 1,
          viewPosition: 0.4,
          animated: true,
        });
    } catch {
      Alert.alert("Could not mark this line", "Please try again.");
    } finally {
      marking.current = false;
    }
  };
  const select = (index: number) => {
    const line = synced.find((value) => value.index === index);
    if (!matching || busy) return;
    if (line) {
      setSynced((prev) => prev.filter((value) => value.index < index));
      void seek(line.time);
    } else void mark(index);
  };
  const save = async () => {
    if (!id || !synced.length || busy) return;
    setBusy(true);
    try {
      await saveLyrics(
        id,
        formatLRC([...synced].sort((a, b) => a.time - b.time))
      );
      router.back();
    } catch {
      Alert.alert("Could not save timing", "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const confirmSave = () => {
    if (synced.length < lyrics.length)
      Alert.alert(
        "Save partial timing?",
        lyrics.length -
          synced.length +
          " lines still need timing. Only marked lines will appear in timed playback.",
        [
          { text: "Keep syncing", style: "cancel" },
          { text: "Save", onPress: save },
        ]
      );
    else void save();
  };
  if (loading) return <LoadingScreen />;
  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <ScreenHeader
        title="Sync lyrics"
        right={
          <IconButton
            icon="checkmark"
            label="Save lyric timing"
            color={c.accent}
            disabled={!synced.length || busy}
            onPress={confirmSave}
          />
        }
      />
      {!song ? (
        <EmptyState
          title="Track unavailable"
          message={error || "This track could not be found."}
        />
      ) : (
        <>
          <View style={{ padding: 20, gap: 14 }}>
            <SongHeading
              title={song.title}
              artist={song.artist}
              coverArt={song.coverArt}
            />
            <Text style={ui.muted}>
              Mark each line as you hear it. Tap a timed line to rewind and redo
              it from there.
            </Text>
          </View>
          <FlatList
            ref={list}
            data={lyrics}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 20,
              gap: 8,
            }}
            onScrollToIndexFailed={({ index, averageItemLength }) =>
              list.current?.scrollToOffset({
                offset: index * averageItemLength,
                animated: true,
              })
            }
            ListEmptyComponent={
              <EmptyState
                title="Add lyrics first"
                message="Add plain lyrics from track details, then return to set the timing."
              />
            }
            renderItem={({ item, index }) => {
              const line = synced.find((value) => value.index === index);
              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={"Line " + (index + 1) + ": " + item}
                  disabled={!matching || busy}
                  onPress={() => select(index)}
                  style={[
                    ui.card,
                    {
                      gap: 6,
                      borderColor: index === next ? c.accent : c.border,
                      backgroundColor: line ? c.accentSoft : c.surface,
                    },
                  ]}
                >
                  <Text
                    style={[ui.label, { color: line ? c.accent : c.muted }]}
                  >
                    {line
                      ? formatTimestamp(line.time)
                      : "Line " +
                        (index + 1) +
                        (index === next ? " / Up next" : "")}
                  </Text>
                  <Text style={ui.body}>{item}</Text>
                </TouchableOpacity>
              );
            }}
          />
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 10,
              paddingBottom: 12,
              borderTopWidth: 1,
              borderTopColor: c.border,
              gap: 8,
            }}
          >
            {!matching ? (
              <ActionButton
                label="Play this track to start"
                icon="play"
                loading={busy}
                onPress={start}
              />
            ) : (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-around",
                    alignItems: "center",
                  }}
                >
                  <IconButton
                    icon="play-back"
                    label="Seek back five seconds"
                    disabled={busy}
                    onPress={() => seek(Math.max(0, position - 5))}
                  />
                  <PlayPauseButton iconSize={25} />
                  <Text style={ui.label}>
                    {formatTimestamp(position)} / {synced.length} of{" "}
                    {lyrics.length}
                  </Text>
                  <IconButton
                    icon="play-forward"
                    label="Seek forward five seconds"
                    disabled={busy}
                    onPress={() =>
                      seek(Math.min(duration || position + 5, position + 5))
                    }
                  />
                </View>
                <ActionButton
                  label={
                    next < 0 ? "All lines marked" : "Mark line " + (next + 1)
                  }
                  icon="timer-outline"
                  disabled={next < 0 || !lyrics.length || busy}
                  onPress={() => mark(next)}
                />
              </>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}
