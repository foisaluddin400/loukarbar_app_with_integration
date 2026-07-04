import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Colors } from "../../constants/colors";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { Tag } from "../../components/ui/Tag";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { PinCard } from "../../components/map/PinCard";
import { usePersist } from "../../hooks/usePersist";
import { MapPin, PinType } from "../../types";
import { AppTextInput } from "@/components/ui/AppTextInput";
import AlignedNav from "@/components/ui/AlignedNav";

const SEED_PINS: MapPin[] = [
  {
    id: 1,
    city: "Los Angeles",
    country: "USA",
    lat: 34,
    lng: -118,
    type: "home",
    owner: "lou",
    note: "Sunsets and Griffith hikes.",
  },
  {
    id: 2,
    city: "Turin",
    country: "Italy",
    lat: 45,
    lng: 7.7,
    type: "home",
    owner: "amanda",
    note: "Cobblestones, espresso, alpine air.",
  },
  {
    id: 3,
    city: "New York",
    country: "USA",
    lat: 40.7,
    lng: -74,
    type: "together",
    dates: "Dec 2024",
    note: "Our first trip together.",
  },
  {
    id: 4,
    city: "Lake Como",
    country: "Italy",
    lat: 45.9,
    lng: 9.3,
    type: "together",
    dates: "Aug 2024",
    note: "Long lunches, slow boats.",
  },
  {
    id: 5,
    city: "Paris",
    country: "France",
    lat: 49,
    lng: 2,
    type: "bucket",
    note: "A dream long in the making.",
  },
  {
    id: 6,
    city: "Tulum",
    country: "Mexico",
    lat: 20,
    lng: -87,
    type: "upcoming",
    note: "Spring reunion trip — booked.",
    dates: "March 20–27",
  },
];

const TYPE_FILTERS = ["all", "home", "together", "upcoming", "bucket"] as const;
const PIN_META = {
  home: { label: "Home", color: Colors.muted },
  together: { label: "Together", color: Colors.accent },
  upcoming: { label: "Upcoming", color: Colors.sage },
  bucket: { label: "Bucket", color: Colors.light },
};
type MeetType = "location" | "pickup" | "pickedup";

// 2. State with proper type

const Moment = [
  { name: "Play", mark: "◐" },
  { name: "VCDates", mark: "◇" },
  { name: "History", mark: "◈" },
  { name: "Pulse", mark: "✦" },
];

export const MapScreen: React.FC = () => {
  const [pins, setPins] = usePersist<MapPin[]>("map.pins", SEED_PINS);
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<MapPin | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [meetType, setMeetType] = useState<MeetType>("location");

  // 3. Options array with proper typing
  const meetOptions = [
    { label: "Together", value: "location" as MeetType },
    { label: "Upcoming", value: "pickup" as MeetType },
    { label: "Bucket", value: "pickedup" as MeetType },
  ] as const;
  const filtered =
    filter === "all" ? pins : pins.filter((p) => p.type === filter);
  const stats = {
    countries: new Set(pins.map((p) => p.country)).size,
    cities: pins.length,
    together: pins.filter((p) => p.type === "together").length,
    bucket: pins.filter((p) => p.type === "bucket").length,
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
            Map
            <AppText size={42} color={Colors.accent}>
              .
            </AppText>
          </AppText>
          <AppText
            variant="serifItalic"
            size={16}
            color={Colors.muted}
            style={{ lineHeight: 24, marginBottom: 20 }}
          >
            Places been, places dreamt.
          </AppText>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { n: stats.countries, l: "Countries" },
              { n: stats.cities, l: "Cities" },
              { n: stats.together, l: "Together" },
              { n: stats.bucket, l: "Bucket" },
            ].map((s, i) => (
              <View
                key={i}
                style={[styles.statBlock, i < 3 && styles.statBorder]}
              >
                <AppText
                  variant="display"
                  size={24}
                  color={Colors.ink}
                  style={{ lineHeight: 24 }}
                >
                  {s.n}
                </AppText>
                <AppText
                  variant="smallCaps"
                  color={Colors.muted}
                  style={{ marginTop: 4 }}
                >
                  {s.l}
                </AppText>
              </View>
            ))}
          </View>

          {/* Map placeholder */}
          <View style={styles.mapPlaceholder}>
            <AppText
              variant="serifItalic"
              size={15}
              color={Colors.muted}
              style={{ textAlign: "center" }}
            >
              Interactive world map{"\n"}
              <AppText variant="mono" size={10} color={Colors.light}>
                (Integrate react-native-maps or react-native-svg for full
                implementation)
              </AppText>
            </AppText>
            {/* Legend */}
            <View style={styles.legend}>
              {Object.entries(PIN_META).map(([k, m]) => (
                <View
                  key={k}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <View
                    style={[styles.legendDot, { backgroundColor: m.color }]}
                  />
                  <AppText
                    variant="mono"
                    color={Colors.muted}
                    style={{ fontSize: 9 }}
                  >
                    {m.label.toUpperCase()}
                  </AppText>
                </View>
              ))}
            </View>
          </View>

          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 18 }}
          >
            <View style={{ flexDirection: "row", gap: 6 }}>
              {TYPE_FILTERS.map((t) => (
                <Tag key={t} active={filter === t} onPress={() => setFilter(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Tag>
              ))}
            </View>
          </ScrollView>

          {/* Pin list header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 14,
            }}
          >
            <AppText variant="smallCaps" color={Colors.ink2}>
              {filtered.length} places
            </AppText>
            <AppButton
              variant="ghost"
              size="sm"
              onPress={() => setSheet("new")}
            >
              + ADD
            </AppButton>
          </View>

          {filtered.map((p) => (
            <PinCard
              key={p.id}
              pin={p}
              onPress={() => {
                setSelected(p);
                setSheet("detail");
              }}
            />
          ))}

          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* Detail sheet */}
      {/* Detail BottomSheet */}
      <BottomSheet
        open={sheet === "detail" && !!selected}
        onClose={() => setSheet(null)}
        kicker={selected ? PIN_META[selected.type].label.toUpperCase() : ""}
        title={selected?.city ?? ""}
      >
        {selected && (
          <>
            <AppText
              variant="mono"
              color={Colors.muted}
              style={{ fontSize: 10, marginBottom: 18 }}
            >
              {selected.country.toUpperCase()} · {selected.lat}°, {selected.lng}
              °
            </AppText>

            <AppText
              variant="serifItalic"
              size={17}
              color={Colors.ink2}
              style={{ lineHeight: 26, marginBottom: 24 }}
            >
              {selected.note}
            </AppText>

            {selected.dates && (
              <View style={styles.dateBlock}>
                <AppText
                  variant="smallCaps"
                  color={Colors.accent}
                  style={{ marginBottom: 4 }}
                >
                  When
                </AppText>
                <AppText variant="heading" size={16}>
                  {selected.dates}
                </AppText>
              </View>
            )}

            {/* ==================== MOMENT SECTION ==================== */}
            <AppText
              variant="smallCaps"
              color={Colors.ink2}
              style={{ marginTop: 28, marginBottom: 12 }}
            >
              IN THIS MOMENT
            </AppText>

            <View style={styles.momentGrid}>
              {Moment.map((item, index) => (
                <View key={index} style={styles.momentCard}>
                  <AppText style={styles.momentMark}>{item.mark}</AppText>
                  <AppText
                    variant="mono"
                    style={{ fontSize: 12, marginTop: 6 }}
                  >
                    {item.name}
                  </AppText>
                </View>
              ))}
            </View>

            {selected.type === "bucket" && (
              <AppButton
                full
                variant="accent"
                size="lg"
                style={{ marginTop: 24, marginBottom: 10 }}
                onPress={() => {
                  const upd = {
                    ...selected,
                    type: "upcoming" as PinType,
                    dates: "TBD",
                  };
                  setSelected(upd);
                  setPins((p) =>
                    p.map((x) => (x.id === selected.id ? upd : x)),
                  );
                }}
              >
                Plan a trip here →
              </AppButton>
            )}

            <AppButton
              full
              variant="outline"
              size="lg"
              onPress={() => setSheet(null)}
            >
              Close
            </AppButton>
          </>
        )}
      </BottomSheet>

      {/* Add pin sheet */}
      <BottomSheet
        open={sheet === "new"}
        onClose={() => setSheet(null)}
        kicker="NEW"
        title="Mark a place"
      >
        <AppText
          variant="serifItalic"
          size={15}
          color={Colors.muted}
          style={{ marginBottom: 22 }}
        >
          Add a city to your shared map.
        </AppText>

        <AppTextInput label="City" n="01" placeholder="Lisbon" />
        <AppTextInput label="Country" n="02" placeholder="Portugal" />

        <View style={styles.meetOptions}>
          {meetOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.meetOption,
                meetType === option.value && styles.meetSelected,
              ]}
              onPress={() => setMeetType(option.value)} // ← No 'as any' needed
            >
              <AppText
                variant="smallCaps"
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
          label="A Note"
          n="04"
          placeholder="What Draws you there..."
        />

        <AppButton
          full
          variant="solid"
          size="lg"
          onPress={() => {
            const np: MapPin = {
              id: Date.now(),
              city: "New City",
              country: "—",
              lat: Math.random() * 80 - 40,
              lng: Math.random() * 300 - 150,
              type: "bucket",
              note: "",
            };
            setPins((p) => [...p, np]);
            setSheet(null);
          }}
        >
          Add to map →
        </AppButton>
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bone },
  inner: { padding: 24 },
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.cream,
    borderRadius: 14,
    marginBottom: 16,
    padding: 14,
  },
  statBlock: { flex: 1, alignItems: "center" },
  statBorder: { borderRightWidth: 1, borderRightColor: Colors.rule },
  mapPlaceholder: {
    aspectRatio: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.rule,
    backgroundColor: Colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    padding: 20,
    gap: 12,
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

  momentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  momentCard: {
    flex: 1,
    minWidth: "47%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    backgroundColor: Colors.bone,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 14,
  },
  momentMark: {
    fontSize: 32,
    color: Colors.accent,
  },
  legend: {
    flexDirection: "row",
    gap: 14,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  dateBlock: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: `${Colors.accent}10`,
    marginBottom: 22,
  },
});
