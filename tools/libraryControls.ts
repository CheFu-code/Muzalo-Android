import type { Song } from "@/types/types";
import { audioFileKey } from "./deviceLibrary";

export const librarySortLabels = {
  recent: "Recently added",
  title: "Title",
  artist: "Artist",
  duration: "Duration",
} as const;
export type LibrarySort = keyof typeof librarySortLabels;
export type LibraryPreferences = {
  sort: LibrarySort;
  descending: boolean;
  folder: string | null;
  excludedFolders: string[];
  hideShort: boolean;
  hideNonMusic: boolean;
};
export const defaultLibraryPreferences: LibraryPreferences = {
  sort: "recent",
  descending: false,
  folder: null,
  excludedFolders: [],
  hideShort: false,
  hideNonMusic: false,
};
export function songFolder(song: Song): string {
  const uri = audioFileKey(song.uri);
  if (/^https?:/.test(uri)) return "Online sources";
  return uri.slice(0, uri.lastIndexOf("/")) || "Other audio";
}
export function selectLibraryTracks(
  songs: Song[],
  preferences: LibraryPreferences,
  search = "",
): Song[] {
  const term = search.trim().toLowerCase();
  const filtered = songs.filter((song) => {
    const folder = songFolder(song);
    if (preferences.folder && folder !== preferences.folder) return false;
    if (preferences.excludedFolders.includes(folder)) return false;
    // Unknown duration is retained instead of being mistaken for a short clip.
    if (preferences.hideShort && song.duration > 0 && song.duration < 30)
      return false;
    if (
      preferences.hideNonMusic &&
      /(?:^|\/)(?:recordings?|ringtones?|notifications?|alarms?)(?:\/|$)/i.test(
        folder,
      )
    )
      return false;
    return (
      !term ||
      [song.title, song.artist, song.album, song.filename].some((value) =>
        value?.toLowerCase().includes(term),
      )
    );
  });
  return filtered.sort((a, b) => {
    let order: number;
    switch (preferences.sort) {
      case "artist":
        order = (a.artist || "Unknown artist").localeCompare(
          b.artist || "Unknown artist",
          undefined,
          { sensitivity: "base", numeric: true },
        );
        break;
      case "duration":
        order = a.duration - b.duration;
        break;
      case "title":
        order = (a.title || a.filename).localeCompare(
          b.title || b.filename,
          undefined,
          { sensitivity: "base", numeric: true },
        );
        break;
      default:
        order = (b.date || 0) - (a.date || 0);
    }
    return (
      (preferences.descending ? -order : order) || a.uri.localeCompare(b.uri)
    );
  });
}
