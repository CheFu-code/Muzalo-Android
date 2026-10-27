const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const load = require("./helpers/load-typescript.cjs");
let DatabaseSync;
try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch {}

function database(t) {
  const sql = new DatabaseSync(":memory:");
  t.after(() => sql.close());
  sql.exec(
    fs
      .readFileSync(path.join(__dirname, "../tools/db.ts"), "utf8")
      .match(/await db\.execAsync\(`([\s\S]*?)`\)/)[1],
  );
  let failQuery = null;
  const adapter = {
    runAsync: async (query, params = []) => {
      if (failQuery && query.includes(failQuery)) throw Error("Disk full");
      return sql.prepare(query).run(...params);
    },
    getFirstAsync: async (query, params = []) =>
      sql.prepare(query).get(...params) ?? null,
    getAllAsync: async (query, params = []) =>
      sql.prepare(query).all(...params),
    withExclusiveTransactionAsync: async (callback) => {
      sql.exec("BEGIN");
      try {
        await callback(adapter);
        sql.exec("COMMIT");
      } catch (error) {
        sql.exec("ROLLBACK");
        throw error;
      }
    },
  };
  const db = load(path.join(__dirname, "../tools/db.ts"), {
    "expo-sqlite": { openDatabaseAsync: async () => adapter },
    "react-native-uuid": { v4: () => "new-playlist" },
    "sonner-native": { toast: { error: assert.fail } },
  });
  sql.exec(
    "INSERT INTO songs(id,uri,title,lyrics,playCount,lastPlayedAt) VALUES('original','file:///old.mp3','Edited','My lyrics',5,100); INSERT INTO songs(id,uri,title,playCount,lastPlayedAt) VALUES('found','file:///found.mp3','Other title',2,200); INSERT INTO playlists(id,name) VALUES('favorites','Favorites'),('mix','Mix'); INSERT INTO playlist_songs VALUES('favorites','original'),('mix','found');",
  );
  return {
    sql,
    db,
    fail: (query) => {
      failQuery = query;
    },
  };
}
const options = { skip: !DatabaseSync && "Node SQLite is unavailable" };

test(
  "metadata and lyrics writes reject database errors and missing tracks",
  options,
  async (t) => {
    const { db, fail, sql } = database(t);
    fail("UPDATE songs");
    await assert.rejects(db.editSong("original", "New", "Artist"), /Disk full/);
    await assert.rejects(
      db.addLyrics("original", "New lyrics", null),
      /Disk full/,
    );
    assert.equal(
      sql.prepare("SELECT title FROM songs WHERE id='original'").get().title,
      "Edited",
    );
    fail(null);
    await assert.rejects(
      db.editSong("missing", "New", "Artist"),
      /no longer exists/,
    );
    await assert.rejects(
      db.addLyrics("missing", "Words", null),
      /no longer exists/,
    );
    await assert.rejects(
      db.updateSongSyncedLyrics("missing", "[00:01] Words"),
      /no longer exists/,
    );
  },
);

test(
  "playlist creation rejects instead of returning an invented success",
  options,
  async (t) => {
    const { db, fail, sql } = database(t);
    fail("INSERT INTO playlists");
    await assert.rejects(db.createPlaylist("New"), /Disk full/);
    assert.equal(sql.prepare("SELECT count(*) AS n FROM playlists").get().n, 2);
  },
);

test(
  "relinking merges playlist references and history while preserving original edits",
  options,
  async (t) => {
    const { db, sql } = database(t);
    assert.equal(
      await db.relinkSong("original", "file:///found.mp3", "found.mp3"),
      "found",
    );
    const track = sql.prepare("SELECT * FROM songs WHERE id='original'").get();
    assert.equal(track.uri, "file:///found.mp3");
    assert.equal(track.title, "Edited");
    assert.equal(track.lyrics, "My lyrics");
    assert.equal(track.playCount, 7);
    assert.equal(track.lastPlayedAt, 200);
    assert.equal(sql.prepare("SELECT count(*) AS n FROM songs").get().n, 1);
    assert.deepEqual(
      sql
        .prepare(
          "SELECT playlistId FROM playlist_songs WHERE songId='original' ORDER BY playlistId",
        )
        .all()
        .map((row) => row.playlistId),
      ["favorites", "mix"],
    );
  },
);

test(
  "a failed relink rolls back the duplicate merge and all playlist changes",
  options,
  async (t) => {
    const { db, fail, sql } = database(t);
    fail("UPDATE songs SET uri");
    await assert.rejects(
      db.relinkSong("original", "file:///found.mp3", "found.mp3"),
      /Disk full/,
    );
    assert.equal(sql.prepare("SELECT count(*) AS n FROM songs").get().n, 2);
    assert.equal(
      sql.prepare("SELECT uri FROM songs WHERE id='original'").get().uri,
      "file:///old.mp3",
    );
    assert.equal(
      sql
        .prepare("SELECT songId FROM playlist_songs WHERE playlistId='mix'")
        .get().songId,
      "found",
    );
  },
);

test(
  "relinking retains the newly authorised URI when merging a system-library entry",
  options,
  async (t) => {
    const { db, sql } = database(t);
    const grantedUri = "content://folder/document/primary%3AMusic%2Ffound.mp3";
    await db.relinkSong("original", grantedUri, "found.mp3", "found");
    assert.equal(
      sql.prepare("SELECT uri FROM songs WHERE id='original'").get().uri,
      grantedUri,
    );
    assert.equal(sql.prepare("SELECT count(*) AS n FROM songs").get().n, 1);
  },
);
