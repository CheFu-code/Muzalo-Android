import { AppIcon, Screen, ScreenHeader, ui } from "@/components/ui";
import { muzaloTheme as c } from "@/constants/tokens";
import { useLibraryStore } from "@/tools/store/useLibraryStore";
import { syncLibrary } from "@/tools/syncLibrary";
import { getStorageUsage } from "@/tools/downloadManager";
import { Feather, Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useEffect, useState } from "react";
import { Pressable } from "react-native-gesture-handler";

function SettingsRow({
  label,
  icon,
  onPress,
  busy = false,
  indicator = "external-link",
}: {
  label: string;
  icon: AppIcon;
  onPress: () => void;
  busy?: boolean;
  indicator?: "external-link" | "chevron" | "none";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 54,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        opacity: pressed || busy ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={21} color={c.muted} />
      <Text style={{ flex: 1, color: c.text, fontSize: 15 }}>{label}</Text>
      {busy ? (
        <ActivityIndicator color={c.accent} size="small" />
      ) : indicator === "external-link" ? (
        <Feather name="external-link" size={17} color={c.muted} />
      ) : indicator === "chevron" ? (
        <Ionicons name="chevron-forward" size={17} color={c.muted} />
      ) : null}
    </Pressable>
  );
}
function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return `${value.toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

export default function SettingsScreen() {
  const [storage, setStorage] = useState<{ usedBytes?: number; freeBytes?: number }>({});
  useEffect(() => { void getStorageUsage().then(setStorage).catch(() => undefined); }, []);
  const scanning = useLibraryStore((state) => state.scanning);
  const version = Constants.expoConfig?.version;
  const build =
    Platform.OS === "android"
      ? (Constants.platform?.android?.versionCode ??
        Constants.expoConfig?.android?.versionCode)
      : (Constants.platform?.ios?.buildNumber ??
        Constants.expoConfig?.ios?.buildNumber);
  const open = (url: string) => {
    void Linking.openURL(url).catch(() =>
      Alert.alert(
        "Could not open link",
        url.startsWith("mailto:")
          ? "Email privacy@chefu.co.za from your mail app."
          : `Open ${url} in your browser.`,
      ),
    );
  };
  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <ScreenHeader title="Settings & About" />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 24 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={{ width: 56, height: 56, borderRadius: 14 }}
            accessibilityIgnoresInvertColors
          />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[ui.title, { fontSize: 23 }]}>Muzalo</Text>
            <Text style={ui.muted}>Your music, on your device.</Text>
            {version && (
              <Text style={{ color: c.muted, fontSize: 12 }}>
                Version {version}
                {build != null ? ` (${build})` : ""}
              </Text>
            )}
          </View>
        </View>
        <View>
          <Text accessibilityRole="header" style={ui.label}>
            Library
          </Text>
          {Platform.OS === "android" && (
            <SettingsRow
              label={scanning ? "Scanning your music…" : "Scan for music"}
              icon="refresh-outline"
              indicator="none"
              busy={scanning}
              onPress={() => {
                Alert.alert(
                  "Allow access to your music?",
                  "Muzalo needs audio access to find supported music already stored on this device. Your music files are not uploaded by the library scan.",
                  [
                    { text: "Not now", style: "cancel" },
                    {
                      text: "Continue",
                      onPress: () => void syncLibrary({ requestPermission: true }),
                    },
                  ],
                );
              }}
            />
          )}
          {Platform.OS !== "web" && (
            <SettingsRow
              label="App permissions"
              icon="shield-checkmark-outline"
              indicator="chevron"
              onPress={() => {
                void Linking.openSettings().catch(() =>
                  Alert.alert(
                    "Could not open settings",
                    "Open your device settings and choose Muzalo to manage its permissions.",
                  ),
                );
              }}
            />
          )}
          <Text style={[ui.muted, { fontSize: 12, lineHeight: 19 }]}>
            Sort songs and choose which folders appear using the library
            controls beside Your music.
          </Text>
          {storage.usedBytes != null && storage.freeBytes != null && (
            <Text style={[ui.muted, { fontSize: 12, marginTop: 8 }]}>
              Storage used: {formatBytes(storage.usedBytes)} · Free: {formatBytes(storage.freeBytes)}
            </Text>
          )}
        </View>
        <View>
          <Text accessibilityRole="header" style={ui.label}>
            Help & legal
          </Text>
          <SettingsRow
            label="Contact support"
            icon="help-circle-outline"
            onPress={() => open("https://www.chefu.co.za/contact")}
          />
          <SettingsRow
            label="Privacy Policy"
            icon="lock-closed-outline"
            onPress={() => open("https://www.chefu.co.za/privacy/muzalo")}
          />
          <SettingsRow
            label="Terms of Service"
            icon="document-text-outline"
            onPress={() => open("https://www.chefu.co.za/terms/muzalo")}
          />
          <SettingsRow
            label="Privacy questions"
            icon="mail-outline"
            onPress={() =>
              open(
                "mailto:privacy@chefu.co.za?subject=Muzalo%20privacy%20request",
              )
            }
          />
          <SettingsRow
            label="Our website"
            icon="globe-outline"
            onPress={() => open("https://www.chefu.co.za")}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
