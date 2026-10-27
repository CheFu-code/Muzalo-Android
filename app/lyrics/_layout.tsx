import { muzaloTheme } from "@/constants/tokens";
import { Stack } from "expo-router";
import React from "react";
import { View } from "react-native";

const SongInfoLayout = () => {
  return (
    <View style={{ flex: 1, backgroundColor: muzaloTheme.background }}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: muzaloTheme.background },
          statusBarStyle: "light",
        }}
      >
        <Stack.Screen
          name="edit/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="editsynced/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="sync/[id]"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </View>
  );
};

export default SongInfoLayout;
