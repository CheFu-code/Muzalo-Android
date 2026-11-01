import { Song } from "@/types/types";
import { toast } from "sonner-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type LyricsResult = { plainLyrics: string; syncedLyrics?: string; source: string; fetchedAt: number };
const LYRICS_CACHE_KEY = "lyrics-lookup-cache";
const successfulLookups = new Map<string, LyricsResult>();
const pendingLookups = new Map<string, Promise<LyricsResult | null>>();
let cacheReady: Promise<void> | null = null;
const persistentCacheAvailable = typeof globalThis.window !== "undefined";

function loadCache() {
  if (!persistentCacheAvailable) return Promise.resolve();
    if (!cacheReady) {
      cacheReady = AsyncStorage.getItem(LYRICS_CACHE_KEY)
        .then((value) => {
          if (!value) return;
          const parsed = JSON.parse(value) as Record<string, LyricsResult>;
          for (const [key, result] of Object.entries(parsed)) {
            if (result?.plainLyrics && result.source && Number.isFinite(result.fetchedAt))
              successfulLookups.set(key, result);
          }
        })
        .catch((error) => {
          console.warn("Could not load cached lyrics", error);
        });
    }
    return cacheReady;
}

function persistCache() {
  if (!persistentCacheAvailable) return Promise.resolve();
    return AsyncStorage.setItem(
      LYRICS_CACHE_KEY,
      JSON.stringify(Object.fromEntries(successfulLookups)),
    ).catch((error) => {
      console.warn("Could not save cached lyrics", error);
    });
}

export function clearLyricsLookupCache() {
    successfulLookups.clear();
    if (!persistentCacheAvailable) return;
    void AsyncStorage.removeItem(LYRICS_CACHE_KEY).catch((error) => {
      console.warn("Could not clear cached lyrics", error);
    });
}

export const fetchLyrics = async (
    track: Song | null,
    setLyrics: (id: string, plainLyrics: string, syncedLyrics?: string, source?: string) => void | Promise<void>
) => {
    if (!track) {
        return null;
    }
    await loadCache();

    const artist = track.artist?.trim();
    if (!artist || /^(unknown|unknown\s+artist)$/i.test(artist)) {
        toast.info("Add the artist in Edit track before fetching lyrics.");
        return null;
    }

    const key = `${artist.toLocaleLowerCase()}\u0000${(track.title || "").trim().toLocaleLowerCase()}`;
    const cached = successfulLookups.get(key);
    if (cached) {
        await setLyrics(track.id || "", cached.plainLyrics, cached.syncedLyrics, cached.source);
        return cached.syncedLyrics || cached.plainLyrics;
    }
    let lookup = pendingLookups.get(key);
    if (!lookup) {
      lookup = (async () => {
       try {
        const request = await fetch(
            `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track.title || "")}`,
            {
                method: "GET",
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                    Origin: "https://lrclib.net",
                    Referer: "https://lrclib.net/",
                },
            }
        );

        if (!request.ok && request.status !== 404) throw new Error("Lyrics lookup failed. Please try again.");
        const response = await request.json().catch(() => ({}));

        if (response.instrumental) {
            toast.info("This track is instrumental; no lyrics are available.");
            return null;
        }
        if (response.plainLyrics) {
            const result = { plainLyrics: response.plainLyrics, syncedLyrics: response.syncedLyrics || undefined, source: "LRCLIB", fetchedAt: Date.now() };
            successfulLookups.set(key, result);
            void persistCache();
            return result;
        } else {
            toast.info("No lyrics are available for this track.");
            return null;
        }
       } finally {
         pendingLookups.delete(key);
       }
      })();
      pendingLookups.set(key, lookup);
    }
    const result = await lookup;
    if (!result) return null;
    await setLyrics(track.id || "", result.plainLyrics, result.syncedLyrics, result.source);
    return result.syncedLyrics || result.plainLyrics;
};
