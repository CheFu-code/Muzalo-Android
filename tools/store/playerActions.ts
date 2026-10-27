import TrackPlayer, { RepeatMode, State } from "react-native-track-player";
import { toast } from "sonner-native";
import type { Song } from "@/types/types";
import { incrementPlayCountInDB, updateSongDuration } from "@/tools/db";
import saveSongMetadata from "@/tools/saveCurrnetSong";
import {
  nativeTrack,
  playableUri,
  shuffledSongs,
  songKey,
  uniqueSongs,
  UnavailableSongError,
} from "../playbackQueue";
import type { PlayerStore } from "./usePlayerStore";

type SetPlayer = (
  update: Partial<PlayerStore> | ((state: PlayerStore) => Partial<PlayerStore>),
) => void;

export function createPlayerActions(set: SetPlayer, get: () => PlayerStore) {
  let operations: Promise<unknown> = Promise.resolve();
  let mutating = false;
  let lastCounted: string | null = null;
  let attemptedSong: Song | null = null;
  const pendingDurations = new Set<string>();

  const rememberDuration = async (id: string, duration: number) => {
    if (!Number.isFinite(duration) || duration <= 0 || pendingDurations.has(id))
      return;
    const source = get().files.find((entry) => songKey(entry) === id);
    if (
      !source ||
      (Number.isFinite(source.duration) &&
        source.duration > 0 &&
        Math.round(source.duration) === Math.round(duration))
    )
      return;
    pendingDurations.add(id);
    try {
      await updateSongDuration(id, duration);
      set((state) => ({
        files: state.files.map((entry) =>
          songKey(entry) === id ? { ...entry, duration } : entry,
        ),
        queue: state.queue.map((entry) =>
          songKey(entry) === id ? { ...entry, duration } : entry,
        ),
        currentSong:
          state.currentSong && songKey(state.currentSong) === id
            ? { ...state.currentSong, duration }
            : state.currentSong,
      }));
    } catch (error) {
      console.warn("Could not save the song duration", error);
    } finally {
      pendingDurations.delete(id);
    }
  };

  const report = (error: unknown, song = get().currentSong) => {
    const failed = error instanceof UnavailableSongError ? error.song : song;
    const message =
      error instanceof UnavailableSongError
        ? error.message
        : "Playback could not complete. The file may be unavailable, unsupported, or audio access may have changed.";
    set({ playbackError: { song: failed, message } });
  };
  const serial = (work: () => Promise<void>) => {
    const result = operations.then(async () => {
      mutating = true;
      set({ playbackBusy: true });
      try {
        await work();
        return true;
      } catch (error) {
        report(error, attemptedSong ?? get().currentSong);
        return false;
      } finally {
        attemptedSong = null;
        mutating = false;
        set({ playbackBusy: false });
      }
    });
    operations = result;
    return result;
  };
  const repeatMode = () =>
    get().repeat === "one"
      ? RepeatMode.Track
      : get().repeat === "all"
        ? RepeatMode.Queue
        : RepeatMode.Off;

  const activate = async (song: Song | null, position = 0, playing = false) => {
    if (
      !song ||
      songKey(song) !== (get().currentSong && songKey(get().currentSong!))
    )
      lastCounted = null;
    set({
      currentSong: song,
      currentSongIndex: song
        ? get().files.findIndex((s) => songKey(s) === songKey(song))
        : -1,
      position,
      duration: song?.duration || 0,
      isPlaying: playing,
    });
    if (song && playing && lastCounted !== songKey(song)) {
      lastCounted = songKey(song);
      get().incrementPlayCount(songKey(song));
      try {
        await incrementPlayCountInDB(songKey(song));
      } catch {
        toast.error(
          "Music is playing, but listening history could not be saved.",
        );
      }
      void saveSongMetadata(song);
    }
  };

  const install = async (
    queue: Song[],
    selected: Song | null,
    position: number,
    playing: boolean,
  ) => {
    const index = selected
      ? queue.findIndex((song) => songKey(song) === songKey(selected))
      : 0;
    await TrackPlayer.setQueue(queue.map((song) => nativeTrack(song)));
    if (queue.length) {
      await TrackPlayer.skip(Math.max(0, index), Math.max(0, position));
      await TrackPlayer.setRepeatMode(repeatMode());
      await TrackPlayer.setVolume(get().volume);
      if (playing) await TrackPlayer.play();
      else await TrackPlayer.pause();
    }
    set({ queue });
    await activate(
      queue[Math.max(0, index)] ?? null,
      position,
      playing && queue.length > 0,
    );
  };

  const ready = async () => {
    const state = get();
    const native = await TrackPlayer.getQueue();
    if (
      native.length === state.queue.length &&
      native.every((track, i) => track.id === songKey(state.queue[i]))
    )
      return;
    await install(
      state.queue,
      state.currentSong,
      state.position,
      state.isPlaying,
    );
  };

  const play = async (
    song: Song,
    context?: Song[],
    shuffle?: boolean,
    position = 0,
  ) => {
    attemptedSong = song;
    const source = await playableUri(song); // Check before interrupting the current song.
    let queue = uniqueSongs(
      context?.length
        ? context
        : get().queue.length &&
            get().queue.some((s) => songKey(s) === songKey(song))
          ? get().queue
          : get().files.length
            ? get().files
            : [song],
    );
    if (!queue.some((s) => songKey(s) === songKey(song))) queue.push(song);
    const shuffled = shuffle ?? get().shuffle;
    const queueOrder =
      context || !get().queueOrder.length
        ? queue.map(songKey)
        : get().queueOrder;
    if (shuffle !== undefined) set({ shuffle });
    if (shuffled && context)
      queue = [
        song,
        ...shuffledSongs(queue.filter((s) => songKey(s) !== songKey(song))),
      ];
    const native = await TrackPlayer.getQueue();
    const same =
      native.length === queue.length &&
      native.every((track, i) => track.id === songKey(queue[i]));
    const selected = queue.findIndex((s) => songKey(s) === songKey(song));
    const active = await TrackPlayer.getActiveTrack();
    const ended = (await TrackPlayer.getPlaybackState()).state === State.Ended;
    const reload = !same || native[selected]?.url !== source;
    if (!same) {
      const tracks = queue.map((entry) =>
        nativeTrack(
          entry,
          songKey(entry) === songKey(song) ? source : undefined,
        ),
      );
      await TrackPlayer.setQueue(tracks);
    } else if (native[selected]?.url !== source) {
      // A recovered download can fall back to its original source.
      await TrackPlayer.setQueue(
        queue.map((entry) =>
          nativeTrack(
            entry,
            songKey(entry) === songKey(song) ? source : undefined,
          ),
        ),
      );
    }
    if (reload || active?.id !== songKey(song) || position > 0 || ended) {
      await TrackPlayer.skip(selected, position);
    }
    if (ended) lastCounted = null;
    await TrackPlayer.setRepeatMode(repeatMode());
    await TrackPlayer.setVolume(get().volume);
    await TrackPlayer.play();
    set({
      queue,
      queueOrder,
      playbackError: null,
      queueContext: context ? "custom" : get().queueContext,
    });
    const progress = await TrackPlayer.getProgress();
    await activate(song, progress.position, true);
    void rememberDuration(songKey(song), progress.duration);
  };

  const resume = async () => {
    const current = get().currentSong ?? get().queue[0];
    if (!current) return;
    const active = await TrackPlayer.getActiveTrack();
    await play(
      current,
      undefined,
      undefined,
      active?.id === songKey(current) ? 0 : get().position,
    );
  };

  const syncActiveTrack = async (id?: string) => {
    if (mutating) return;
    const track = await TrackPlayer.getActiveTrack();
    if (!track) return; // A fresh native player must not erase a restorable session.
    if (id && track?.id !== id) return;
    const song =
      get().queue.find((entry) => songKey(entry) === track.id) ??
      get().files.find((entry) => songKey(entry) === track.id);
    if (!song) return;
    const state = await TrackPlayer.getPlaybackState();
    const progress = await TrackPlayer.getProgress();
    if (!mutating) {
      await activate(song, progress.position, state.state === State.Playing);
      void rememberDuration(songKey(song), progress.duration);
    }
  };

  return {
    setProgress: (position: number, duration: number) =>
      set({ position, duration }),
    setIsPlaying: (isPlaying: boolean) => set({ isPlaying }),
    playFile: (song: Song) => serial(() => play(song)),
    playSong: (
      index: number,
      _direction?: "backward" | "forward",
      _random?: boolean,
      context?: Song[],
    ) =>
      serial(async () => {
        const song = (context ?? get().files)[index];
        if (song) await play(song, context);
      }),
    playSongWithUri: (
      uri: string,
      _direction?: "backward" | "forward",
      _random?: boolean,
      context?: Song[],
    ) =>
      serial(async () => {
        const song = (context ?? get().files).find(
          (entry) => entry.uri === uri,
        );
        if (song) await play(song, context);
      }),
    playSongGeneric: (
      song: Song,
      options?: {
        contextQueue?: Song[];
        fromUserAction?: boolean;
        shuffle?: boolean;
      },
    ) => serial(() => play(song, options?.contextQueue, options?.shuffle)),
    resumePlayback: () => serial(resume),
    pausePlayback: () =>
      serial(async () => {
        await TrackPlayer.pause();
        set({ isPlaying: false });
      }),
    refreshPlaybackQueue: () =>
      serial(async () => {
        const { queue, currentSong, position, isPlaying } = get();
        await install(queue, currentSong, position, isPlaying);
      }),
    refreshTrackMetadata: (id: string) =>
      serial(async () => {
        try {
          const queue = await TrackPlayer.getQueue();
          const index = queue.findIndex((entry) => entry.id === id);
          const song = get().files.find((entry) => songKey(entry) === id);
          if (index >= 0 && song)
            await TrackPlayer.updateMetadataForTrack(index, {
              title: song.title || song.filename,
              artist: song.artist || "Unknown artist",
              artwork: song.coverArt || undefined,
            });
        } catch {
          // The database save succeeded; a stopped player can load these details later.
          toast.info(
            "Saved. Playback details will refresh when the track loads again.",
          );
        }
      }),
    playPauseMusic: () =>
      serial(async () => {
        if ((await TrackPlayer.getPlaybackState()).state === State.Playing) {
          await TrackPlayer.pause();
          set({ isPlaying: false });
        } else await resume();
      }),
    syncActiveTrack,
    syncPlaybackProgress: async () => {
      if (mutating) return;
      const active = await TrackPlayer.getActiveTrack();
      if (!active) return;
      const progress = await TrackPlayer.getProgress();
      const latest = await TrackPlayer.getActiveTrack();
      const current = get().currentSong;
      if (
        mutating ||
        latest?.id !== active.id ||
        !current ||
        songKey(current) !== active.id
      )
        return;
      set({
        position: progress.position,
        duration:
          Number.isFinite(progress.duration) && progress.duration > 0
            ? progress.duration
            : current.duration || 0,
      });
      await rememberDuration(songKey(current), progress.duration);
    },
    reportPlaybackError: (message?: string) => {
      report(new Error(message));
      set({ isPlaying: false });
    },
    dismissPlaybackError: () => set({ playbackError: null }),
    handleChangeSongPosition: (position: number) =>
      serial(async () => {
        await TrackPlayer.seekTo(Math.max(0, position));
        set({ position: Math.max(0, position) });
      }),
    handlebackwardPosition: () =>
      serial(async () => {
        const { position } = await TrackPlayer.getProgress();
        await TrackPlayer.seekTo(Math.max(0, position - 5));
      }),
    handleForwardPosition: () =>
      serial(async () => {
        const { position, duration } = await TrackPlayer.getProgress();
        await TrackPlayer.seekTo(
          Math.min(duration || position + 5, position + 5),
        );
      }),
    toggleShowLyrics: () => set((state) => ({ showLyrics: !state.showLyrics })),
    setVolume: (volume: number) =>
      serial(async () => {
        await TrackPlayer.setVolume(volume);
        set({ volume });
      }),
    toggleRepeat: () =>
      serial(async () => {
        const next =
          get().repeat === "off"
            ? "all"
            : get().repeat === "all"
              ? "one"
              : "off";
        await TrackPlayer.setRepeatMode(
          next === "all"
            ? RepeatMode.Queue
            : next === "one"
              ? RepeatMode.Track
              : RepeatMode.Off,
        );
        set({ repeat: next });
      }),
    toggleShuffle: () =>
      serial(async () => {
        await ready();
        const { queue, currentSong, position, isPlaying, shuffle, queueOrder } =
          get();
        const currentIndex = queue.findIndex(
          (song) => currentSong && songKey(song) === songKey(currentSong),
        );
        const past = queue.slice(0, currentIndex + 1);
        const upcoming = queue.slice(currentIndex + 1);
        const originalOrder = queueOrder.length
          ? queueOrder
          : queue.map(songKey);
        const ordered = shuffle
          ? [...upcoming].sort(
              (a, b) =>
                originalOrder.indexOf(songKey(a)) -
                originalOrder.indexOf(songKey(b)),
            )
          : shuffledSongs(upcoming);
        // Move upcoming tracks natively without restarting the current audio.
        const working = [...queue];
        const next = [...past, ...ordered];
        for (let i = currentIndex + 1; i < next.length; i++) {
          const from = working.findIndex(
            (song) => songKey(song) === songKey(next[i]),
          );
          if (from !== i) {
            await TrackPlayer.move(from, i);
            working.splice(i, 0, working.splice(from, 1)[0]);
          }
        }
        set({
          queue: next,
          queueOrder: originalOrder,
          shuffle: !shuffle,
          position,
          isPlaying,
        });
      }),
    addToQueue: (songs: Song[]) =>
      serial(async () => {
        await ready();
        const queue = get().queue;
        const additions = uniqueSongs(songs).filter(
          (song) => !queue.some((entry) => songKey(entry) === songKey(song)),
        );
        if (!additions.length) {
          toast.info("Already in the queue.");
          return;
        }
        await TrackPlayer.add(additions.map((song) => nativeTrack(song)));
        set({
          queue: [...queue, ...additions],
          queueOrder: [...get().queueOrder, ...additions.map(songKey)],
        });
        if (!get().currentSong) await activate(additions[0]);
        toast.success("Added to queue");
      }),
    playNext: (song: Song) =>
      serial(async () => {
        await ready();
        const queue = [...get().queue];
        const active = queue.findIndex(
          (entry) =>
            get().currentSong && songKey(entry) === songKey(get().currentSong!),
        );
        const existing = queue.findIndex(
          (entry) => songKey(entry) === songKey(song),
        );
        if (existing === active && existing >= 0) {
          toast.info("This song is the current track.");
          return;
        }
        let destination = active + 1;
        if (existing >= 0) {
          if (existing < destination) destination--;
          await TrackPlayer.move(existing, destination);
          queue.splice(destination, 0, queue.splice(existing, 1)[0]);
        } else {
          await TrackPlayer.add(nativeTrack(song), destination);
          queue.splice(destination, 0, song);
        }
        set({ queue, queueOrder: queue.map(songKey) });
        if (!get().currentSong) await activate(song);
        toast.success("Playing next");
      }),
    moveQueueTrack: (from: number, to: number) =>
      serial(async () => {
        await ready();
        const queue = [...get().queue];
        if (
          from < 0 ||
          to < 0 ||
          from >= queue.length ||
          to >= queue.length ||
          from === to
        )
          return;
        await TrackPlayer.move(from, to);
        queue.splice(to, 0, queue.splice(from, 1)[0]);
        set({ queue, queueOrder: queue.map(songKey) });
      }),
    removeFromQueue: (id: string) =>
      serial(async () => {
        await ready();
        const queue = get().queue;
        const index = queue.findIndex((song) => songKey(song) === id);
        if (index < 0) return;
        const playing = get().isPlaying;
        await TrackPlayer.remove(index);
        const next = queue.filter((_, i) => i !== index);
        set({
          queue: next,
          queueOrder: get().queueOrder.filter((key) => key !== id),
        });
        const native = await TrackPlayer.getActiveTrack();
        const song =
          next.find((entry) => songKey(entry) === native?.id) ?? null;
        await activate(
          song,
          song ? (await TrackPlayer.getProgress()).position : 0,
          playing && !!song,
        );
      }),
    clearQueue: () =>
      serial(async () => {
        await TrackPlayer.reset();
        set({ queue: [], queueOrder: [], queueContext: null });
        await activate(null);
      }),
    playAnotherSongInQueue: (direction: "next" | "previous") =>
      serial(async () => {
        await ready();
        const { queue, currentSong, repeat } = get();
        if (!queue.length) return;
        const progress = await TrackPlayer.getProgress();
        if (direction === "previous" && progress.position > 5) {
          await TrackPlayer.seekTo(0);
          set({ position: 0 });
          return;
        }
        const index = queue.findIndex(
          (song) => currentSong && songKey(song) === songKey(currentSong),
        );
        let next = index + (direction === "next" ? 1 : -1);
        if (next < 0 || next >= queue.length) {
          if (repeat !== "all") {
            if (direction === "previous") await TrackPlayer.seekTo(0);
            return;
          }
          next = (next + queue.length) % queue.length;
        }
        await play(queue[next]);
      }),
  };
}
