import FloatingPlayer from "@/components/FloatingPlayer";
import { TAB_BAR_HEIGHT, muzaloTheme } from "@/constants/tokens";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TabsNavigation = () => {
  const insets = useSafeAreaInsets();
  return (
    <>
      <Tabs
        initialRouteName="(songs)"
        screenOptions={{
          tabBarActiveTintColor: muzaloTheme.accent,
          tabBarInactiveTintColor: muzaloTheme.muted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
          tabBarItemStyle: { paddingTop: 7 },
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderTopWidth: 1,
            borderTopColor: muzaloTheme.border,
            paddingBottom: insets.bottom,
            height: TAB_BAR_HEIGHT + insets.bottom,
            zIndex: 10,
            backgroundColor: muzaloTheme.background,
          },
          tabBarBackground: () => (
            <BlurView
              intensity={40}
              tint="dark"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  overflow: "hidden",
                },
              ]}
            />
          ),
        }}
      >
        <Tabs.Screen
          name="favorites"
          options={{
            title: "Favorites",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "heart" : "heart-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="playlists"
          options={{
            title: "Playlists",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "albums" : "albums-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="(songs)"
          options={{
            title: "Songs",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "musical-notes" : "musical-notes-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="artists"
          options={{
            title: "Artists",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "people" : "people-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
      <FloatingPlayer />
    </>
  );
};

export default TabsNavigation;
