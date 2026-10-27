const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const load = require("./helpers/load-typescript.cjs");
const { processMusicData } = load(path.join(__dirname, "../tools/artists.ts"));

const song = (id, artist, extra = {}) => ({
  id,
  artist,
  uri: `content://music/${id}.mp3`,
  filename: `${id}.mp3`,
  title: `Track ${id}`,
  album: null,
  coverArt: null,
  duration: 120,
  index: 0,
  ...extra,
});

test("all tracks with missing artist metadata stay in one complete group", () => {
  const tracks = [song("one", null), song("two", ""), song("three", "   ")];
  const artists = processMusicData(tracks);
  assert.equal(artists.length, 1);
  assert.equal(artists[0].name, "Unknown Artist");
  assert.deepEqual(
    artists[0].songs.map((track) => track.id),
    ["one", "two", "three"]
  );
});

test("case and spacing variations merge without changing display spelling or losing track data", () => {
  const first = song("one", " Alicia   Keys ", {
    lyrics: "saved lyrics",
    playCount: 8,
  });
  const second = song("two", "alicia keys", { coverArt: "file:///art.jpg" });
  const artists = processMusicData([first, second]);
  assert.equal(artists.length, 1);
  assert.equal(artists[0].name, "Alicia Keys");
  assert.equal(artists[0].image, "file:///art.jpg");
  assert.equal(artists[0].songs[0], first);
  assert.equal(artists[0].songs[0].lyrics, "saved lyrics");
  assert.equal(artists[0].songs[0].playCount, 8);
  assert.equal(first.artist, " Alicia   Keys ");
});

test("artists are alphabetic with the unknown group last and distinct names intact", () => {
  const artists = processMusicData([
    song("one", null),
    song("two", "Zola"),
    song("three", "AC+DC"),
    song("four", "Bongi"),
  ]);
  assert.deepEqual(
    artists.map((artist) => artist.name),
    ["AC+DC", "Bongi", "Zola", "Unknown Artist"]
  );
  assert.deepEqual(processMusicData([]), []);
});
