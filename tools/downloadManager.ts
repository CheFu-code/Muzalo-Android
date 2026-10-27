// tools/downloadManager.ts

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import uuid from "react-native-uuid";
import { resolveAudioDownload } from "./audioFormats";

const PERMISSIONS_KEY = "musicDirectoryUri";

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
  fileName: string
): Promise<string | null> {
  const dirUri = await getOrRequestDownloadFolderUri();
  if (!dirUri) {
    console.warn("User did not grant folder permission");
    return null;
  }

  let tempUri: string | undefined;
  let destinationUri: string | undefined;
  let completed = false;
  try {
    // Step 1️⃣ Download into app sandbox (temporary file)
    if (!FileSystem.cacheDirectory)
      throw new Error("Download cache is unavailable.");
    const tempFile = `${FileSystem.cacheDirectory}audio-download-${uuid.v4()}`;
    tempUri = tempFile;
    const result = await FileSystem.downloadAsync(remoteUrl, tempFile);
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

    // Step 2️⃣ Read as base64
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
