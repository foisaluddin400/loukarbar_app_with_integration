import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from "react-native";
import { Colors } from "../../constants/colors";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { Rule } from "../../components/ui/Rule";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { PresenceStrip } from "../../components/home/PresenceStrip";
import { CountdownBlock } from "../../components/home/CountdownBlock";
import { usePersist } from "../../hooks/usePersist";
import { useTimeOfDay } from "../../hooks/useTimeOfDay";
import { formatTime } from "../../utils/dateUtils";
import UsSection from "./UsSection";
import Rhythms from "./Rhythms";
import { AppTextInput } from "@/components/ui/AppTextInput";
import AlignedNav from "@/components/ui/AlignedNav";
import OurPlaylist from "./OurPlaylist";
import { usePresenceTracker } from "../../hooks/usePresenceTracker";
import { getMe } from "../../services/authApi";
import { getStreak } from "../../services/streakApi";
import { completeRitual } from "../../services/ritualApi";
import { createCheckin, updateCheckin, getCheckin, getQuestionsEndpoint } from "../../services/checkinApi";

const MOODS_DESIRE = [
  { mark: "◯", label: "At peace" },
  { mark: "◈", label: "Loving" },
  { mark: "✦", label: "Flirtatious" },
  { mark: "◆", label: "Passionate" },
  { mark: "✧", label: "Needing you" },
  { mark: "·", label: "Thinking of you" },
];

const RITUAL_BY_TOD: Record<
  string,
  { title: string; sub: string; cta: string; sheet: string }
> = {
  morning: {
    title: "Morning appreciation",
    sub: "Start the day with one thing you love about them.",
    cta: "Write",
    sheet: "appreciation",
  },
  afternoon: {
    title: "Midday check-in",
    sub: "A gentle pulse on how you're both doing.",
    cta: "Check in",
    sheet: "checkin",
  },
  evening: {
    title: "Evening appreciation",
    sub: "Send one appreciation before the day closes.",
    cta: "Write",
    sheet: "appreciation",
  },
  night: {
    title: "A check-in before bed",
    sub: "A pulse on where you each landed today.",
    cta: "Check in",
    sheet: "checkin",
  },
  late: {
    title: "Late night whisper",
    sub: "Send something tender before sleep.",
    cta: "Write",
    sheet: "appreciation",
  },
};

export const HomeScreen: React.FC = () => {
  usePresenceTracker();
  const tod = useTimeOfDay();
  const ritual = RITUAL_BY_TOD[tod];
  const [activeUsTab, setActiveUsTab] = useState<"TIME" | "DATES" | "REUNION">(
    "TIME",
  );
  const [userName, setUserName] = useState<string>("User");

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getMe();
        if (data && data.name) {
          const firstName = data.name.trim().split(" ")[0];
          setUserName(firstName);
        }
      } catch (err) {
        console.log("Error fetching user for greeting:", err);
      }
    };
    fetchUser();
  }, []);

  const [activeUser] = useState<"lou" | "amanda">("lou");
  const [sheet, setSheet] = useState<string | null>(null);
  const [louMood, setLouMood] = usePersist<number>("home.louMood", 1);
  const [amandaMood, setAmandaMood] = usePersist<number>("home.amandaMood", 3);
  const [weScore] = usePersist<number>("home.weScore", 72);
  const [streak, setStreak] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Appreciation State
  const [appreciationText, setAppreciationText] = useState("");

  // Checkin State
  const [checkinQ1, setCheckinQ1] = useState("");
  const [checkinQ2, setCheckinQ2] = useState("");
  const [checkinQ3, setCheckinQ3] = useState("");
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [partnerCheckin, setPartnerCheckin] = useState<any>(null);
  const [showPartnerCheckin, setShowPartnerCheckin] = useState(false);
  
  const [questions, setQuestions] = useState({
    question_1: "How are you feeling?",
    question_2: "What do you need most?",
    question_3: "One thing on your mind..."
  });

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const streakData = await getStreak(tz);
        if (streakData) setStreak(streakData.current_streak);
      } catch (e) {
        console.log("Error fetching streak:", e);
      }

      try {
        const qData = await getQuestionsEndpoint();
        if (qData && qData.data) {
          setQuestions(qData.data);
        }
      } catch (e) {
        console.log("Error fetching questions:", e);
      }

      try {
        const today = new Date().toLocaleDateString('en-US', {
          month: '2-digit', day: '2-digit', year: 'numeric'
        }).replace(/\//g, '.');
        const checkinData = await getCheckin(today);
        if (checkinData && checkinData.data) {
          if (checkinData.data.my_check_in) {
            setCheckinQ1(checkinData.data.my_check_in.answer_1);
            setCheckinQ2(checkinData.data.my_check_in.answer_2);
            setCheckinQ3(checkinData.data.my_check_in.answer_3);
            setHasCheckedInToday(true);
          }
          if (checkinData.data.partner_check_in) {
            setPartnerCheckin(checkinData.data.partner_check_in);
          }
        }
      } catch (e) {
        console.log("Error fetching existing checkin:", e);
      }
    };
    loadData();
  }, []);

  const handleAppreciationSubmit = async () => {
    if (!appreciationText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await completeRitual({
        ritual_type: 'appreciation',
        text: appreciationText,
        timezone: tz,
        time_name: tod
      });
      setStreak(res.streak);
      setSheet(null);
      setAppreciationText("");
    } catch (e) {
      console.log("Error completing appreciation:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckinSubmit = async () => {
    if (!checkinQ1.trim() || !checkinQ2.trim() || !checkinQ3.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const today = new Date().toLocaleDateString('en-US', {
        month: '2-digit', day: '2-digit', year: 'numeric'
      }).replace(/\//g, '.');
      
      if (hasCheckedInToday) {
        await updateCheckin({
          date: today,
          answer_1: checkinQ1,
          answer_2: checkinQ2,
          answer_3: checkinQ3,
          timezone: tz,
          time_name: tod
        });
      } else {
        await createCheckin({
          date: today,
          answer_1: checkinQ1,
          answer_2: checkinQ2,
          answer_3: checkinQ3,
          timezone: tz,
          time_name: tod
        });
        
        const res = await completeRitual({
          ritual_type: 'checkin',
          timezone: tz,
          time_name: tod
        });
        setStreak(res.streak);
        setHasCheckedInToday(true);
      }
      
      setSheet(null);
    } catch (e) {
      console.log("Error submitting checkin:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reunionDate = new Date("2026-03-15");
  const days = Math.floor(
    (Date.now() - new Date("2023-11-14").getTime()) / 86_400_000,
  );

  const greeting = {
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night",
    late: "night",
  }[tod];

  return (
    <SafeAreaView style={styles.safe}>
      <AlignedNav></AlignedNav>
      <ScrollView showsVerticalScrollIndicator={false}>
        <PresenceStrip />

        <View style={styles.inner}>
          {/* Greeting */}
          <View style={styles.greeting}>
            <AppText
              variant="mono"
              color={Colors.muted}
              style={{ fontSize: 10, marginBottom: 12 }}
            >
              {new Date()
                .toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })
                .toUpperCase()}
            </AppText>
            <AppText variant="display" size={44} style={{ lineHeight: 44 }}>
              Good{" "}
              <AppText variant="serifItalic" size={44} color={Colors.accent}>
                {greeting}
              </AppText>
              {`,\n${userName}.`}
            </AppText>
          </View>

          {/* Hero: Score + Ritual */}
          <View style={styles.heroCard}>
            {/* Score */}
            <Pressable
              style={styles.scoreBlock}
              onPress={() => setSheet("sync")}
            >
              <AppText
                variant="display"
                size={62}
                color={Colors.ink}
                style={{ lineHeight: 62 }}
              >
                {weScore}
              </AppText>
              <AppText
                variant="smallCaps"
                color={Colors.muted}
                style={{ marginTop: 8 }}
              >
                Sync
              </AppText>
              <Rule style={{ marginVertical: 12 }} />
              <Pressable onPress={() => setSheet("streak")}>
                <AppText
                  variant="mono"
                  color={Colors.accent}
                  style={{ fontSize: 10 }}
                >
                  {streak}D STREAK
                </AppText>
              </Pressable>
            </Pressable>
            {/* Ritual */}
            <View style={styles.ritualBlock}>
              <AppText
                variant="smallCaps"
                color={Colors.muted}
                style={{ marginBottom: 8 }}
              >
                Ritual · {formatTime(new Date())}
              </AppText>
              <AppText
                variant="display"
                size={22}
                style={{ lineHeight: 26, marginBottom: 6, letterSpacing:0.1 }}
              >
                {ritual.title}
              </AppText>
              <AppText
                variant="serifItalic"
                size={14}
                color={Colors.muted}
                style={{ lineHeight: 20 }}
              >
                {ritual.sub}
              </AppText>
              <Pressable
                style={styles.ritualCta}
                onPress={() => setSheet(ritual.sheet)}
              >
                <AppText
                  variant="mono"
                  color={Colors.accent}
                  style={{ fontSize: 11 }}
                >
                  {ritual.cta.toUpperCase()}
                </AppText>
                <AppText color={Colors.accent}>→</AppText>
              </Pressable>
            </View>
          </View>

          <UsSection />

          <OurPlaylist></OurPlaylist>

          {/* Desire Mood */}
          <AppText
            variant="smallCaps"
            color={Colors.ink2}
            style={styles.sectionLabel}
          >
            Desire Mood
          </AppText>
          <View
            style={[
              styles.card1,
              { flexDirection: "row", padding: 0, overflow: "hidden" },
            ]}
          >
            {(
              [
                { u: "lou", m: louMood, sheet: "mood_lou" },
                { u: "amanda", m: amandaMood, sheet: "mood_amanda" },
              ] as const
            ).map((x, i) => (
              <Pressable
                key={x.u}
                style={[styles.moodBlock, i === 0 && styles.moodBorder]}
                onPress={() => setSheet(x.sheet)}
              >
                <AppText
                  variant="smallCaps"
                  color={Colors.muted}
                  style={{ marginBottom: 10 }}
                >
                  {x.u.toUpperCase()}
                </AppText>
                <AppText
                  size={32}
                  color={Colors.accent}
                  style={{ marginBottom: 8 }}
                >
                  {MOODS_DESIRE[x.m].mark}
                </AppText>
                <AppText variant="heading" size={17}>
                  {MOODS_DESIRE[x.m].label}
                </AppText>
              </Pressable>
            ))}
          </View>
            <Rhythms />
        </View>

        {/* Extra space for tab bar */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ─── Bottom Sheets ─── */}

      {/* Mood selector */}
      {["mood_lou", "mood_amanda"].map((key) => {
        const u = key === "mood_lou" ? "lou" : "amanda";
        return (
          <BottomSheet
            key={key}
            open={sheet === key}
            onClose={() => setSheet(null)}
            kicker={u.toUpperCase()}
            title="How are you?"
          >
            {MOODS_DESIRE.map((m, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  u === "lou" ? setLouMood(i) : setAmandaMood(i);
                  setSheet(null);
                }}
                style={styles.moodOption}
              >
                <AppText size={20} color={Colors.accent} style={{ width: 28 }}>
                  {m.mark}
                </AppText>
                <AppText variant="heading" size={18} style={{ flex: 1 }}>
                  {m.label}
                </AppText>
                <AppText variant="mono" style={{ fontSize: 10 }}>
                  {String(i + 1).padStart(2, "0")}
                </AppText>
              </Pressable>
            ))}
          </BottomSheet>
        );
      })}

      {/* Appreciation sheet */}
      <BottomSheet
        open={sheet === "appreciation"}
        onClose={() => setSheet(null)}
        kicker="APPRECIATION · ❦"
        title="A love note"
      >
       <View>
                   <AppText variant="serifItalic" size={15} color={Colors.muted} style={{ marginBottom: 18, lineHeight: 22 }}>
                     One thing you noticed about them this week. Small is fine — true is better.
                   </AppText>
                   <AppTextInput 
                     multiline 
                     placeholder="One thing I love about you is..." 
                     style={{ minHeight: 140 }} 
                     value={appreciationText}
                     onChangeText={setAppreciationText}
                   />
                
                 </View>
        <AppButton
          variant="solid"
          full
          size="lg"
          onPress={handleAppreciationSubmit}
          disabled={isSubmitting || !appreciationText.trim()}
          style={{ marginTop: 22 }}
        >
          {isSubmitting ? "Sending..." : "Send →"}
        </AppButton>
      </BottomSheet>

      {/* Check-in sheet */}
      <BottomSheet
        open={sheet === "checkin"}
        onClose={() => setSheet(null)}
        kicker="CHECK IN · ◈"
        title="A pulse on the two of you"
      >



        <AppText
          variant="serifItalic"
          size={15}
          color={Colors.muted}
          style={{ marginVertical: 15, lineHeight: 22 }}
        >
         Three questions. Honest answers. A gentle pulse on where you both are this week.
        </AppText>

        {partnerCheckin && (
          <Pressable 
            onPress={() => setShowPartnerCheckin(!showPartnerCheckin)}
            style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: Colors.rule, borderRadius: 20, marginBottom: 15 }}
          >
            <AppText variant="mono" color={Colors.ink} style={{ fontSize: 10 }}>
              {showPartnerCheckin ? "WRITE YOURS" : "SEE PARTNER'S"}
            </AppText>
          </Pressable>
        )}

        {showPartnerCheckin ? (
          <View style={{ marginBottom: 20 }}>
            <View style={{ marginBottom: 20 }}>
              <AppText variant="smallCaps" color={Colors.muted} style={{ marginBottom: 4 }}>
                01. {questions.question_1}
              </AppText>
              <AppText variant="serifItalic" size={17} color={Colors.ink}>
                "{partnerCheckin.answer_1}"
              </AppText>
            </View>
            <View style={{ marginBottom: 20 }}>
              <AppText variant="smallCaps" color={Colors.muted} style={{ marginBottom: 4 }}>
                02. {questions.question_2}
              </AppText>
              <AppText variant="serifItalic" size={17} color={Colors.ink}>
                "{partnerCheckin.answer_2}"
              </AppText>
            </View>
            <View style={{ marginBottom: 20 }}>
              <AppText variant="smallCaps" color={Colors.muted} style={{ marginBottom: 4 }}>
                03. {questions.question_3}
              </AppText>
              <AppText variant="serifItalic" size={17} color={Colors.ink}>
                "{partnerCheckin.answer_3}"
              </AppText>
            </View>
          </View>
        ) : (
          <>
            <AppTextInput 
              label={questions.question_1} n="01" placeholder="Honestly, I'm..." 
              value={checkinQ1} onChangeText={setCheckinQ1} 
            />

            <AppTextInput 
              label={questions.question_2} n="02" placeholder="I could use..." 
              value={checkinQ2} onChangeText={setCheckinQ2} 
            />

            <AppTextInput 
              label={questions.question_3} n="03" placeholder="I've been thinking about..." 
              value={checkinQ3} onChangeText={setCheckinQ3} 
            />
          </>
        )}

        {!showPartnerCheckin && (
          <AppButton
            variant="solid"
            full
            size="lg"
            onPress={handleCheckinSubmit}
            disabled={isSubmitting || !checkinQ1.trim() || !checkinQ2.trim() || !checkinQ3.trim()}
          >
            {isSubmitting ? (hasCheckedInToday ? "Updating..." : "Submitting...") : (hasCheckedInToday ? "Update →" : "Submit →")}
          </AppButton>
        )}
      </BottomSheet>

      {/* Sync score sheet */}

      <BottomSheet
        open={sheet === "sync"}
        onClose={() => setSheet(null)}
        kicker="THIS WEEK"
        title="Your Sync"
      >
        <View style={{ paddingHorizontal: 10, paddingBottom: 20 }}>
          {/* Big Score */}
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <AppText
              variant="display"
              size={92}
              color={Colors.ink}
              style={{ lineHeight: 88 }}
            >
              {weScore}
            </AppText>
          </View>

          {/* Subtitle */}
          <AppText
            variant="serifItalic"
            size={15}
            color={Colors.muted}
            style={{ textAlign: "center", lineHeight: 22, marginBottom: 32 }}
          >
            How in tune you two are this week, built from small acts. Tap any
            line to see what counts.
          </AppText>

          <Rule style={{ marginBottom: 24 }} />

          {/* WHAT GOES INTO IT */}
          <AppText
            variant="smallCaps"
            color={Colors.ink2}
            style={{ marginBottom: 16, fontSize: 10 }}
          >
            WHAT GOES INTO IT
          </AppText>

          {/* Breakdown Items */}
          <View style={{ gap: 20 }}>
            {/* Daily rituals */}
            <View
              style={{
                backgroundColor: "#EAE2D4",
                padding: 16,
                borderRadius: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <AppText variant="heading" size={17}>
                  Daily rituals
                </AppText>
                <AppText variant="mono" color={Colors.muted} size={15}>
                  25%
                </AppText>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: "25%" }]} />
              </View>
              <AppText
                variant="mono"
                color={Colors.muted}
                style={{ marginTop: 6, fontSize: 13 }}
              >
                0 of 7 days completed
              </AppText>
            </View>

            {/* Weekly check-in */}
            <View
              style={{
                backgroundColor: "#EAE2D4",
                padding: 16,
                borderRadius: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <AppText variant="heading" size={17}>
                  Weekly check-in
                </AppText>
                <AppText variant="mono" color={Colors.muted} size={15}>
                  28%
                </AppText>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: "28%" }]} />
              </View>
              <AppText
                variant="mono"
                color={Colors.muted}
                style={{ marginTop: 6, fontSize: 13 }}
              >
                Not yet this week
              </AppText>
            </View>

            {/* Appreciations sent */}
            <View
              style={{
                backgroundColor: "#EAE2D4",
                padding: 16,
                borderRadius: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <AppText variant="heading" size={17}>
                  Appreciations sent
                </AppText>
                <AppText variant="mono" color={Colors.muted} size={15}>
                  28%
                </AppText>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: "28%" }]} />
              </View>
              <AppText
                variant="mono"
                color={Colors.muted}
                style={{ marginTop: 6, fontSize: 13 }}
              >
                2 sent recently
              </AppText>
            </View>

            {/* Thread activity */}
            <View
              style={{
                backgroundColor: "#EAE2D4",
                padding: 16,
                borderRadius: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <AppText variant="heading" size={17}>
                  Thread activity
                </AppText>
                <AppText variant="mono" color={Colors.muted} size={15}>
                  15%
                </AppText>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: "15%" }]} />
              </View>
              <AppText
                variant="mono"
                color={Colors.muted}
                style={{ marginTop: 6, fontSize: 13 }}
              >
                0 entries this week
              </AppText>
            </View>

            <View
              style={{
                padding: 16,
                borderRadius: 10,
                backgroundColor: "#ff4f281e",
              }}
            >
              <AppText
                variant="smallCaps"
                color={Colors.accent}
                style={{ marginBottom: 1, fontSize: 10 }}
              >
                HOW TO RAISE IT
              </AppText>
              <AppText
                variant="serifItalic"
                size={15}
                color={Colors.muted}
                style={{}}
              >
                Send an appreciation tonight, complete your evening ritual, or
                share a moment to Thread. Small acts compound.
              </AppText>
            </View>
          </View>
        </View>
      </BottomSheet>
      {/* Streak sheet */}
      <BottomSheet
        open={sheet === "streak"}
        onClose={() => setSheet(null)}
        kicker={`${streak} days strong`}
        title="Your streak"
      >
        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <AppText
            variant="display"
            size={84}
            color={Colors.accent}
            style={{ lineHeight: 84 }}
          >
            {streak}
          </AppText>
          <AppText
            variant="smallCaps"
            color={Colors.muted}
            style={{ marginTop: 8 }}
          >
            Days in a row
          </AppText>
        </View>
        <AppButton variant="outline" full onPress={() => setSheet(null)}>
          Close
        </AppButton>
      </BottomSheet>
    
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bone },
  inner: { padding: 20 },
  greeting: { paddingVertical: 28 },
  sectionLabel: { marginBottom: 14, marginTop: 8 },

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
    paddingVertical: 16,
    alignItems: "center",
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
    width: "60%",
    backgroundColor: Colors.ink,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  timeTab: { padding: 10 },
  milestoneRow: { flexDirection: "row", marginTop: 32, gap: 12 },
  milestoneBox: {
    flex: 1,

    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
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
  addDateButton: {
    paddingVertical: 10,
  },

  reunionTab: { padding: 24 },
  countdownGrid: { flexDirection: "row", gap: 12 },
  countdownBox: {
    flex: 1,
    backgroundColor: "#F9F7F4",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.rule,
  },

  card: {
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: Colors.bone,

    borderColor: Colors.rule,

    shadowColor: Colors.ink2,
    shadowOpacity: 0.04,

    elevation: 1,
  },
  card1: {
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: Colors.bone,
    borderWidth: 1,
    borderColor: Colors.rule,
    padding: 20,
    shadowColor: Colors.ink2,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  heroCard: {
    flexDirection: "row",
    borderRadius: 14,
    marginBottom: 24,
    backgroundColor: Colors.bone,
    borderWidth: 1,
    borderColor: Colors.rule,
    overflow: "hidden",
    shadowColor: Colors.ink2,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scoreBlock: {
    padding: 22,
    borderRightWidth: 1,
    borderRightColor: Colors.rule,
    alignItems: "center",
    minWidth: 108,
  },
  ritualBlock: {
    flex: 1,
    padding: 22,
    justifyContent: "space-between",
  },
  ritualCta: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.rule,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  moodBlock: {
    flex: 1,
    padding: 20,
  },
  moodBorder: {
    borderRightWidth: 1,
    borderRightColor: Colors.rule,
  },
  moodOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
    gap: 16,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: Colors.bone,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.sage,
    borderRadius: 3,
  },
  appreciationInput: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
    paddingVertical: 12,
    minHeight: 120,
  },
});
