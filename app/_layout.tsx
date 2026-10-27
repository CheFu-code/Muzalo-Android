import PlayerBinder from "@/components/PlayerBinder";
import PlaybackIssueDialog from "@/components/PlaybackIssueDialog";
import LoadingScreen from "@/components/LoadingScreen";
import StartupRecoveryScreen from "@/components/StartupRecoveryScreen";
import { muzaloTheme } from "@/constants/tokens";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { I18nManager, Platform, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { initDB } from "@/tools/db";
import { setupPlayer } from "@/tools/services/trackPlayerService";
import { usePlayerStore, usePlaylistStore } from "@/tools/store/usePlayerStore";
import TrackPlayer from "react-native-track-player";
import { toast, Toaster } from "sonner-native";
import "../global.css";

import playbackService from "@/service";
import { useAppShortcuts } from "@/tools/useAppShortcuts";

TrackPlayer.registerPlaybackService(() => playbackService);

export default function Layout() {
  const [startup, setStartup] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [retry, setRetry] = useState(0);
  useAppShortcuts(startup === "ready");
  const loadLibrary = usePlayerStore((s) => s.loadLibrary);
  const loadFavorites = usePlaylistStore((s) => s.loadFavorites);

  useEffect(() => {
    let active = true;
    setStartup("loading");
    async function initialize() {
      try {
        await initDB();
        await Promise.all([loadLibrary(), loadFavorites()]);
        if (active) setStartup("ready");
      } catch (error) {
        console.error("Could not prepare the saved library:", error);
        if (active) setStartup("error");
      }
    }

    void initialize();
    return () => {
      active = false;
    };
  }, [loadFavorites, loadLibrary, retry]);

  useEffect(() => {
    void setupPlayer().catch(() => {
      toast.error(
        "The audio player could not start. Close and reopen Muzalo to try again.",
      );
    });
  }, []);

  if (I18nManager.isRTL) {
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: muzaloTheme.background }}
        onLayout={() => {
          // Recovery must be visible even when the navigator cannot mount yet.
          void SplashScreen.hideAsync().catch((error) => console.warn("Could not hide the launch screen", error));
        }}
      >
        {startup === "ready" ? (
          <>
            <PlayerBinder />
            <Stack
              screenOptions={{
                statusBarStyle: "light",
                contentStyle: { backgroundColor: muzaloTheme.background },
              }}
            >
              <Stack.Screen
                name="(tabs)"
                options={{ headerShown: false, headerTitleAlign: "center" }}
              />
              <Stack.Screen
                name="Playing"
                options={{
                  presentation:
                    Platform.OS === "android" ? "modal" : "transparentModal",
                  gestureEnabled: false,
                  animationDuration: 100,
                  headerShown: false,
                  animation: "slide_from_bottom",
                }}
              />
              <Stack.Screen
                name="Queue"
                options={{
                  presentation:
                    Platform.OS === "android" ? "modal" : "transparentModal",
                  gestureEnabled: false,
                  animationDuration: 100,
                  headerShown: false,
                  animation: "slide_from_bottom",
                }}
              />
              <Stack.Screen
                name="(modals)/addToPlaylist"
                options={{
                  presentation:
                    Platform.OS === "android" ? "modal" : "transparentModal",
                  gestureEnabled: false,
                  animationDuration: 100,
                  headerShown: false,
                  animation: "slide_from_bottom", // smoother exit
                }}
              />

              <Stack.Screen
                name="info"
                options={{ headerShown: false, headerTitleAlign: "center" }}
              />

              <Stack.Screen
                name="lyrics"
                options={{
                  headerShown: false,
                }}
              />

              <Stack.Screen
                name="edit"
                options={{
                  headerShown: false,
                }}
              />

              <Stack.Screen
                name="album"
                options={{
                  headerShown: false,
                }}
              />

              <Stack.Screen name="settings" options={{ headerShown: false }} />
              <Stack.Screen
                name="notification.click"
                options={{
                  headerShown: false,
                }}
              />
            </Stack>
            <PlaybackIssueDialog />
          </>
        ) : startup === "error" ? (
          <StartupRecoveryScreen
            onRetry={() => setRetry((value) => value + 1)}
          />
        ) : (
          <LoadingScreen />
        )}
        <StatusBar barStyle="light-content" />
        <Toaster position="top-center" richColors />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
