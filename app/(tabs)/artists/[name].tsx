import ArtistTrackList from "@/components/ArtistTrackList";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import { Artist } from "@/types/types";
import { Screen, ScreenHeader } from "@/components/ui";
import { Redirect, useLocalSearchParams } from "expo-router";
import React from "react";

import { processMusicData } from "@/tools/artists";

const ArtistDetailScreen = () => {
  const { name: artistName } = useLocalSearchParams<{ name: string }>();

  const files = usePlayerStore((s) => s.files);

  const decodedName = (artistName || "Unknown Artist").replaceAll("+", " ");

  const uniqueArtists: Artist[] = processMusicData(files);

  const normalizeName = (value: string) =>
    value.trim().replace(/\s+/g, " ").toLowerCase();
  const findArtist =
    uniqueArtists.find(
      (artist) =>
        normalizeName(artist.name) ===
        normalizeName(artistName || "Unknown Artist")
    ) ??
    uniqueArtists.find(
      (artist) => normalizeName(artist.name) === normalizeName(decodedName)
    );

  if (!findArtist) {
    console.warn(`Artist ${decodedName} not found!`);

    return <Redirect href={"/(tabs)/artists"} />;
  }

  return (
    <Screen>
      <ScreenHeader title="Artist" />
      <ArtistTrackList artist={findArtist} />
    </Screen>
  );
};

export default ArtistDetailScreen;
