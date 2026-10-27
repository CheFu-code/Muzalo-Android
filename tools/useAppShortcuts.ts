import * as QuickActions from "expo-quick-actions";
import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { shortcutDestination, shortcutItems } from "./appShortcuts";

let requestSequence = 0;

export function useAppShortcuts(ready: boolean) {
  const router = useRouter();
  const navigation = useRootNavigationState();
  const [pending, setPending] = useState<ReturnType<typeof shortcutDestination>>(null);

  useEffect(() => {
    const receive = (action: QuickActions.Action) => {
      const destination = shortcutDestination(action.id, `${Date.now()}-${++requestSequence}`);
      if (destination) setPending(destination);
    };
    const subscription = QuickActions.addListener(receive);
    if (QuickActions.initial) receive(QuickActions.initial);

    // Unsupported launchers and Expo Go simply have no quick actions.
    void QuickActions.isSupported().then((supported) => {
      if (supported) return QuickActions.setItems(shortcutItems(Platform.OS, QuickActions.maxCount));
    }).catch((error) => console.warn("Could not register app shortcuts", error));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Keep the launch request while the database or navigator is starting.
    if (!ready || !navigation?.key || !pending) return;
    setPending(null);
    if (router.canDismiss()) router.dismissAll();
    router.navigate(pending);
  }, [navigation?.key, pending, ready, router]);
}
