import { useRouter } from "expo-router";
import { useCallback } from "react";

export function useBackNavigation(onBack?: () => void) {
  const router = useRouter();
  return useCallback(() => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/(songs)");
    }
  }, [onBack, router]);
}
