const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const load = require("./helpers/load-typescript.cjs");
const { readAudioMetadata } = load(
  path.join(__dirname, "../tools/audioMetadata.ts")
);
const fixture = (extension) =>
  fs.readFileSync(
    path.join(
      __dirname,
      `fixtures/audio/tone.${extension === "oga" ? "ogg" : extension}`
    )
  );

for (const extension of [
  "mp3",
  "m4a",
  "aac",
  "wav",
  "flac",
  "ogg",
  "oga",
  "opus",
]) {
  test(`reads real ${extension} audio metadata and duration`, async () => {
    const bytes = fixture(extension);
    const result = await readAudioMetadata(
      async (position, length) => bytes.subarray(position, position + length),
      `tone.${extension}`,
      bytes.length
    );
    assert.ok(
      result.format.duration > 0 && result.format.duration < 1,
      JSON.stringify(result.format)
    );
    if (extension !== "aac") {
      assert.equal(result.common.title, "Muzalo Test Tone");
      assert.equal(result.common.artist, "Muzalo Tests");
    }
  });
}

test("M4A tags after a large audio/free region are found with bounded reads", async () => {
  const original = fixture("m4a");
  let moov = 0;
  while (original.toString("ascii", moov + 4, moov + 8) !== "moov")
    moov += original.readUInt32BE(moov);
  const padding = Buffer.alloc(600 * 1024);
  padding.writeUInt32BE(padding.length);
  padding.write("free", 4);
  const bytes = Buffer.concat([
    original.subarray(0, moov),
    padding,
    original.subarray(moov),
  ]);
  const requests = [];
  const result = await readAudioMetadata(
    async (position, length) => {
      requests.push({ position, length });
      return bytes.subarray(position, position + length);
    },
    "late-tags.m4a",
    bytes.length
  );
  assert.equal(result.common.title, "Muzalo Test Tone");
  assert.ok(result.format.duration > 0);
  assert.ok(requests.every(({ length }) => length <= 256 * 1024));
  assert.ok(requests.some(({ position }) => position > 256 * 1024));
});

function nativeMetadata(bytes, uri, directReadFails = false) {
  const files = new Map([[uri, bytes]]);
  const removed = [];
  const native = {
    cacheDirectory: "file:///cache/",
    EncodingType: { Base64: "base64" },
    getInfoAsync: async (source) => ({
      exists: files.has(source),
      size: files.get(source)?.length,
      modificationTime: 1,
    }),
    readAsStringAsync: async (source, { position = 0, length }) => {
      if (directReadFails && source === uri)
        throw new Error("Provider does not allow ranged reads");
      const data = files.get(source);
      if (!data) throw new Error("Missing file");
      return data
        .subarray(
          position,
          length === undefined ? undefined : position + length
        )
        .toString("base64");
    },
    makeDirectoryAsync: async () => {},
    copyAsync: async ({ from, to }) => {
      files.set(to, files.get(from));
    },
    deleteAsync: async (source) => {
      removed.push(source);
      files.delete(source);
    },
  };
  const { readTagsForContentUri } = load(
    path.join(__dirname, "../tools/metadata.ts"),
    {
      "expo-file-system": native,
      "react-native-uuid": { v4: () => "metadata-test-id" },
      "./saveCoverArtIfNeeded": async () => null,
    }
  );
  return { readTagsForContentUri, removed };
}

test("the app metadata path reads each format without pretending it is MP3", async () => {
  for (const extension of [
    "mp3",
    "m4a",
    "aac",
    "wav",
    "flac",
    "ogg",
    "oga",
    "opus",
  ]) {
    const uri = `content://provider/document/primary%3AMusic%2Ftone.${extension}`;
    const { readTagsForContentUri } = nativeMetadata(fixture(extension), uri);
    const track = await readTagsForContentUri(uri);
    assert.equal(track.filename, `tone.${extension}`);
    assert.ok(track.duration > 0, extension);
    assert.equal(
      track.title,
      extension === "aac" ? "tone" : "Muzalo Test Tone"
    );
  }
});

test("providers that reject direct reads use a temporary copy and clean it up", async () => {
  const uri = "content://provider/document/primary%3AMusic%2Ftone.flac";
  const { readTagsForContentUri, removed } = nativeMetadata(
    fixture("flac"),
    uri,
    true
  );
  const track = await readTagsForContentUri(uri);
  assert.equal(track.title, "Muzalo Test Tone");
  assert.ok(track.duration > 0);
  assert.ok(
    removed.some(
      (file) => file.startsWith("file:///cache/") && file.endsWith(".flac")
    )
  );
  assert.ok(!removed.includes(uri));
});

test("malformed metadata still returns a track with a safe filename fallback", async () => {
  const uri = "file:///Music/100% Hits.flac";
  const { readTagsForContentUri } = nativeMetadata(
    Buffer.from("not valid audio"),
    uri
  );
  const track = await readTagsForContentUri(uri);
  assert.equal(track.title, "100% Hits");
  assert.equal(track.filename, "100% Hits.flac");
  assert.equal(track.uri, uri);
});
