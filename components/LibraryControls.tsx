import { muzaloTheme as c } from "@/constants/tokens";
import {
  librarySortLabels,
  LibrarySort,
  songFolder,
} from "@/tools/libraryControls";
import { useLibraryPreferences } from "@/tools/store/useLibraryPreferences";
import { Song } from "@/types/types";
import { useMemo, useState } from "react";
import { Modal, ScrollView, Switch, Text, View } from "react-native";
import {
  GestureHandlerRootView,
  Pressable,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionButton, IconButton, ui } from "./ui";

export default function LibraryControls({ songs }: { songs: Song[] }) {
  const [open, setOpen] = useState(false);
  const preferences = useLibraryPreferences();
  const { update, reset } = preferences;
  const insets = useSafeAreaInsets();
  const folders = useMemo(
    () => [...new Set(songs.map(songFolder))].sort(),
    [songs],
  );
  const select = (label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        justifyContent: "center",
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: selected ? c.accentSoft : "transparent",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text
        style={{
          color: selected ? c.accent : c.text,
          fontWeight: selected ? "600" : "400",
        }}
      >
        {selected ? "✓ " : ""}
        {label}
      </Text>
    </Pressable>
  );
  const toggle = (
    label: string,
    value: boolean,
    onChange: (value: boolean) => void,
  ) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text style={[ui.muted, { flex: 1 }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: c.accent, false: c.border }}
      />
    </View>
  );
  return (
    <>
      <IconButton
        icon="options-outline"
        label="Sort and filter music"
        onPress={() => setOpen(true)}
      />
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <GestureHandlerRootView
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "flex-end",
            paddingTop: insets.top + 16,
          }}
        >
          <View
            style={{
              backgroundColor: c.surface,
              maxHeight: "100%",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: Math.max(insets.bottom, 20),
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text style={[ui.title, { flex: 1, fontSize: 21 }]}>
                Your library
              </Text>
              <IconButton
                icon="close"
                label="Close library controls"
                onPress={() => setOpen(false)}
              />
            </View>
            <ScrollView
              contentContainerStyle={{ gap: 12 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={ui.label}>Sort songs</Text>
              {(Object.keys(librarySortLabels) as LibrarySort[]).map((sort) =>
                select(librarySortLabels[sort], preferences.sort === sort, () =>
                  update({ sort }),
                ),
              )}
              {toggle(
                "Reverse sort order",
                preferences.descending,
                (descending) => update({ descending }),
              )}
              {toggle(
                "Hide audio shorter than 30 seconds",
                preferences.hideShort,
                (hideShort) => update({ hideShort }),
              )}
              {toggle(
                "Hide recording, ringtone and alert folders",
                preferences.hideNonMusic,
                (hideNonMusic) => update({ hideNonMusic }),
              )}
              <Text style={ui.label}>Browse folders</Text>
              <Text style={ui.muted}>
                Choose a folder to browse it. Use Hide to exclude its songs from
                this library view. Your files and playlists stay saved.
              </Text>
              {select("All folders", !preferences.folder, () =>
                update({ folder: null }),
              )}
              {folders.map((folder) => {
                const hidden = preferences.excludedFolders.includes(folder);
                return (
                  <View
                    key={folder}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityLabel={`Browse ${folder}`}
                      accessibilityState={{
                        checked: preferences.folder === folder,
                      }}
                      onPress={() =>
                        update({
                          folder,
                          excludedFolders: preferences.excludedFolders.filter(
                            (entry) => entry !== folder,
                          ),
                        })
                      }
                      style={({ pressed }) => ({
                        flex: 1,
                        minHeight: 48,
                        justifyContent: "center",
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          color:
                            preferences.folder === folder ? c.accent : c.text,
                          fontWeight: "600",
                        }}
                      >
                        {folder.split("/").pop()}
                      </Text>
                      <Text
                        numberOfLines={2}
                        style={{ color: c.muted, fontSize: 11 }}
                      >
                        {folder}
                      </Text>
                    </Pressable>
                    <Text style={ui.muted}>Hide</Text>
                    <Switch
                      value={hidden}
                      accessibilityLabel={`Hide ${folder}`}
                      trackColor={{ true: c.accent, false: c.border }}
                      onValueChange={(hide) =>
                        update({
                          excludedFolders: hide
                            ? [...preferences.excludedFolders, folder]
                            : preferences.excludedFolders.filter(
                                (entry) => entry !== folder,
                              ),
                          folder:
                            hide && preferences.folder === folder
                              ? null
                              : preferences.folder,
                        })
                      }
                    />
                  </View>
                );
              })}
              <ActionButton
                label="Reset library controls"
                variant="secondary"
                onPress={reset}
              />
              <ActionButton label="Done" onPress={() => setOpen(false)} />
            </ScrollView>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}
