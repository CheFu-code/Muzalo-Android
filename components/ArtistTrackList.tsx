import { Artist } from "@/types/types";
import CollectionTracks from "./CollectionTracks";
export default function ArtistTrackList({ artist }: { artist: Artist }) {
  return (
    <CollectionTracks
      title={artist.name}
      kind="Artist"
      tracks={artist.songs}
      artwork={artist.image}
    />
  );
}
