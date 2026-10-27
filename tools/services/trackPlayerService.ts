import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
} from "react-native-track-player";

let initialization: Promise<void> | null = null;

export function setupPlayer() {
  if (initialization) return initialization;
  initialization = initialize().catch((error) => { initialization = null; throw error; });
  return initialization;
}

async function initialize() {
  try { await TrackPlayer.setupPlayer(); }
  catch (error) {
    if ((error as { code?: string }).code !== "player_already_initialized") throw error;
  }

  await TrackPlayer.updateOptions({
    progressUpdateEventInterval: 1,
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
    },
    capabilities: [
      Capability.SkipToPrevious,
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SeekTo,
      // Keep JumpBackward/JumpForward here only if you use them manually
    ],
    notificationCapabilities: [
      Capability.SkipToPrevious,
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SeekTo,
    ],
    compactCapabilities: [
      Capability.SkipToPrevious,
      Capability.Play,
      Capability.SkipToNext,
      Capability.SeekTo,
    ],
  });
}
