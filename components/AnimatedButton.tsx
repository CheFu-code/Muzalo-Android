import { ActionButton } from "./ui";
// Preserve the older API while sharing the app's button treatment.
export const AnimatedButton = ({
  label,
  color,
  disabled,
  onPress,
}: {
  label: string;
  color: "green" | "cyan";
  disabled?: boolean;
  onPress: () => void;
}) => (
  <ActionButton
    label={label}
    variant={color === "green" ? "primary" : "secondary"}
    disabled={disabled}
    onPress={onPress}
  />
);
