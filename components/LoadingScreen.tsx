import { muzaloTheme } from "@/constants/tokens";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

const LoadingScreen = () => (
  <View
    style={{
      flex: 1,
      backgroundColor: muzaloTheme.background,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    }}
  >
    <View
      style={{
        width: 64,
        height: 64,
        borderRadius: 22,
        backgroundColor: muzaloTheme.accentSoft,
        borderWidth: 1,
        borderColor: muzaloTheme.border,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
      }}
    >
      <Ionicons name="musical-notes" size={30} color={muzaloTheme.accent} />
    </View>
    <Text
      style={{
        color: muzaloTheme.text,
        fontSize: 28,
        fontWeight: "700",
        letterSpacing: -0.6,
      }}
    >
      Muzalo
    </Text>
    <Text
      style={{
        color: muzaloTheme.muted,
        fontSize: 14,
        marginTop: 8,
        marginBottom: 24,
      }}
    >
      Getting your music ready
    </Text>
    <ActivityIndicator
      color={muzaloTheme.accent}
      size="small"
      accessibilityLabel="Loading music"
    />
  </View>
);

export default LoadingScreen;
