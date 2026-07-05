import React, { useEffect } from "react";
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { GestureHandlerRootView, ScrollView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Colors } from "../../constants/colors";
import { AppText } from "./AppText";
import { AppButton } from "./AppButton";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  kicker?: string;
  dark?: boolean;
  children: React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  title,
  kicker,
  dark = false,
  children,
}) => {
  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    if (open) {
      translateY.value = withSpring(0, {
        damping: 30,
        stiffness: 220,
        mass: 1,
      });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, {
        damping: 25,
        stiffness: 200,
      });
    }
  }, [open]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const bg = dark ? Colors.ink : Colors.bone;
  const textColor = dark ? Colors.bone : Colors.ink;
  const subtleColor = dark ? "rgba(255,255,255,0.15)" : Colors.rule;

  return (
    <Modal
      transparent
      visible={open}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          style={[
            styles.sheet,
            animatedStyle,
            { backgroundColor: bg, flexShrink: 1 },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: subtleColor }]} />
          </View>

          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: subtleColor, marginBottom: 15 },
            ]}
          >
            <View style={{ flex: 1 }}>
              {kicker && (
                <AppText
                  variant="smallCaps"
                  color={dark ? Colors.light : Colors.muted}
                
                >
                  {kicker}
                </AppText>
              )}
              <AppText variant="display" style={{marginBottom:-20,marginTop:-10, letterSpacing:0.1}} size={27} color={textColor}>
                {title}
              </AppText>
            </View>

            <AppButton
              variant="ghost"
              size="sm"
              onPress={onClose}
              textStyle={{ color: dark ? Colors.light : Colors.muted }}
              style={{borderWidth:1, borderColor: Colors.rule, borderRadius:30}}
            >
              Close
            </AppButton>
          </View>

          {/* Content */}
          <ScrollView
            contentContainerStyle={[styles.content]}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(26, 22, 20, 0.65)",
  },
  sheet: {
    maxHeight: "90%",
    minHeight: 200,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});
