import {
  ActionButton,
  Artwork,
  FormField,
  Screen,
  ScreenHeader,
  ui,
} from "@/components/ui";
import { MINI_PLAYER_HEIGHT, TAB_BAR_HEIGHT } from "@/constants/tokens";
import { usePlayerStore, usePlaylistStore } from "@/tools/store/usePlayerStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CreatePlaylist() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addPlaylist = usePlaylistStore((s) => s.addPlaylist);
  const hasSong = usePlayerStore((s) => Boolean(s.currentSong));
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await addPlaylist(name.trim(), description.trim());
      router.back();
    } catch {
      Alert.alert("Could not create playlist", "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <ScreenHeader title="New playlist" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            ui.content,
            {
              paddingBottom:
                insets.bottom +
                TAB_BAR_HEIGHT +
                (hasSong ? MINI_PLAYER_HEIGHT : 0) +
                30,
            },
          ]}
        >
          <Text style={ui.title}>Make it yours.</Text>
          <Text style={ui.muted}>Bring your favourite tracks together.</Text>
          <FormField
            label="Playlist name"
            placeholder="Give your playlist a name"
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <FormField
            label="Description (optional)"
            placeholder="A few words about this collection"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <View
            style={[
              ui.card,
              { flexDirection: "row", alignItems: "center", gap: 14 },
            ]}
          >
            <Artwork size={60} icon="albums-outline" />
            <View style={{ flex: 1 }}>
              <Text style={ui.body}>{name.trim() || "New playlist"}</Text>
              <Text style={ui.muted}>0 songs</Text>
            </View>
          </View>
          <ActionButton
            label="Create playlist"
            icon="add"
            disabled={!name.trim()}
            loading={busy}
            onPress={save}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
