const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const load = require("./helpers/load-typescript.cjs");
const {
  queueDropIndex,
  moveQueueItem,
  QUEUE_ROW_HEIGHT: height,
} = load(path.join(__dirname, "../tools/queueReorder.ts"));

test("drag targets follow rows and account for auto-scrolling", () => {
  assert.equal(queueDropIndex(1, height, 0, 10), 2);
  assert.equal(queueDropIndex(1, height, height * 3, 10), 5);
  assert.equal(queueDropIndex(5, -height, -height * 2, 10), 2);
  assert.equal(queueDropIndex(1, 12, 0, 10), 1);
});
test("dragging is bounded to the queue, including short or empty lists", () => {
  assert.equal(queueDropIndex(1, -5000, 0, 3), 0);
  assert.equal(queueDropIndex(1, 5000, 0, 3), 2);
  assert.equal(queueDropIndex(0, 300, 0, 1), 0);
  assert.equal(queueDropIndex(0, 300, 0, 0), -1);
});
test("optimistic reordering preserves every song and leaves the snapshot unchanged", () => {
  const queue = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(
    moveQueueItem(queue, 0, 2).map((song) => song.id),
    ["b", "c", "a"],
  );
  assert.deepEqual(
    moveQueueItem(queue, 2, 0).map((song) => song.id),
    ["c", "a", "b"],
  );
  assert.deepEqual(
    queue.map((song) => song.id),
    ["a", "b", "c"],
  );
  assert.deepEqual(moveQueueItem(queue, -1, 2), queue);
});
