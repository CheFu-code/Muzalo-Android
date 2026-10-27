const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const load = require("./helpers/load-typescript.cjs");

test("progress saves are coalesced while queue changes and background flush save promptly", async () => {
  const writes = [];
  const { createPlayerStorage } = load(
    path.join(__dirname, "../tools/store/playerPersistence.ts"),
    {
      "@react-native-async-storage/async-storage": {
        setItem: async (_, json) => writes.push(JSON.parse(json)),
        getItem: async () => null,
        removeItem: async () => {},
      },
      "sonner-native": { toast: { error: assert.fail } },
    },
  );
  const storage = createPlayerStorage();
  const state = {
    currentSong: null,
    queue: [],
    queueOrder: [],
    repeat: "off",
    shuffle: false,
    showLyrics: true,
    volume: 1,
    position: 0,
    duration: 120,
  };
  await storage.setItem("player", { state });
  for (let position = 1; position <= 4; position++)
    storage.setItem("player", { state: { ...state, position } });
  assert.equal(writes.length, 1);
  await storage.flush();
  assert.equal(writes.length, 2);
  assert.equal(writes[1].state.position, 4);
  await storage.setItem("player", { state: { ...state, repeat: "all" } });
  assert.equal(writes.length, 3);
});

test("preference persistence failures notify once and do not reject playback actions", async () => {
  const messages = [];
  const { createPlayerStorage } = load(
    path.join(__dirname, "../tools/store/playerPersistence.ts"),
    {
      "@react-native-async-storage/async-storage": {
        setItem: async () => {
          throw Error("Disk full");
        },
      },
      "sonner-native": {
        toast: { error: (message) => messages.push(message) },
      },
    },
  );
  const storage = createPlayerStorage();
  await storage.setItem("player", { state: { queue: [], position: 0 } });
  await storage.setItem("player", { state: { queue: [], position: 1 } });
  assert.equal(messages.length, 1);
  assert.match(messages[0], /could not be saved/);
});
