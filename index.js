// Initialize crash reporting before Expo Router loads application modules.
const Sentry = require("@sentry/react-native");
Sentry.init({
  dsn: "https://7113eec9646ecf5dd92ebd06659acd7f@o4512011915296768.ingest.de.sentry.io/4512344504270928",
  sendDefaultPii: false,
  enableLogs: true,
});

// Playback services must be registered at the JS entry point, including
// Android headless/background launches where the React UI is never mounted.
const TrackPlayer = require("react-native-track-player").default;
TrackPlayer.registerPlaybackService(() => require("./service").default);

require("expo-router/entry");
