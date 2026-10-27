import type { Artist, Song } from "@/types/types";

export function processMusicData(songs: Song[]): Artist[] {
  const artists = new Map<string, Artist>();
  for (const song of songs) {
    const name = song.artist?.trim().replace(/\s+/g, " ") || "Unknown Artist";
    const key = name.toLowerCase();
    const existing = artists.get(key);
    if (existing) {
      existing.songs.push(song);
      if (!existing.image && song.coverArt) existing.image = song.coverArt;
    } else {
      artists.set(key, { name, image: song.coverArt || null, songs: [song] });
    }
  }
  return [...artists.values()].sort((left, right) => {
    if (left.name.toLowerCase() === "unknown artist")
      return right.name.toLowerCase() === "unknown artist" ? 0 : 1;
    if (right.name.toLowerCase() === "unknown artist") return -1;
    return left.name.localeCompare(right.name, undefined, {
      sensitivity: "base",
    });
  });
}
