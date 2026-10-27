const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const load = require("./helpers/load-typescript.cjs");
let DatabaseSync;
try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch {}
const source = path.join(__dirname, "../tools/db.ts");
const loadDB = (openDatabaseAsync) =>
  load(source, {
    "expo-sqlite": { openDatabaseAsync },
    "react-native-uuid": { v4: () => "test" },
    "sonner-native": { toast: { error: assert.fail } },
  });

function connection({ fail = false } = {}) {
  let closed = 0;
  const db = {
    execAsync: async () => {
      if (fail) throw Error("Cannot prepare database");
    },
    withTransactionAsync: async (callback) => callback(),
    getAllAsync: async () =>
      ["localUri", "playCount", "lastPlayedAt"].map((name) => ({ name })),
    getFirstAsync: async () => ({ id: "exists" }),
    closeAsync: async () => {
      closed++;
    },
  };
  return { db, closed: () => closed };
}

test("concurrent startup and database callers share one fully prepared connection", async () => {
  let opened = 0;
  const ready = connection();
  const db = loadDB(async () => {
    opened++;
    return ready.db;
  });
  const first = db.initDB(),
    second = db.initDB();
  assert.equal(first, second);
  const results = await Promise.all([first, second, db.getDB()]);
  assert.equal(opened, 1);
  assert.ok(results.every((result) => result === ready.db));
  assert.equal(await db.initDB(), ready.db);
  assert.equal(opened, 1);
});

test("failed initialization closes the connection, rejects and allows a clean retry", async () => {
  const failed = connection({ fail: true }),
    ready = connection();
  let opened = 0;
  const db = loadDB(async () => (++opened === 1 ? failed.db : ready.db));
  await assert.rejects(db.initDB(), /Cannot prepare database/);
  assert.equal(failed.closed(), 1);
  assert.equal(await db.getDB(), ready.db);
  assert.equal(opened, 2);
});

test("an open failure does not permanently block later startup attempts", async () => {
  let opened = 0;
  const ready = connection();
  const db = loadDB(async () => {
    if (++opened === 1) throw Error("Storage unavailable");
    return ready.db;
  });
  await assert.rejects(db.initDB(), /Storage unavailable/);
  assert.equal(await db.initDB(), ready.db);
});

function legacyDatabase(t) {
  const sql = new DatabaseSync(":memory:");
  t.after(() => sql.close());
  const schema = fs
    .readFileSync(source, "utf8")
    .match(/await db\.execAsync\(`([\s\S]*?)`\)/)[1]
    .replace("localUri TEXT DEFAULT NULL,", "")
    .replace("playCount INTEGER DEFAULT 0,", "")
    .replace("lastPlayedAt INTEGER DEFAULT 0", "")
    .replace("syncedLyrics TEXT,", "syncedLyrics TEXT");
  sql.exec(schema);
  sql.exec(
    "INSERT INTO songs(id,uri,title,lyrics) VALUES('old','file:///song.mp3','Edited title','Saved lyrics'); INSERT INTO playlists(id,name) VALUES('mine','My playlist'); INSERT INTO playlist_songs VALUES('mine','old');",
  );
  let fail = false,
    closed = 0;
  const adapter = {
    execAsync: async (query) => {
      if (fail && query.includes("ADD COLUMN lastPlayedAt"))
        throw Error("Migration failed");
      sql.exec(query);
    },
    getAllAsync: async (query) => sql.prepare(query).all(),
    getFirstAsync: async (query, params = []) =>
      sql.prepare(query).get(...params),
    runAsync: async (query, params = []) => sql.prepare(query).run(...params),
    closeAsync: async () => {
      closed++;
    },
    withTransactionAsync: async (callback) => {
      sql.exec("BEGIN");
      try {
        await callback();
        sql.exec("COMMIT");
      } catch (error) {
        sql.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return {
    sql,
    db: loadDB(async () => adapter),
    fail: (value) => {
      fail = value;
    },
    closed: () => closed,
  };
}

test(
  "legacy migrations preserve edited songs, lyrics and playlist references",
  { skip: !DatabaseSync },
  async (t) => {
    const { sql, db } = legacyDatabase(t);
    await db.initDB();
    const columns = sql
      .prepare("PRAGMA table_info(songs)")
      .all()
      .map((row) => row.name);
    for (const name of ["localUri", "playCount", "lastPlayedAt"])
      assert.ok(columns.includes(name));
    const song = sql.prepare("SELECT * FROM songs WHERE id='old'").get();
    assert.equal(song.title, "Edited title");
    assert.equal(song.lyrics, "Saved lyrics");
    assert.equal(
      sql
        .prepare("SELECT songId FROM playlist_songs WHERE playlistId='mine'")
        .get().songId,
      "old",
    );
  },
);

test(
  "migration failures roll back changes and retain the old library for retry",
  { skip: !DatabaseSync },
  async (t) => {
    const app = legacyDatabase(t);
    app.fail(true);
    await assert.rejects(app.db.initDB(), /Migration failed/);
    assert.equal(app.closed(), 1);
    const columns = app.sql
      .prepare("PRAGMA table_info(songs)")
      .all()
      .map((row) => row.name);
    assert.ok(!columns.includes("playCount"));
    assert.equal(
      app.sql.prepare("SELECT lyrics FROM songs WHERE id='old'").get().lyrics,
      "Saved lyrics",
    );
    app.fail(false);
    await app.db.initDB();
    assert.equal(app.sql.prepare("SELECT count(*) AS n FROM songs").get().n, 1);
  },
);
