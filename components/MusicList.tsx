import TracksList from "@/components/TracksList";
import {
    MINI_PLAYER_HEIGHT,
    TAB_BAR_HEIGHT,
    muzaloTheme,
} from "@/constants/tokens";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import { Song } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

interface Props {
    currentSong: Song | null;
}

const MusicList = ({ currentSong }: Props) => {
    const files = usePlayerStore((s) => s.files);
    const [search, setSearch] = useState("");
    const insets = useSafeAreaInsets();
    const filteredTracks = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return files;
        return files.filter(
            (track) =>
                track.title?.toLowerCase().includes(term) ||
                track.artist?.toLowerCase().includes(term),
        );
    }, [files, search]);

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
                    <Text style={{ color: muzaloTheme.muted, fontSize: 12 }}>
                        {filteredTracks.length}{" "}
                        {search.trim()
                            ? "results"
                            : filteredTracks.length === 1
                              ? "track"
                              : "tracks"}
                    </Text>
                </View>
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
                                : "A little quiet in here"}
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
                                : "Your music will appear here when Muzalo scans the folder you allow it to access."}
                        </Text>
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
