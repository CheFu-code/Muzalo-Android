import type { Song } from "@/types/types";
import * as FileSystem from "expo-file-system";

export const songKey = (song: Pick<Song, "id" | "uri">) => song.id || song.uri;

export function uniqueSongs(songs: Song[]): Song[] {
  const seen = new Set<string>();
  return songs.filter((song) => {
    const key = songKey(song);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function shuffledSongs(songs: Song[], random = Math.random): Song[] {
  const result = [...songs];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class UnavailableSongError extends Error {
  constructor(public song: Song) {
    super(
      "This audio file is missing or cannot be read. Check audio access, scan again, or locate the file.",
    );
  }
}

export async function playableUri(song: Song): Promise<string> {
  for (const uri of [
    ...new Set([song.localUri, song.uri].filter(Boolean)),
  ] as string[]) {
    if (!uri.startsWith("file://")) return uri;
    try {
      if ((await FileSystem.getInfoAsync(uri)).exists) return uri;
    } catch {
      /* Try the original source if a downloaded copy is inaccessible. */
    }
  }
  throw new UnavailableSongError(song);
}

export const nativeTrack = (song: Song, uri = song.localUri || song.uri) => ({
  id: songKey(song),
  url: uri,
  title: song.title || song.filename || "Unknown title",
  artist: song.artist || "Unknown artist",
  artwork: song.coverArt || undefined,
  duration: song.duration > 0 ? song.duration : undefined,
});
