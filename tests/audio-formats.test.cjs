const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const load = require("./helpers/load-typescript.cjs");
const {
  looksLikeAudio,
  getFilenameFromAnyUri,
  getAudioMimeType,
  resolveAudioDownload,
} = load(path.join(__dirname, "../tools/audioFormats.ts"));

test("scanning accepts supported formats in encoded SAF paths and URLs", () => {
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
    assert.ok(
      looksLikeAudio(
        `content://provider/document/primary%3AMusic%2FTrack%20One.${extension.toUpperCase()}`
      )
    );
    assert.ok(
      looksLikeAudio(
        `https://example.test/music/track.${extension}?token=123#position`
      )
    );
    assert.ok(getAudioMimeType(`track.${extension}`));
  }
  for (const source of [
    "cover.jpg",
    "video.mp4",
    "song.mp3.txt",
    "track.wma",
    "https://example.test/download?name=song.mp3",
  ]) {
    assert.equal(looksLikeAudio(source), false, source);
  }
});

test("filename handling preserves the extension and tolerates literal or encoded punctuation", () => {
  assert.equal(
    getFilenameFromAnyUri(
      "content://provider/document/primary%3AMusic%2FRock%20%26%20Roll.FLAC"
    ),
    "Rock & Roll.FLAC"
  );
  assert.equal(
    getFilenameFromAnyUri("file:///Music/100% Hits.mp3"),
    "100% Hits.mp3"
  );
  assert.equal(getFilenameFromAnyUri("file:///Music/Why%3F.flac"), "Why?.flac");
  assert.equal(
    getFilenameFromAnyUri("https://example.test/song.m4a?signature=a.b"),
    "song.m4a"
  );
  assert.equal(
    getFilenameFromAnyUri("content://provider/document/audio%3A123"),
    "audio:123"
  );
});

test("downloads use response formats, preserve Ogg aliases and reject non-audio responses", () => {
  assert.deepEqual(
    resolveAudioDownload(
      "Favourite",
      "https://example.test/download",
      "audio/mp4; charset=binary"
    ),
    { filename: "Favourite.m4a", mimeType: "audio/mp4" }
  );
  assert.deepEqual(
    resolveAudioDownload(
      "Track.mp3",
      "https://example.test/download",
      "audio/x-flac"
    ),
    { filename: "Track.flac", mimeType: "audio/flac" }
  );
  assert.deepEqual(
    resolveAudioDownload(
      "Track.opus",
      "https://example.test/track.opus",
      "audio/ogg"
    ),
    { filename: "Track.opus", mimeType: "audio/ogg" }
  );
  assert.deepEqual(
    resolveAudioDownload(
      "Track.oga",
      "https://example.test/track.oga",
      "application/ogg"
    ),
    { filename: "Track.oga", mimeType: "audio/ogg" }
  );
  assert.equal(
    resolveAudioDownload(
      "Track.wav",
      "https://example.test/download",
      "application/octet-stream"
    ).filename,
    "Track.wav"
  );
  assert.throws(
    () =>
      resolveAudioDownload(
        "Track.mp3",
        "https://example.test/track.mp3",
        "text/html"
      ),
    /not a supported audio/
  );
  assert.throws(
    () => resolveAudioDownload("Track", "https://example.test/download"),
    /Unable to determine/
  );
});
