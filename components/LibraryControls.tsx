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
import { IconButton, ui } from "./ui";

export default function LibraryControls({ songs }: { songs: Song[] }) {
  const [open, setOpen] = useState(false);
  const preferences = useLibraryPreferences();
  const { update } = preferences;
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
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <GestureHandlerRootView
          style={{
            flex: 1,
            width: "100%",
            alignItems: "stretch",
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "flex-end",
            paddingTop: insets.top + 12,
          }}
        >
          <View
            style={{
              backgroundColor: c.surface,
              width: "100%",
              height: "90%",
              maxHeight: "100%",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexShrink: 0,
                paddingLeft: Math.max(insets.left, 20),
                paddingRight: Math.max(insets.right, 20),
                paddingTop: 12,
                paddingBottom: 8,
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
              style={{ flex: 1, minHeight: 0 }}
              contentContainerStyle={{
                gap: 12,
                alignItems: "stretch",
                paddingLeft: Math.max(insets.left, 20),
                paddingRight: Math.max(insets.right, 20),
                paddingBottom: Math.max(insets.bottom, 16) + 16,
              }}
              keyboardShouldPersistTaps="handled"
              contentInsetAdjustmentBehavior="never"
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
                      width: "100%",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 4,
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
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
                          width: "100%",
                          minWidth: 0,
                          minHeight: 48,
                          overflow: "hidden",
                          justifyContent: "center",
                          opacity: pressed ? 0.6 : 1,
                        })}
                      >
                        <Text
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          style={{
                            width: "100%",
                            flexShrink: 1,
                            color:
                              preferences.folder === folder ? c.accent : c.text,
                            fontWeight: "600",
                          }}
                        >
                          {folder.split("/").pop()}
                        </Text>
                        <Text
                          numberOfLines={2}
                          ellipsizeMode="tail"
                          style={{
                            width: "100%",
                            flexShrink: 1,
                            color: c.muted,
                            fontSize: 11,
                            marginTop: 3,
                          }}
                        >
                          {folder}
                        </Text>
                      </Pressable>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        flexShrink: 0,
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
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
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}
