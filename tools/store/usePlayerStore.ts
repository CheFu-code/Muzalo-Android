import { createPlayerActions } from "./playerActions";
import { createPlayerStorage } from "./playerPersistence";
import {
  addFavorite,
  addLyrics,
  addSong,
  addSongToPlaylist,
  createPlaylist,
  editSong,
  getAlbum,
  getAllPlaylists,
  getAllSongs,
  getFavoriteSongs,
  getSongInfoFromDB,
  getSpeceficSystemPlaylist,
  clearHistoryInDB,
  removeFavorite,
  removePlaylist,
  removeSongFromPlaylist,
  setLocalURI,
  updateSongSyncedLyrics,
} from "@/tools/db";
import { Playlist, Song } from "@/types/types";
import { Buffer } from "buffer";

import uuid from "react-native-uuid";
import { toast } from "sonner-native";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { downloadSongWithSAF } from "../downloadManager";
import { getAudioExtension } from "../audioFormats";
import { updateMusicWidget } from "../services/widgetService";

if (!(global as any).Buffer) {
  (global as any).Buffer = Buffer;
}



export type PlayerStore = {
  files: Song[];
  currentSong: Song | null;
  currentSongIndex: number;
  isPlaying: boolean;
  position: number;
  duration: number;
  isLoading: boolean;
  playbackBusy: boolean;
  playbackError: { song: Song | null; message: string } | null;
  syncActiveTrack: (id?: string) => Promise<void>;
  reportPlaybackError: (message?: string) => void;
  dismissPlaybackError: () => void;
  resumePlayback: () => Promise<boolean>;
  pausePlayback: () => Promise<boolean>;
  refreshPlaybackQueue: () => Promise<boolean>;
  refreshTrackMetadata: (id: string) => Promise<boolean>;
  playNext: (song: Song) => Promise<boolean>;
  moveQueueTrack: (from: number, to: number) => Promise<boolean>;

  shuffle: boolean;

  showLyrics: boolean;

  repeat: "off" | "all" | "one";
  // Actions
  loadLibrary: () => Promise<void>;
  addFile: (song: Song) => Promise<void>;

  setProgress: (position: number, duration: number) => void;

  // actions
  // pickFolder: () => Promise<void>;
  playFile: (file: Song, duration?: number) => Promise<boolean>;
  playSong: (
    index: number,
    backwardOrForward?: "backward" | "forward",
    isRandom?: boolean,
    contextQueue?: Song[]
  ) => Promise<boolean>;
  playSongWithUri: (
    uri: string,
    backwardOrForward?: "backward" | "forward",
    isRandom?: boolean,
    contextQueue?: Song[]
  ) => Promise<boolean>;
  playSongGeneric: (
    song: Song,
    options?: {
      contextQueue?: Song[];
      fromUserAction?: boolean;
      shuffle?: boolean;
    }
  ) => Promise<boolean>;
  playPauseMusic: () => Promise<boolean>;
  setIsPlaying: (val: boolean) => void;
  handleChangeSongPosition: (pos: number) => void;
  handlebackwardPosition: () => void;
  handleForwardPosition: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleShowLyrics: () => void;
  volume: number;
  setVolume: (val: number) => void;

  queue: Song[]; // songs queued up
  queueOrder: string[];
  queueContext?: "playlist" | "search" | "library" | "custom" | null;
  addToQueue: (songs: Song[]) => Promise<boolean>;
  removeFromQueue: (songId: string) => Promise<boolean>;
  clearQueue: () => Promise<boolean>;
  playAnotherSongInQueue: (
    type: "next" | "previous",
    method?: "button" | "update"
  ) => Promise<boolean>;
  setFiles: (files: Song[]) => void;
  setAllFiles: (files: Song[]) => void;
  setLyrics: (id: string, lyrics: string, syncedLyrics?: string) => Promise<void>;
  editSong: (
    id: string,
    title: string,
    artist: string,
    album?: string,
    year?: string
  ) => Promise<void>;

  updateFileLocalUri: (id: string | null | undefined, localUri: string) => void;
  downloadFile: (id: string, remoteUri: string) => void;
  incrementPlayCount: (id: string | null | undefined) => void;
  getSongInfo: (id: string) => Promise<Song | null>;
  getAlbum: (id: string) => Promise<Song[] | null>;
  updateSongSyncedLyrics: (id: string, syncedLyrics: string) => Promise<void>;
};

export const playerSessionStorage = createPlayerStorage();

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      files: [],
      currentSong: null,
      currentSongIndex: -1,
      isPlaying: false,
      queue: [],
      queueOrder: [],
      queueContext: null,
      position: 0,
      duration: 1,
      isLoading: false,
      playbackBusy: false,
      playbackError: null,
      shuffle: false,
      showLyrics: true,
      repeat: "off",
      volume: 1,
      setAllFiles: (files) => {
        // console.log(files);
        const mergedFiles = files.map((f) => {
          const id = uuid.v4().toString().slice(-8);
          console.log("ID: ", id);

          return {
            ...f,
            id,
          };
        });

        // console.log("Merggged ", mergedFiles);

        set({ files: mergedFiles });
      },
      loadLibrary: async () => {
        const songs = await getAllSongs();
        set({ files: songs });
      },
      setFiles: (files) => {
        const prevFiles = get().files;

        // Merge with persisted lyrics/syncedLyrics if available
        const mergedFiles = files.map((f) => {
          const existing = prevFiles.find((pf) => pf.uri === f.uri);

          return {
            ...f,
            ...(existing
              ? {
                  lyrics: existing.lyrics ?? null,
                  syncedLyrics: existing.syncedLyrics ?? null,
                }
              : {}),
          };
        });

        set({ files: mergedFiles });
      },

      addFile: async (song: Song) => {
        await addSong(song);
        const songs = await getAllSongs();
        set({ files: songs });
      },

      updateFileLocalUri: (id: string | null | undefined, localUri: any) =>
        set((s) => ({
          files: s.files.map((f) => (f.id === id ? { ...f, localUri } : f)),
        })),
      downloadFile: async (id: string, remoteUri) => {
        const file = get().files.find((f) => f.id === id);
        if (!file) return;

        const safeTitle =
          file.title?.replace(/[\\/:*?"<>|]/g, "_") || `song_${id}`;
        const extension =
          getAudioExtension(remoteUri) ??
          getAudioExtension(file.filename) ??
          getAudioExtension(file.uri);
        const localUri = await downloadSongWithSAF(
          remoteUri,
          `${safeTitle}${extension ?? ""}`
        );

        if (localUri) {
          get().updateFileLocalUri(id, localUri);

          const { addTrackToPlaylist } = usePlaylistStore.getState();

          await setLocalURI(localUri, file.id || "");

          // Add the track (make sure it includes updated localUri)
          addTrackToPlaylist("downloads", file.id || "");
        } else {
          toast.error(
            "Could not download the audio file. Check the source and folder access."
          );
        }
      },

      ...createPlayerActions(set, get),
      setLyrics: async (id: string, lyrics: string, syncedLyrics?: string) => {
        if (!id) {
          throw new Error("A track is required to save lyrics.");
        }

        const { getSongInfo } = get();

        const song = await getSongInfo(id);

        const synced =
          syncedLyrics !== undefined
            ? syncedLyrics
            : (song?.syncedLyrics ?? null);

        await addLyrics(id, lyrics, synced);
        toast.success(`Lyrics added!`);

        set((state) => ({
          currentSong:
            state.currentSong?.id === id
              ? { ...state.currentSong, lyrics, syncedLyrics: synced }
              : state.currentSong,
          files: state.files.map((f) =>
            f.id === id
              ? {
                  ...f,
                  lyrics,
                  syncedLyrics: synced,
                }
              : f
          ),
          queue: state.queue.map((f) =>
            f.id === id ? { ...f, lyrics, syncedLyrics: synced } : f
          ),
        }));
      },
      editSong: async (
        id: string,
        title: string,
        artist: string,
        album?: string,
        year?: string
      ) => {
        if (!id || !title || !artist) {
          throw new Error("Title and artist are required.");
        }

        await editSong(id, title, artist, album, year);
        toast.success(`Song Edited!`);

        set((state) => ({
          currentSong:
            state.currentSong?.id === id
              ? {
                  ...state.currentSong,
                  title,
                  artist,
                  album: album || "",
                  year,
                }
              : state.currentSong,
          files: state.files.map((f) =>
            f.id === id
              ? {
                  ...f,
                  title,
                  artist,
                  album: album || "",
                  year,
                }
              : f
          ),
          queue: state.queue.map((f) =>
            f.id === id ? { ...f, title, artist, album: album || "", year } : f
          ),
        }));
        void get().refreshTrackMetadata(id);
      },
      incrementPlayCount: (id: string | null | undefined) => {
        if (!id) {
          return;
        }
        set((s) => ({
          files: s.files.map((song) =>
            song.id === id
              ? {
                  ...song,
                  playCount: (song.playCount || 0) + 1,
                  lastPlayedAt: Date.now(),
                }
              : song
          ),
        }));
      },
      getSongInfo: async (id: string) => {
        const songInfo = await getSongInfoFromDB(id);
        return songInfo;
      },
      getAlbum: async (name: string) => {
        const songInfo = await getAlbum(name);
        return songInfo;
      },
      updateSongSyncedLyrics: async (id: string, syncedLyrics: string) => {
        await updateSongSyncedLyrics(id, syncedLyrics);
        set((state) => ({
          currentSong:
            state.currentSong?.id === id
              ? { ...state.currentSong, syncedLyrics }
              : state.currentSong,
          files: state.files.map((song) =>
            song.id === id ? { ...song, syncedLyrics } : song
          ),
          queue: state.queue.map((song) =>
            song.id === id ? { ...song, syncedLyrics } : song
          ),
        }));
        toast.success(`Synced Lyrics added!`);
      },
    }),
    {
      name: "player-storage",
      storage: playerSessionStorage,
      partialize: (s) => ({
        currentSong: s.currentSong,
        currentSongIndex: s.currentSongIndex,
        queue: s.queue,
        queueOrder: s.queueOrder,
        queueContext: s.queueContext,
        repeat: s.repeat,
        shuffle: s.shuffle,
        showLyrics: s.showLyrics,
        volume: s.volume,
        position: s.position,
        duration: s.duration,
      }),
      onRehydrateStorage: () => (state) => {
        console.log(
          "🎵 PlayerStore rehydrated with queue:",
          state?.queue?.length ?? 0
        );
        if (state?.currentSong) {
          updateMusicWidget(state.currentSong, state.isPlaying ?? false);
        }
      },
    }
  )
);

let _prevWidgetSongKey: string | null = null;
let _prevWidgetIsPlaying: boolean | null = null;

usePlayerStore.subscribe((state) => {
  const songKey = state.currentSong
    ? `${state.currentSong.id || state.currentSong.uri}-${state.currentSong.title}`
    : null;
  const isPlaying = state.isPlaying;
  if (songKey !== _prevWidgetSongKey || isPlaying !== _prevWidgetIsPlaying) {
    _prevWidgetSongKey = songKey;
    _prevWidgetIsPlaying = isPlaying;
    updateMusicWidget(state.currentSong, isPlaying);
  }
});

export const usePlaylistStore = create<{
  playlists: Playlist[];
  favorites: Song[]; // store song IDs
  isFavorite: (songId: string) => boolean;
  loadFavorites: () => Promise<void>;
  toggleFavorite: (songId: string) => Promise<void>;

  isLoading: boolean;
  setIsLoading: (state: boolean) => void;
  loadPlaylists: (type: "user" | "system" | "all") => Promise<void>;
  addPlaylist: (name: string, description?: string) => Promise<void>;
  removePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeTrackFromPlaylist: (
    playlistId: string,
    songId: string
  ) => Promise<void>;
  getSpeceficSystemPlaylist: (
    type: "recent" | "most-played" | "history"
  ) => Promise<Playlist | undefined>;
  clearHistory: () => Promise<void>;
}>((set, get) => ({
  playlists: [],
  isLoading: false,
  favorites: [],

  toggleFavorite: async (songId) => {
    const isFav = get().favorites.some((f) => f.id === songId);
    if (isFav) {
      await removeFavorite(songId);
      toast.success(`Track Deleted from Favorites!`);
    } else {
      await addFavorite(songId);
      toast.success(`Track added to Favorites!`);
    }
    const updatedFavs = await getFavoriteSongs();
    set({ favorites: updatedFavs });
  },
  isFavorite: (songId) => {
    const isFav = get().favorites.some((f) => f.id === songId);
    return isFav;
  },

  // Load favorites
  loadFavorites: async () => {
    const favs = await getFavoriteSongs();
    set({ favorites: favs });
  },

  setIsLoading: async (state: boolean) => {
    set({ isLoading: state });
  },
  loadPlaylists: async (type: "user" | "system" | "all" = "all") => {
    set({ isLoading: true });
    try {
      const playlists = await getAllPlaylists(type);
      set({ playlists });
    } catch (error) {
      console.error("Failed to load playlists:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  addPlaylist: async (name, description) => {
    await createPlaylist(name, description);
    await get().loadPlaylists("all");
    toast.success(`Playlists Created: ${name}`);
  },

  removePlaylist: async (id) => {
    await removePlaylist(id);
    await get().loadPlaylists("all");
    toast.success(`Playlists Deleted!`);
  },

  addTrackToPlaylist: async (playlistId, songId) => {
    await addSongToPlaylist(playlistId, songId);
    const { favorites } = get();

    if (playlistId === "favorites") {
      if (!favorites.find((fav) => fav.id === songId)) {

        const getSongInfo = usePlayerStore.getState().getSongInfo;
        const song = await getSongInfo(songId);
        if (!song) {
          toast.error("Something went wrong! The song coundn't be found!");
          return;
        }
        set(() => ({
          favorites: [...favorites, song],
        }));
      }
    }

    await get().loadPlaylists("all");
  },

  removeTrackFromPlaylist: async (playlistId, songId) => {
    await removeSongFromPlaylist(playlistId, songId);
    await get().loadPlaylists("all");
  },
  getSpeceficSystemPlaylist: async (
    type: "recent" | "most-played" | "history"
  ) => {
    const playlist = await getSpeceficSystemPlaylist(type);
    return playlist;
  },
  clearHistory: async () => {
    await clearHistoryInDB();
    await get().loadPlaylists("all");
    toast.success("Playback history cleared!");
  },
}));

