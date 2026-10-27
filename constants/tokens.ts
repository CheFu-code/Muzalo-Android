import { useColorScheme } from "react-native";

export const muzaloTheme = {
  background: "#080D12",
  surface: "#121D26",
  raised: "#1A2934",
  border: "#263844",
  accent: "#80DECE",
  accentSoft: "#132D2D",
  onAccent: "#092522",
  text: "#F2F6F8",
  muted: "#94A5B3",
  danger: "#F1A8A8",
  dangerSoft: "#322327",
};

export const TAB_BAR_HEIGHT = 64;
export const MINI_PLAYER_HEIGHT = 76;

interface ColorPalette {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
  text: string;
  icon: string;
  textMuted: string;
  maximumTrackTintColor: string;
  minimumTrackTintColor: string;
}

export function useColors(): ColorPalette {
  const colorScheme = useColorScheme(); // 'light' or 'dark'

  // Define the colors based on the color scheme
  const lightColors: ColorPalette = {
    primary: "#117A70",
    secondary: "#3579A6",
    background: "#f9fafb",
    foreground: "#1f2937",
    text: "#000",
    icon: "#000",
    textMuted: "#6b7280",
    maximumTrackTintColor: "rgba(0,0,0,0.3)",
    minimumTrackTintColor: "rgba(0,0,0,0.5)",
  };

  const darkColors: ColorPalette = {
    primary: muzaloTheme.accent,
    secondary: "#83B8DC",
    background: muzaloTheme.background,
    foreground: "#fff",
    text: "#fff",
    icon: "#fff",
    textMuted: muzaloTheme.muted,
    maximumTrackTintColor: "rgba(255,255,255,0.4)",
    minimumTrackTintColor: "rgba(255,255,255,0.6)",
  };

  return colorScheme === "dark" ? darkColors : lightColors;
}

export const fontSize = {
  xs: 12,
  sm: 16,
  base: 20,
  lg: 24,
};

export const screenPadding = {
  horizontal: 24,
};
