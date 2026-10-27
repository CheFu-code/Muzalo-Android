const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const load = require("./helpers/load-typescript.cjs");
const { parseLRC, hasTimestamps, formatTimestamp, formatLRC } = load(
  path.join(__dirname, "../tools/parseLyrics.ts")
);

test("timestamps accept whole seconds, centiseconds and milliseconds, including zero", () => {
  assert.deepEqual(
    parseLRC("[00:00] Start\n[00:01.25] Next\n[01:02.345] Later"),
    [
      { time: 0, text: "Start" },
      { time: 1.25, text: "Next" },
      { time: 62.345, text: "Later" },
    ]
  );
  assert.equal(hasTimestamps("[00:00] Start"), true);
});
test("repeated timestamps expand and metadata is excluded from timed playback", () => {
  assert.deepEqual(parseLRC("[ar:Artist]\n[00:12.00][00:03.5] Refrain"), [
    { time: 3.5, text: "Refrain" },
    { time: 12, text: "Refrain" },
  ]);
});
test("plain lyrics preserve line order without treating them as synced", () => {
  assert.deepEqual(parseLRC("First\r\n\r\nSecond"), [
    { time: 0, text: "First" },
    { time: 0, text: "Second" },
  ]);
  assert.equal(hasTimestamps("First\nSecond"), false);
  assert.deepEqual(parseLRC(""), []);
});
test("timestamp rounding carries into the next minute and never emits invalid seconds", () => {
  assert.equal(formatTimestamp(59.999), "[01:00.00]");
  assert.equal(formatTimestamp(62.345), "[01:02.35]");
  assert.equal(formatTimestamp(-5), "[00:00.00]");
  assert.equal(formatTimestamp(NaN), "[00:00.00]");
});
test("saved lyric timing round-trips through the player parser", () => {
  const lines = [
    { time: 0, text: "Start" },
    { time: 63.25, text: "Next" },
  ];
  assert.deepEqual(parseLRC(formatLRC(lines)), lines);
});
