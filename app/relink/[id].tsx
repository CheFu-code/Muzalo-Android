import SongScreen from "@/components/SongScreen";
import { ActionButton, ui } from "@/components/ui";
import { muzaloTheme as c } from "@/constants/tokens";
import { useSongDetails } from "@/hooks/useSongDetails";
import { getAllSongs, getSongInfoFromDB, relinkSong } from "@/tools/db";
import { audioFileKey } from "@/tools/deviceLibrary";
import { fileNameFromSafUri } from "@/tools/fileNameFromSAF";
import { looksLikeAudio } from "@/tools/fileUtils";
import { songKey, uniqueSongs } from "@/tools/playbackQueue";
import { usePlayerStore, usePlaylistStore } from "@/tools/store/usePlayerStore";
import * as FileSystem from "expo-file-system";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text } from "react-native";
import { toast } from "sonner-native";

export default function RelinkTrack() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { song, loading, error } = useSongDetails(id);
  const [uris, setUris] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState(false);
  const router = useRouter();
  const choose = async () => {
    setBusy(true);
    try {
      const result =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!result.granted) return;
      setUris(
        (
          await FileSystem.StorageAccessFramework.readDirectoryAsync(
            result.directoryUri,
          )
        ).filter(looksLikeAudio),
      );
      setChosen(true);
    } catch {
      Alert.alert(
        "Could not read folder",
        "Choose a folder you can access and try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const link = (uri: string) => {
    const filename = fileNameFromSafUri(uri) || "Audio file";
    Alert.alert(
      "Use this audio file?",
      `Link “${filename}” to this track. Its edited details and lyrics stay saved. If this file already has another library entry, its playlist references and listening history are merged into this track. This track's details and lyrics take priority over the other entry.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Use file",
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                const indexed = (await getAllSongs()).find(
                  (entry) =>
                    entry.id !== id &&
                    audioFileKey(entry.uri) === audioFileKey(uri),
                );
                const mergedId = await relinkSong(
                  id,
                  uri,
                  filename,
                  indexed?.id ?? undefined,
                );
                const updated = await getSongInfoFromDB(id);
                if (!updated) throw new Error("Track unavailable");
                const files = await getAllSongs();
                const matches = (key: string) => key === id || key === mergedId;
                usePlayerStore.setState((state) => ({
                  files,
                  currentSong:
                    state.currentSong && matches(songKey(state.currentSong))
                      ? updated
                      : state.currentSong,
                  queue: uniqueSongs(
                    state.queue.map((entry) =>
                      matches(songKey(entry)) ? updated : entry,
                    ),
                  ),
                  queueOrder: [
                    ...new Set(
                      state.queueOrder.map((key) => (matches(key) ? id : key)),
                    ),
                  ],
                }));
                await usePlaylistStore.getState().loadFavorites();
                await usePlaylistStore.getState().loadPlaylists("all");
                await usePlayerStore.getState().refreshPlaybackQueue();
                toast.success("Audio file linked");
                router.back();
              } catch {
                Alert.alert(
                  "Could not link audio",
                  "Your original file has not been deleted. Check access and try again.",
                );
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SongScreen
        title="Locate audio"
        song={song}
        loading={loading}
        error={error}
      >
        <Text style={ui.muted}>
          Choose the folder containing the moved file, then select its audio
          file. This keeps the existing track&apos;s identity and saved
          information.
        </Text>
        <ActionButton
          label="Choose folder"
          icon="folder-open-outline"
          onPress={() => {
            void choose();
          }}
          loading={busy}
        />
        {chosen && !uris.length && (
          <Text style={ui.muted}>
            No supported audio files were found directly in this folder. Try its
            music subfolder.
          </Text>
        )}
        {uris.map((uri) => (
          <ActionButton
            key={uri}
            label={fileNameFromSafUri(uri) || "Audio file"}
            variant="secondary"
            disabled={busy}
            onPress={() => link(uri)}
          />
        ))}
        <Text style={{ color: c.muted }}>
          Music files are never moved or deleted by linking.
        </Text>
      </SongScreen>
    </>
  );
}
