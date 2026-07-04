import { SafeAreaView } from 'react-native-safe-area-context';
import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Colors } from "../constants/colors";
import { AppText } from "../components/ui/AppText";
import { RootStackParamList } from "@/types";
import { getMe } from "../services/authApi";
import { checkVibeStatus } from "../services/vibeCheckApi";
import { useState } from "react";

type Nav = StackNavigationProp<RootStackParamList, "ModeSelector">;

export const ModeSelector: React.FC = () => {
  const nav = useNavigation<Nav>();
  const [loadingAligned, setLoadingAligned] = useState(false);
  const [loadingVibe, setLoadingVibe] = useState(false);

  const handleVibePress = async () => {
    try {
      setLoadingVibe(true);
      const status = await checkVibeStatus();
      if (status.success) {
        nav.navigate("VibeApp");
      } else {
        nav.navigate("VibeOnboarding");
      }
    } catch (error) {
      console.log("Error checking vibe status:", error);
      nav.navigate("VibeOnboarding");
    } finally {
      setLoadingVibe(false);
    }
  };

  const handleAlignedPress = async () => {
    try {
      setLoadingAligned(true);
      const user = await getMe();
      if (user.is_aligned || user.partner || user.secret_key) {
        nav.navigate("AlignedApp");
      } else {
        nav.navigate("AlignedOnboarding");
      }
    } catch (error) {
      console.log("Error checking user state:", error);
      nav.navigate("AlignedOnboarding");
    } finally {
      setLoadingAligned(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <AppText variant="smallCaps" color={Colors.muted}>
            Welcome
          </AppText>
          <AppText variant="smallCaps" color={Colors.accent}>
            ONE APP · TWO SIDES
          </AppText>
        </View>

        {/* Main Content - Pushed to Bottom */}
        <View style={styles.mainContent}>
          {/* Title */}
          <View style={styles.titleBlock}>
            <AppText
              variant="display"
              size={52}
              style={{ lineHeight: 52, marginBottom: 16 }}
            >
              Where are{" "}
              <AppText variant="serifItalic" size={52} color={Colors.accent}>
                you
              </AppText>
              {"\n"}right now?
            </AppText>
            <AppText
              variant="serifItalic"
              size={17}
              color={Colors.muted}
              style={{ lineHeight: 26, maxWidth: 340 }}
            >
              Same app, two sides. Pick the one that fits where you are today.
            </AppText>
          </View>

          {/* Options Cards */}
          <View style={styles.options}>
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.pressed, loadingAligned && { opacity: 0.5 }]}
              onPress={handleAlignedPress}
              disabled={loadingAligned}
            >
              <AppText
                variant="smallCaps"
                color={Colors.accent}
                style={{ marginBottom: 10 }}
              >
                If you're together
              </AppText>
              <AppText variant="display" size={30} style={{ marginBottom: 4 }}>
                aligned
                <AppText size={30} color={Colors.accent}>
                  .
                </AppText>
              </AppText>
              <AppText
                variant="serifItalic"
                size={14}
                color={Colors.muted}
                style={{ lineHeight: 22 }}
              >
                Rituals, shared dates, a running journal, a travel map.
              </AppText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.pressed, loadingVibe && { opacity: 0.5 }]}
              onPress={handleVibePress}
              disabled={loadingVibe}
            >
              <AppText
                variant="smallCaps"
                color={Colors.accent}
                style={{ marginBottom: 10 }}
              >
                If you're figuring it out
              </AppText>
              <AppText variant="display" size={30} style={{ marginBottom: 4 }}>
                vibe check
                <AppText size={30} color={Colors.accent}>
                  .
                </AppText>
              </AppText>
              <AppText
                variant="serifItalic"
                size={14}
                color={Colors.muted}
                style={{ lineHeight: 22 }}
              >
                A daily card. Match with someone to find out what this is.
              </AppText>
            </Pressable>
          </View>

          {/* Footer Note */}
          <AppText
            variant="serifItalic"
            size={13}
            color={Colors.light}
            style={{ textAlign: "center", marginTop: 20 }}
          >
            One account, two sides. Switch anytime from the menu.
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: Colors.bone 
  },
  container: { 
    flexGrow: 1, 
    padding: 32,
    justifyContent: 'space-between' 
  },

  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
  },

  mainContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  titleBlock: { 
    marginBottom: 40 
  },
  options: { 
    gap: 14, 
    marginBottom: 30 
  },
  card: {
    padding: 24,
    borderRadius: 14,
    backgroundColor: '#F2ECE2',
    borderWidth: 1,
    borderColor: Colors.rule,
    shadowColor: Colors.ink2,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: { 
    opacity: 0.9, 
    transform: [{ scale: 0.99 }] 
  },
});