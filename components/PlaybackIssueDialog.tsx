import { muzaloTheme as c } from "@/constants/tokens";
import { removeSong } from "@/tools/db";
import { songKey } from "@/tools/playbackQueue";
import { usePlayerStore, usePlaylistStore } from "@/tools/store/usePlayerStore";
import { syncLibrary } from "@/tools/syncLibrary";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Modal, ScrollView, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { toast } from "sonner-native";
import { ActionButton, IconButton, ui } from "./ui";

export default function PlaybackIssueDialog() {
  const issue = usePlayerStore((state) => state.playbackError);
  const dismiss = usePlayerStore((state) => state.dismissPlaybackError);
  const queue = usePlayerStore((state) => state.queue);
  const current = usePlayerStore((state) => state.currentSong);
  const repeat = usePlayerStore((state) => state.repeat);
  const index = queue.findIndex((song) => current && songKey(song) === songKey(current));
  const canSkip = queue.length > 1 && (index < queue.length - 1 || repeat === "all");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const retry = async () => {
    if (!issue?.song || busy) return;
    setBusy(true);
    const song =
      usePlayerStore
        .getState()
        .files.find((entry) => songKey(entry) === songKey(issue.song!)) ??
      issue.song;
    const success = await usePlayerStore.getState().playSongGeneric(song);
    setBusy(false);
    if (success) dismiss();
  };
  const remove = () => {
    if (!issue?.song?.id) return;
    const id = issue.song.id;
    Alert.alert(
      "Remove from library?",
      "This removes the library entry, its saved lyrics and playlist references. It does not delete the audio file.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                if (!(await usePlayerStore.getState().removeFromQueue(id)))
                  return;
                await removeSong(id);
                await usePlayerStore.getState().loadLibrary();
                await usePlaylistStore.getState().loadFavorites();
                await usePlaylistStore.getState().loadPlaylists("all");
                dismiss();
                toast.success("Removed from library");
              } catch {
                Alert.alert("Could not remove track", "Please try again.");
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
    <Modal
      visible={!!issue}
      transparent
      animationType="fade"
      onRequestClose={busy ? undefined : dismiss}
    >
      <GestureHandlerRootView
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 20,
          backgroundColor: "rgba(0,0,0,0.7)",
        }}
      >
        <View
          style={{
            maxHeight: "90%",
            backgroundColor: c.surface,
            borderRadius: 22,
            padding: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[ui.title, { flex: 1, fontSize: 20 }]}>
              Playback unavailable
            </Text>
            <IconButton
              icon="close"
              label="Close playback message"
              onPress={dismiss}
              disabled={busy}
            />
          </View>
          <ScrollView
            contentContainerStyle={{ gap: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            {issue?.song && (
              <Text style={{ color: c.text, fontWeight: "600" }}>
                {issue.song.title || issue.song.filename}
              </Text>
            )}
            <Text style={[ui.muted, { lineHeight: 22 }]}>{issue?.message}</Text>
            {issue?.song && (
              <ActionButton
                label="Try playing again"
                onPress={() => {
                  void retry();
                }}
                loading={busy}
              />
            )}
            {issue?.song && (
              <ActionButton
                label="Skip to next track"
                variant="secondary"
                disabled={busy || !canSkip}
                onPress={() => {
                  setBusy(true);
                  void usePlayerStore
                    .getState()
                    .playAnotherSongInQueue("next")
                    .then((success) => {
                      if (success) dismiss();
                    })
                    .finally(() => setBusy(false));
                }}
              />
            )}
            <ActionButton
              label="Scan for music"
              variant="secondary"
              loading={busy}
              onPress={() => {
                setBusy(true);
                void syncLibrary({ requestPermission: true }).finally(() =>
                  setBusy(false),
                );
              }}
            />
            {issue?.song?.id && (
              <>
                <ActionButton
                  label="Locate audio file"
                  icon="folder-open-outline"
                  variant="secondary"
                  disabled={busy}
                  onPress={() => {
                    const id = issue.song!.id!;
                    dismiss();
                    router.push({ pathname: "/relink/[id]", params: { id } });
                  }}
                />
                <ActionButton
                  label="Remove from library"
                  variant="danger"
                  disabled={busy}
                  onPress={remove}
                />
              </>
            )}
          </ScrollView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
