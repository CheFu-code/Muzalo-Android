const AUDIO_MIME_TYPES = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".opus": "audio/ogg",
} as const;

export type AudioExtension = keyof typeof AUDIO_MIME_TYPES;
export const AUDIO_EXT = Object.keys(AUDIO_MIME_TYPES) as AudioExtension[];

export function getFilenameFromAnyUri(uri: string): string {
  // Remove URL parameters before decoding: an encoded '?' can be part of a filename.
  const path = uri.split(/[?#]/, 1)[0];
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    // A literal '%' in a local filename must not prevent scanning or playback.
  }
  return decoded.slice(decoded.lastIndexOf("/") + 1) || "track";
}

export function getAudioExtension(uri: string): AudioExtension | undefined {
  const filename = getFilenameFromAnyUri(uri).toLowerCase();
  return AUDIO_EXT.find((extension) => filename.endsWith(extension));
}

export function looksLikeAudio(uri: string): boolean {
  return getAudioExtension(uri) !== undefined;
}

export function getAudioMimeType(uri: string): string | undefined {
  const extension = getAudioExtension(uri);
  return extension ? AUDIO_MIME_TYPES[extension] : undefined;
}

const MIME_EXTENSIONS: Record<string, AudioExtension> = {
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac",
  "audio/aacp": ".aac",
  "audio/x-aac": ".aac",
  "audio/wav": ".wav",
  "audio/wave": ".wav",
  "audio/x-wav": ".wav",
  "audio/vnd.wave": ".wav",
  "audio/flac": ".flac",
  "audio/x-flac": ".flac",
  "audio/ogg": ".ogg",
  "application/ogg": ".ogg",
  "audio/opus": ".opus",
};

export function resolveAudioDownload(
  preferredName: string,
  remoteUri: string,
  contentType?: string
): { filename: string; mimeType: string } {
  const declaredMime = contentType?.split(";", 1)[0].trim().toLowerCase();
  const declaredExtension = declaredMime
    ? MIME_EXTENSIONS[declaredMime]
    : undefined;
  if (
    declaredMime &&
    !declaredExtension &&
    !["application/octet-stream", "binary/octet-stream"].includes(declaredMime)
  ) {
    throw new Error("The download response is not a supported audio format.");
  }

  const sourceExtension =
    getAudioExtension(remoteUri) ?? getAudioExtension(preferredName);
  // Preserve .opus/.oga when the server identifies their shared Ogg container.
  const extension =
    declaredExtension &&
    (!sourceExtension ||
      AUDIO_MIME_TYPES[sourceExtension] !== AUDIO_MIME_TYPES[declaredExtension])
      ? declaredExtension
      : (sourceExtension ?? declaredExtension);
  if (!extension)
    throw new Error("Unable to determine the downloaded audio format.");

  const originalName = getFilenameFromAnyUri(preferredName);
  const previousExtension = getAudioExtension(originalName);
  const stem =
    (previousExtension
      ? originalName.slice(0, -previousExtension.length)
      : originalName
    )
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
      .trim() || "track";
  return {
    filename: `${stem}${extension}`,
    mimeType: AUDIO_MIME_TYPES[extension],
  };
}
