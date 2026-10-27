import * as FileSystem from "expo-file-system";

import { getFilenameFromAnyUri } from "./audioFormats";
export {
  AUDIO_EXT,
  looksLikeAudio,
  getFilenameFromAnyUri,
} from "./audioFormats";

export async function ensureCacheDir(sub = "music-scan"): Promise<string> {
  const dir = `${FileSystem.cacheDirectory}${sub}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists)
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  return dir;
}

export async function copyContentToCache(
  contentUri: string,
  cacheDir: string,
  preferredName?: string
): Promise<string> {
  const filename = (preferredName ?? getFilenameFromAnyUri(contentUri)).replace(
    /[\\/:*?"<>|\u0000-\u001f]/g,
    "_"
  );
  const dest = `${cacheDir}${filename}`;
  const exists = await FileSystem.getInfoAsync(dest);
  if (exists.exists) await FileSystem.deleteAsync(dest, { idempotent: true });
  await FileSystem.copyAsync({ from: contentUri, to: dest });
  return dest;
}
