import * as MediaLibrary from "expo-media-library";

// Compare the old SAF document URI with MediaStore's file URI without
// collapsing distinct songs that happen to have the same filename.
export function audioFileKey(uri: string): string {
    let decoded = uri;
    try { decoded = decodeURIComponent(uri); } catch {}
    const document = decoded.match(/\/document\/([^/]+):(.+)$/);
    if (document) {
        const volume = document[1] === "primary" ? "emulated/0" : document[1];
        return `/storage/${volume}/${document[2]}`;
    }
    return decoded.replace(/^file:\/\//, "");
}

export async function getDeviceAudio(): Promise<MediaLibrary.Asset[]> {
    const assets: MediaLibrary.Asset[] = [];
    let after: string | undefined;
    do {
        const page = await MediaLibrary.getAssetsAsync({
            mediaType: MediaLibrary.MediaType.audio,
            first: 200,
            after,
            sortBy: [MediaLibrary.SortBy.creationTime],
        });
        assets.push(...page.assets);
        if (!page.hasNextPage) return assets;
        if (!page.endCursor || page.endCursor === after) {
            throw new Error("The audio library could not finish loading.");
        }
        after = page.endCursor;
    } while (true);
}
