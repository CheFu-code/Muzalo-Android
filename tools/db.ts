// tools/db.ts
import { Playlist, Song } from "@/types/types";
import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";
import uuid from "react-native-uuid";

let database: SQLiteDatabase | null = null;
let initialization: Promise<SQLiteDatabase> | null = null;

export function initDB(): Promise<SQLiteDatabase> {
  if (database) return Promise.resolve(database);
  if (initialization) return initialization;
  initialization = initializeDatabase().finally(() => {
    initialization = null;
  });
  return initialization;
}

async function initializeDatabase(): Promise<SQLiteDatabase> {
  const connection = await openDatabaseAsync("lor.db", {
    useNewConnection: true,
  });
  try {
    await connection.execAsync("PRAGMA foreign_keys = ON;");
    await connection.withTransactionAsync(async () => {
      await configureDatabase(connection);
    });
    database = connection;
    return connection;
  } catch (error) {
    try {
      await connection.closeAsync();
    } catch (closeError) {
      console.warn("Could not close the failed library connection", closeError);
    }
    throw error;
  }
}

async function configureDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY NOT NULL,
      uri TEXT UNIQUE,
      localUri TEXT DEFAULT NULL,
      filename TEXT,
      title TEXT,
      artist TEXT,
      album TEXT,
      duration REAL,
      coverArt TEXT,
      size INTEGER,
      date INTEGER,
      year INTEGER,
      lyrics TEXT,
      syncedLyrics TEXT,
      playCount INTEGER DEFAULT 0,
      lastPlayedAt INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      coverArt TEXT,
      type TEXT DEFAULT 'user',
      createdAt INTEGER,
      updatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS playlist_songs (
      playlistId TEXT REFERENCES playlists(id) ON DELETE CASCADE,
      songId TEXT REFERENCES songs(id) ON DELETE CASCADE,
      PRIMARY KEY (playlistId, songId)
    );
  `);

  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(songs)",
  );
  for (const [name, definition] of [
    ["localUri", "TEXT DEFAULT NULL"],
    ["playCount", "INTEGER DEFAULT 0"],
    ["lastPlayedAt", "INTEGER DEFAULT 0"],
  ]) {
    if (!columns.some((column) => column.name === name)) {
      await db.execAsync(`ALTER TABLE songs ADD COLUMN ${name} ${definition};`);
    }
  }

  const now = Date.now();

  const systemPlaylists = [
    {
      id: "downloads",
      name: "Downloads",
      description: "Downloaded songs",
      type: "user",
    },
    {
      id: "recent",
      name: "Recently Added",
      description: "Songs you’ve recently added",
      type: "system",
    },
    {
      id: "favorites",
      name: "Favorites",
      description: "Your favorite songs collection",
      type: "user",
    },
    {
      id: "most-played",
      name: "Most Played",
      description: "Your top 50 most listened songs",
      type: "system",
    },
    {
      id: "history",
      name: "History",
      description: "Recently played songs",
      type: "system",
    },
  ];

  for (const { id, name, description, type } of systemPlaylists) {
    const exists = await db.getFirstAsync(
      `SELECT id FROM playlists WHERE id = ?`,
      [id],
    );
    if (!exists) {
      await db.runAsync(
        `INSERT INTO playlists (id, name, description, type, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, name, description, type, now, now],
      );
    }
  }
}

export async function getDB(): Promise<SQLiteDatabase> {
  return initDB();
}

export async function addSong(song: Song) {
  const db = await getDB();
  const songDate = song.date ?? Date.now();
  await db.runAsync(
    `INSERT OR REPLACE INTO songs
      (id, uri, filename, title, artist, album, duration, coverArt, size, date, year, lyrics, syncedLyrics)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

    [
      song.id || song.uri,
      song.uri ?? null,
      song.filename ?? null,
      song.title ?? null,
      song.artist ?? null,
      song.album ?? null,
      song.duration ?? 0,
      song.coverArt ?? null,
      song.size ?? 0,
      songDate,
      song.year ?? null,
      song.lyrics ?? null,
      song.syncedLyrics ?? null,
    ],
  );
}

export async function addSongsBatch(songs: Song[]) {
  if (!songs || songs.length === 0) return;
  const db = await getDB();
  await db.withExclusiveTransactionAsync(async (txn) => {
    const statement = await txn.prepareAsync(
      `INSERT OR IGNORE INTO songs
        (id, uri, filename, title, artist, album, duration, coverArt, size, date, year, lyrics, syncedLyrics)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    try {
      for (const song of songs) {
        const songDate = song.date ?? Date.now();
        await statement.executeAsync([
          song.id || song.uri,
          song.uri ?? null,
          song.filename ?? null,
          song.title ?? null,
          song.artist ?? null,
          song.album ?? null,
          song.duration ?? 0,
          song.coverArt ?? null,
          song.size ?? 0,
          songDate,
          song.year ?? null,
          song.lyrics ?? null,
          song.syncedLyrics ?? null,
        ]);
      }
    } finally {
      await statement.finalizeAsync();
    }
  });
}

export async function updateSongUri(id: string, uri: string) {
  const db = await getDB();
  await db.runAsync("UPDATE songs SET uri = ? WHERE id = ?", [uri, id]);
}

export async function updateSongDuration(idOrUri: string, duration: number) {
  if (!idOrUri || !Number.isFinite(duration) || duration <= 0) return;
  const db = await getDB();
  await db.runAsync("UPDATE songs SET duration = ? WHERE id = ? OR uri = ?", [duration, idOrUri, idOrUri]);
}

export async function relinkSong(
  id: string,
  uri: string,
  filename: string,
  existingId?: string,
): Promise<string | null> {
  const db = await getDB();
  let mergedId: string | null = null;
  await db.withExclusiveTransactionAsync(async (txn) => {
    const target = await txn.getFirstAsync<{ id: string }>(
      "SELECT id FROM songs WHERE id = ?",
      [id],
    );
    if (!target) throw new Error("This track is no longer in your library.");
    const duplicate = await txn.getFirstAsync<{ id: string }>(
      "SELECT id FROM songs WHERE (uri = ? OR id = ?) AND id != ?",
      [uri, existingId ?? null, id],
    );
    if (duplicate) {
      mergedId = duplicate.id;
      await txn.runAsync(
        "INSERT OR IGNORE INTO playlist_songs (playlistId, songId) SELECT playlistId, ? FROM playlist_songs WHERE songId = ?",
        [id, duplicate.id],
      );
      await txn.runAsync(
        "UPDATE songs SET playCount = COALESCE(playCount, 0) + COALESCE((SELECT playCount FROM songs WHERE id = ?), 0), lastPlayedAt = MAX(COALESCE(lastPlayedAt, 0), COALESCE((SELECT lastPlayedAt FROM songs WHERE id = ?), 0)) WHERE id = ?",
        [duplicate.id, duplicate.id, id],
      );
      await txn.runAsync("DELETE FROM songs WHERE id = ?", [duplicate.id]);
    }
    await txn.runAsync(
      "UPDATE songs SET uri = ?, localUri = NULL, filename = ? WHERE id = ?",
      [uri, filename, id],
    );
  });
  return mergedId;
}

export async function getSong(songId: string): Promise<Song | undefined> {
  if (!songId) {
    return undefined;
  }
  const db = await getDB();
  const row = await db.getFirstAsync(
    `SELECT * FROM songs WHERE id = ? ORDER BY date DESC`,
    [songId],
  );

  return row as Song | undefined;
}

export async function getAllSongs(): Promise<Song[]> {
  const db = await getDB();
  const rows = await db.getAllAsync(`SELECT * FROM songs ORDER BY date DESC`);
  return rows as Song[];
}

export async function getAlbum(album: string): Promise<Song[]> {
  const db = await getDB();
  const rows = await db.getAllAsync(
    `SELECT * FROM songs WHERE album = ? ORDER BY date DESC`,
    [album],
  );
  return rows as Song[];
}

export async function getSongInfoFromDB(id: string): Promise<Song | null> {
  if (!id) return null;
  const db = await getDB();
  const row = await db.getFirstAsync(`SELECT * FROM songs WHERE id = ?`, [id]);
  return row ? (row as Song) : null;
}

export async function removeSong(id: string) {
  const db = await getDB();
  await db.runAsync(`DELETE FROM songs WHERE id = ?`, [id]);
}

export async function clearSongs() {
  const db = await getDB();
  await db.execAsync(`DELETE FROM songs`);
}

export async function editSong(
  songId: string,
  title: string,
  artist: string,
  album?: string,
  year?: string,
) {
  const db = await getDB();
  const result = await db.runAsync(
    "UPDATE songs SET title = ?, artist = ?, album = ?, year = ? WHERE id = ?",
    [title, artist, album || null, year || null, songId],
  );
  if (!result.changes)
    throw new Error("The track no longer exists in your library.");
}

export async function addLyrics(
  songId: string,
  lyrics: string,
  syncedLyrics: string | null,
) {
  const db = await getDB();
  const result = await db.runAsync(
    "UPDATE songs SET lyrics = ?, syncedLyrics = ? WHERE id = ?",
    [lyrics, syncedLyrics, songId],
  );
  if (!result.changes)
    throw new Error("The track no longer exists in your library.");
}

export async function incrementPlayCountInDB(
  songId: string | null | undefined,
) {
  if (!songId) {
    return;
  }
  const db = await getDB();
  const now = Date.now();
  await db.runAsync(
    "UPDATE songs SET playCount = COALESCE(playCount, 0) + 1, lastPlayedAt = ? WHERE id = ? OR uri = ?",
    [now, songId, songId],
  );
}

export async function clearHistoryInDB(): Promise<void> {
  const db = await getDB();
  await db.runAsync("UPDATE songs SET lastPlayedAt = 0");
}

export async function updateSongSyncedLyrics(
  id: string,
  syncedLyrics: string,
): Promise<void> {
  if (!id) {
    throw new Error("A track is required to save lyrics.");
  }

  const db = await getDB();
  const result = await db.runAsync(
    `UPDATE songs SET syncedLyrics = ? WHERE id = ?`,
    [syncedLyrics, id],
  );
  if (!result.changes)
    throw new Error("The track no longer exists in your library.");
}

export async function createPlaylist(name: string, description?: string) {
  const id = uuid.v4().toString().slice(-8);
  const now = Date.now();
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO playlists (id, name, description, coverArt, type, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, name, description || "", null, "user", now, now],
  );

  return id;
}

export async function getAllPlaylists(
  type: "user" | "system" | "all" = "all",
): Promise<Playlist[]> {
  let query = `SELECT * FROM playlists`;
  const params: any[] = [];

  if (type === "user" || type === "system") {
    query += ` WHERE type = ?`;
    params.push(type);
  }
  const db = await getDB();

  const playlists: Playlist[] = await db.getAllAsync(query, params);
  for (const playlist of playlists) {
    let songs: Song[] = [];
    if (playlist.id === "recent") {
      songs = await db.getAllAsync(`
        SELECT * FROM songs
        ORDER BY date DESC
        LIMIT 50
      `);
    } else if (playlist.id === "most-played") {
      songs = await db.getAllAsync(`
        SELECT * FROM songs
        WHERE playCount > 0
        ORDER BY playCount DESC, lastPlayedAt DESC
        LIMIT 50
      `);
    } else if (playlist.id === "history") {
      songs = await db.getAllAsync(`
        SELECT * FROM songs
        WHERE lastPlayedAt > 0
        ORDER BY lastPlayedAt DESC
        LIMIT 50
      `);
    } else {
      songs = await db.getAllAsync(
        `SELECT s.* FROM songs s
         JOIN playlist_songs ps ON ps.songId = s.id
         WHERE ps.playlistId = ?`,
        [playlist.id],
      );
    }
    playlist.songs = songs;
    playlist.songsLength = songs.length;
    playlist.duration = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  }

  // Define preferred display order for known system/special playlists
  const orderMap: Record<string, number> = {
    favorites: 1,
    recent: 2,
    "most-played": 3,
    history: 4,
    downloads: 5,
  };

  playlists.sort((a, b) => {
    const orderA = orderMap[a.id] ?? 100;
    const orderB = orderMap[b.id] ?? 100;
    if (orderA !== orderB) return orderA - orderB;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  return playlists;
}

export async function getSpeceficSystemPlaylist(
  type: "recent" | "most-played" | "history",
) {
  let songs: Song[] = [];

  const db = await getDB();

  const playlist: Playlist | null = await db.getFirstAsync(
    `SELECT * FROM playlists WHERE type = ? AND id = ?`,
    ["system", type],
  );

  if (!playlist) {
    return;
  }

  if (type === "recent") {
    // Recently added: last 50 songs by date
    songs = await db.getAllAsync(`
        SELECT * FROM songs
        ORDER BY date DESC
        LIMIT 50
      `);
  } else if (type === "most-played") {
    // Most played: top 50 by playCount
    songs = await db.getAllAsync(`
        SELECT * FROM songs
        WHERE playCount > 0
        ORDER BY playCount DESC, lastPlayedAt DESC
        LIMIT 50
      `);
  } else if (type === "history") {
    // History: recently played songs
    songs = await db.getAllAsync(`
        SELECT * FROM songs
        WHERE lastPlayedAt > 0
        ORDER BY lastPlayedAt DESC
        LIMIT 50
      `);
  }

  playlist.songs = songs;
  playlist.songsLength = songs.length;
  playlist.duration = songs.reduce((acc, s) => acc + (s.duration || 0), 0);

  return playlist;
}

export async function addSongToPlaylist(playlistId: string, songId: string) {
  if (
    playlistId === "recent" ||
    playlistId === "most-played" ||
    playlistId === "history"
  ) {
    return;
  }
  const db = await getDB();

  const playlistSize: { count: number } | null = await db.getFirstAsync(
    `SELECT COUNT(*) as count FROM playlist_songs WHERE playlistId = ?`,
    [playlistId],
  );

  if (playlistSize?.count === 0) {
    const song: Song | undefined = await getSong(songId);
    if (song && song.coverArt) {
      await db.runAsync(`UPDATE playlists SET coverArt = ? WHERE id = ?`, [
        song.coverArt,
        playlistId,
      ]);
    }
  }
  await db.runAsync(
    `INSERT OR IGNORE INTO playlist_songs (playlistId, songId) VALUES (?, ?)`,
    [playlistId, songId],
  );
  await db.runAsync(`UPDATE playlists SET updatedAt = ? WHERE id = ?`, [
    Date.now(),
    playlistId,
  ]);
}

export async function removePlaylist(playlistId: string) {
  if (
    playlistId === "downloads" ||
    playlistId === "recent" ||
    playlistId === "most-played" ||
    playlistId === "favorites" ||
    playlistId === "history"
  ) {
    return;
  }
  const db = await getDB();

  await db.runAsync(`DELETE FROM playlists WHERE id = ?`, [playlistId]);
}

export async function removeSongFromPlaylist(
  playlistId: string,
  songId: string,
) {
  if (
    playlistId === "recent" ||
    playlistId === "most-played" ||
    playlistId === "history"
  ) {
    return;
  }
  const db = await getDB();

  await db.runAsync(
    `DELETE FROM playlist_songs WHERE playlistId = ? AND songId = ?`,
    [playlistId, songId],
  );
  await db.runAsync(`UPDATE playlists SET updatedAt = ? WHERE id = ?`, [
    Date.now(),
    playlistId,
  ]);
}
export async function addFavorite(songId: string) {
  await addSongToPlaylist("favorites", songId);
}

export async function removeFavorite(songId: string) {
  await removeSongFromPlaylist("favorites", songId);
}

export async function getFavoriteSongs(): Promise<Song[]> {
  const db = await getDB();
  const playlist = await db.getFirstAsync(
    `SELECT * FROM playlists WHERE id = 'favorites'`,
  );

  if (!playlist) return [];

  const songs: Song[] = await db.getAllAsync(
    `SELECT s.* FROM songs s
     JOIN playlist_songs ps ON ps.songId = s.id
     WHERE ps.playlistId = ?`,
    ["favorites"],
  );

  return songs;
}

export async function setLocalURI(localUri: string, songId: string) {
  const db = await getDB();
  await db.runAsync(`UPDATE songs SET localUri = ? WHERE id = ?`, [
    localUri,
    songId,
  ]);
}
