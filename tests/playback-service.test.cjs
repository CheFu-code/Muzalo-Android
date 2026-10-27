const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const load = require("./helpers/load-typescript.cjs");

test("service registers once and notification actions execute once", async () => {
  const listeners = new Map(),
    calls = [];
  const events = [
    "RemotePlay",
    "RemotePause",
    "RemoteNext",
    "RemotePrevious",
    "RemoteSeek",
    "RemoteJumpForward",
    "RemoteJumpBackward",
    "RemoteDuck",
    "PlaybackState",
    "PlaybackProgressUpdated",
    "PlaybackActiveTrackChanged",
    "PlaybackQueueEnded",
    "PlaybackError",
  ];
  const state = Object.fromEntries(
    [
      "resumePlayback",
      "pausePlayback",
      "playAnotherSongInQueue",
      "handleChangeSongPosition",
      "handleForwardPosition",
      "handlebackwardPosition",
      "syncActiveTrack",
      "syncPlaybackProgress",
      "reportPlaybackError",
      "setProgress",
    ].map((name) => [
      name,
      async (...args) => {
        calls.push([name, ...args]);
      },
    ]),
  );
  const service = load(path.join(__dirname, "../service.ts"), {
    "react-native-track-player": {
      Event: Object.fromEntries(events.map((name) => [name, name])),
      State: { Playing: "playing" },
      addEventListener: (event, action) => {
        assert.equal(listeners.has(event), false);
        listeners.set(event, action);
      },
      pause: async () => calls.push(["pause"]),
    },
    "./tools/store/usePlayerStore": {
      usePlayerStore: {
        getState: () => state,
        setState: (value) => Object.assign(state, value),
      },
    },
  }).default;
  await service();
  await service();
  listeners.get("RemoteNext")();
  listeners.get("RemotePlay")();
  listeners.get("PlaybackActiveTrackChanged")({ track: { id: "a" } });
  listeners.get("PlaybackProgressUpdated")({ position: 12, duration: 180 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(
    calls.filter(([name]) => name === "syncPlaybackProgress"),
    [["syncPlaybackProgress"]],
  );
  assert.deepEqual(
    calls.filter(([name]) => name === "playAnotherSongInQueue"),
    [["playAnotherSongInQueue", "next"]],
  );
  assert.deepEqual(
    calls.filter(([name]) => name === "resumePlayback"),
    [["resumePlayback"]],
  );
  assert.deepEqual(
    calls.filter(([name]) => name === "syncActiveTrack"),
    [["syncActiveTrack", "a"]],
  );
  listeners.get("PlaybackError")({ message: "File missing" });
  assert.equal(state.isPlaying, undefined);
  assert.deepEqual(calls.at(-1), ["reportPlaybackError", "File missing"]);
});
