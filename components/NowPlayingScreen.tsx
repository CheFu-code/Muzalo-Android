import {
    PlayPauseButton,
    RepeatHandler,
    ShuffleHandler,
    SkipToLastButton,
    SkipToNextButton,
} from "@/components/PlayerControls";
import PlayerVolumeBar from "@/components/PlayerVolumeBar";
import ProgressBar from "@/components/ProgressBar";
import SwipeDismissScreen from "@/components/SwipeDismissScreen";
import SyncedLyrics from "@/components/SyncedLyrics";
import TrackShortcutsMenu from "@/components/TrackShortcutsMenu";
import {
    ActionButton,
    Artwork,
    EmptyState,
    IconButton,
    ui,
} from "@/components/ui";
import { muzaloTheme as c } from "@/constants/tokens";
import { handleFetchingLyrics } from "@/tools/handleFetchingLyrics";
import { usePlayerStore, usePlaylistStore } from "@/tools/store/usePlayerStore";
import { Ionicons } from "@expo/vector-icons";
import coverImage from "@/assets/placeholder2.jpg";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function PlayingScreen() {
    const router = useRouter();
    const [contentHeight, setContentHeight] = useState(0);
    const [artworkSpace, setArtworkSpace] = useState({ width: 0, height: 0 });
    const song = usePlayerStore((s) => s.currentSong);
    const showLyrics = usePlayerStore((s) => s.showLyrics);
    const toggleLyrics = usePlayerStore((s) => s.toggleShowLyrics);
    const setLyrics = usePlayerStore((s) => s.setLyrics);
    const download = usePlayerStore((s) => s.downloadFile);
    const toggleFavorite = usePlaylistStore((s) => s.toggleFavorite);
    const favorite = usePlaylistStore((s) => s.isFavorite(song?.id || ""));
    const [fetching, setFetching] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const compact = contentHeight > 0 && contentHeight < 620;
    const size = Math.max(
        0,
        Math.min(artworkSpace.width, artworkSpace.height, 360),
    );
    const fetchLyrics = async () => {
        if (fetching || !song) return;
        setFetching(true);
        try {
            await handleFetchingLyrics({ currentSong: song, setLyrics });
        } catch {
            Alert.alert("Could not fetch lyrics", "Please try again.");
        } finally {
            setFetching(false);
        }
    };
    const handleDownload = async () => {
        if (!song?.id || downloading) return;
        setDownloading(true);
        try {
            await download(song.id, song.uri);
        } catch {
            Alert.alert("Download failed", "Please try again.");
        } finally {
            setDownloading(false);
        }
    };
    return (
        <SwipeDismissScreen
            title="Now playing"
            background={
                <View
                    pointerEvents="none"
                    style={StyleSheet.absoluteFillObject}
                >
                    <Image
                        source={
                            song?.coverArt ? { uri: song.coverArt } : coverImage
                        }
                        blurRadius={30}
                        resizeMode="cover"
                        style={StyleSheet.absoluteFillObject}
                    />
                    <BlurView
                        intensity={80}
                        tint="dark"
                        style={StyleSheet.absoluteFillObject}
                    />
                    <View
                        style={[
                            StyleSheet.absoluteFillObject,
                            { backgroundColor: "rgba(8,13,18,0.25)" },
                        ]}
                    />
                </View>
            }
            right={
                song ? (
                    <TrackShortcutsMenu track={song} isInPlaylist={false}>
                        <View style={ui.iconButton}>
                            <Ionicons
                                name="ellipsis-horizontal"
                                size={22}
                                color={c.text}
                            />
                        </View>
                    </TrackShortcutsMenu>
                ) : undefined
            }
        >
            {!song ? (
                <EmptyState
                    title="Choose something to play"
                    message="Your music is waiting in the library."
                />
            ) : (
                <View
                    testID="now-playing-content"
                    onLayout={({ nativeEvent }) =>
                        setContentHeight(nativeEvent.layout.height)
                    }
                    style={{
                        flex: 1,
                        width: "100%",
                        maxWidth: 480,
                        alignSelf: "center",
                        paddingHorizontal: 20,
                        paddingVertical: compact ? 6 : 12,
                        gap: compact ? 6 : 10,
                    }}
                >
                    <View
                        testID="now-playing-artwork"
                        onLayout={({ nativeEvent: { layout } }) =>
                            setArtworkSpace((previous) =>
                                previous.width === layout.width &&
                                previous.height === layout.height
                                    ? previous
                                    : {
                                          width: layout.width,
                                          height: layout.height,
                                      },
                            )
                        }
                        style={{
                            flex: 1,
                            minHeight: 0,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {showLyrics ? (
                            <View
                                style={{
                                    width: "100%",
                                    flex: 1,
                                    minHeight: 0,
                                    maxHeight: 400,
                                    borderRadius: 24,
                                    backgroundColor: c.surface,
                                    borderWidth: 1,
                                    borderColor: c.border,
                                    overflow: "hidden",
                                }}
                            >
                                {song.syncedLyrics || song.lyrics ? (
                                    <SyncedLyrics
                                        lrc={
                                            song.syncedLyrics ||
                                            song.lyrics ||
                                            ""
                                        }
                                        toggleShowLyrics={toggleLyrics}
                                    />
                                ) : (
                                    <View
                                        style={{
                                            flex: 1,
                                            justifyContent: "center",
                                            padding: 12,
                                            gap: 8,
                                        }}
                                    >
                                        <Text
                                            style={[
                                                ui.body,
                                                { textAlign: "center" },
                                            ]}
                                        >
                                            No lyrics added yet
                                        </Text>
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                gap: 8,
                                            }}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <ActionButton
                                                    label="Fetch lyrics"
                                                    icon="cloud-download-outline"
                                                    loading={fetching}
                                                    onPress={fetchLyrics}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <ActionButton
                                                    label="Add lyrics"
                                                    icon="create-outline"
                                                    variant="secondary"
                                                    disabled={!song.id}
                                                    onPress={() =>
                                                        router.push({
                                                            pathname:
                                                                "/lyrics/edit/[id]",
                                                            params: {
                                                                id:
                                                                    song.id ||
                                                                    "",
                                                            },
                                                        })
                                                    }
                                                />
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </View>
                        ) : size > 0 ? (
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel="Show lyrics"
                                onPress={toggleLyrics}
                                activeOpacity={0.85}
                            >
                                <Artwork uri={song.coverArt} size={size} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            flexShrink: 0,
                        }}
                    >
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                                numberOfLines={compact ? 1 : 2}
                                style={[
                                    ui.title,
                                    { fontSize: compact ? 20 : 24 },
                                ]}
                            >
                                {song.title || song.filename || "Unknown title"}
                            </Text>
                            <TouchableOpacity
                                accessibilityRole="link"
                                accessibilityLabel="View artist"
                                onPress={() =>
                                    router.navigate({
                                        pathname: "/(tabs)/artists/[name]",
                                        params: {
                                            name:
                                                song.artist || "Unknown Artist",
                                        },
                                    })
                                }
                                style={{
                                    minHeight: 44,
                                    justifyContent: "center",
                                }}
                            >
                                <Text numberOfLines={1} style={ui.muted}>
                                    {song.artist || "Unknown artist"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <IconButton
                            icon={favorite ? "heart" : "heart-outline"}
                            label={
                                favorite
                                    ? "Remove from favourites"
                                    : "Add to favourites"
                            }
                            active={favorite}
                            disabled={!song.id}
                            onPress={() => toggleFavorite(song.id || "")}
                        />
                        <IconButton
                            icon="add-circle-outline"
                            label="Add to playlist"
                            disabled={!song.id}
                            onPress={() =>
                                router.push({
                                    pathname: "/(modals)/addToPlaylist",
                                    params: { trackUri: song.uri },
                                })
                            }
                        />
                    </View>
                    <View style={{ flexShrink: 0 }}>
                        <ProgressBar />
                    </View>
                    <View
                        style={[
                            ui.card,
                            {
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: compact ? 4 : 8,
                                flexShrink: 0,
                            },
                        ]}
                    >
                        <ShuffleHandler iconSize={20} />
                        <SkipToLastButton iconSize={26} />
                        <View
                            style={{
                                backgroundColor: c.accent,
                                borderRadius: 24,
                                padding: compact ? 4 : 8,
                            }}
                        >
                            <PlayPauseButton iconSize={28} color={c.onAccent} />
                        </View>
                        <SkipToNextButton iconSize={26} />
                        <RepeatHandler iconSize={20} />
                    </View>
                    {/**TODO: Add volume control on new version */}
                    {/* <View style={{ flexShrink: 0 }}>
                        <PlayerVolumeBar />
                    </View> */}
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-around",
                            // borderTopWidth: 1,
                            // borderTopColor: c.border,
                            paddingTop: compact ? 0 : 6,
                            flexShrink: 0,
                        }}
                    >
                        <View style={{ alignItems: "center" }}>
                            <IconButton
                                icon="chatbox-ellipses-outline"
                                label={
                                    showLyrics ? "Hide lyrics" : "Show lyrics"
                                }
                                active={showLyrics}
                                onPress={toggleLyrics}
                            />
                            {!compact && (
                                <Text numberOfLines={1} style={ui.label}>
                                    Lyrics
                                </Text>
                            )}
                        </View>
                        <View style={{ alignItems: "center" }}>
                            <IconButton
                                icon="list-outline"
                                label="Open queue"
                                onPress={() => router.push("/Queue")}
                            />
                            {!compact && (
                                <Text numberOfLines={1} style={ui.label}>
                                    Queue
                                </Text>
                            )}
                        </View>
                        <View style={{ alignItems: "center" }}>
                            <IconButton
                                icon="information-circle-outline"
                                label="Song details"
                                disabled={!song.id}
                                onPress={() =>
                                    router.push({
                                        pathname: "/info/[id]",
                                        params: { id: song.id || "" },
                                    })
                                }
                            />
                            {!compact && (
                                <Text numberOfLines={1} style={ui.label}>
                                    Details
                                </Text>
                            )}
                        </View>
                        {(song.uri.startsWith("https://") ||
                            song.uri.startsWith("http://")) && (
                            <View style={{ alignItems: "center" }}>
                                <IconButton
                                    icon="download-outline"
                                    label={
                                        downloading
                                            ? "Downloading"
                                            : "Download track"
                                    }
                                    disabled={downloading || !song.id}
                                    onPress={handleDownload}
                                />
                                {!compact && (
                                    <Text numberOfLines={1} style={ui.label}>
                                        Download
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            )}
        </SwipeDismissScreen>
    );
}
