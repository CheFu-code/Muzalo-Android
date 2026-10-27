import { muzaloTheme } from "@/constants/tokens";
import { Stack } from "expo-router";
import React from "react";
import { View } from "react-native";

const PlaylistsScreenLayout = () => {
  return (
    <View style={{ flex: 1, backgroundColor: muzaloTheme.background }}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: muzaloTheme.background },
          statusBarStyle: "light",
        }}
      >
        <Stack.Screen
          name="[name]"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </View>
  );
};

export default PlaylistsScreenLayout;
