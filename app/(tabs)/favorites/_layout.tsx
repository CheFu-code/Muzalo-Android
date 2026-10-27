import { muzaloTheme } from "@/constants/tokens";
import { StackScreenWithSearchBar } from "@/constants/layouts";
import { Stack } from "expo-router";
import React from "react";
import { View } from "react-native";

const FavoritesScreenLayout = () => {
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
          options={{ ...StackScreenWithSearchBar, headerTitle: "Favorites" }}
        />
      </Stack>
    </View>
  );
};

export default FavoritesScreenLayout;
