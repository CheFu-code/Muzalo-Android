import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Song } from "@/types/types";
import LoadingScreen from "./LoadingScreen";
import { EmptyState, Screen, ScreenHeader, SongHeading, ui } from "./ui";

export default function SongScreen({
  title,
  song,
  loading,
  error,
  children,
}: {
  title: string;
  song: Song | null;
  loading: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  if (loading) return <LoadingScreen />;
  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <ScreenHeader title={title} />
      {!song ? (
        <EmptyState
          title="Track unavailable"
          message={error || "This track could not be found in your library."}
        />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={ui.content}
          >
            <SongHeading
              title={song.title}
              artist={song.artist}
              coverArt={song.coverArt}
            />
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}
