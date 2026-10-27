import SongScreen from "@/components/SongScreen";
import { ActionButton, DetailRow, ui } from "@/components/ui";
import { useSongDetails } from "@/hooks/useSongDetails";
import formatDuration from "@/tools/formatDuration";
import { handleFetchingLyrics } from "@/tools/handleFetchingLyrics";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

export default function SongInfoScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { song, loading, error, refresh } = useSongDetails(id);
    const router = useRouter();
    const setLyrics = usePlayerStore((s) => s.setLyrics);
    const [busy, setBusy] = useState(false);
    const fetch = async () => {
        if (busy || !song) return;
        setBusy(true);
        try {
            await handleFetchingLyrics({ currentSong: song, setLyrics });
            await refresh();
        } catch {
            Alert.alert("Could not fetch lyrics", "Please try again.");
        } finally {
            setBusy(false);
        }
    };
    return (
        <SongScreen
            title="Track details"
            song={song}
            loading={loading}
            error={error}
        >
            {song && (
                <>
                    <View style={ui.card}>
                        <DetailRow
                            label="Album"
                            value={song.album || "Unknown album"}
                        />
                        {song.year ? (
                            <DetailRow label="Year" value={song.year} />
                        ) : null}
                        <DetailRow
                            label="Duration"
                            value={formatDuration(song.duration || 0)}
                        />
                        {song.size && song.size > 0 ? (
                            <DetailRow
                                label="File size"
                                value={song.size + " MB"}
                            />
                        ) : null}
                        <DetailRow
                            label="Play count"
                            value={String(song.playCount || 0)}
                        />
                        <DetailRow
                            label="File"
                            value={song.filename || song.uri}
                        />
                    </View>
                    {song.album ? (
                        <ActionButton
                            label="View album"
                            icon="disc-outline"
                            variant="secondary"
                            onPress={() =>
                                router.push({
                                    pathname: "/album/[name]",
                                    params: { name: song.album! },
                                })
                            }
                        />
                    ) : null}
                    <ActionButton
                        label={
                            song.syncedLyrics || song.lyrics
                                ? "Edit lyrics"
                                : "Add lyrics"
                        }
                        icon="create-outline"
                        onPress={() =>
                            router.push({
                                pathname: song.syncedLyrics
                                    ? "/lyrics/editsynced/[id]"
                                    : "/lyrics/edit/[id]",
                                params: { id },
                            })
                        }
                    />
                    <ActionButton
                        label="Sync lyrics with music"
                        icon="timer-outline"
                        variant="secondary"
                        disabled={!song.lyrics && !song.syncedLyrics}
                        onPress={() =>
                            router.push({
                                pathname: "/lyrics/sync/[id]",
                                params: { id },
                            })
                        }
                    />
                    <ActionButton
                        label={
                            song.lyrics || song.syncedLyrics
                                ? "Fetch lyrics again"
                                : "Fetch lyrics"
                        }
                        icon="cloud-download-outline"
                        variant="secondary"
                        loading={busy}
                        onPress={fetch}
                    />
                    <ActionButton
                        label="Edit track details"
                        icon="options-outline"
                        variant="secondary"
                        onPress={() =>
                            router.push({
                                pathname: "/edit/[id]",
                                params: { id },
                            })
                        }
                    />
                </>
            )}
        </SongScreen>
    );
}
