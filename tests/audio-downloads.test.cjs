const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const load = require("./helpers/load-typescript.cjs");

function downloader({
  status = 200,
  contentType = "audio/flac",
  failWrite = false,
} = {}) {
  const created = [],
    removed = [];
  const native = {
    cacheDirectory: "file:///cache/",
    EncodingType: { Base64: "base64" },
    downloadAsync: async (_, uri) => ({
      uri,
      status,
      headers: { "Content-Type": contentType },
    }),
    readAsStringAsync: async () => "audio-bytes",
    deleteAsync: async (uri) => {
      removed.push(uri);
    },
    StorageAccessFramework: {
      createFileAsync: async (folder, name, mime) => {
        created.push({ folder, name, mime });
        return "content://folder/downloaded";
      },
      writeAsStringAsync: async () => {
        if (failWrite) throw new Error("Folder unavailable");
      },
    },
  };
  const { downloadSongWithSAF } = load(
    path.join(__dirname, "../tools/downloadManager.ts"),
    {
      "expo-file-system": native,
      "@react-native-async-storage/async-storage": {
        getItem: async () => "content://folder",
      },
      "react-native-uuid": { v4: () => "download-test-id" },
    }
  );
  return { downloadSongWithSAF, created, removed };
}

test("downloads save the actual extension and MIME type, then remove the cache file", async () => {
  const { downloadSongWithSAF, created, removed } = downloader();
  assert.equal(
    await downloadSongWithSAF("https://example.test/download", "Favourite.mp3"),
    "content://folder/downloaded"
  );
  assert.deepEqual(created, [
    { folder: "content://folder", name: "Favourite.flac", mime: "audio/flac" },
  ]);
  assert.deepEqual(removed, ["file:///cache/audio-download-download-test-id"]);
});

test("failed HTTP and HTML responses never create an audio file", async () => {
  for (const options of [{ status: 404 }, { contentType: "text/html" }]) {
    const { downloadSongWithSAF, created, removed } = downloader(options);
    assert.equal(
      await downloadSongWithSAF("https://example.test/song.mp3", "Song.mp3"),
      null
    );
    assert.equal(created.length, 0);
    assert.equal(removed.length, 1);
  }
});

test("a failed folder write removes the temporary and partial destination files", async () => {
  const { downloadSongWithSAF, removed } = downloader({ failWrite: true });
  assert.equal(
    await downloadSongWithSAF("https://example.test/song.flac", "Song.flac"),
    null
  );
  assert.ok(removed.includes("file:///cache/audio-download-download-test-id"));
  assert.ok(removed.includes("content://folder/downloaded"));
});
