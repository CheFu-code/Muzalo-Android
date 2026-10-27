const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const load = require("./helpers/load-typescript.cjs");
const {
  selectLibraryTracks,
  defaultLibraryPreferences: defaults,
  songFolder,
} = load(path.join(__dirname, "../tools/libraryControls.ts"), {
  "expo-media-library": {},
});
const tracks = [
  {
    id: "a",
    uri: "file:///storage/emulated/0/Music/a.mp3",
    filename: "a.mp3",
    title: "Song 10",
    artist: "Zed",
    duration: 120,
    date: 1,
  },
  {
    id: "b",
    uri: "file:///storage/emulated/0/Music/b.mp3",
    filename: "b.mp3",
    title: "Song 2",
    artist: "Amy",
    duration: 20,
    date: 3,
  },
  {
    id: "c",
    uri: "file:///storage/emulated/0/Recordings/c.mp3",
    filename: "c.mp3",
    title: "Recording",
    artist: null,
    duration: 0,
    date: 2,
  },
];
const ids = (preferences, term) =>
  selectLibraryTracks(tracks, { ...defaults, ...preferences }, term).map(
    (song) => song.id,
  );

test("sorts by recent, natural title, artist and duration without mutating records", () => {
  assert.deepEqual(ids(), ["b", "c", "a"]);
  assert.deepEqual(ids({ sort: "title" }), ["c", "b", "a"]);
  assert.deepEqual(ids({ sort: "artist" }), ["b", "c", "a"]);
  assert.deepEqual(ids({ sort: "duration", descending: true }), [
    "a",
    "b",
    "c",
  ]);
  assert.deepEqual(
    tracks.map((song) => song.id),
    ["a", "b", "c"],
  );
});
test("folder browsing and exclusions do not remove library records", () => {
  assert.deepEqual(ids({ folder: songFolder(tracks[0]) }), ["b", "a"]);
  assert.deepEqual(ids({ excludedFolders: [songFolder(tracks[0])] }), ["c"]);
  assert.equal(tracks.length, 3);
});
test("optional short-audio filter retains unknown durations; non-music folders are opt-in", () => {
  assert.deepEqual(ids({ hideShort: true }), ["c", "a"]);
  assert.deepEqual(ids({ hideNonMusic: true }), ["b", "a"]);
  assert.deepEqual(ids({ hideNonMusic: true, hideShort: true }), ["a"]);
});
test("search works alongside sorting and folder filters", () => {
  assert.deepEqual(ids({ sort: "title" }, "song"), ["b", "a"]);
  assert.deepEqual(ids({ folder: songFolder(tracks[0]) }, "zed"), ["a"]);
});
