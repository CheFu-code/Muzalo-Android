import SongScreen from "@/components/SongScreen";
import { ActionButton, FormField, ui } from "@/components/ui";
import { useSongDetails } from "@/hooks/useSongDetails";
import {
  formatLRC,
  formatTimestamp,
  LyricLine,
  parseLRC,
} from "@/tools/parseLyrics";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";

export default function EditSyncedLyricsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { song, loading, error } = useSongDetails(id);
  const saveLyrics = usePlayerStore((s) => s.updateSongSyncedLyrics);
  const router = useRouter();
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (song) setLines(parseLRC(song.syncedLyrics || song.lyrics || ""));
  }, [song]);
  const save = async () => {
    if (!id || !lines.length || busy) return;
    setBusy(true);
    try {
      await saveLyrics(id, formatLRC(lines));
      router.back();
    } catch {
      Alert.alert(
        "Could not save lyrics",
        "Your changes are still here. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };
  const copy = () => {
    const plain = (song?.lyrics || "")
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
    if (plain.length !== lines.length) {
      Alert.alert(
        "Line counts differ",
        "The plain lyrics have " +
          plain.length +
          " lines and the timed lyrics have " +
          lines.length +
          ". Edit the lines here, or sync the plain lyrics again to preserve the correct timing."
      );
      return;
    }
    Alert.alert(
      "Replace lyric text?",
      "This copies your plain lyrics into the timed lines and keeps their timestamps.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Copy",
          onPress: () =>
            setLines((prev) =>
              prev.map((line, i) => ({ ...line, text: plain[i] }))
            ),
        },
      ]
    );
  };
  return (
    <SongScreen
      title="Edit timed lyrics"
      song={song}
      loading={loading}
      error={error}
    >
      <Text style={ui.muted}>
        Edit each line without changing its timing. Use Sync lyrics to adjust
        timestamps.
      </Text>
      <ActionButton
        label="Edit plain lyrics"
        icon="create-outline"
        variant="secondary"
        onPress={() =>
          router.push({ pathname: "/lyrics/edit/[id]", params: { id } })
        }
      />
      <ActionButton
        label="Copy text from plain lyrics"
        icon="copy-outline"
        variant="secondary"
        disabled={!song?.lyrics || !lines.length}
        onPress={copy}
      />
      {lines.map((line, index) => (
        <View key={index} style={{ gap: 8 }}>
          <FormField
            label={"Line " + (index + 1) + " / " + formatTimestamp(line.time)}
            multiline
            style={{ minHeight: 72 }}
            value={line.text}
            onChangeText={(text) =>
              setLines((prev) =>
                prev.map((value, i) =>
                  i === index ? { ...value, text } : value
                )
              )
            }
          />
        </View>
      ))}
      <ActionButton
        label="Save timed lyrics"
        icon="checkmark"
        disabled={!lines.length}
        loading={busy}
        onPress={save}
      />
    </SongScreen>
  );
}
