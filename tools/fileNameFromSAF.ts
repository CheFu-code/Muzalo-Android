import { getFilenameFromAnyUri } from "./audioFormats";

export function displayNameFromSafUri(uri: string): string {
  return getFilenameFromAnyUri(uri).replace(/\.[a-z0-9]+$/i, "");
}

export const fileNameFromSafUri = getFilenameFromAnyUri;
