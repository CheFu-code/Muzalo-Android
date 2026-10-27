import definitions from "../constants/appShortcuts.json";
import type { Action } from "expo-quick-actions";

export function shortcutItems(platform: string, maxCount = 3): Action[] {
  return definitions.slice(0, Math.max(0, maxCount)).map((item) => ({
    id: item.id,
    title: item.title,
    icon: platform === "ios" ? item.iosIcon : item.androidIcon,
  }));
}

// Only our known actions may navigate; never trust a supplied href.
export function shortcutDestination(id: string, requestId: string) {
  switch (id) {
    case "now-playing":
      return "/Playing" as const;
    case "favourites":
      return "/(tabs)/favorites" as const;
    case "search":
      return {
        pathname: "/(tabs)/(songs)" as const,
        params: { focusSearch: requestId },
      };
    default:
      return null;
  }
}
