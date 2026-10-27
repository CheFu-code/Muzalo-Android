# Android device music discovery

Muzalo now queries Android's audio media index through the installed Expo MediaLibrary 17 API instead of opening a folder picker at startup. The first scan requests audio access; subsequent scans do not automatically re-prompt after denial. The music screen provides an explicit permission retry or app-settings action, a scan button, progress indication and error recovery. Returning to the foreground refreshes discovery. Concurrent scans share one operation.

Queries use audio only and page through the whole result set. No image or video permission is requested; the Android manifest and Expo configuration block those permissions. Older Android releases use the platform's legacy storage permission.

Existing SAF tracks are matched by full storage path, including the storage volume. Migrating a URI uses UPDATE so the song ID, playlists, favourites, play history, edits and lyrics survive. New tracks are inserted without replacing existing records. Scans do not erase rows solely because an asset disappeared from the index, an SD card was removed or access failed. This means old unavailable entries can remain in the library. The app does not delete original music files during a scan.

Only Android's indexed, accessible supported audio is discovered. Private app storage, `.nomedia` directories and files not yet indexed may be absent. There is no all-files permission, hidden-folder traversal or promise that every file on the device will be visible. iOS device-wide audio discovery is not implemented by this change.

The folder picker remains available separately for choosing a download destination or locating an unavailable audio file. The unused legacy `LayoutScreen` is not part of the routed startup flow. `syncFolder` now forwards to the new scanner for older callers.

The app's native manifest changed. Rebuild and install Android to validate permission prompts, multi-folder discovery, playback, returning from Settings and an upgrade containing existing playlists. A JavaScript reload does not update an already installed Android manifest. Publish the matching company-site Muzalo privacy and terms changes with the release.

Automated coverage: `npm run test:library` exercises pagination, multi-folder discovery, audio-only permissions, denied access, concurrent scans, legacy URI migration, preservation after scan failures and metadata fallback.

## Playback and library controls

The player now installs real tracks in the native queue. Only `service.ts` registers playback and notification events. Native transitions update the active song; the placeholder-track workaround and duplicate event listeners were removed. Queue mutations run in order. Play-next and queue additions avoid duplicate entries; reordering uses native move operations so the playing track and its position are retained. Repeat-one still allows queue editing. Shuffle changes upcoming tracks, and disabling it restores the original upcoming order. Clearing the queue explicitly stops playback.

The music screen's options action opens persistent sorting, reverse ordering, exact-folder browsing, folder exclusions, a filter for known durations below 30 seconds and an opt-in filter for recording/ringtone/alert folders. Exclusions affect the library view; they do not erase songs or change saved playlists. A reset action recovers from an empty filtered view.

An unreadable file produces a recovery dialog. Users can retry, skip where a next track exists, scan, locate a file or explicitly remove its library record. Locating uses a separately authorised folder, not unrestricted device access. Relinking preserves the original track ID and metadata, merges playlist references and listening history from a duplicate entry in a database transaction, and keeps the newly authorised URI. The confirmation explains that the original track's details and lyrics take priority. Removing a library entry requires confirmation and never deletes the audio file.

Metadata, lyrics and playlist-creation failures reject so their screens keep unsaved input and show an error. Lyrics lookup awaits the store's single database write. Progress persistence batches position-only changes instead of serialising a full queue every second; queue/settings changes save promptly and progress is flushed when the app backgrounds.

Run `npm run test:playback` and `npm run test:lyrics`. The database tests use real in-memory SQLite on Node versions that expose `node:sqlite`. Phone checks still needed: automatic transitions and repeat modes with the screen locked, Bluetooth/notification controls, moving queue entries during playback, revoked permissions, moved files, relinking an already-indexed file and large-library responsiveness. An Android JavaScript export validates bundling, not native playback on a device.
