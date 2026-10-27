import LoadingScreen from "@/components/LoadingScreen";
import { router, usePathname } from "expo-router";
import { useEffect } from "react";

export default function NotificationRedirect() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/Playing") {
      router.dismissTo("/Playing");
    }
  }, [pathname]);

  return <LoadingScreen />;
}
