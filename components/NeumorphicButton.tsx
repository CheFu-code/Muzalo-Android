import { muzaloTheme as c } from "@/constants/tokens";
import { Ionicons } from "@expo/vector-icons";
import { GestureResponderEvent, TouchableOpacity } from "react-native";
interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: (event: GestureResponderEvent) => void;
  style?: string;
}
export default function NeumorphicButton({ icon, onPress }: Props) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={icon.replaceAll("-", " ")}
      onPress={onPress}
      style={{
        minWidth: 48,
        minHeight: 48,
        borderRadius: 16,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={icon} size={24} color={c.accent} />
    </TouchableOpacity>
  );
}
