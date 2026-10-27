import ArtistTrackList from "@/components/ArtistTrackList";
import { usePlayerStore } from "@/tools/store/usePlayerStore";
import { Artist } from "@/types/types";
import { MaterialIcons } from "@expo/vector-icons";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { processMusicData } from "@/tools/artists";

const ArtistDetailScreen = () => {
  const { name: artistName } = useLocalSearchParams<{ name: string }>();

  const files = usePlayerStore((s) => s.files);

  const router = useRouter();

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
    <SafeAreaView className="flex-1 bg-black px-6" pointerEvents="box-none">
      <View
        className="flex-row items-center justify-between px-5 py-3 z-50"
        style={{ elevation: 10 }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={26} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">{findArtist.name}</Text>
        <TouchableOpacity>
          <MaterialIcons name="share" size={26} color="#ffffff" />
        </TouchableOpacity>
      </View>
      <ArtistTrackList artist={findArtist} />
    </SafeAreaView>
  );
};

export default ArtistDetailScreen;
