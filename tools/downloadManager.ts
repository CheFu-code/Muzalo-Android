// tools/downloadManager.ts

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import uuid from "react-native-uuid";
import { resolveAudioDownload } from "./audioFormats";

const PERMISSIONS_KEY = "musicDirectoryUri";
const activeDownloads = new Map<string, { cancel: () => void }>();
const activeRequests = new Set<string>();

export type DownloadProgress = { receivedBytes: number; totalBytes?: number; fraction?: number };
export type DownloadOptions = {
  onProgress?: (progress: DownloadProgress) => void;
  signal?: { aborted: boolean; addEventListener?: (event: string, listener: () => void) => void };
};

export function cancelDownload(key: string) {
  activeDownloads.get(key)?.cancel();
}

export async function deleteDownloadedFile(uri: string) {
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

export async function getStorageUsage() {
  const [free, total] = await Promise.all([
    FileSystem.getFreeDiskStorageAsync?.() ?? Promise.resolve(undefined),
    FileSystem.getTotalDiskCapacityAsync?.() ?? Promise.resolve(undefined),
  ]);
  return { freeBytes: free, totalBytes: total, usedBytes: free != null && total != null ? Math.max(0, total - free) : undefined };
}

export async function getOrRequestDownloadFolderUri(): Promise<string | null> {
  // 1️⃣ Try to restore stored folder
  const savedUri = await AsyncStorage.getItem(PERMISSIONS_KEY);
  if (savedUri) return savedUri;

  // 2️⃣ Ask the user to pick a folder
  const permissions =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

  if (!permissions.granted) return null;

  // 3️⃣ Save for later use
  await AsyncStorage.setItem(PERMISSIONS_KEY, permissions.directoryUri);
  return permissions.directoryUri;
}

export async function downloadSongWithSAF(
  remoteUrl: string,
  fileName: string,
  options: DownloadOptions = {},
): Promise<string | null> {
  const requestKey = `${remoteUrl}\u0000${fileName}`;
  if (activeRequests.has(requestKey)) {
    console.warn("A download for this track is already in progress.");
    return null;
  }
  activeRequests.add(requestKey);
  let dirUri: string | null;
  try {
    dirUri = await getOrRequestDownloadFolderUri();
  } catch (error) {
    activeRequests.delete(requestKey);
    throw error;
  }
  if (!dirUri) {
    console.warn("User did not grant folder permission");
    activeRequests.delete(requestKey);
    return null;
  }

  let tempUri: string | undefined;
  let destinationUri: string | undefined;
  let completed = false;
  const key = `${dirUri}\u0000${fileName}`;
  if (activeDownloads.has(key)) {
    activeRequests.delete(requestKey);
    return null;
  }
  try {
    const preflightAudio = resolveAudioDownload(fileName, remoteUrl);
    const existing = FileSystem.StorageAccessFramework.readDirectoryAsync
      ? await FileSystem.StorageAccessFramework.readDirectoryAsync(dirUri).catch(() => [])
      : [];
    if (existing.some((uri: string) => {
      try { return decodeURIComponent(uri).toLocaleLowerCase().endsWith(`/${preflightAudio.filename.toLocaleLowerCase()}`); }
      catch { return uri.toLocaleLowerCase().endsWith(`/${preflightAudio.filename.toLocaleLowerCase()}`); }
    })) {
      throw new Error("This track is already downloaded.");
    }
    const freeBeforeDownload = await FileSystem.getFreeDiskStorageAsync?.();
    if (freeBeforeDownload != null && freeBeforeDownload <= 0)
      throw new Error("Not enough storage available for this download.");

    // Step 1️⃣ Download into app sandbox (temporary file)
    if (!FileSystem.cacheDirectory)
      throw new Error("Download cache is unavailable.");
    const tempFile = `${FileSystem.cacheDirectory}audio-download-${uuid.v4()}`;
    tempUri = tempFile;
    let result: any;
    let task: any;
    if (FileSystem.createDownloadResumable) {
      task = FileSystem.createDownloadResumable(remoteUrl, tempFile, {}, (p: any) => {
        options.onProgress?.({ receivedBytes: p.totalBytesWritten, totalBytes: p.totalBytesExpectedToWrite > 0 ? p.totalBytesExpectedToWrite : undefined, fraction: p.totalBytesExpectedToWrite > 0 ? p.totalBytesWritten / p.totalBytesExpectedToWrite : undefined });
      });
      const cancel = () => { void task.cancelAsync?.(); };
      activeDownloads.set(key, { cancel });
      options.signal?.addEventListener?.("abort", cancel);
      if (options.signal?.aborted) cancel();
      result = await task.downloadAsync();
    } else {
      activeDownloads.set(key, { cancel: () => undefined });
      result = await FileSystem.downloadAsync(remoteUrl, tempFile);
    }
    if (!result) throw new Error("Audio download cancelled.");
    tempUri = result.uri;
    if (result.status < 200 || result.status >= 300)
      throw new Error("Audio download failed.");
    const contentType =
      Object.entries(result.headers ?? {}).find(
        ([name]) => name.toLowerCase() === "content-type"
      )?.[1] ??
      result.mimeType ??
      undefined;
    const audio = resolveAudioDownload(fileName, remoteUrl, contentType);
    if (audio.filename !== preflightAudio.filename) {
      const duplicate = existing.some((uri: string) => {
        try { return decodeURIComponent(uri).toLocaleLowerCase().endsWith(`/${audio.filename.toLocaleLowerCase()}`); }
        catch { return uri.toLocaleLowerCase().endsWith(`/${audio.filename.toLocaleLowerCase()}`); }
      });
      if (duplicate) throw new Error("This track is already downloaded.");
    }
    const expected = Number(Object.entries(result.headers ?? {}).find(([name]) => name.toLowerCase() === "content-length")?.[1]);
    const free = await FileSystem.getFreeDiskStorageAsync?.();
    if (Number.isFinite(expected) && free != null && free < expected)
      throw new Error("Not enough storage available for this download.");

    // Step 2️⃣ Read as base64
    if (!tempUri) throw new Error("The temporary download file is unavailable.");
    const base64 = await FileSystem.readAsStringAsync(tempUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Step 3️⃣ Create new file in user folder via SAF
    const safFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      dirUri,
      audio.filename,
      audio.mimeType
    );
    destinationUri = safFileUri;

    // Step 4️⃣ Write base64 data into that SAF file
    await FileSystem.StorageAccessFramework.writeAsStringAsync(
      safFileUri,
      base64,
      {
        encoding: FileSystem.EncodingType.Base64,
      }
    );

    completed = true;

    console.log("✅ Downloaded successfully to:", safFileUri);
    return safFileUri;
  } catch (error) {
    console.error("❌ Download failed:", error);
    return null;
  } finally {
    activeDownloads.delete(key);
    activeRequests.delete(requestKey);
    if (tempUri) {
      await FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(
        () => undefined
      );
    }
    if (destinationUri && !completed) {
      await FileSystem.deleteAsync(destinationUri, { idempotent: true }).catch(
        () => undefined
      );
    }
  }
}
