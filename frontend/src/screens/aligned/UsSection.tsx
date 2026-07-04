"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { Colors } from "../../constants/colors";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CountdownBlock } from "@/components/home/CountdownBlock";
import { Calendar, DateData } from "react-native-calendars";
import { AppTextInput } from "@/components/ui/AppTextInput";
import { Ionicons } from "@expo/vector-icons";
import {
  getUsStats,
  updateStartDate,
  createMilestone,
  deleteMilestone,
  setNextMeet,
  updateNextMeet,
  getNextMeetCountdown,
} from "../../services/usApi";

type UsTab = "TIME" | "DATES" | "REUNION";
type ActiveSheet = "startDate" | "addMarkedDay" | "reunionEdit" | null;

const formatDisplayDate = (dateString: string | null): string => {
  if (!dateString) return "mm/dd/yyyy";
  // Handle both yyyy-mm-dd and mm.dd.yyyy formats
  if (dateString.includes("-")) {
    const [year, month, day] = dateString.split("-");
    return `${month}/${day}/${year}`;
  }
  const parts = dateString.split(".");
  return `${parts[0]}/${parts[1]}/${parts[2]}`;
};

const formatReadableDate = (dateString: string): string => {
  // Convert mm.dd.yyyy to readable "Month Day, Year"
  if (!dateString) return "";
  const parts = dateString.split(".");
  if (parts.length !== 3) return dateString;
  const d = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const toApiDate = (dateString: string): string => {
  // Convert yyyy-mm-dd (from calendar) to mm.dd.yyyy (API format)
  if (dateString.includes("-")) {
    const [year, month, day] = dateString.split("-");
    return `${month}.${day}.${year}`;
  }
  return dateString;
};

const toCalendarDate = (dateString: string): string => {
  // Convert mm.dd.yyyy to yyyy-mm-dd (for calendar)
  if (dateString.includes(".")) {
    const parts = dateString.split(".");
    return `${parts[2]}-${parts[0]}-${parts[1]}`;
  }
  return dateString;
};

const UsSection: React.FC = () => {
  const [activeUsTab, setActiveUsTab] = useState<UsTab>("TIME");
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live data state
  const [totalDays, setTotalDays] = useState(0);
  const [monthsPassed, setMonthsPassed] = useState(0);
  const [relationshipStartDate, setRelationshipStartDate] = useState("11.14.2023");
  const [daysUntilAnniversary, setDaysUntilAnniversary] = useState(0);
  const [nextMilestone, setNextMilestone] = useState<any>(null);
  const [userMilestones, setUserMilestones] = useState<any[]>([]);

  // Reunion live data
  const [reunionData, setReunionData] = useState<any>(null);
  const [reunionTargetDate, setReunionTargetDate] = useState<Date>(new Date());

  // "Add a Marked Day" sheet state
  const [markedDayDate, setMarkedDayDate] = useState<string | null>(null);
  const [showMarkedCalendar, setShowMarkedCalendar] = useState(false);
  const [selectedMark, setSelectedMark] = useState<string | null>(null);
  const [markedDayTitle, setMarkedDayTitle] = useState("");

  // "Start Date" sheet state
  const [startDateEdit, setStartDateEdit] = useState<string>("2023-11-14");
  const [showStartCalendar, setShowStartCalendar] = useState(false);

  // "Reunion" sheet state
  const [reunionDateEdit, setReunionDateEdit] = useState<string>("");
  const [reunionCityEdit, setReunionCityEdit] = useState<string>("");
  const [reunionTimeEdit, setReunionTimeEdit] = useState<string>("12:00 PM");
  const [showReunionCalendar, setShowReunionCalendar] = useState(false);

  // Countdown timer ref
  const countdownInterval = useRef<any>(null);

  const loadData = useCallback(async () => {
    try {
      const statsRes = await getUsStats();
      if (statsRes.success && statsRes.data) {
        const d = statsRes.data;
        setTotalDays(d.total_days);
        setMonthsPassed(d.months_passed + d.years_passed * 12);
        setRelationshipStartDate(d.relationship_start_date);
        setDaysUntilAnniversary(d.days_until_anniversary);
        setStartDateEdit(toCalendarDate(d.relationship_start_date));

        // Find the next day-based milestone
        const daysMilestone = d.upcoming_milestones.find((m: any) => m.type === "days");
        setNextMilestone(daysMilestone || null);

        // User/custom milestones for DATES tab
        const custom = d.upcoming_milestones.filter(
          (m: any) => m.type === "custom" || m.type === "birthday"
        );
        setUserMilestones(custom);
      }
    } catch (e) {
      console.log("Error loading Us stats:", e);
    }

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const countdownRes = await getNextMeetCountdown(tz);
      if (countdownRes.success && countdownRes.data) {
        setReunionData(countdownRes.data);
        // Build the target date from countdown data for CountdownBlock
        const cd = countdownRes.data;
        const calDate = toCalendarDate(cd.date);
        setReunionDateEdit(calDate);
        setReunionCityEdit(cd.city_name || "");
        // Set target date for the CountdownBlock
        const now = new Date();
        const target = new Date(
          now.getTime() +
            (cd.countdown.days * 86400 + cd.countdown.hours * 3600 + cd.countdown.minutes * 60 + cd.countdown.seconds) * 1000
        );
        setReunionTargetDate(target);
      }
    } catch (e) {
      console.log("Error loading countdown:", e);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkedDayPress = (day: DateData) => {
    setMarkedDayDate(day.dateString);
    setShowMarkedCalendar(false);
  };

  const handleStartDatePress = (day: DateData) => {
    setStartDateEdit(day.dateString);
    setShowStartCalendar(false);
  };

  const handleReunionDatePress = (day: DateData) => {
    setReunionDateEdit(day.dateString);
    setShowReunionCalendar(false);
  };

  const handleCloseSheet = () => {
    setActiveSheet(null);
    setShowMarkedCalendar(false);
    setShowStartCalendar(false);
    setShowReunionCalendar(false);
  };

  const handleSaveStartDate = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const apiDate = toApiDate(startDateEdit);
      await updateStartDate(apiDate);
      handleCloseSheet();
      await loadData(); // refresh
    } catch (e) {
      console.log("Error saving start date:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMilestone = async () => {
    if (isSubmitting || !markedDayTitle.trim() || !markedDayDate) return;
    setIsSubmitting(true);
    try {
      const apiDate = toApiDate(markedDayDate);
      await createMilestone({
        title: markedDayTitle,
        date: apiDate,
        description: selectedMark || "◈",
        type: "custom",
      });
      // Reset form
      setMarkedDayTitle("");
      setMarkedDayDate(null);
      setSelectedMark(null);
      handleCloseSheet();
      await loadData(); // refresh
    } catch (e) {
      console.log("Error adding milestone:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    try {
      await deleteMilestone(id);
      await loadData();
    } catch (e) {
      console.log("Error deleting milestone:", e);
    }
  };

  const handleReunionSave = async () => {
    if (isSubmitting || !reunionDateEdit) return;
    setIsSubmitting(true);
    try {
      const apiDate = toApiDate(reunionDateEdit);
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (reunionData) {
        // Update existing
        await updateNextMeet({
          date: apiDate,
          time: reunionTimeEdit || "12:00 PM",
          timezone: tz,
          city_name: reunionCityEdit || "TBD",
        });
      } else {
        // Create new
        await setNextMeet({
          date: apiDate,
          time: reunionTimeEdit || "12:00 PM",
          timezone: tz,
          city_name: reunionCityEdit || "TBD",
        });
      }
      handleCloseSheet();
      await loadData();
    } catch (e) {
      console.log("Error saving reunion:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const MARKS = ["◆", "○", "◉", "◇", "□", "🜂", "✦", "·"];

  return (
    <View>
      <View style={styles.headerRow}>
        <AppText
          variant="smallCaps"
          color={Colors.ink2}
          style={styles.sectionLabel}
        >
          Us
        </AppText>
        <Pressable onPress={() => setActiveSheet("startDate")}>
          <AppText variant="mono" color={Colors.accent} style={styles.editBtn}>
            EDIT
          </AppText>
        </Pressable>
      </View>

      <View style={styles.usCard}>
        {/* Tabs */}
        <View style={styles.tabContainer}>
          {(["TIME", "DATES", "REUNION"] as const).map((tab) => (
            <Pressable
              key={tab}
              style={styles.tab}
              onPress={() => setActiveUsTab(tab)}
            >
              <AppText
                variant="smallCaps"
                color={activeUsTab === tab ? Colors.ink : Colors.muted}
                style={{ fontSize: 12, letterSpacing: 0.5 }}
              >
                {tab}
              </AppText>
              {activeUsTab === tab && <View style={styles.tabIndicator} />}
            </Pressable>
          ))}
        </View>

        {activeUsTab === "TIME" && (
          <View style={styles.timeTab}>
            <View style={[styles.card, { marginTop: 10 }]}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  gap: 12,
                }}
              >
                <AppText variant="display" size={90} style={{ lineHeight: 80 }}>
                  {totalDays}
                </AppText>
                <View>
                  <AppText variant="serifItalic" size={22} color={Colors.muted}>
                    days
                  </AppText>
                  <AppText variant="smallCaps" color={Colors.accent}>
                    & counting
                  </AppText>
                </View>
              </View>
              <AppText
                variant="serifItalic"
                size={15}
                color={Colors.muted}
                style={{ marginTop: 12 }}
              >
                Since{" "}
                <AppText variant="serifItalic" size={15} color={Colors.ink}>
                  {formatReadableDate(relationshipStartDate)}
                </AppText>{" "}
                — the day it all began.
              </AppText>
            </View>

            <View style={styles.milestoneRow}>
              {[
                { value: nextMilestone ? `${nextMilestone.days_left}` : "—", label: "MILESTONE" },
                { value: `${daysUntilAnniversary}d`, label: "NEXT ANNIVERSARY" },
                { value: `${monthsPassed}`, label: "MONTHS" },
              ].map(({ value, label }, index, array) => (
                <View
                  key={label}
                  style={[
                    styles.milestoneBox1,
                    index < array.length - 1 && styles.milestoneBorder,
                  ]}
                >
                  <AppText variant="display" size={32}>
                    {value}
                  </AppText>
                  <AppText
                    variant="mono"
                    color={Colors.muted}
                    style={{ fontSize: 12, marginTop: 4 }}
                  >
                    {label}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeUsTab === "DATES" && (
          <View style={styles.datesTab}>
            {userMilestones.length > 0 ? (
              userMilestones.map((milestone, index) => (
                <Pressable
                  key={milestone.id}
                  style={styles.dateRow}
                  onLongPress={() => {
                    Alert.alert(
                      "Delete Date",
                      `Remove "${milestone.title}"?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => handleDeleteMilestone(milestone.id),
                        },
                      ]
                    );
                  }}
                >
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                  >
                    <AppText size={18}>{milestone.description || "◈"}</AppText>
                    <View>
                      <AppText variant="heading" size={17}>
                        {milestone.title}
                      </AppText>
                      <AppText variant="mono" color={Colors.muted}>
                        {formatReadableDate(milestone.date).toUpperCase().split(",")[0]}
                      </AppText>
                    </View>
                  </View>
                  <AppText variant="mono" color={Colors.muted}>
                    #{String(index + 1).padStart(2, "0")}
                  </AppText>
                </Pressable>
              ))
            ) : (
              <View style={{ padding: 20, alignItems: "center" }}>
                <AppText
                  variant="serifItalic"
                  size={15}
                  color={Colors.muted}
                  style={{ textAlign: "center", lineHeight: 22 }}
                >
                  No dates marked yet. Add one below.
                </AppText>
              </View>
            )}

            <Pressable
              style={styles.addDateButton}
              onPress={() => setActiveSheet("addMarkedDay")}
            >
              <AppText
                variant="mono"
                color={Colors.accent}
                style={{ fontSize: 10 }}
              >
                + ADD A DATE
              </AppText>
            </Pressable>
          </View>
        )}

        {activeUsTab === "REUNION" && (
          <View style={styles.reunionTab}>
            <View style={styles.card}>
              <AppText
                variant="serifItalic"
                size={15}
                color={Colors.muted}
                style={{ marginBottom: 18, lineHeight: 22 }}
              >
                Until you hold each other again, there is a quiet countdown.
              </AppText>
              <CountdownBlock targetDate={reunionTargetDate} />
            </View>

            <View style={styles.reunionFooter}>
              <AppText
                variant="mono"
                color={Colors.muted}
                style={{ fontSize: 10 }}
              >
                {reunionData
                  ? `${reunionData.date} · ${(reunionData.city_name || "").toUpperCase()}`
                  : "No reunion set"}
              </AppText>
              <Pressable onPress={() => setActiveSheet("reunionEdit")}>
                <AppText
                  variant="mono"
                  color={Colors.accent}
                  style={{ fontSize: 10 }}
                >
                  EDIT
                </AppText>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Start Date Sheet */}
      <BottomSheet
        open={activeSheet === "startDate"}
        onClose={handleCloseSheet}
        kicker="PAGE 02"
        title="Our beginning"
      >
        <View>
          <AppText
            variant="serifItalic"
            size={15}
            color={Colors.muted}
            style={{ marginBottom: 24, marginTop: 15 }}
          >
            When did your story begin?
          </AppText>

          <AppText
            variant="smallCaps"
            color={Colors.ink2}
            style={styles.sheetLabel}
          >
            01 START DATE
          </AppText>

          <View style={styles.datePickerRow}>
            <AppText variant="display" style={{ letterSpacing: 1 }} size={20}>
              {formatDisplayDate(startDateEdit)}
            </AppText>
            <Pressable onPress={() => setShowStartCalendar((v) => !v)}>
              <Ionicons name="calendar-outline" size={26} color="#000" />
            </Pressable>
          </View>

          {showStartCalendar && (
            <View style={styles.calendarWrapper}>
              <Calendar
                current={startDateEdit}
                onDayPress={handleStartDatePress}
                markedDates={
                  startDateEdit
                    ? {
                        [startDateEdit]: {
                          selected: true,
                          selectedColor: Colors.accent,
                        },
                      }
                    : {}
                }
                theme={{
                  todayTextColor: Colors.accent,
                  arrowColor: Colors.accent,
                }}
              />
            </View>
          )}

          <AppButton
            variant="solid"
            full
            size="lg"
            style={{ marginTop: 20 }}
            onPress={handleSaveStartDate}
            disabled={isSubmitting}
          >
            {isSubmitting ? "SAVING..." : "SAVE →"}
          </AppButton>
        </View>
      </BottomSheet>

      {/* Add a Date Sheet */}
      <BottomSheet
        open={activeSheet === "addMarkedDay"}
        onClose={handleCloseSheet}
        kicker="DATES"
        title="Add a marked day"
      >
        <View style={{ marginTop: 8 }}>
          <View>
            <AppTextInput
              label="What it is"
              n="01"
              placeholder="First Trip Together"
              value={markedDayTitle}
              onChangeText={setMarkedDayTitle}
            />
          </View>

          {/* 02 Date */}
          <View style={{ marginBottom: 28 }}>
            <AppText
              variant="smallCaps"
              color={Colors.ink2}
              style={styles.sheetLabel}
            >
              02 WHEN
            </AppText>
            <View style={styles.datePickerRow}>
              <AppText
                variant="display"
                size={20}
                color={markedDayDate ? Colors.ink : Colors.muted}
              >
                {formatDisplayDate(markedDayDate)}
              </AppText>
              <Pressable onPress={() => setShowMarkedCalendar((v) => !v)}>
                <Ionicons name="calendar-outline" size={26} color="#000" />
              </Pressable>
            </View>

            {showMarkedCalendar && (
              <View style={styles.calendarWrapper}>
                <Calendar
                  onDayPress={handleMarkedDayPress}
                  markedDates={
                    markedDayDate
                      ? {
                          [markedDayDate]: {
                            selected: true,
                            selectedColor: Colors.accent,
                          },
                        }
                      : {}
                  }
                  theme={{
                    todayTextColor: Colors.accent,
                    arrowColor: Colors.accent,
                  }}
                />
              </View>
            )}
          </View>

          <View>
            <AppText
              variant="smallCaps"
              color={Colors.ink2}
              style={styles.sheetLabel}
            >
              03 MARK
            </AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {MARKS.map((mark) => (
                <Pressable
                  key={mark}
                  onPress={() => setSelectedMark(mark)}
                  style={[
                    styles.markBox,
                    selectedMark === mark && styles.markBoxActive,
                  ]}
                >
                  <AppText size={26}>{mark}</AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <AppButton
            variant="solid"
            full
            size="lg"
            style={{ marginTop: 40 }}
            onPress={handleAddMilestone}
            disabled={isSubmitting || !markedDayTitle.trim() || !markedDayDate}
          >
            {isSubmitting ? "ADDING..." : "ADD →"}
          </AppButton>
        </View>
      </BottomSheet>

      {/* Reunion Edit Sheet */}
      <BottomSheet
        open={activeSheet === "reunionEdit"}
        onClose={handleCloseSheet}
        kicker="REUNION"
        title="Next time, together"
      >
        <View>
          <AppText
            variant="serifItalic"
            size={15}
            color={Colors.muted}
            style={{ marginBottom: 24 }}
          >
            The date you'll next hold each other.
          </AppText>

          <AppText
            variant="smallCaps"
            color={Colors.ink2}
            style={styles.sheetLabel}
          >
            01 REUNION DATE
          </AppText>

          <View style={styles.datePickerRow}>
            <AppText variant="display" size={32}>
              {formatDisplayDate(reunionDateEdit)}
            </AppText>
            <Pressable onPress={() => setShowReunionCalendar((v) => !v)}>
              <Ionicons name="calendar-outline" size={26} color="#000" />
            </Pressable>
          </View>

          {showReunionCalendar && (
            <View style={styles.calendarWrapper}>
              <Calendar
                current={reunionDateEdit}
                onDayPress={handleReunionDatePress}
                markedDates={
                  reunionDateEdit
                    ? {
                        [reunionDateEdit]: {
                          selected: true,
                          selectedColor: Colors.accent,
                        },
                      }
                    : {}
                }
                theme={{
                  todayTextColor: Colors.accent,
                  arrowColor: Colors.accent,
                }}
              />
            </View>
          )}

          <AppTextInput
            label="City"
            n="02"
            placeholder="Tulum"
            value={reunionCityEdit}
            onChangeText={setReunionCityEdit}
          />

          <AppButton
            variant="solid"
            full
            size="lg"
            style={{ marginTop: 40 }}
            onPress={handleReunionSave}
            disabled={isSubmitting || !reunionDateEdit}
          >
            {isSubmitting ? "UPDATING..." : "UPDATE COUNTDOWN →"}
          </AppButton>
        </View>
      </BottomSheet>
    </View>
  );
};

export default UsSection;

const styles = StyleSheet.create({
  sectionLabel: { marginBottom: 4, marginTop: 8 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  editBtn: { fontSize: 10 },

  usCard: {
    backgroundColor: Colors.bone,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.rule,
    overflow: "hidden",
    marginBottom: 8,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",

    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
    width: "60%",
    backgroundColor: Colors.accent,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  timeTab: { padding: 10 },
  milestoneRow: {
    flexDirection: "row",
    marginTop: 32,
    marginHorizontal: 10,
  },

  milestoneBox1: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: Colors.rule,
    paddingHorizontal: 10,
  },

  milestoneBorder: {
    borderRightWidth: 1,
    borderColor: Colors.rule,
  },
  datesTab: { padding: 10 },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  addDateButton: { paddingVertical: 16, alignItems: "center" },

  reunionTab: { padding: 24 },
  reunionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
  },

  card: {
    borderRadius: 14,

    padding: 15,

    elevation: 1,
  },

  sheetLabel: { fontSize: 12, marginBottom: 8 },
  datePickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  calendarWrapper: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.rule,
    overflow: "hidden",
  },

  markBox: {
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.rule,
  },
  markBoxActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.bone,
  },
});
