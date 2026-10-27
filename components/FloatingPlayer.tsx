import coverImage from "@/assets/placeholder2.jpg";
import {
    MINI_PLAYER_HEIGHT,
    TAB_BAR_HEIGHT,
    muzaloTheme,
} from "@/constants/tokens";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    PlayPauseButton,
    SkipToLastButton,
    SkipToNextButton,
} from "./PlayerControls";

const FloatingPlayer = () => {
    const currentSong = usePlayerStore((s) => s.currentSong);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    if (!currentSong) return null;

    return (
        <View
            style={{
                position: "absolute",
                left: 12,
                right: 12,
                bottom: insets.bottom + TAB_BAR_HEIGHT + 8,
                height: MINI_PLAYER_HEIGHT,
                zIndex: 50,
                flexDirection: "row",
                alignItems: "center",
                padding: 10,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: muzaloTheme.border,
                backgroundColor: muzaloTheme.surface,
                shadowColor: "#000",
                shadowOpacity: 0.3,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 12,
                elevation: 8,
            }}
        >
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open player for ${currentSong.title || "current track"}`}
                onPress={() => router.navigate("/Playing")}
                style={{
                    flex: 1,
                    minWidth: 0,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingRight: 6,
                }}
            >
                <Image
                    source={
                        currentSong.coverArt
                            ? { uri: currentSong.coverArt }
                            : coverImage
                    }
                    accessibilityIgnoresInvertColors
                    style={{ width: 44, height: 44, borderRadius: 10 }}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                        numberOfLines={1}
                        style={{
                            color: muzaloTheme.text,
                            fontSize: 13,
                            fontWeight: "600",
                        }}
                    >
                        {currentSong.title || "Unknown title"}
                    </Text>
                    <Text
                        numberOfLines={1}
                        style={{
                            color: muzaloTheme.muted,
                            fontSize: 11,
                            marginTop: 3,
                        }}
                    >
                        {currentSong.artist || "Unknown artist"}
                    </Text>
                </View>
            </Pressable>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
                <SkipToLastButton
                    iconSize={16}
                    classNames="w-11 h-11 items-center justify-center"
                />
                <PlayPauseButton
                    iconSize={18}
                    color={muzaloTheme.onAccent}
                    classNames="w-11 h-11 rounded-full bg-[#80DECE] items-center justify-center"
                />
                <SkipToNextButton
                    iconSize={16}
                    classNames="w-11 h-11 items-center justify-center"
                />
            </View>
        </View>
    );
};

export default FloatingPlayer;
