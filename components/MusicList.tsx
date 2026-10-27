import TracksList from "@/components/TracksList";
import {
    MINI_PLAYER_HEIGHT,
    TAB_BAR_HEIGHT,
    muzaloTheme,
} from "@/constants/tokens";
import { librarySortLabels, selectLibraryTracks } from "@/tools/libraryControls";
import { useLibraryPreferences } from "@/tools/store/useLibraryPreferences";
import { useLibraryStore } from "@/tools/store/useLibraryStore";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import { syncLibrary } from "@/tools/syncLibrary";
import { Song } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Linking, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import LibraryControls from "./LibraryControls";
import { ActionButton, IconButton } from "./ui";

interface Props {
    currentSong: Song | null;
}

const MusicList = ({ currentSong }: Props) => {
    const router = useRouter();
    const files = usePlayerStore((s) => s.files);
    const preferences = useLibraryPreferences();
    const { scanning, access, canAskAgain, error } = useLibraryStore();
    const scan = () => { void syncLibrary({ requestPermission: true }); };
    const [search, setSearch] = useState("");
    const insets = useSafeAreaInsets();
    const filteredTracks = useMemo(() => {
        return selectLibraryTracks(files, preferences, search);
    }, [files, search, preferences]);
    const filtered = !!preferences.folder || !!preferences.excludedFolders.length || preferences.hideShort || preferences.hideNonMusic;

    return (
        <SafeAreaView
            edges={["top", "left", "right"]}
            style={{ flex: 1, backgroundColor: muzaloTheme.background }}
        >
            <View
                style={{
                    paddingHorizontal: 20,
                    paddingTop: 12,
                    paddingBottom: 18,
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 18,
                    }}
                >
                    <Text
                        style={{
                            color: muzaloTheme.text,
                            fontSize: 30,
                            fontWeight: "700",
                            letterSpacing: -0.8,
                        }}
                    >
                        Your music
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        
                        
                        <LibraryControls songs={files} />
                        <IconButton icon="settings-outline" label="Settings and About" onPress={() => router.push("/settings")} />
                    </View>
                </View>
                <Text numberOfLines={1} style={{ color: muzaloTheme.muted, fontSize: 12, marginBottom: 12 }}>
                    {preferences.folder?.split("/").pop() || "All folders"} · {librarySortLabels[preferences.sort]}{filtered ? " · Filtered" : ""}
                </Text>
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: muzaloTheme.border,
                        backgroundColor: muzaloTheme.surface,
                        paddingLeft: 14,
                    }}
                >
                    <Ionicons
                        name="search-outline"
                        size={19}
                        color={muzaloTheme.muted}
                    />
                    <TextInput
                        style={{
                            flex: 1,
                            minWidth: 0,
                            minHeight: 48,
                            color: muzaloTheme.text,
                            fontSize: 15,
                            paddingHorizontal: 10,
                            paddingVertical: 12,
                        }}
                        placeholder="Search songs or artists"
                        placeholderTextColor={muzaloTheme.muted}
                        selectionColor={muzaloTheme.accent}
                        accessibilityLabel="Search songs or artists"
                        autoCorrect={false}
                        value={search}
                        onChangeText={setSearch}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Clear search"
                            onPress={() => setSearch("")}
                            style={{
                                width: 44,
                                minHeight: 48,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Ionicons
                                name="close-circle"
                                size={20}
                                color={muzaloTheme.muted}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            {access === "denied" || error ? (
                <View style={{ paddingHorizontal: 20, paddingBottom: 16, gap: 12 }}>
                    <Text style={{ color: muzaloTheme.muted, lineHeight: 22 }}>
                        {access === "denied"
                            ? "Allow music and audio access to find songs across your device."
                            : error}
                    </Text>
                    <ActionButton
                        label={access === "denied" ? (canAskAgain ? "Allow audio access" : "Open app settings") : "Try scanning again"}
                        onPress={access === "denied" && !canAskAgain ? () => { void Linking.openSettings(); } : scan}
                        loading={scanning}
                        variant="secondary"
                    />
                </View>
            ) : null}
            <TracksList
                tracks={filteredTracks}
                extraData={currentSong?.id}
                search={search}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                    paddingBottom:
                        insets.bottom +
                        TAB_BAR_HEIGHT +
                        (currentSong ? MINI_PLAYER_HEIGHT + 24 : 20),
                    flexGrow: 1,
                }}
                ListEmptyComponent={
                    <View
                        style={{
                            alignItems: "center",
                            paddingHorizontal: 32,
                            paddingTop: 44,
                        }}
                    >
                        <Ionicons
                            name={
                                search.trim()
                                    ? "search-outline"
                                    : "musical-notes-outline"
                            }
                            size={40}
                            color={muzaloTheme.accent}
                        />
                        <Text
                            style={{
                                color: muzaloTheme.text,
                                fontSize: 19,
                                fontWeight: "600",
                                marginTop: 16,
                            }}
                        >
                            {search.trim()
                                ? "No matching tracks"
                                : scanning ? "Finding your music" : "A little quiet in here"}
                        </Text>
                        <Text
                            style={{
                                color: muzaloTheme.muted,
                                fontSize: 14,
                                lineHeight: 22,
                                textAlign: "center",
                                marginTop: 8,
                            }}
                        >
                            {search.trim()
                                ? "Try another song title or artist name."
                                : access === "unavailable"
                                  ? "Device music scanning is currently available on Android."
                                  : access === "denied"
                                    ? "Your songs stay on your device. Grant audio access above to show them here."
                                    : scanning
                                      ? "Songs will appear as Muzalo scans your device's audio library."
                                      : filtered ? "No songs match your library filters. Reset them to show your music again."
                                      : "No supported songs were found in your device's audio library. Add music to your device, then tap Scan for music."}
                        </Text>
                        {filtered && <ActionButton label="Reset filters" variant="secondary" onPress={preferences.reset} />}
                    </View>
                }
                scrollEventThrottle={16}
                removeClippedSubviews
                initialNumToRender={12}
                windowSize={11}
            />
        </SafeAreaView>
    );
};

export default MusicList;
