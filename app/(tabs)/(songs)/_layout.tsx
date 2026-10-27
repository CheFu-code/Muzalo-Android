import { muzaloTheme } from "@/constants/tokens";
import { Stack } from "expo-router";
import React from "react";
import { View } from "react-native";

const SongsScreenLayout = () => {
  return (
    <View style={{ flex: 1, backgroundColor: muzaloTheme.background }}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: muzaloTheme.background },
          statusBarStyle: "light",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            // ...StackScreenWithSearchBar,
            headerTitle: "Songs",
            headerShown: false,
          }}
        />
      </Stack>
    </View>
  );
};

export default SongsScreenLayout;
