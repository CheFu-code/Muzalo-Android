import { parseFromTokenizer, type IFileInfo } from "music-metadata-browser";
import { AbstractTokenizer } from "strtok3/lib/AbstractTokenizer";
import { EndOfStreamError } from "strtok3/lib/core";
import { getAudioMimeType } from "./audioFormats";

type ReadRange = (position: number, length: number) => Promise<Uint8Array>;
type ReadOptions = Parameters<AbstractTokenizer["readBuffer"]>[1];
const READ_WINDOW_SIZE = 256 * 1024;

// Read metadata anywhere in a file without loading an entire FLAC/M4A into JS memory.
class AudioFileTokenizer extends AbstractTokenizer {
  private windowStart = 0;
  private window: Uint8Array = new Uint8Array(0);

  constructor(
    private readonly readRange: ReadRange,
    fileInfo: IFileInfo
  ) {
    super(fileInfo);
  }

  async peekBuffer(target: Uint8Array, options?: ReadOptions): Promise<number> {
    const read = this.normalizeOptions(target, options);
    const available =
      this.fileInfo.size === undefined
        ? read.length
        : Math.max(0, this.fileInfo.size - read.position);
    const length = Math.min(read.length, available);
    if (!read.mayBeLess && length < read.length) throw new EndOfStreamError();
    let copied = 0;
    while (copied < length) {
      const position = read.position + copied;
      if (
        position < this.windowStart ||
        position >= this.windowStart + this.window.length
      ) {
        this.windowStart = position;
        const remaining =
          this.fileInfo.size === undefined
            ? READ_WINDOW_SIZE
            : this.fileInfo.size - position;
        this.window = await this.readRange(
          position,
          Math.min(READ_WINDOW_SIZE, remaining)
        );
        if (this.window.length === 0) break;
      }
      const start = position - this.windowStart;
      const count = Math.min(length - copied, this.window.length - start);
      target.set(
        this.window.subarray(start, start + count),
        read.offset + copied
      );
      copied += count;
    }
    if (!read.mayBeLess && copied < read.length) throw new EndOfStreamError();
    return copied;
  }

  async readBuffer(target: Uint8Array, options?: ReadOptions): Promise<number> {
    const read = this.normalizeOptions(target, options);
    const count = await this.peekBuffer(target, read);
    this.position = read.position + count;
    return count;
  }
}

export async function readAudioMetadata(
  readRange: ReadRange,
  filename: string,
  size?: number
) {
  const tokenizer = new AudioFileTokenizer(readRange, {
    path: filename,
    mimeType: getAudioMimeType(filename),
    size: size || undefined,
  });
  try {
    return await parseFromTokenizer(tokenizer, { duration: true });
  } finally {
    await tokenizer.close();
  }
}
