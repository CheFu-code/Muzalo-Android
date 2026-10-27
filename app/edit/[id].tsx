import SongScreen from "@/components/SongScreen";
import { ActionButton, FormField, ui } from "@/components/ui";
import { useSongDetails } from "@/hooks/useSongDetails";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text } from "react-native";

export default function EditSongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { song, loading, error } = useSongDetails(id);
  const editSong = usePlayerStore((s) => s.editSong);
  const router = useRouter();
  const [title, setTitle] = useState(""),
    [artist, setArtist] = useState(""),
    [album, setAlbum] = useState(""),
    [year, setYear] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (song) {
      setTitle(song.title || "");
      setArtist(song.artist || "");
      setAlbum(song.album || "");
      setYear(song.year || "");
    }
  }, [song]);
  const save = async () => {
    if (!song?.id || busy) return;
    if (!title.trim() || !artist.trim()) {
      Alert.alert("Title and artist are required", "Enter both before saving.");
      return;
    }
    setBusy(true);
    try {
      await editSong(
        song.id,
        title.trim(),
        artist.trim(),
        album.trim(),
        year.trim()
      );
      router.back();
    } catch {
      Alert.alert(
        "Could not save track",
        "Your changes are still here. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <SongScreen title="Edit track" song={song} loading={loading} error={error}>
      <Text style={ui.muted}>
        Update how this track appears in your Muzalo library.
      </Text>
      <FormField
        label="Title (required)"
        value={title}
        onChangeText={setTitle}
      />
      <FormField
        label="Artist (required)"
        value={artist}
        onChangeText={setArtist}
      />
      <FormField label="Album" value={album} onChangeText={setAlbum} />
      <FormField
        label="Release year"
        value={year}
        onChangeText={setYear}
        keyboardType="number-pad"
        maxLength={4}
      />
      <ActionButton
        label="Save changes"
        icon="checkmark"
        loading={busy}
        onPress={save}
      />
      <ActionButton
        label="Cancel"
        variant="secondary"
        disabled={busy}
        onPress={() => router.back()}
      />
    </SongScreen>
  );
}
