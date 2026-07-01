import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { AppTextInput } from "../../components/ui/AppTextInput";
import { BottomSheet } from "../../components/ui/BottomSheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import SamVibeNav from "@/components/ui/SamVibeNav";
import { getVibeProfile } from "../../services/vibeCheckApi";
import {
  proposeVibeDate,
  listVibeDates,
  updateVibeDate,
  deleteVibeDate,
  respondToVibeDate,
} from "../../services/vibeDatesApi";

const getTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const VCDatesScreen: React.FC = () => {
  const [dates, setDates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  
  // Partner tracking to filter dates
  const [activePartners, setActivePartners] = useState<any[]>([]);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("Partner");

  const [sheet, setSheet] = useState(false);
  const [editingDate, setEditingDate] = useState<any | null>(null);

  // Form States
  const [place, setPlace] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [meetType, setMeetType] = useState<"location" | "pickup" | "pickedup">("location");
  const [note, setNote] = useState("");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const formatDisplayTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const profile = await getVibeProfile().catch(() => null);
      let currentPartnerId = partnerId;

      if (profile) {
        setMyUserId(profile.user_id);
        const allPartners = [
          ...(profile.active_users || []),
          ...(profile.inactive_users || []),
        ];
        setActivePartners(allPartners);

        if (allPartners.length > 0 && !currentPartnerId) {
          currentPartnerId = allPartners[0].user_id;
          setPartnerId(currentPartnerId);
          setPartnerName(allPartners[0].name);
        }
      }

      const res = await listVibeDates(1, 100, getTimezone()).catch(() => null);
      if (res?.data) {
        setDates(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handlePartnerChange = (newPartnerId: string) => {
    const p = activePartners.find((ap) => ap.user_id === newPartnerId);
    if (p) {
      setPartnerId(newPartnerId);
      setPartnerName(p.name);
    }
  };

  const handleDateChange = (_: any, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) setSelectedDate(selected);
  };

  const handleTimeChange = (_: any, selected?: Date) => {
    setShowTimePicker(false);
    if (selected) setSelectedTime(selected);
  };

  const openNewSheet = () => {
    setEditingDate(null);
    setPlace("");
    setSelectedDate(new Date());
    setSelectedTime(new Date());
    setMeetType("location");
    setNote("");
    setSheet(true);
  };

  const openEditSheet = (d: any) => {
    setEditingDate(d);
    setPlace(d.where);
    const [year, month, day] = d.date.split("-");
    const [hour, minute] = d.time.split(":");
    setSelectedDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
    const t = new Date();
    t.setHours(parseInt(hour), parseInt(minute), 0, 0);
    setSelectedTime(t);
    setMeetType(d.how_we_meet as any);
    setNote(d.note || "");
    setSheet(true);
  };

  const saveDate = async () => {
    if (!partnerId) {
      Alert.alert("No Partner", "You need an active partner to propose a date.");
      return;
    }
    if (!place.trim()) {
      Alert.alert("Missing Info", "Please enter where you're going.");
      return;
    }

    const payload = {
      where: place.trim(),
      date: selectedDate.toISOString().split("T")[0],
      time: selectedTime.toTimeString().slice(0, 5),
      how_we_meet: meetType,
      note: note.trim() || undefined,
      timezone: getTimezone(),
    };

    try {
      if (editingDate) {
        await updateVibeDate(editingDate.id, payload);
      } else {
        await proposeVibeDate({ ...payload, partner_id: partnerId });
      }
      setSheet(false);
      fetchData();
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.detail || e.message || "Failed to save date.");
    }
  };

  const handleCancelDate = (id: string) => {
    Alert.alert(
      "Cancel Date",
      "Are you sure you want to cancel this date proposal?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVibeDate(id);
              fetchData();
            } catch (e: any) {
              Alert.alert("Error", e.response?.data?.detail || "Failed to cancel date.");
            }
          },
        },
      ]
    );
  };

  const handleRespond = async (id: string, action: "accepted" | "rejected") => {
    try {
      await respondToVibeDate(id, { action });
      fetchData();
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.detail || "Failed to respond.");
    }
  };

  // Filter dates for the active partner
  const partnerDates = dates.filter(
    (d) => d.partner_id === partnerId || d.proposer_id === partnerId
  );

  const upcoming = partnerDates.filter((d) => {
    if (d.status === "rejected") return false;
    const dateObj = new Date(`${d.date}T${d.time}`);
    return dateObj >= new Date(new Date().setHours(0, 0, 0, 0));
  });

  const past = partnerDates.filter((d) => {
    if (d.status === "rejected") return false;
    const dateObj = new Date(`${d.date}T${d.time}`);
    return dateObj < new Date(new Date().setHours(0, 0, 0, 0));
  });

  return (
    <SafeAreaView style={styles.safe}>
      <SamVibeNav onPartnerChange={handlePartnerChange} />
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
            What's next between you two.
          </AppText>

          <AppText
            variant="smallCaps"
            color={Colors.ink2}
            style={{ marginBottom: 14 }}
          >
            Next up
          </AppText>

          {loading ? (
            <ActivityIndicator color={Colors.accent} style={{ marginVertical: 20 }} />
          ) : upcoming.length > 0 ? (
            upcoming.map((dateItem) => {
              const isMine = dateItem.proposer_id === myUserId;
              const isPending = dateItem.status === "pending" || dateItem.status === "proposed_changes";
              
              let statusLabel = "";
              let statusColor = Colors.muted;
              if (dateItem.status === "accepted") {
                  statusLabel = "● Confirmed";
                  statusColor = Colors.accent;
              } else if (isPending) {
                  statusLabel = isMine ? "○ Proposed (Waiting for them)" : "● Proposed (Waiting for you)";
                  statusColor = isMine ? Colors.muted : Colors.sage;
              }

              return (
                <View key={dateItem.id} style={styles.upcomingCard}>
                  <AppText
                    variant="smallCaps"
                    color={statusColor}
                    style={{ marginBottom: 8 }}
                  >
                    {statusLabel}
                  </AppText>
                  <AppText
                    variant="display"
                    size={26}
                    style={{ lineHeight: 28, marginBottom: 8 }}
                  >
                    {dateItem.where}
                  </AppText>
                  <AppText
                    variant="serifItalic"
                    size={16}
                    color={Colors.muted}
                    style={{ marginBottom: 8 }}
                  >
                    {formatDisplayDate(new Date(dateItem.date))} · {dateItem.time}
                  </AppText>
                  {dateItem.note && (
                    <AppText
                      variant="serifItalic"
                      size={14}
                      color={Colors.ink2}
                      style={{
                        lineHeight: 22,
                        borderTopWidth: 1,
                        borderTopColor: Colors.rule,
                        paddingTop: 12,
                        marginTop: 4,
                      }}
                    >
                      "{dateItem.note}"
                    </AppText>
                  )}

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
                    {!isMine && isPending ? (
                      <>
                        <AppButton
                          variant="solid"
                          size="sm"
                          style={{ flex: 1 }}
                          onPress={() => handleRespond(dateItem.id, "accepted")}
                        >
                          Accept
                        </AppButton>
                        <AppButton
                          variant="outline"
                          size="sm"
                          style={{ flex: 1 }}
                          onPress={() => openEditSheet(dateItem)}
                        >
                          Change
                        </AppButton>
                        <AppButton
                          variant="outline"
                          size="sm"
                          style={{ flex: 1 }}
                          onPress={() => handleRespond(dateItem.id, "rejected")}
                        >
                          Decline
                        </AppButton>
                      </>
                    ) : (
                      <>
                        <AppButton
                          variant="outline"
                          size="sm"
                          style={{ flex: 1 }}
                          onPress={() => openEditSheet(dateItem)}
                        >
                          Edit
                        </AppButton>
                        <AppButton
                          variant="outline"
                          size="sm"
                          style={{ flex: 1 }}
                          onPress={() => handleCancelDate(dateItem.id)}
                        >
                          Cancel
                        </AppButton>
                      </>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <AppButton
              full
              variant="outline"
              size="lg"
              onPress={openNewSheet}
              style={{ marginBottom: 18 }}
            >
              + Plan something
            </AppButton>
          )}
          
          {upcoming.length > 0 && (
             <AppButton
                full
                variant="outline"
                size="md"
                onPress={openNewSheet}
                style={{ marginBottom: 18, marginTop: 8 }}
              >
                + Plan another
              </AppButton>
          )}

          <AppText
            variant="smallCaps"
            color={Colors.ink2}
            style={{ marginTop: 24, marginBottom: 14 }}
          >
            The history
          </AppText>
          {past.length === 0 ? (
             <AppText variant="serifItalic" color={Colors.muted} style={{ textAlign: 'center', marginTop: 12 }}>
                 No past dates recorded yet.
             </AppText>
          ) : (
             past.map((d, i) => (
                <View key={d.id || i} style={styles.pastCard}>
                  <View>
                    <AppText variant="heading" size={15}>
                      {d.where}
                    </AppText>
                    <AppText
                      variant="mono"
                      color={Colors.light}
                      style={{ fontSize: 9, marginTop: 2 }}
                    >
                      {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()} · {d.status.toUpperCase()}
                    </AppText>
                    {d.note && (
                        <AppText
                          variant="serifItalic"
                          size={13}
                          color={Colors.muted}
                          style={{ marginTop: 4 }}
                        >
                          {d.note}
                        </AppText>
                    )}
                  </View>
                </View>
             ))
          )}

          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* Plan / Edit Date BottomSheet */}
      <BottomSheet
        open={sheet}
        onClose={() => setSheet(false)}
        kicker={editingDate ? "EDIT" : "NEW"}
        title={editingDate ? "Edit this date" : "Plan a date"}
      >
        <AppTextInput
          label="WHERE"
          n="01"
          value={place}
          onChangeText={setPlace}
          placeholder="The Fat Radish"
        />

        {/* Date Picker */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: Colors.rule }}>
          <AppText
            variant="smallCaps"
            color={Colors.ink2}
            style={{ marginBottom: 8 }}
          >
            02 Date
          </AppText>
          <Pressable
            style={styles.datePickerRow}
            onPress={() => setShowDatePicker(true)}
          >
            <AppText variant="display" size={20}>
              {formatDisplayDate(selectedDate)}
            </AppText>
            <Ionicons name="calendar-outline" size={26} color="#000" />
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </View>

        {/* Time Picker */}
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: Colors.rule,
            marginBottom: 20,
            paddingTop: 10,
          }}
        >
          <AppText
            variant="smallCaps"
            color={Colors.ink2}
            style={{ marginBottom: 8 }}
          >
            03 TIME
          </AppText>
          <Pressable
            style={styles.datePickerRow}
            onPress={() => setShowTimePicker(true)}
          >
            <AppText variant="display" size={20}>
              {formatDisplayTime(selectedTime)}
            </AppText>
            <Ionicons name="time-outline" size={26} color="#000" />
          </Pressable>
          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              is24Hour={false}
              onChange={handleTimeChange}
            />
          )}
        </View>

        {/* How We Meet */}
        <AppText
          variant="smallCaps"
          color={Colors.ink2}
          style={{ marginBottom: 10 }}
        >
          04 HOW WE MEET
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
              variant="mono"
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

        <AppTextInput
          label="A NOTE (optional)"
          n="05"
          value={note}
          onChangeText={setNote}
          placeholder="Low key dinner..."
          multiline
        />

        <AppButton
          full
          variant="solid"
          size="lg"
          style={{ marginTop: 28 }}
          onPress={saveDate}
        >
          {editingDate ? "Update Date →" : "Propose Date →"}
        </AppButton>
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bone },
  inner: { padding: 24 },
  upcomingCard: {
    borderRadius: 14,
    padding: 22,
    backgroundColor: Colors.bone,
    borderWidth: 1,
    borderColor: `${Colors.accent}30`,
    marginBottom: 12,
  },
  pastCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: Colors.bone,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.rule,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  datePickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
  },
  meetOptions: {
    marginBottom: 10,
    gap: 8,
  },
  meetOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
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
});
