import SongScreen from "@/components/SongScreen";
import { ActionButton, FormField, ui } from "@/components/ui";
import { useSongDetails } from "@/hooks/useSongDetails";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text } from "react-native";
export default function EditLyricsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { song, loading, error } = useSongDetails(id);
  const updateLyrics = usePlayerStore((s) => s.setLyrics);
  const router = useRouter();
  const [lyrics, setLyrics] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (song) setLyrics(song.lyrics || "");
  }, [song]);
  const save = async () => {
    if (!song?.id || busy) return;
    setBusy(true);
    try {
      await updateLyrics(song.id, lyrics);
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
  const paste = async () => {
    try {
      setLyrics(await Clipboard.getStringAsync());
    } catch {
      Alert.alert(
        "Could not paste",
        "Try typing or pasting directly into the lyrics field."
      );
    }
  };
  return (
    <SongScreen title="Edit lyrics" song={song} loading={loading} error={error}>
      <Text style={ui.muted}>
        Put each lyric on its own line. You can add timing from track details.
      </Text>
      <FormField
        label="Lyrics"
        multiline
        style={{ minHeight: 300 }}
        placeholder="Type or paste lyrics here"
        value={lyrics}
        onChangeText={setLyrics}
      />
      <ActionButton
        label="Paste from clipboard"
        icon="clipboard-outline"
        variant="secondary"
        onPress={paste}
        disabled={busy}
      />
      <ActionButton
        label="Save lyrics"
        icon="checkmark"
        onPress={save}
        loading={busy}
      />
    </SongScreen>
  );
}
