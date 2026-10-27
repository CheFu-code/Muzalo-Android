import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { muzaloTheme } from "./tokens";

export const StackScreenWithSearchBar: NativeStackNavigationOptions = {
  headerLargeTitle: true,
  headerTitleStyle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  headerLargeStyle: {
    backgroundColor: muzaloTheme.background,
  },
  headerLargeTitleStyle: {
    color: "#fff",
    fontSize: 32,
  },
  navigationBarHidden: false,
  headerStyle: {
    backgroundColor: muzaloTheme.background,
  },
  headerTintColor: muzaloTheme.accent,
  statusBarStyle: "light",
  headerBlurEffect: "prominent",
  headerShadowVisible: false,
};
