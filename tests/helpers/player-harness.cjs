const path = require("node:path");
const load = require("./load-typescript.cjs");

const song = (id, extra = {}) => ({
  id,
  uri: `file:///${id}.mp3`,
  filename: `${id}.mp3`,
  title: id,
  artist: "Artist",
  album: null,
  coverArt: null,
  duration: 120,
  index: 0,
  ...extra,
});

function playerHarness(songs = [song("a"), song("b"), song("c")]) {
  const calls = [],
    history = [],
    messages = [];
  let nativeQueue = [],
    active = -1,
    position = 0,
    playing = false,
    ended = false;
  let failure = null;
  const State = {
    Playing: "playing",
    Paused: "paused",
    Ended: "ended",
    Ready: "ready",
  };
  const RepeatMode = { Off: "off", Queue: "queue", Track: "track" };
  const record = (name, ...args) => {
    calls.push([name, ...args]);
    if (failure === name) {
      failure = null;
      throw Error(`${name} failed`);
    }
  };
  const native = {
    getQueue: async () => [...nativeQueue],
    getActiveTrack: async () => nativeQueue[active],
    getProgress: async () => ({ position, duration: 120 }),
    getPlaybackState: async () => ({
      state: ended ? State.Ended : playing ? State.Playing : State.Paused,
    }),
    setQueue: async (tracks) => {
      record("setQueue", tracks);
      nativeQueue = [...tracks];
      active = tracks.length ? 0 : -1;
      position = 0;
      playing = false;
    },
    skip: async (index, start = 0) => {
      record("skip", index, start);
      active = index;
      position = start;
      ended = false;
    },
    play: async () => {
      record("play");
      playing = true;
      ended = false;
    },
    pause: async () => {
      record("pause");
      playing = false;
    },
    seekTo: async (target) => {
      record("seek", target);
      position = target;
    },
    setRepeatMode: async (mode) => record("repeat", mode),
    setVolume: async (volume) => record("volume", volume),
    add: async (tracks, index = nativeQueue.length) => {
      record("add", tracks, index);
      const id = nativeQueue[active]?.id;
      nativeQueue.splice(
        index,
        0,
        ...(Array.isArray(tracks) ? tracks : [tracks]),
      );
      active = id ? nativeQueue.findIndex((entry) => entry.id === id) : 0;
    },
    move: async (from, to) => {
      record("move", from, to);
      const id = nativeQueue[active]?.id;
      nativeQueue.splice(to, 0, nativeQueue.splice(from, 1)[0]);
      active = nativeQueue.findIndex((entry) => entry.id === id);
    },
    remove: async (index) => {
      record("remove", index);
      const id = nativeQueue[active]?.id;
      nativeQueue.splice(index, 1);
      active = nativeQueue.findIndex((entry) => entry.id === id);
      if (active < 0) {
        active = nativeQueue.length
          ? Math.min(index, nativeQueue.length - 1)
          : -1;
        position = 0;
      }
    },
    reset: async () => {
      record("reset");
      nativeQueue = [];
      active = -1;
      position = 0;
      playing = false;
    },
  };
  const state = {
    files: songs,
    queue: [],
    queueOrder: [],
    currentSong: null,
    currentSongIndex: -1,
    position: 0,
    duration: 0,
    isPlaying: false,
    shuffle: false,
    repeat: "off",
    volume: 1,
    showLyrics: false,
    playbackBusy: false,
    playbackError: null,
    incrementPlayCount: (id) => history.push(id),
  };
  const { createPlayerActions } = load(
    path.join(__dirname, "../../tools/store/playerActions.ts"),
    {
      "react-native-track-player": { ...native, State, RepeatMode },
      "@/tools/db": { incrementPlayCountInDB: async () => {} },
      "@/tools/saveCurrnetSong": async () => {},
      "expo-file-system": {
        getInfoAsync: async (uri) => ({ exists: !uri.includes("missing") }),
      },
      "sonner-native": {
        toast: Object.fromEntries(
          ["info", "success", "error"].map((type) => [
            type,
            (message) => messages.push([type, message]),
          ]),
        ),
      },
    },
  );
  const actions = createPlayerActions(
    (update) =>
      Object.assign(
        state,
        typeof update === "function" ? update(state) : update,
      ),
    () => state,
  );
  Object.assign(state, actions);
  return {
    state,
    native,
    calls,
    history,
    messages,
    actions,
    keys: () => nativeQueue.map((entry) => entry.id),
    active: () => nativeQueue[active]?.id,
    progress: (value) => {
      position = value;
      state.position = value;
    },
    advance: (index) => {
      active = index;
      position = 0;
      playing = true;
    },
    end: () => {
      ended = true;
      playing = false;
    },
    fail: (operation) => {
      failure = operation;
    },
  };
}
module.exports = { playerHarness, song };
