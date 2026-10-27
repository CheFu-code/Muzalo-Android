import { ReactNode } from "react";
import { Gesture } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { Screen, ScreenHeader } from "./ui";

// Only the title is draggable; navigation and menu buttons receive ordinary taps.
export default function SwipeDismissScreen({
  title,
  right,
  background,
  children,
}: {
  title: string;
  right?: ReactNode;
  background?: ReactNode;
  children: ReactNode;
}) {
  const dismiss = useBackNavigation();
  const y = useSharedValue(0);
  const pan = Gesture.Pan()
    .activeOffsetY(20)
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      y.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 130 || (e.translationY > 40 && e.velocityY > 900))
        runOnJS(dismiss)();
      else y.value = withSpring(0, { damping: 20, stiffness: 180 });
    });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));
  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      {background}
      <Animated.View style={[{ flex: 1 }, style]}>
        <ScreenHeader
          title={title}
          right={right}
          close
          onBack={dismiss}
          dragGesture={pan}
        />
        {children}
      </Animated.View>
    </Screen>
  );
}
