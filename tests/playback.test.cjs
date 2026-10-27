const test = require("node:test");
const assert = require("node:assert/strict");
const { playerHarness, song } = require("./helpers/player-harness.cjs");

test("loads a real queue at the chosen track, with no placeholder or duplicate play count", async () => {
  const app = playerHarness();
  assert.equal(
    await app.actions.playSongGeneric(app.state.files[1], {
      contextQueue: app.state.files,
    }),
    true,
  );
  assert.deepEqual(app.keys(), ["a", "b", "c"]);
  assert.equal(app.active(), "b");
  await app.actions.syncActiveTrack("b");
  assert.deepEqual(app.history, ["b"]);
});

test("native automatic transitions update UI and history once; old events are ignored", async () => {
  const app = playerHarness();
  await app.actions.playSongGeneric(app.state.files[0], {
    contextQueue: app.state.files,
  });
  app.advance(1);
  await Promise.all([
    app.actions.syncActiveTrack("b"),
    app.actions.syncActiveTrack("b"),
  ]);
  await app.actions.syncActiveTrack("a");
  assert.equal(app.state.currentSong.id, "b");
  assert.deepEqual(app.history, ["a", "b"]);
});

test("pause/resume and replay at the queue end do not rebuild a healthy queue", async () => {
  const app = playerHarness();
  await app.actions.playSongGeneric(app.state.files[2], {
    contextQueue: app.state.files,
  });
  app.progress(42);
  await app.actions.playPauseMusic();
  await app.actions.resumePlayback();
  assert.equal((await app.native.getProgress()).position, 42);
  assert.equal(app.calls.filter(([name]) => name === "setQueue").length, 1);
  app.end();
  await app.actions.resumePlayback();
  assert.equal((await app.native.getProgress()).position, 0);
});

test("queue additions work during repeat-one and play-next moves an existing song without interruption", async () => {
  const app = playerHarness();
  await app.actions.playSongGeneric(app.state.files[0], {
    contextQueue: app.state.files,
  });
  app.state.repeat = "one";
  app.progress(51);
  await app.actions.addToQueue([song("d")]);
  await app.actions.playNext(app.state.files[2]);
  assert.deepEqual(app.keys(), ["a", "c", "b", "d"]);
  assert.equal(app.active(), "a");
  assert.equal((await app.native.getProgress()).position, 51);
  assert.equal(app.calls.filter(([name]) => name === "setQueue").length, 1);
});

test("moving and removing items preserves the current song and progress", async () => {
  const app = playerHarness();
  await app.actions.playSongGeneric(app.state.files[1], {
    contextQueue: app.state.files,
  });
  app.progress(25);
  await app.actions.moveQueueTrack(0, 2);
  assert.deepEqual(app.keys(), ["b", "c", "a"]);
  assert.equal(app.active(), "b");
  await app.actions.removeFromQueue("a");
  assert.equal(app.active(), "b");
  assert.equal((await app.native.getProgress()).position, 25);
  await app.actions.removeFromQueue("b");
  assert.equal(app.state.currentSong.id, "c");
  assert.deepEqual(
    app.state.queue.map((song) => song.id),
    app.keys(),
  );
});

test("previous restarts after five seconds and next respects repeat-all boundaries", async () => {
  const app = playerHarness();
  await app.actions.playSongGeneric(app.state.files[2], {
    contextQueue: app.state.files,
  });
  app.progress(20);
  await app.actions.playAnotherSongInQueue("previous");
  assert.equal(app.active(), "c");
  assert.equal((await app.native.getProgress()).position, 0);
  await app.actions.playAnotherSongInQueue("next");
  assert.equal(app.active(), "c");
  app.state.repeat = "all";
  await app.actions.playAnotherSongInQueue("next");
  assert.equal(app.active(), "a");
});

test("missing selected files leave existing audio alone and identify the failed song", async () => {
  const app = playerHarness();
  await app.actions.playSongGeneric(app.state.files[0]);
  const before = app.calls.length;
  const missing = song("missing");
  assert.equal(await app.actions.playSongGeneric(missing), false);
  assert.equal(app.active(), "a");
  assert.equal(app.state.currentSong.id, "a");
  assert.equal(app.calls.length, before);
  assert.equal(app.state.playbackError.song.id, "missing");
});

test("a missing downloaded copy falls back to the original file and selects the right queue entry", async () => {
  const files = [
    song("a"),
    song("b", { localUri: "file:///missing-copy.mp3" }),
    song("c"),
  ];
  const app = playerHarness(files);
  await app.actions.playSongGeneric(files[0], { contextQueue: files });
  await app.actions.playSongGeneric(files[1]);
  assert.equal(app.active(), "b");
  assert.equal((await app.native.getActiveTrack()).url, files[1].uri);
});

test("native queue failures are visible and later commands still run", async () => {
  const app = playerHarness();
  app.fail("setQueue");
  assert.equal(await app.actions.playSongGeneric(app.state.files[1]), false);
  assert.equal(app.state.playbackError.song.id, "b");
  assert.equal(app.state.playbackBusy, false);
  assert.equal(await app.actions.playSongGeneric(app.state.files[0]), true);
});

test("restored queue selects the persisted track and position before resuming", async () => {
  const app = playerHarness();
  app.state.queue = app.state.files;
  app.state.currentSong = app.state.files[1];
  app.state.position = 67;
  await app.actions.resumePlayback();
  assert.equal(app.active(), "b");
  assert.equal((await app.native.getProgress()).position, 67);
});

test("turning shuffle off restores original upcoming order without restarting audio", async () => {
  const app = playerHarness();
  await app.actions.playSongGeneric(app.state.files[0], {
    contextQueue: app.state.files,
  });
  app.progress(35);
  await app.actions.toggleShuffle();
  await app.actions.toggleShuffle();
  assert.deepEqual(app.keys(), ["a", "b", "c"]);
  assert.equal((await app.native.getProgress()).position, 35);
  assert.equal(app.calls.filter(([name]) => name === "setQueue").length, 1);
});
