const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const load = require("./helpers/load-typescript.cjs");
const formats = load(path.join(__dirname, "../tools/audioFormats.ts"));
const granted = { granted: true, canAskAgain: true, status: "granted" };
const asset = (id, folder = "Music") => ({
  id,
  uri: `file:///storage/emulated/0/${folder}/Song${id}.mp3`,
  filename: `Song${id}.mp3`,
  duration: 60,
  creationTime: 1000,
});

function scanner({
  existing = [],
  permission = granted,
  requested = granted,
  pages = [{ assets: [asset("1")], hasNextPage: false }],
  failQuery = false,
  failTags = false,
} = {}) {
  const rows = existing.map((song) => ({ ...song }));
  const calls = { requests: 0, queries: [], reads: 0, inserts: [] };
  const player = {
    files: [],
    currentSong: existing[0] ?? null,
    queue: existing,
  };
  const state = {};
  const store = (value) => ({
    setState: (update) =>
      Object.assign(
        value,
        typeof update === "function" ? update(value) : update,
      ),
  });
  const { syncLibrary } = load(
    path.join(__dirname, "../tools/syncLibrary.ts"),
    {
      "react-native": { Platform: { OS: "android" } },
      "expo-media-library": {
        MediaType: { audio: "audio" },
        SortBy: { creationTime: "creationTime" },
        getPermissionsAsync: async (writeOnly, granular) => {
          assert.equal(writeOnly, false);
          assert.deepEqual(granular, ["audio"]);
          return permission;
        },
        requestPermissionsAsync: async (writeOnly, granular) => {
          assert.equal(writeOnly, false);
          assert.deepEqual(granular, ["audio"]);
          calls.requests++;
          return requested;
        },
        getAssetsAsync: async (options) => {
          calls.queries.push(options);
          if (failQuery) throw Error("Permission revoked during scan");
          return pages[calls.queries.length - 1];
        },
      },
      "./db": {
        getAllSongs: async () => rows.map((song) => ({ ...song })),
        addSongsBatch: async (songs) => {
          calls.inserts.push(...songs);
          rows.push(...songs);
        },
        updateSongUri: async (id, uri) => {
          rows.find((song) => song.id === id).uri = uri;
        },
        updateSongDuration: async (id, duration) => {
          rows.find((song) => song.id === id).duration = duration;
        },
      },
      "./fileUtils": {
        ensureCacheDir: async () => "file:///cache/",
        looksLikeAudio: formats.looksLikeAudio,
      },
      "./metadata": {
        readTagsForContentUri: async () => {
          calls.reads++;
          if (failTags) throw Error("Unreadable metadata");
          return { id: "parser-id", title: "Read title", artist: "Artist" };
        },
      },
      "./store/usePlayerStore": { usePlayerStore: store(player) },
      "./store/useLibraryStore": { useLibraryStore: store(state) },
    },
  );
  return { syncLibrary, rows, calls, player, state };
}

test("scans audio across folders and every page, skipping duplicate assets", async () => {
  const first = asset("1"),
    second = asset("2", "Download");
  const app = scanner({
    pages: [
      { assets: [first], hasNextPage: true, endCursor: "200" },
      { assets: [first, second], hasNextPage: false },
    ],
  });
  await app.syncLibrary();
  assert.equal(app.calls.requests, 0);
  assert.equal(app.calls.queries[0].mediaType, "audio");
  assert.equal(app.calls.queries[1].after, "200");
  assert.deepEqual(
    app.rows.map((song) => song.uri),
    [first.uri, second.uri],
  );
  assert.deepEqual(
    app.rows.map((song) => song.id),
    ["media:1", "media:2"],
  );
  assert.equal(app.state.scanning, false);
});

test("denied permission keeps existing tracks and does not repeatedly prompt", async () => {
  const app = scanner({
    existing: [{ id: "old", uri: "file:///old.mp3", lyrics: "Saved" }],
    permission: { granted: false, canAskAgain: true, status: "denied" },
    requested: { granted: false, canAskAgain: true, status: "denied" },
  });
  await app.syncLibrary();
  assert.equal(app.calls.requests, 0);
  assert.equal(app.calls.queries.length, 0);
  assert.equal(app.player.files[0].lyrics, "Saved");
  assert.equal(app.state.access, "denied");
  await app.syncLibrary({ requestPermission: true });
  assert.equal(app.calls.requests, 1);
});

test("first-time access requests audio only and overlapping scans share one run", async () => {
  const app = scanner({
    permission: { granted: false, canAskAgain: true, status: "undetermined" },
  });
  const first = app.syncLibrary(),
    second = app.syncLibrary();
  assert.equal(first, second);
  await first;
  assert.equal(app.calls.requests, 1);
  assert.equal(app.calls.reads, 1);
});

test("upgrades old folder tracks without duplicating them or losing edited data", async () => {
  const old = {
    id: "legacy",
    uri: "content://com.android.externalstorage.documents/tree/primary%3AMusic/document/primary%3AMusic%2FSong1.mp3",
    title: "Edited",
    artist: "My artist",
    lyrics: "My lyrics",
    playCount: 7,
  };
  const app = scanner({ existing: [old] });
  await app.syncLibrary();
  assert.equal(app.calls.reads, 0);
  assert.equal(app.rows.length, 1);
  assert.deepEqual(app.rows[0], { ...old, uri: asset("1").uri, duration: 60 });
  assert.equal(app.player.currentSong.uri, asset("1").uri);
  assert.equal(app.player.queue[0].id, "legacy");
});

test("empty or failed scans preserve playlists' track records", async () => {
  for (const failQuery of [false, true]) {
    const app = scanner({
      existing: [{ id: "old", uri: "file:///old.mp3" }],
      pages: [{ assets: [], hasNextPage: false }],
      failQuery,
    });
    await app.syncLibrary();
    assert.equal(app.rows.length, 1);
    assert.equal(app.state.scanning, false);
    if (failQuery) assert.match(app.state.error, /Try scanning again/);
  }
});

test("bad tags retain a playable filename and media-library duration", async () => {
  const app = scanner({ failTags: true });
  await app.syncLibrary();
  assert.equal(app.rows[0].filename, "Song1.mp3");
  assert.equal(app.rows[0].title, "Song1");
  assert.equal(app.rows[0].duration, 60);
});

test("storage keys keep identically named songs in different folders separate", () => {
  const { audioFileKey } = load(
    path.join(__dirname, "../tools/deviceLibrary.ts"),
    { "expo-media-library": {} },
  );
  assert.notEqual(
    audioFileKey(asset("1", "Music").uri),
    audioFileKey(asset("1", "Download").uri),
  );
  assert.equal(
    audioFileKey(
      "content://com.android.externalstorage.documents/document/ABCD-1234%3AMusic%2FSong.mp3",
    ),
    "/storage/ABCD-1234/Music/Song.mp3",
  );
});

test("rescanning backfills missing durations without replacing edits or lyrics", async () => {
  for (const duration of [0, undefined]) {
    const original = {
      id: "old",
      uri: asset("1").uri,
      title: "Edited",
      lyrics: "Saved",
      duration,
    };
    const app = scanner({ existing: [original] });
    await app.syncLibrary();
    assert.equal(app.calls.reads, 0);
    assert.equal(app.calls.inserts.length, 0);
    assert.deepEqual(app.rows[0], { ...original, duration: 60 });
  }
});

test("a rescan preserves duration already learned from playback", async () => {
  const original = { id: "old", uri: asset("1").uri, duration: 185.4 };
  const app = scanner({ existing: [original] });
  await app.syncLibrary();
  assert.equal(app.rows[0].duration, 185.4);
});
