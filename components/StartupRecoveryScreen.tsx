import { muzaloTheme as c } from "@/constants/tokens";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Linking, Text, View } from "react-native";
import { ActionButton, Screen, ui } from "./ui";

export default function StartupRecoveryScreen({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <View style={{ flex: 1, justifyContent: "center", padding: 28, gap: 16 }}>
        <Ionicons name="musical-notes-outline" size={40} color={c.accent} />
        <Text accessibilityRole="header" style={[ui.title, { fontSize: 24 }]}>
          Couldn&apos;t open your library
        </Text>
        <Text style={[ui.muted, { lineHeight: 23 }]}>
          Muzalo couldn&apos;t prepare your saved music library. Try again to
          continue. Retrying keeps your saved library and music files.
        </Text>
        <ActionButton
          label="Try again"
          icon="refresh-outline"
          onPress={onRetry}
        />
        <ActionButton
          label="Contact support"
          variant="secondary"
          onPress={() => {
            void Linking.openURL("https://www.chefu.co.za/contact").catch(
              () => {
                Alert.alert(
                  "Could not open support",
                  "Visit www.chefu.co.za/contact in your browser.",
                );
              },
            );
          }}
        />
      </View>
    </Screen>
  );
}
