import { Platform } from "react-native";
import * as MediaLibrary from "expo-media-library";
import type { Song } from "@/types/types";
import {
  addSongsBatch,
  getAllSongs,
  updateSongUri,
  updateSongDuration,
} from "./db";
import { audioFileKey, getDeviceAudio } from "./deviceLibrary";
import { ensureCacheDir, looksLikeAudio } from "./fileUtils";
import { readTagsForContentUri } from "./metadata";
import { useLibraryStore } from "./store/useLibraryStore";
import { usePlayerStore } from "./store/usePlayerStore";

let inFlight: Promise<void> | null = null;

export function syncLibrary(
  options: { requestPermission?: boolean } = {},
): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = scan(options.requestPermission ?? false).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function scan(requestPermission: boolean) {
  useLibraryStore.setState({ scanning: true, error: null });
  try {
    const existing = await getAllSongs();
    usePlayerStore.setState({ files: existing, isLoading: false });
    if (Platform.OS !== "android") {
      useLibraryStore.setState({ access: "unavailable" });
      return;
    }
    let permission = await MediaLibrary.getPermissionsAsync(false, ["audio"]);
    if (
      !permission.granted &&
      permission.canAskAgain &&
      (requestPermission || permission.status === "undetermined")
    ) {
      permission = await MediaLibrary.requestPermissionsAsync(false, ["audio"]);
    }
    useLibraryStore.setState({
      access: permission.granted ? "granted" : "denied",
      canAskAgain: permission.canAskAgain,
    });
    if (!permission.granted) return;

    const assets = await getDeviceAudio();
    const known = new Set(existing.map((song) => audioFileKey(song.uri)));
    const byId = new Map(existing.map((song) => [song.id, song]));
    const byPath = new Map(
      existing.map((song) => [audioFileKey(song.uri), song]),
    );
    const existingUris = new Set(existing.map((song) => song.uri));
    for (const asset of assets) {
      const song =
        byId.get(`media:${asset.id}`) ?? byPath.get(audioFileKey(asset.uri));
      if (
        song &&
        Number.isFinite(asset.duration) &&
        asset.duration > 0 &&
        (!Number.isFinite(song.duration) || song.duration <= 0)
      ) {
        await updateSongDuration(song.id || song.uri, asset.duration);
        usePlayerStore.setState((state) => ({
          currentSong:
            state.currentSong && state.currentSong.id === song.id
              ? { ...state.currentSong, duration: asset.duration }
              : state.currentSong,
          queue: state.queue.map((entry) =>
            entry.id === song.id
              ? { ...entry, duration: asset.duration }
              : entry,
          ),
        }));
      }
      if (song?.id && song.uri !== asset.uri && !existingUris.has(asset.uri)) {
        await updateSongUri(song.id, asset.uri);
        known.add(audioFileKey(asset.uri));
        usePlayerStore.setState((state) => ({
          currentSong:
            state.currentSong && state.currentSong.id === song.id
              ? { ...state.currentSong, uri: asset.uri }
              : state.currentSong,
          queue: state.queue.map((entry) =>
            entry.id === song.id ? { ...entry, uri: asset.uri } : entry,
          ),
        }));
      }
    }
    usePlayerStore.setState({ files: await getAllSongs() });
    const pending = assets.filter((asset) => {
      const key = audioFileKey(asset.uri);
      if (!looksLikeAudio(asset.filename) || known.has(key)) return false;
      known.add(key);
      return true;
    });
    if (!pending.length) return;
    const cacheDir = await ensureCacheDir();
    // Process bounded batches, yielding between files so discovery does not
    // monopolise interaction. Only insert new tracks: never replace edited
    // records or cascade-delete playlist entries from an incomplete scan.
    for (let offset = 0; offset < pending.length; offset += 15) {
      const batch: Song[] = [];
      for (const asset of pending.slice(offset, offset + 15)) {
        let tags: Partial<Song> = {};
        try {
          tags = await readTagsForContentUri(asset.uri, cacheDir);
        } catch (error) {
          console.warn("Could not read audio tags", error);
        }
        batch.push({
          artist: null,
          album: null,
          coverArt: null,
          lyrics: null,
          syncedLyrics: null,
          ...tags,
          id: `media:${asset.id}`,
          uri: asset.uri,
          filename: asset.filename,
          title: tags.title || asset.filename.replace(/\.[^.]+$/, ""),
          duration:
            Number.isFinite(asset.duration) && asset.duration > 0
              ? asset.duration
              : tags.duration || 0,
          date: asset.creationTime || asset.modificationTime || Date.now(),
          index: existing.length + offset + batch.length,
        });
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      await addSongsBatch(batch);
      usePlayerStore.setState({ files: await getAllSongs() });
    }
  } catch (error) {
    console.error("Could not scan device audio", error);
    useLibraryStore.setState({
      error: "Could not finish scanning your music. Try scanning again.",
    });
  } finally {
    usePlayerStore.setState({ isLoading: false });
    useLibraryStore.setState({ scanning: false });
  }
}
