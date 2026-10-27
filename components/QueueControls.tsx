import { muzaloTheme } from "@/constants/tokens";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import { Song } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import TrackPlayer from "react-native-track-player";

export const QUEUE_CONTROLS_HEIGHT = 62;

const QueueControls = ({ tracks }: { tracks: Song[] }) => {
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const playSongGeneric = usePlayerStore((s) => s.playSongGeneric);
  const handleShuffle = async () => {
    if (!tracks.length) return;
    clearQueue();
    const randomIndex = Math.floor(Math.random() * tracks.length);
    await playSongGeneric(tracks[randomIndex], { contextQueue: tracks });
  };
  const handlePlay = async () => {
    if (!tracks.length) return;
    clearQueue();
    await playSongGeneric(tracks[0], { contextQueue: tracks });
    await TrackPlayer.play();
  };
  if (!tracks.length) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 18,
        height: 46,
        marginBottom: 16,
      }}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Play all tracks"
        onPress={handlePlay}
        activeOpacity={0.8}
        style={{
          flex: 1,
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: muzaloTheme.accent,
          borderRadius: 14,
        }}
      >
        <Ionicons name="play" size={18} color={muzaloTheme.onAccent} />
        <Text
          style={{
            color: muzaloTheme.onAccent,
            fontSize: 14,
            fontWeight: "700",
          }}
        >
          Play all
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Shuffle tracks"
        onPress={handleShuffle}
        activeOpacity={0.8}
        style={{
          flex: 1,
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: muzaloTheme.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: muzaloTheme.border,
        }}
      >
        <Ionicons name="shuffle" size={20} color={muzaloTheme.accent} />
        <Text
          style={{ color: muzaloTheme.text, fontSize: 14, fontWeight: "600" }}
        >
          Shuffle
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default QueueControls;
