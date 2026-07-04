import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView, Alert } from "react-native";
import { Colors } from "../../constants/colors";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { AppTextInput } from "@/components/ui/AppTextInput";
import { Calendar, DateData } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import Confidential from "./Confidential";
import { pokePartner, getInteractions } from "../../services/interactionsApi";
import { createWatchSession } from "../../services/watchApi";

const PLATFORMS = [
  { name: "NETFLIX", color: "#E50914" },
  { name: "HULU", color: "#1DB954" },
  { name: "MAX", color: "#0033A0" },
  { name: "PRIME", color: "#00A8E1" },
  { name: "APPLE TV", color: "#000000" },
  { name: "YOUTUBE", color: "#FF0000" },
];

const Moment: React.FC = () => {
  const [thinkingSent, setThinkingSent] = useState(false);
  const [interactionsCount, setInteractionsCount] = useState(0);
  const [activeSheet, setActiveSheet] = useState<"watchTogether" | null>(null);

  // Watch state
  const [watchPlatform, setWatchPlatform] = useState("APPLE TV");
  const [watchWhat, setWatchWhat] = useState("");
  const [watchTime, setWatchTime] = useState("09:00 PM");
  const [watchDate, setWatchDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [showWatchCalendar, setShowWatchCalendar] = useState(false);

  useEffect(() => {
    const fetchInt = async () => {
      try {
        const res = await getInteractions();
        if (res.success) setInteractionsCount(res.data.length);
      } catch (e) { console.log(e); }
    };
    fetchInt();
  }, []);

  const handlePoke = async () => {
    if (thinkingSent) return;
    setThinkingSent(true);
    try {
      await pokePartner();
      setInteractionsCount(c => c + 1);
    } catch (e) {
      setThinkingSent(false);
    }
  };

  const handleWatchDatePress = (day: DateData) => {
    setWatchDate(day.dateString);
    setShowWatchCalendar(false);
  };

  const formatDisplayDate = (dateString: string | null): string => {
    if (!dateString) return "mm.dd.yyyy";
    const [year, month, day] = dateString.split("-");
    return `${month}.${day}.${year}`; 
  };

  const handleScheduleWatch = async () => {
    try {
      await createWatchSession({
        platform: watchPlatform,
        show_name: watchWhat,
        link: "",
        date: formatDisplayDate(watchDate),
        time: watchTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      });
      Alert.alert("Success", "Watch session scheduled!");
      setActiveSheet(null);
    } catch (e) {
      Alert.alert("Error", "Could not schedule watch session.");
    }
  };

  return (
    <View>
      <AppText variant="smallCaps" color={Colors.ink2} style={styles.sectionLabel}>
        IN THIS MOMENT
      </AppText>

      <View style={styles.cardsContainer}>
        <Pressable style={styles.card} onPress={handlePoke} disabled={thinkingSent}>
          <View style={styles.dotContainer}>
            <AppText style={{ fontSize: 16 }}>◉</AppText>
          </View>
          <AppText variant="heading" size={18} style={{ marginTop: 8 }}>
            Thinking of you
          </AppText>
          <AppText variant="serifItalic" size={14} color={Colors.muted}>
            A silent ping {interactionsCount > 0 ? `• ${interactionsCount} today` : ""}
          </AppText>
          {thinkingSent && (
            <View style={styles.sentContainer}>
              <AppText variant="mono" color={Colors.accent} style={{ fontSize: 15 }}>
                SENT ✓
              </AppText>
            </View>
          )}
        </Pressable>

        <Pressable style={styles.card} onPress={() => setActiveSheet("watchTogether")}>
          <View style={styles.dotContainer}>
            <AppText style={{ fontSize: 16 }}>◐</AppText>
          </View>
          <AppText variant="heading" size={18} style={{ marginTop: 8 }}>
            Watch together
          </AppText>
          <AppText variant="serifItalic" size={14} color={Colors.muted}>
            Sync a movie, show, or game
          </AppText>
        </Pressable>
      </View>

      <AppText variant="serifItalic" size={14} color={Colors.muted} style={styles.footerText}>
        Things that exist in the present — they don't get saved.
      </AppText>

      <Confidential />

      <BottomSheet
        open={activeSheet === "watchTogether"}
        onClose={() => setActiveSheet(null)}
        kicker="IN SYNC"
        title="Watch together"
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <AppText variant="serifItalic" size={15} color={Colors.muted} style={{ marginBottom: 24, lineHeight: 22 }}>
            Pick what you're watching and when. We'll ping you both at the same moment to hit play.
          </AppText>

          <View style={{ marginBottom: 28 }}>
            <AppText variant="smallCaps" color={Colors.ink2} style={{ fontSize: 10, marginBottom: 12 }}>
              01 WHERE
            </AppText>
            <View style={styles.platformRow}>
              {PLATFORMS.map((platform, i) => {
                const selected = watchPlatform === platform.name;
                return (
                  <Pressable
                    key={i}
                    onPress={() => setWatchPlatform(platform.name)}
                    style={[
                      styles.platformBtn,
                      selected && { backgroundColor: platform.color, borderColor: platform.color },
                    ]}
                  >
                    <AppText style={{ color: selected ? "#fff" : Colors.ink, fontSize: 10 }}>
                      {platform.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ marginBottom: 5 }}>
            <AppTextInput label="What" n="02" placeholder="Severance • S2 E4" value={watchWhat} onChangeText={setWatchWhat} />
          </View>

          <AppText variant="smallCaps" color={Colors.ink2} style={{ fontSize: 10 }}>
            03 DATE
          </AppText>
          <View style={styles.datePickerRow}>
            <AppText variant="display" size={16}>
              {formatDisplayDate(watchDate)}
            </AppText>
            <Pressable onPress={() => setShowWatchCalendar((v) => !v)}>
              <Ionicons name="calendar-outline" size={26} color="#000" />
            </Pressable>
          </View>

          {showWatchCalendar && (
            <View style={styles.calendarWrapper}>
              <Calendar
                current={watchDate}
                onDayPress={handleWatchDatePress}
                markedDates={{ [watchDate]: { selected: true, selectedColor: Colors.accent } }}
                theme={{ todayTextColor: Colors.accent, arrowColor: Colors.accent }}
              />
            </View>
          )}

          <View style={{ marginBottom: 32, paddingTop: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.rule }}>
            <AppText variant="smallCaps" color={Colors.ink2} style={{ fontSize: 10, marginBottom: 10 }}>
              04 TIME
            </AppText>
            <AppTextInput label="" n="" placeholder="09:00 PM" value={watchTime} onChangeText={setWatchTime} />
          </View>

          <View style={styles.howItWorks}>
            <AppText variant="smallCaps" color={Colors.accent} style={{ fontSize: 12, marginBottom: 8 }}>
              HOW IT WORKS
            </AppText>
            <AppText variant="serifItalic" size={14} color={Colors.muted} style={{ lineHeight: 20 }}>
              You'll both get a notification at showtime. Hit play when the countdown hits zero. Watch in sync.
            </AppText>
          </View>

          <AppButton variant="solid" full size="lg" style={{ marginTop: 32, backgroundColor: "#E8D5C8" }} onPress={handleScheduleWatch}>
            SCHEDULE →
          </AppButton>
        </ScrollView>
      </BottomSheet>
    </View>
  );
};

export default Moment;

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  cardsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.cream,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dotContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.bone,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.ink2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sentContainer: {
    position: "absolute",
    bottom: -10,
    backgroundColor: Colors.cream,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  footerText: {
    textAlign: "center",
  },
  platformRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  platformBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.rule,
    backgroundColor: Colors.bone,
  },
  datePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: Colors.rule,
    marginBottom: 24,
  },
  calendarWrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  howItWorks: {
    backgroundColor: "#F1E4DA",
    padding: 16,
    borderRadius: 12,
  },
});
