import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Colors } from "../../constants/colors";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { AppTextInput } from "../../components/ui/AppTextInput";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { DateCard } from "../../components/dates/DateCard";
import { usePersist } from "../../hooks/usePersist";
import { DateEntry } from "../../types";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import AlignedNav from "@/components/ui/AlignedNav";

const SEED_DATES: DateEntry[] = [
  {
    id: 1,
    status: "completed",
    rating: 5,
    venue: "Griffith Observatory",
    date: "2026-02-14",
    exactTime: "17:30",
    meetType: "pickup",
    memory: "The city lights were incredible.",
  },
  {
    id: 2,
    status: "accepted",
    venue: "Intelligentsia Coffee",
    date: "2026-04-26",
    exactTime: "10:00",
    meetType: "location",
  },
  {
    id: 3,
    status: "proposed",
    venue: "Blue Whale Jazz Club",
    date: "2026-05-03",
    exactTime: "19:00",
    meetType: "pickedup",
  },
];

export const DatesScreen: React.FC = () => {
  const [dates, setDates] = usePersist<DateEntry[]>(
    "dates.entries",
    SEED_DATES,
  );
  const [selected, setSelected] = useState<DateEntry | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);

  const [city, setCity] = usePersist("dates.city", "Los Angeles");
  const [stars, setStars] = useState(0);
  const [memory, setMemory] = useState("");

  // Date Generator States
  const [mood, setMood] = useState("INTIMATE");
  const [vibe, setVibe] = useState("COZY");
  const [meetType, setMeetType] = useState<"location" | "pickup" | "pickedup">(
    "location",
  );
  const [exactTime, setExactTime] = useState(new Date(2026, 4, 8, 19, 0)); // 7:00 PM
  const [showTimePicker, setShowTimePicker] = useState(false);
const [pingSheet, setPingSheet] = useState(false);
  const [cancelSheet, setCancelSheet] = useState(false);
  const [selectedDelay, setSelectedDelay] = useState("10 MIN");
  const [pingNote, setPingNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const moods = ["ROMANTIC", "PLAYFUL", "ADVENTUROUS", "RELAXED", "INTIMATE"];
  const vibes = [
    "OUTDOORSY",
    "FOODIE",
    "CULTURAL",
    "NIGHTLIFE",
    "COZY",
    "ACTIVE",
  ];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleTimeChange = (_: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) setExactTime(selectedTime);
  };

  const generateDate = () => {
    const newDate: DateEntry = {
      id: Date.now(),
      status: "proposed",
      venue: `Special ${mood.toLowerCase()} ${vibe.toLowerCase()} date in ${city}`,
      date: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
      exactTime: formatTime(exactTime).replace(" ", ""),
      meetType: meetType,
    };
    setDates((p) => [newDate, ...p]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AlignedNav></AlignedNav>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <AppText
            variant="display"
            size={42}
            style={{ lineHeight: 42, marginBottom: 6 }}
          >
            Dates
            <AppText size={42} color={Colors.accent}>
              .
            </AppText>
          </AppText>
          <AppText
            variant="serifItalic"
            size={16}
            color={Colors.muted}
            style={{ lineHeight: 24, marginBottom: 24 }}
          >
            Intentional time, well-spent.
          </AppText>

          {/* ==================== DATE GENERATOR ==================== */}
          <View style={styles.generatorCard}>
            <View style={styles.genHeader}>
              <AppText variant="smallCaps" color={Colors.muted}>
                DATE GENERATOR
              </AppText>
            </View>

            <View style={{ padding: 20 }}>
              {/* 01 CITY */}
              <AppTextInput
                label="CITY"
                n="01"
                value={city}
                onChangeText={setCity}
                placeholder="Los Angeles"
              />

              {/* 02 MOOD */}
              <AppText
                variant="smallCaps"
                color={Colors.ink2}
                style={{ marginTop: 15, marginBottom: 10 }}
              >
                02 MOOD
              </AppText>
              <View style={styles.chipRow}>
                {moods.map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.chip, mood === m && styles.chipSelected]}
                    onPress={() => setMood(m)}
                  >
                    <AppText
                      variant="smallCaps"
                      style={{
                        color: mood === m ? "#fff" : Colors.muted,
                        fontSize: 10,
                      }}
                    >
                      {m}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              {/* 03 VIBE */}
              <AppText
                variant="smallCaps"
                color={Colors.ink2}
                style={{ marginTop: 20, marginBottom: 10 }}
              >
                03 VIBE
              </AppText>
              <View style={styles.chipRow}>
                {vibes.map((v) => (
                  <Pressable
                    key={v}
                    style={[styles.chip, vibe === v && styles.chipSelected]}
                    onPress={() => setVibe(v)}
                  >
                    <AppText
                      variant="smallCaps"
                      style={{
                        color: vibe === v ? "#fff" : Colors.muted,
                        fontSize: 10,
                      }}
                    >
                      {v}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              {/* 04 EXACT TIME */}
              <AppText
                variant="smallCaps"
                color={Colors.ink2}
                style={{ marginTop: 20, marginBottom: 10 }}
              >
                04 EXACT TIME
              </AppText>
              <Pressable
                style={styles.timeRow}
                onPress={() => setShowTimePicker(true)}
              >
                <AppText variant="display" size={20}>
                  {formatTime(exactTime)}
                </AppText>
                <Ionicons name="time-outline" size={26} color="#000" />
              </Pressable>

              {showTimePicker && (
                <DateTimePicker
                  value={exactTime}
                  mode="time"
                  is24Hour={false}
                  onChange={handleTimeChange}
                />
              )}

              {/* 05 HOW WE MEET */}
              <AppText
                variant="mono"
                color={Colors.ink2}
                style={{ marginTop: 20, marginBottom: 10 }}
              >
                05 HOW WE MEET
              </AppText>
              <View style={styles.meetOptions}>
                {[
                  { label: "Meet at the location", value: "location" },
                  { label: "I'll pick you up", value: "pickup" },
                  { label: "Pick me up", value: "pickedup" },
                ].map((option) => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.meetOption,
                      meetType === option.value && styles.meetSelected,
                    ]}
                    onPress={() => setMeetType(option.value as any)}
                  >
                    <AppText
                      style={{
                        color: meetType === option.value ? "#fff" : Colors.ink,
                      }}
                    >
                      {option.label}
                    </AppText>
                    <View
                      style={[
                        styles.radio,
                        meetType === option.value && styles.radioSelected,
                      ]}
                    />
                  </Pressable>
                ))}
              </View>

              {/* GENERATE BUTTON */}
              <AppButton
                variant="solid"
                full
                size="lg"
                style={styles.generateBtn}
                onPress={generateDate}
              >
                ♦ GENERATE DATE
              </AppButton>
            </View>
          </View>

          {/* Date list */}
          <AppText
            variant="smallCaps"
            color={Colors.ink2}
            style={{ marginBottom: 8, marginTop: 28 }}
          >
            Proposed
          </AppText>
          {dates.map((d, i) => (
            <DateCard
              key={d.id}
              entry={d}
              index={i}
              onPress={() => {
                setSelected(d);
                setSheet("view");
              }}
            />
          ))}

          <Pressable style={styles.addBtn} onPress={() => setSheet("manual")}>
            <AppText variant="smallCaps" color={Colors.accent}>
              + Propose manually
            </AppText>
          </Pressable>

          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* Date detail sheet */}
      <BottomSheet
        open={sheet === "view" && !!selected}
        onClose={() => setSheet(null)}
        kicker={`DATE · ${selected?.status.toUpperCase() ?? ""}`}
        title={selected?.venue ?? ""}
      >
        {selected && (
          <>
            <View style={styles.proposalBlock}>
              <AppText
                variant="smallCaps"
                color={Colors.accent}
                style={{ marginBottom: 14 }}
              >
                THE PROPOSAL
              </AppText>

              <AppText
                variant="smallCaps"
                color={Colors.muted}
                style={{ marginBottom: 6, marginTop: 10 }}
              >
                Venue
              </AppText>
              <AppText variant="heading" size={18} style={{ marginBottom: 4 }}>
                {selected.venue}
              </AppText>

              <AppText
                variant="smallCaps"
                color={Colors.muted}
                style={{ marginBottom: 6, marginTop: 10 }}
              >
                Date
              </AppText>
              <AppText variant="heading" size={18} style={{ marginBottom: 4 }}>
                {selected.date}
              </AppText>

              <AppText
                variant="smallCaps"
                color={Colors.muted}
                style={{ marginBottom: 6, marginTop: 10 }}
              >
                Time
              </AppText>
              <AppText variant="heading" size={18} style={{ marginBottom: 4 }}>
                {selected.exactTime}
              </AppText>

              <AppText
                variant="smallCaps"
                color={Colors.muted}
                style={{ marginBottom: 6, marginTop: 10 }}
              >
                Meet
              </AppText>
              <AppText variant="heading" size={18} style={{ marginBottom: 4 }}>
                {selected.meetType}
              </AppText>
            </View>
{selected.status ===  "completed" &&  (
            <AppText
              variant="serifItalic"
              size={18}
              style={{
                marginBottom: 18,
                borderLeftWidth: 2,
                borderColor: Colors.accent,
                padding: 15,
                color: Colors.muted,
              }}
            >
              "The city lights were incredible."
            </AppText>
   )}
            <View>
              <View style={styles.sheetActions}>
                {" "}
                {selected.status === "proposed" && (
                  <>
                    <AppButton
                      variant="accent"
                      size="lg"
                      style={{ flex: 1 }}
                      onPress={() => {
                        setDates((p) =>
                          p.map((d) =>
                            d.id === selected.id
                              ? { ...d, status: "accepted" }
                              : d,
                          ),
                        );
                        setSheet(null);
                      }}
                    >
                      Accept →
                    </AppButton>
                    <AppButton
                      variant="outline"
                      size="lg"
                      style={{ flex: 1 }}
                      onPress={() => {
                        setDates((p) => p.filter((d) => d.id !== selected.id));
                        setSheet(null);
                      }}
                    >
                      Pass
                    </AppButton>
                    <AppButton
                      variant="outline"
                      size="lg"
                      style={{ flex: 1 }}
                     
                    >
                      Edit
                    </AppButton>
                  </>
                )}
              </View>
              {selected.status === "accepted" && (
                <>
                  <View style={styles.proposalBlock}>
                    <AppText
                      variant="smallCaps"
                      color={Colors.accent}
                      style={{ marginBottom: 14 }}
                    >
                      PLANS CHANGE
                    </AppText>
                    <View  style={styles.gridContainer}>
                     <Pressable style={styles.gridItem} onPress={() => setPingSheet(true)}>
  <AppText variant="smallCaps">◐ Running late</AppText>
</Pressable>

<Pressable style={styles.gridItem} onPress={() => setCancelSheet(true)}>
  <AppText variant="smallCaps">◇ Cancel</AppText>
</Pressable>
                    </View>
                  </View>
                  <AppButton
                    full
                    variant="solid"
                    size="lg"
                    onPress={() => {
                      setStars(0);
                      setMemory("");
                      setSheet("rate");
                    }}
                  >
                    Rate this date ★
                  </AppButton>
                </>
              )}
            </View>
          </>
        )}
      </BottomSheet>

      {/* Rate sheet */}
      <BottomSheet
        open={sheet === "rate"}
        onClose={() => setSheet(null)}
        kicker="RATE"
        title="How was it?"
      >
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Pressable key={s} onPress={() => setStars(s)}>
              <AppText
                size={36}
                color={s <= stars ? Colors.accent : Colors.rule}
              >
                {s <= stars ? "★" : "☆"}
              </AppText>
            </Pressable>
          ))}
        </View>
        <AppTextInput
          label="Memory note"
          n="01"
          value={memory}
          onChangeText={setMemory}
          placeholder="One sentence that captures it..."
          multiline
        />
        <AppButton
          full
          variant="solid"
          size="lg"
          onPress={() => {
            if (selected) {
              setDates((p) =>
                p.map((d) =>
                  d.id === selected.id
                    ? { ...d, status: "completed", rating: stars, memory }
                    : d,
                ),
              );
            }
            setSheet(null);
          }}
        >
          Save memory →
        </AppButton>
      </BottomSheet>

      {/* Manual propose */}
      <BottomSheet
        open={sheet === "manual"}
        onClose={() => setSheet(null)}
        kicker="NEW"
        title="Propose a date"
      >
        <AppTextInput label="Title" n="01" placeholder="Sunset Rooftop Night" />
        <AppTextInput
          label="Location"
          n="02"
          placeholder="Venue or neighborhood"
        />
        <AppTextInput
          label="Description"
          n="02"
          placeholder="What's the plan?"
        />
        <AppButton
          full
          variant="solid"
          size="lg"
          onPress={() => setSheet(null)}
        >
          Propose →
        </AppButton>
      </BottomSheet>
      <BottomSheet
        open={pingSheet}
        onClose={() => setPingSheet(false)}
        kicker="RUNNING LATE"
        title="Ping Amanda"
      >
        <View >
          <AppText variant="serifItalic" size={15} color={Colors.muted} style={{ marginBottom: 20 }}>
            A quick heads-up. They'll get it as a notification.
          </AppText>

          <AppText variant="smallCaps" color={Colors.ink2} style={{ marginBottom: 12 }}>01 HOW LATE</AppText>
          
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 30 }}>
            {["5 MIN", "10 MIN", "15 MIN", "30 MIN", "45 MIN", "60 MIN"].map((time) => (
              <Pressable
                key={time}
                style={[styles.delayChip, selectedDelay === time && styles.delayChipActive]}
                onPress={() => setSelectedDelay(time)}
              >
                <AppText variant="smallCaps" style={{ color: selectedDelay === time ? "#fff" : "#000" }}>{time}</AppText>
              </Pressable>
            ))}
          </View>

         
          <AppTextInput
          label="A note (optional)" n="01"
            multiline
            placeholder="Stuck at work — leaving soon"
            value={pingNote}
            onChangeText={setPingNote}
            style={{ minHeight: 80 }}
          />

          <AppButton full variant="solid" size="lg" style={{ marginTop: 30, backgroundColor: "#1C1C1E" }} onPress={() => setPingSheet(false)}>
            SEND PING →
          </AppButton>
        </View>
      </BottomSheet>
      {/* ====================== CHANGE OF PLANS BOTTOMSHEET ====================== */}
      <BottomSheet
        open={cancelSheet}
        onClose={() => setCancelSheet(false)}
        kicker="CANCELLING"
        title="Change of plans"
      >
        <View >
          <AppText variant="serifItalic" size={15} color={Colors.muted} style={{ marginBottom: 20 }}>
            Short, honest, kind. A few words go a long way.
          </AppText>

         
          <AppTextInput
          label="A brief reason" n="01"
            multiline
            placeholder="Something came up at work — let's try again this weekend"
            value={cancelReason}
            onChangeText={setCancelReason}
            style={{ minHeight: 120 }}
          />

          <AppButton full variant="solid" size="lg" style={{ marginTop: 30, backgroundColor: "#1C1C1E" }} onPress={() => setCancelSheet(false)}>
            SEND AND CANCEL →
          </AppButton>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bone },
  inner: { padding: 24 },

  generatorCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.rule,
    overflow: "hidden",
    backgroundColor: Colors.bone,
    marginBottom: 28,
  },
  genHeader: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
    backgroundColor: Colors.cream,
  },
  gridContainer: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 8,
  },

  gridItem: {
    flex: 1, // Equal width
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 3,

    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.rule,
  },
  chipSelected: {
    backgroundColor: "#1C1C1E",
    borderColor: "#1C1C1E",
  },

  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    borderBottomWidth: 1,
    borderColor: Colors.rule,
  },

  meetOptions: {
    gap: 8,
  },
  meetOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#EAE2D4",
    borderRadius: 12,
  },
  meetSelected: {
    backgroundColor: "#1C1C1E",
  },
  radio: {
    width: 6,
    height: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.rule,
  },
  radioSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },

  generateBtn: {
    backgroundColor: Colors.accent,
    marginTop: 28,
  },

  addBtn: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
    marginTop: 4,
  },
  proposalBlock: {
    padding: 18,
    borderRadius: 14,
    backgroundColor: Colors.cream,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: Colors.rule,
  },
  sheetActions: { flexDirection: "row", gap: 10 },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 20,
    marginBottom: 20,
  },
  delayChip: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,

    backgroundColor: "#EAE2D4",
  },
  delayChipActive: {
    backgroundColor: "#1C1C1E",
    borderColor: "#1C1C1E",
  },
});
