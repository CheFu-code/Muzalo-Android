These short 440 Hz sine-wave fixtures were generated for Muzalo's format tests;
they contain no third-party music. Metadata is `Muzalo Test Tone` / `Muzalo Tests`.
The raw ADTS AAC fixture has no embedded title.

Generation example (repeat with the corresponding encoder and file extension):

```sh
ffmpeg -f lavfi -i "sine=frequency=440:duration=0.25" -metadata "title=Muzalo Test Tone" -metadata "artist=Muzalo Tests" -metadata "album=Format Tests" -metadata "date=2026" -c:a flac tone.flac
```

Encoders: MP3 `libmp3lame`, M4A/AAC `aac`, WAV `pcm_s16le`, FLAC `flac`,
OGG `libvorbis`, Opus `libopus`. OGA tests reuse the Ogg fixture. Tests also add
a large MP4 `free` atom before the M4A's trailing metadata to exercise ranged
reads without committing a large audio file. FFmpeg is not required to run tests.
