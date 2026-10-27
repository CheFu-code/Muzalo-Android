import SongScreen from "@/components/SongScreen";
import { FormField, ui } from "@/components/ui";
import { muzaloTheme } from "@/constants/tokens";
import { useSongDetails } from "@/hooks/useSongDetails";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text } from "react-native";
import { Pressable } from "react-native-gesture-handler";

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
            Alert.alert(
                "Title and artist are required",
                "Enter both before saving.",
            );
            return;
        }
        setBusy(true);
        try {
            await editSong(
                song.id,
                title.trim(),
                artist.trim(),
                album.trim(),
                year.trim(),
            );
            router.back();
        } catch {
            Alert.alert(
                "Could not save track",
                "Your changes are still here. Please try again.",
            );
        } finally {
            setBusy(false);
        }
    };
    return (
        <SongScreen
            title="Edit track"
            song={song}
            loading={loading}
            error={error}
            headerRight={
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Save changes"
                    accessibilityState={{ disabled: busy, busy }}
                    disabled={busy}
                    onPress={save}
                    style={({ pressed }) => ({
                        minWidth: 44,
                        minHeight: 44,
                        paddingHorizontal: 8,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: busy ? 0.5 : pressed ? 0.6 : 1,
                    })}
                >
                    {busy ? (
                        <ActivityIndicator size="small" color={muzaloTheme.accent} />
                    ) : (
                        <Text style={{ color: muzaloTheme.accent, fontSize: 16, fontWeight: "600" }}>
                            Save
                        </Text>
                    )}
                </Pressable>
            }
        >
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
        </SongScreen>
    );
}
