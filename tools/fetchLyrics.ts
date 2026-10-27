import { Song } from "@/types/types";
import { toast } from "sonner-native";

export const fetchLyrics = async (
    track: Song | null,
    setLyrics: (id: string, plainLyrics: string, syncedLyrics?: string) => void | Promise<void>
) => {
    if (!track) {
        return null;
    }

    const artist = track.artist?.trim();
    if (!artist || /^(unknown|unknown\s+artist)$/i.test(artist)) {
        toast.info("Add the artist in Edit track before fetching lyrics.");
        return null;
    }

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
        const response = await request.json();

        if (response.plainLyrics) {
            console.log("Set lyrics for ", track.title);

            if (response.plainLyrics && response.syncedLyrics) {
                await setLyrics(track.id || "", response.plainLyrics, response.syncedLyrics);
                const lyrics = response.syncedLyrics || response.plainLyrics;
                return lyrics;
            } else {
                await setLyrics(track.id || "", response.plainLyrics);
                return response.plainLyrics;
            }
        } else {
            toast.info("No Lyrics available!");
            return null;
        }
    } catch (error) {
        throw error;
    }
};
