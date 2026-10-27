import { unknownTrackImageUri } from "@/constants/images";
import { muzaloTheme } from "@/constants/tokens";
import { fetchLyrics } from "@/tools/fetchLyrics";
import { usePlayerStore, usePlaylistStore } from "@/tools/store/usePlayerStore";
import { Song } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, {
  ComponentProps,
  PropsWithChildren,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

type TrackShortcutsMenuProps = PropsWithChildren<{
  track: Song;
  isInPlaylist: boolean;
  playlistId?: string;
}>;

type MenuAction = {
  key: string;
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  destructive?: boolean;
  navigation?: boolean;
};

const TrackShortcutsMenu = ({
  track,
  children,
  isInPlaylist,
  playlistId,
}: TrackShortcutsMenuProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const actionInFlight = useRef(false);
  // Artist lists can pass a track URI without its database ID.
  const trackId = usePlayerStore(
    (state) =>
      track.id || state.files.find((song) => song.uri === track.uri)?.id
  );
  const toggleFavorite = usePlaylistStore((state) => state.toggleFavorite);
  const removeTrackFromPlaylist = usePlaylistStore(
    (state) => state.removeTrackFromPlaylist
  );
  const isFavorite = usePlaylistStore((state) =>
    state.isFavorite(trackId || "")
  );
  const setLyrics = usePlayerStore((state) => state.setLyrics);
  const dismiss = () => setVisible(false);

  const runAction = async (key: string, action: () => Promise<unknown>) => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setBusyAction(key);
    try {
      await action();
      dismiss();
    } catch {
      dismiss();
      toast.error("That action could not be completed. Please try again.");
    } finally {
      actionInFlight.current = false;
      setBusyAction(null);
    }
  };

  const actions: MenuAction[] = [
    {
      key: "lyrics",
      label: busyAction === "lyrics" ? "Fetching lyrics..." : "Fetch lyrics",
      icon: "cloud-download-outline",
      disabled: !trackId,
      onPress: () =>
        runAction("lyrics", async () => {
          const result = await fetchLyrics(
            { ...track, id: trackId },
            setLyrics
          );
          if (result === undefined) throw new Error("Lyrics lookup failed");
        }),
    },
    {
      key: "artist",
      label: "Show artist",
      icon: "person-outline",
      disabled: !track.artist,
      navigation: true,
      onPress: () => {
        if (!track.artist) return;
        dismiss();
        router.navigate({
          pathname: "/(tabs)/artists/[name]",
          params: { name: track.artist },
        });
      },
    },
    ...(track.album
      ? [
          {
            key: "album",
            label: "Show album",
            icon: "disc-outline" as const,
            navigation: true,
            onPress: () => {
              dismiss();
              router.navigate({
                pathname: "/album/[name]",
                params: { name: track.album!.replaceAll(" ", "+") },
              });
            },
          },
        ]
      : []),
    {
      key: "playlist",
      label: "Add to playlist",
      icon: "add-circle-outline",
      navigation: true,
      onPress: () => {
        dismiss();
        router.push({
          pathname: "/(modals)/addToPlaylist",
          params: { trackUri: track.uri },
        });
      },
    },
    {
      key: "favorite",
      label: isFavorite ? "Remove from favorites" : "Add to favorites",
      icon: isFavorite ? "heart" : "heart-outline",
      disabled: !trackId,
      onPress: () => runAction("favorite", () => toggleFavorite(trackId!)),
    },
    ...(isInPlaylist &&
    playlistId &&
    !["recent", "most-played", "history"].includes(playlistId)
      ? [
          {
            key: "remove",
            label: "Remove from playlist",
            icon: "remove-circle-outline" as const,
            destructive: true,
            disabled: !trackId,
            onPress: () =>
              runAction("remove", () =>
                removeTrackFromPlaylist(playlistId, trackId!)
              ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`More options for ${track.title || "this track"}`}
        accessibilityState={{ expanded: visible }}
        hitSlop={6}
        onPress={(event) => {
          event.stopPropagation();
          setVisible(true);
        }}
      >
        {children}
      </Pressable>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={dismiss}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.65)",
            paddingHorizontal: 12,
          }}
        >
          <Pressable
            accessibilityLabel="Dismiss track options"
            accessibilityRole="button"
            style={StyleSheet.absoluteFillObject}
            onPress={dismiss}
          />
          <View
            accessibilityViewIsModal
            style={{
              width: "100%",
              maxWidth: 560,
              maxHeight: Math.min(
                height * 0.85,
                height - insets.top - insets.bottom - 24
              ),
              marginBottom: Math.max(insets.bottom, 12),
              borderRadius: 24,
              borderWidth: 1,
              borderColor: muzaloTheme.border,
              backgroundColor: muzaloTheme.surface,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: 34,
                height: 4,
                borderRadius: 2,
                backgroundColor: muzaloTheme.border,
                alignSelf: "center",
                marginTop: 12,
              }}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 18,
                borderBottomWidth: 1,
                borderBottomColor: muzaloTheme.border,
              }}
            >
              <Image
                source={{ uri: track.coverArt || unknownTrackImageUri }}
                style={{ width: 50, height: 50, borderRadius: 12 }}
                accessibilityIgnoresInvertColors
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    color: muzaloTheme.accent,
                    fontSize: 9,
                    fontWeight: "700",
                    letterSpacing: 1.6,
                    marginBottom: 4,
                  }}
                >
                  TRACK OPTIONS
                </Text>
                <Text
                  numberOfLines={2}
                  style={{
                    color: muzaloTheme.text,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {track.title || "Unknown title"}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: muzaloTheme.muted,
                    fontSize: 12,
                    marginTop: 3,
                  }}
                >
                  {track.artist || "Unknown artist"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close track options"
                onPress={dismiss}
                hitSlop={6}
                style={{
                  width: 36,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={22} color={muzaloTheme.muted} />
              </Pressable>
            </View>
            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ padding: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {actions.map((action) => {
                const disabled = action.disabled || busyAction !== null;
                const color = action.destructive ? "#F1A8A8" : muzaloTheme.text;
                return (
                  <TouchableOpacity
                    key={action.key}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    accessibilityState={{
                      disabled,
                      busy: busyAction === action.key,
                    }}
                    disabled={disabled}
                    onPress={() => {
                      void action.onPress();
                    }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      minHeight: 54,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                      opacity: action.disabled ? 0.4 : 1,
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 11,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: action.destructive
                          ? "#322327"
                          : muzaloTheme.raised,
                      }}
                    >
                      <Ionicons
                        name={action.icon}
                        size={19}
                        color={action.destructive ? color : muzaloTheme.accent}
                      />
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        color,
                        fontSize: 15,
                        fontWeight: "500",
                      }}
                    >
                      {action.label}
                    </Text>
                    {busyAction === action.key ? (
                      <ActivityIndicator
                        size="small"
                        color={muzaloTheme.accent}
                      />
                    ) : action.navigation ? (
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={muzaloTheme.muted}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={dismiss}
              activeOpacity={0.8}
              style={{
                marginHorizontal: 18,
                marginTop: 4,
                marginBottom: 16,
                minHeight: 46,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: muzaloTheme.border,
                borderRadius: 14,
                backgroundColor: muzaloTheme.raised,
              }}
            >
              <Text
                style={{
                  color: muzaloTheme.text,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default TrackShortcutsMenu;
