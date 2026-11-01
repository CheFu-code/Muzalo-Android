import TrackPlayer, { Event, State } from "react-native-track-player";
import { usePlayerStore } from "./tools/store/usePlayerStore";

let registered = false;

// All UI and notification playback events are registered once, here.
export default async function playbackService() {
  if (registered) return;
  registered = true;
  // A restarted service must not keep a stale native queue. The hydrated
  // player store restores it when the application process is ready.
  try {
    if (typeof (TrackPlayer as { reset?: () => Promise<void> }).reset === "function")
      await TrackPlayer.reset();
    usePlayerStore.getState().clearTransientPlaybackState?.();
  } catch {
    // The player may not have been initialized yet; the app will restore it.
  }
  let interruptedPlayback = false;
  const run = (action: () => Promise<unknown>) => {
    void action().catch((error) => usePlayerStore.getState().reportPlaybackError(String(error)));
  };
  TrackPlayer.addEventListener(Event.RemotePlay, () => run(() => usePlayerStore.getState().resumePlayback()));
  TrackPlayer.addEventListener(Event.RemotePause, () => run(() => usePlayerStore.getState().pausePlayback()));
  TrackPlayer.addEventListener(Event.RemoteNext, () => run(() => usePlayerStore.getState().playAnotherSongInQueue("next")));
  TrackPlayer.addEventListener(Event.RemotePrevious, () => run(() => usePlayerStore.getState().playAnotherSongInQueue("previous")));
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => run(async () => {
    await usePlayerStore.getState().handleChangeSongPosition(position);
  }));
  TrackPlayer.addEventListener(Event.RemoteJumpForward, () => usePlayerStore.getState().handleForwardPosition());
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, () => usePlayerStore.getState().handlebackwardPosition());
  TrackPlayer.addEventListener(Event.RemoteDuck, ({ paused, permanent }) => run(async () => {
    if (paused || permanent) {
      interruptedPlayback =
        !permanent && usePlayerStore.getState().isPlaying;
      await usePlayerStore.getState().pausePlayback();
    } else if (interruptedPlayback) {
      interruptedPlayback = false;
      await usePlayerStore.getState().resumePlayback();
    }
  }));
  TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
    usePlayerStore.setState({ isPlaying: state === State.Playing });
    if (state === State.Playing) run(() => usePlayerStore.getState().syncActiveTrack());
  });
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, () => {
    run(() => usePlayerStore.getState().syncPlaybackProgress());
  });
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, ({ track }) => {
    run(() => usePlayerStore.getState().syncActiveTrack(track?.id));
  });
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
    usePlayerStore.setState({ isPlaying: false });
  });
  TrackPlayer.addEventListener(Event.PlaybackError, ({ message }) => {
    usePlayerStore.getState().reportPlaybackError(message);
  });
}
