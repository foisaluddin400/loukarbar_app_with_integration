import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Switch } from "react-native";
import { Colors } from "../../constants/colors";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { AppTextInput } from "@/components/ui/AppTextInput";
import { getLifecycleOverview, addPeriodStart } from "../../services/lifecycleApi";
import { getEnergyLogs, createEnergyLog } from "../../services/energyApi";
import { getUserProfile } from "../../services/userApi";
import { Calendar, DateData } from "react-native-calendars";

const ENERGY_LEVELS = ["Drained", "Flat", "Steady", "On", "Lit"];
const SLEEP_LEVELS = ["Depleted", "Under-Slept", "Adequate", "Rested"];
const STRESS_LEVELS = ["Light", "Moderate", "Heavy", "Max"];

const Rhythms: React.FC = () => {
  const [activeSheet, setActiveSheet] = useState<
    "herRhythm" | "yourState" | null
  >(null);

  // API State
  const [lifecycle, setLifecycle] = useState<any>(null);
  const [userGender, setUserGender] = useState<string>("Male");
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  
  // Energy Form State
  const [energyLevel, setEnergyLevel] = useState<number>(2);
  const [sleepLevel, setSleepLevel] = useState<number>(2);
  const [stressLevel, setStressLevel] = useState<number>(1);
  const [energyNotes, setEnergyNotes] = useState<string>("");
  const [shareWithPartner, setShareWithPartner] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoadingLifecycle, setIsLoadingLifecycle] = useState(true);
  const [isLoadingEnergy, setIsLoadingEnergy] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const lc = await getLifecycleOverview();
        if (lc && lc.success) {
          setLifecycle(lc);
        }
      } catch (e) {
        console.log("Error loading lifecycle overview", e);
      } finally {
        setIsLoadingLifecycle(false);
      }
      
      try {
        const profile = await getUserProfile();
        if (profile && profile.success && profile.data) {
          setUserGender(profile.data.gender || "Male");
        }
      } catch (e) {
        console.log("Error loading user profile", e);
      }
      
      try {
        const el = await getEnergyLogs();
        if (el && el.success && el.data.length > 0) {
          const latest = el.data[0];
          setEnergyLevel(Math.max(0, ENERGY_LEVELS.indexOf(latest.energy_level)));
          setSleepLevel(Math.max(0, SLEEP_LEVELS.indexOf(latest.sleep)));
          setStressLevel(Math.max(0, STRESS_LEVELS.indexOf(latest.stress)));
          if (latest.notes) setEnergyNotes(latest.notes);
          setShareWithPartner(latest.share_with_partner);
        }
      } catch (e) {
        console.log("Error loading energy logs", e);
      } finally {
        setIsLoadingEnergy(false);
      }
    };
    loadData();
  }, []);

  const handleUpdateCycle = async (day: DateData) => {
    setShowCalendar(false);
    try {
      const [year, month, dayStr] = day.dateString.split("-");
      const formattedDate = `${month}.${dayStr}.${year}`;
      await addPeriodStart({ start_date: formattedDate });
      
      setIsLoadingLifecycle(true);
      const lc = await getLifecycleOverview();
      if (lc && lc.success) {
        setLifecycle(lc);
      }
    } catch (e) {
      console.log("Failed to update cycle dates", e);
    } finally {
      setIsLoadingLifecycle(false);
    }
  };

  const handleEnergySubmit = async () => {
    setIsSubmitting(true);
    try {
      await createEnergyLog({
        energy_level: ENERGY_LEVELS[energyLevel],
        sleep: SLEEP_LEVELS[sleepLevel],
        stress: STRESS_LEVELS[stressLevel],
        notes: energyNotes,
        share_with_partner: shareWithPartner
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setActiveSheet(null);
      }, 1000);
    } catch (e) {
      console.log("Error submitting energy log", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ownerName = lifecycle?.period_user_name || "Partner";
  const hasCycleData = !!lifecycle?.stats?.current_phase;
  const currentPhase = lifecycle?.stats?.current_phase || "Not set";
  const daysSinceStart = lifecycle?.stats?.days_since_start || 0;
  const currentNoteText = lifecycle?.current_note?.text || "No note for today.";
  const currentNoteAgo = lifecycle?.current_note?.created_ago || "Just now";
  const phaseDesc = lifecycle?.stats?.phase_description || "";


  return (
    <View>
      <AppText
        variant="smallCaps"
        color={Colors.ink2}
        style={styles.sectionLabel}
      >
        RHYTHMS
      </AppText>

      {/* Main Rhythms Card */}
      <Pressable
        style={styles.rhythmsCard}
        onPress={() => setActiveSheet("herRhythm")}
      >
        <View style={styles.topRow}>
          <View style={styles.circle}>
            <AppText style={{ fontSize: 15 }}>◊</AppText>
          </View>
          <View>
            {isLoadingLifecycle ? (
              <AppText variant="serifItalic" color={Colors.muted} style={{ marginTop: 10 }}>Loading rhythm data...</AppText>
            ) : hasCycleData ? (
              <>
                <AppText
                  variant="mono"
                  color={Colors.accent}
                  style={{ fontSize: 10 }}
                >
                  {ownerName.toUpperCase()} • {currentPhase.toUpperCase()} • DAY {daysSinceStart}
                </AppText>
                <AppText
                  variant="heading"
                  size={17}
                  style={{ marginTop: 5, lineHeight: 24 }}
                >
                  {currentNoteText}
                </AppText>

                <AppText
                  variant="mono"
                  color={Colors.muted}
                  style={{ fontSize: 10, marginTop: 10 }}
                >
                  TAP FOR CONTEXT
                </AppText>
              </>
            ) : (
              <>
                <AppText
                  variant="mono"
                  color={Colors.muted}
                  style={{ fontSize: 10 }}
                >
                  {ownerName.toUpperCase()}
                </AppText>
                <AppText
                  variant="heading"
                  size={17}
                  style={{ marginTop: 5, lineHeight: 24, color: Colors.muted }}
                >
                  No cycle data logged yet.
                </AppText>
                <AppText
                  variant="mono"
                  color={Colors.accent}
                  style={{ fontSize: 10, marginTop: 10 }}
                >
                  TAP TO LEARN MORE
                </AppText>
              </>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <AppText
              variant="smallCaps"
              color={Colors.muted}
              style={{ fontSize: 12 }}
            >
              YOUR STATE • TODAY
            </AppText>
            <AppText variant="heading" size={17} style={{ marginTop: 4 }}>
              Update your energy, sleep, stress
            </AppText>
            <AppText
              variant="serifItalic"
              size={14}
              color={Colors.muted}
              style={{ marginTop: 3 }}
            >
              Share the physiology behind the day.
            </AppText>
          </View>
          <Pressable onPress={() => setActiveSheet("yourState")}>
            <AppText style={{ fontSize: 24 }}>→</AppText>
          </Pressable>
        </View>
      </Pressable>

      <AppText
        variant="serifItalic"
        color={Colors.muted}
        style={{ textAlign: "center", marginTop: 40, fontSize: 12 }}
      >
        Published daily, for two.
      </AppText>

      {/* ==================== BOTTOM SHEETS ==================== */}

      {/* Her Rhythm, Right Now */}
      <BottomSheet
        open={activeSheet === "herRhythm"}
        onClose={() => setActiveSheet(null)}
        kicker="AMANDA • SHARED WITH YOU"
        title="Her rhythm, right now"
      >
        <View style={{ paddingBottom: 30 }}>
           <AppText
            variant="serifItalic"
            size={15}
            color={Colors.muted}
            style={{ marginBottom: 20, lineHeight: 22 }}
          >
            {ownerName} chose to share this so you have context — not so you have to fix anything. Just hold it with her.
          </AppText>
          <View style={styles.phaseRow}>
            <View style={{ flex: 1 }}>
              <View>
                <AppText
                  variant="mono"
                  color={Colors.accent}
                  style={{ fontSize: 10 }}
                >
                  CURRENT PHASE · DAY {daysSinceStart} OF CYCLE
                </AppText>
                <AppText variant="mono" style={{ fontSize: 25 }}>
                  {currentPhase}.
                </AppText>
              </View>
              <AppText
                variant="serifItalic"
                size={16}
                style={{ lineHeight: 24, marginTop: 12 }}
              >
                {phaseDesc}
              </AppText>
            </View>
          </View>
          <View style={styles.sheetCard}>
            <AppText
              variant="smallCaps"
              color={Colors.ink2}
              style={{ fontSize: 12, marginBottom: 8 }}
            >
              • IN HER WORDS
            </AppText>
            <AppText variant="serifItalic" size={16} style={{ lineHeight: 24 }}>
              "{currentNoteText}"
            </AppText>
            <AppText
              variant="mono"
              color={Colors.muted}
              style={{ fontSize: 9, marginTop: 12 }}
            >
              UPDATED {currentNoteAgo.toUpperCase()}
            </AppText>
          </View>

          <AppText
            variant="smallCaps"
            color={Colors.ink2}
            style={{ marginTop: 32, marginBottom: 16, fontSize: 10 }}
          >
            THE FULL CYCLE
          </AppText>

          {/* Cycle Phases */}
          {[
            {
              phase: "Menstrual",
              days: "Days 1-5",
              desc: "Estrogen and progesterone at their lowest. The uterus sheds. Energy often low; body in reset.",
              active: false,
            },
            {
              phase: "Follicular",
              days: "Days 6-13",
              desc: "FSH drives follicle development. Estrogen climbs. Energy, mood, and openness usually rise.",
              active: true,
            },
            {
              phase: "Ovulatory",
              days: "Days 14-16",
              desc: "LH surge releases a mature egg. Estrogen peaks. Often the most expressive, social, confident window.",
              active: false,
            },
            {
              phase: "Luteal",
              days: "Days 17-28",
              desc: "Progesterone dominant. Body preparing for possible implantation. Later days can feel inward, more sensitive.",
              active: false,
            },
          ].map((item, i) => (
            <View
              key={i}
              style={[styles.phaseRow, item.active && styles.activePhase]}
            >
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <AppText
                    variant="heading"
                    size={13}
                    color={item.active ? "#fff" : Colors.ink}
                  >
                    {item.phase}
                  </AppText>
                  <AppText
                    variant="mono"
                    color={item.active ? "#ddd" : Colors.muted}
                    style={{ fontSize: 10 }}
                  >
                    {item.days}
                  </AppText>
                </View>
                <AppText
                  variant="serifItalic"
                  size={14}
                  color={item.active ? "#ddd" : Colors.muted}
                  style={{ marginTop: 6, lineHeight: 20 }}
                >
                  {item.desc}
                </AppText>
              </View>
            </View>
          ))}

          {userGender === "Female" && (
            <>
              <Pressable 
                style={styles.updateCycle} 
                onPress={() => setShowCalendar(!showCalendar)}
              >
                <AppText
                  variant="mono"
                  color={Colors.accent}
                  style={{ fontSize: 10 }}
                >
                  ♦ UPDATE CYCLE DATES
                </AppText>
              </Pressable>
              
              {showCalendar && (
                <View style={{ marginTop: 20, backgroundColor: "#fff", borderRadius: 10, overflow: "hidden" }}>
                  <Calendar
                    onDayPress={handleUpdateCycle}
                    theme={{
                      todayTextColor: Colors.accent,
                      arrowColor: Colors.accent,
                    }}
                  />
                </View>
              )}
            </>
          )}

          <AppText
            variant="heading"
            color={Colors.muted}
            style={{ textAlign: "center", marginTop: 20, fontSize: 13 }}
          >
            {ownerName} controls what's shown here. She can turn it off anytime.
          </AppText>
        </View>
      </BottomSheet>

      {/* Where you are today */}
      <BottomSheet
        open={activeSheet === "yourState"}
        onClose={() => setActiveSheet(null)}
        kicker="YOUR STATE • TODAY"
        title="Where you are today"
      >
        <View style={{  paddingBottom: 30 }}>
          <AppText
            variant="serifItalic"
            size={15}
            color={Colors.muted}
            style={{ marginBottom: 20, lineHeight: 22 }}
          >
            Men operate on a daily hormonal rhythm too — testosterone peaks in the morning and drops 50%+ by evening, cortisol curves inversely. Sleep debt and stress load measurably shift both. This is an honest signal, not a performance number.
          </AppText>

          {/* Energy */}
          <View style={{ marginBottom: 24 }}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <AppText variant="smallCaps" color={Colors.ink2}>
                ENERGY
              </AppText>
              <AppText variant="mono" color={Colors.muted}>
                T / CORTISOL STATE
              </AppText>
            </View>
            <View style={styles.optionRow}>
              {ENERGY_LEVELS.map((label, i) => (
                <Pressable
                  key={i}
                  style={[styles.optionBtn, i === energyLevel && styles.selectedOption]}
                  onPress={() => setEnergyLevel(i)}
                >
                  <AppText
                    style={{
                      color: i === energyLevel ? "#fff" : Colors.ink,
                      fontSize: 13,
                    }}
                  >
                    {label.toUpperCase()}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <AppText variant="serifItalic" size={13} color={Colors.muted}>
              {ENERGY_LEVELS[energyLevel]} — {
                ["Depleted state. Needs total rest.", "Running low. Taking it easy.", "Normal range. Holding well.", "Elevated energy. Feeling good.", "Firing on all cylinders."][energyLevel]
              }
            </AppText>
          </View>

          {/* Sleep */}
          <View style={{ marginBottom: 24 }}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <AppText variant="smallCaps" color={Colors.ink2}>
                SLEEP
              </AppText>
              <AppText variant="mono" color={Colors.muted}>
                RECOVERY STATE
              </AppText>
            </View>
            <View style={styles.optionRow}>
              {SLEEP_LEVELS.map(
                (label, i) => (
                  <Pressable
                    key={i}
                    style={[
                      styles.optionBtn,
                      i === sleepLevel && styles.selectedOptionGreen,
                    ]}
                    onPress={() => setSleepLevel(i)}
                  >
                    <AppText
                      style={{
                        color: i === sleepLevel ? "#fff" : Colors.ink,
                        fontSize: 13,
                      }}
                    >
                      {label.toUpperCase()}
                    </AppText>
                  </Pressable>
                ),
              )}
            </View>
            <AppText variant="serifItalic" size={13} color={Colors.muted}>
              {SLEEP_LEVELS[sleepLevel]} — {
                ["Zero recovery. Running on empty.", "One rough night. Recoverable.", "Solid sleep. Ready for the day.", "Excellent recovery. Feeling completely restored."][sleepLevel]
              }
            </AppText>
          </View>

          {/* Stress Load */}
          <View style={{ marginBottom: 32 }}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <AppText variant="smallCaps" color={Colors.ink2}>
                STRESS LOAD
              </AppText>
              <AppText variant="mono" color={Colors.muted}>
                CORTISOL DEMAND
              </AppText>
            </View>
            <View style={styles.optionRow}>
              {STRESS_LEVELS.map((label, i) => (
                <Pressable
                  key={i}
                  style={[
                    styles.optionBtn,
                    i === stressLevel && styles.selectedOptionBrown,
                  ]}
                  onPress={() => setStressLevel(i)}
                >
                  <AppText
                    style={{
                      color: i === stressLevel ? "#fff" : Colors.ink,
                      fontSize: 13,
                    }}
                  >
                    {label.toUpperCase()}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <AppText variant="serifItalic" size={13} color={Colors.muted}>
              {STRESS_LEVELS[stressLevel]} — {
                ["Low demand. Feeling relaxed.", "Manageable load. Standard day.", "Elevated load. Shorter patience expected.", "Overwhelmed. Need a break."][stressLevel]
              }
            </AppText>
          </View>

          {/* In your words */}
          <View style={{ marginBottom: 24 }}>
            <AppText
              variant="smallCaps"
              color={Colors.ink2}
              style={{ marginBottom: 8 }}
            >
              04 IN YOUR WORDS (OPTIONAL)
            </AppText>
            <View style={styles.inputBox}>
              <AppTextInput 
                multiline
                placeholder="Optional notes on how you're feeling..."
                value={energyNotes}
                onChangeText={setEnergyNotes}
                style={{ fontSize: 20, fontFamily: 'serifItalic', color: Colors.ink, lineHeight: 28 }}
              />
            </View>
          </View>

          {/* Share toggle */}
          <View style={styles.shareRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="heading" size={16}>
                Share with {ownerName}
              </AppText>
              <AppText
                variant="mono"
                color={Colors.muted}
                style={{ fontSize: 12 }}
              >
                She'll see this on her Today. You can turn it off anytime.
              </AppText>
            </View>
            <Switch
              value={shareWithPartner}
              onValueChange={setShareWithPartner}
              trackColor={{ false: Colors.rule, true: Colors.accent }}
              thumbColor={"#fff"}
            />
          </View>

          <AppButton 
            variant={isSuccess ? "outline" : "solid"}
            full 
            size="lg" 
            style={{ marginTop: 32 }}
            onPress={handleEnergySubmit}
            disabled={isSubmitting || isSuccess || isLoadingEnergy}
          >
            {isSuccess ? "SAVED!" : isSubmitting ? "SAVING..." : "SAVE FOR TODAY →"}
          </AppButton>
        </View>
      </BottomSheet>
    </View>
  );
};

export default Rhythms;

const styles = StyleSheet.create({
  sectionLabel: { marginBottom: 12, marginTop: 8 },

  rhythmsCard: {
    backgroundColor: Colors.bone,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.rule,
    padding: 20,
  },
  topRow: {
    flexDirection: "row",

    gap: 10,
  },
  circle: {
    width: 42,
    height: 42,
    borderRadius: 50,
    backgroundColor: "#ff4f280e",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.rule,
    marginVertical: 16,
  },

  sheetCard: {
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 12,
    padding: 16,
  },

  phaseRow: {
    padding: 16,
    backgroundColor: Colors.cream,
    borderRadius: 12,
    marginBottom: 8,
  },
  activePhase: {
    backgroundColor: "#1C1C1E",
  },

  updateCycle: {
    paddingVertical: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginTop: 7,
    borderColor: Colors.rule,
  },

  optionRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 10,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: Colors.cream,
    borderRadius: 10,
    alignItems: "center",
  },
  selectedOption: {
    backgroundColor: "#C44D4D",
  },
  selectedOptionGreen: {
    backgroundColor: Colors.sage,
  },
  selectedOptionBrown: {
    backgroundColor: "#D4A574",
  },

  inputBox: {
    borderBottomWidth:1,
    borderColor:Colors.rule,
  
    paddingVertical:4,
    minHeight: 80,
  },

  shareRow: {
    flexDirection: "row",
    alignItems: "center",
  backgroundColor: Colors.cream,
    padding: 16,
    borderRadius: 12,
  },
  toggle: {
    width: 50,
    height: 28,
    backgroundColor: Colors.accent,
    borderRadius: 20,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  toggleCircle: {
    width: 20,
    height: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    alignSelf: "flex-end",
  },
});
