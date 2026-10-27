const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const load = require("./helpers/load-typescript.cjs");
function createStore(db) {
  const storage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  const native = { addEventListener: () => ({ remove() {} }), getQueue: async () => [] };
  return load(path.join(__dirname, "../tools/store/usePlayerStore.ts"), {
    "@/tools/db": db,
    "expo-file-system": {},
    "@/tools/saveCurrnetSong": () => {},
    "@react-native-async-storage/async-storage": storage,
    "react-native-track-player": {
      ...native,
      Event: {},
      State: {},
      RepeatMode: {},
    },
    "react-native-uuid": { v4: () => "id" },
    "sonner-native": { toast: { success() {}, error() {} } },
    "../downloadManager": {},
    "../services/widgetService": { updateMusicWidget() {} },
  }).usePlayerStore;
}
const track = {
  id: "one",
  uri: "file:///one.mp3",
  title: "One",
  lyrics: "Original",
  syncedLyrics: "[00:00] Original",
};

test("saving plain lyrics preserves existing timing and replaces the active track immutably", async () => {
  const saved = [];
  const store = createStore({
    getSongInfoFromDB: async () => track,
    addLyrics: async (...args) => saved.push(args),
  });
  store.setState({ currentSong: track, files: [track] });
  await store.getState().setLyrics("one", "Edited");
  assert.deepEqual(saved, [["one", "Edited", "[00:00] Original"]]);
  assert.notEqual(store.getState().currentSong, track);
  assert.equal(track.lyrics, "Original");
  assert.equal(store.getState().currentSong.syncedLyrics, "[00:00] Original");
  assert.equal(store.getState().files[0].lyrics, "Edited");
});
test("a lookup can save both plain and timed lyrics", async () => {
  const saved = [];
  const store = createStore({
    getSongInfoFromDB: async () => track,
    addLyrics: async (...args) => saved.push(args),
  });
  store.setState({ currentSong: track, files: [track] });
  await store.getState().setLyrics("one", "New", "[00:02] New");
  assert.deepEqual(saved, [["one", "New", "[00:02] New"]]);
  assert.equal(store.getState().currentSong.syncedLyrics, "[00:02] New");
});

test("failed metadata writes leave the active track, library and queue unchanged", async () => {
  const store = createStore({ editSong: async () => { throw Error("Disk full"); } });
  store.setState({ currentSong: track, files: [track], queue: [track] });
  await assert.rejects(store.getState().editSong("one", "New title", "New artist"), /Disk full/);
  assert.equal(store.getState().currentSong, track);
  assert.equal(store.getState().files[0], track);
  assert.equal(store.getState().queue[0], track);
});
test("saving timing refreshes active playback, library and queue after persistence", async () => {
  const saved = [];
  const store = createStore({
    updateSongSyncedLyrics: async (...args) => saved.push(args),
  });
  const other = { ...track, id: "two", uri: "file:///two.mp3" };
  store.setState({
    currentSong: track,
    files: [track, other],
    queue: [track, other],
  });
  await store.getState().updateSongSyncedLyrics("one", "[00:03] Changed");
  assert.deepEqual(saved, [["one", "[00:03] Changed"]]);
  const state = store.getState();
  for (const song of [state.currentSong, state.files[0], state.queue[0]])
    assert.equal(song.syncedLyrics, "[00:03] Changed");
  assert.equal(state.files[1], other);
  assert.equal(state.queue[1], other);
});
test("failed timing persistence leaves playback and library untouched", async () => {
  const store = createStore({
    updateSongSyncedLyrics: async () => {
      throw Error("Database unavailable");
    },
  });
  store.setState({ currentSong: track, files: [track], queue: [track] });
  await assert.rejects(
    store.getState().updateSongSyncedLyrics("one", "changed"),
    /Database unavailable/
  );
  assert.equal(store.getState().currentSong, track);
  assert.equal(store.getState().files[0], track);
});

test("edited metadata updates the player and queue without mutating the old track", async () => {
  const saved = [];
  const store = createStore({ editSong: async (...args) => saved.push(args) });
  store.setState({ currentSong: track, files: [track], queue: [track] });
  await store
    .getState()
    .editSong("one", "New title", "New artist", "Album", "2026");
  assert.deepEqual(saved, [
    ["one", "New title", "New artist", "Album", "2026"],
  ]);
  for (const song of [
    store.getState().currentSong,
    store.getState().files[0],
    store.getState().queue[0],
  ]) {
    assert.equal(song.title, "New title");
    assert.equal(song.artist, "New artist");
  }
  assert.equal(track.title, "One");
});
test("saving lyrics does not replace a different track selected while the database was busy", async () => {
  let done;
  const pending = new Promise((resolve) => {
    done = resolve;
  });
  const store = createStore({
    getSongInfoFromDB: async () => track,
    addLyrics: () => pending,
  });
  const other = { ...track, id: "two", uri: "file:///two.mp3" };
  store.setState({ currentSong: track, files: [track], queue: [track] });
  const saving = store.getState().setLyrics("one", "Changed");
  store.setState({ currentSong: other });
  done();
  await saving;
  assert.equal(store.getState().currentSong, other);
  assert.equal(store.getState().files[0].lyrics, "Changed");
});
