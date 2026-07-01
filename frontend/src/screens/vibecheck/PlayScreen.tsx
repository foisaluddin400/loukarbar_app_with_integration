import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { ThisOrThatCard } from "../../components/vibecheck/ThisOrThatCard";
import {
  VibeTabParamList,
} from "../../types";
import SamVibeNav from "@/components/ui/SamVibeNav";
import { useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import {
  getVibeProfile,
  getDailyCards,
  getVibeStreak,
  submitVibeAnswers,
  getVibeResults
} from "../../services/vibeCheckApi";
import api from "../../services/api";

const DAILY_LIMIT = 12;

const CLOSING_MESSAGES = [
  "Come back tomorrow. The slowness is the point.",
  "Good things take time. See you tomorrow.",
  "Reflect on today's answers. Let them breathe.",
  "Connection is built in small, daily steps.",
  "That's enough for now. Rest your mind.",
  "A little bit every day builds a strong foundation."
];

// Helper to get a stable message of the day
const getDailyMessage = () => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return CLOSING_MESSAGES[dayOfYear % CLOSING_MESSAGES.length];
};

const numberToWord = (num: number) => {
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
  return words[num] || num.toString();
};

export const PlayScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<VibeTabParamList>>();
  
  const [loading, setLoading] = useState(true);
  const [dailyCards, setDailyCards] = useState<any[]>([]);
  const [cardsAnsweredToday, setCardsAnsweredToday] = useState(0);
  const [streak, setStreak] = useState(0);
  const [matchRate, setMatchRate] = useState(0);
  const [allResults, setAllResults] = useState<any[]>([]);
  
  const [activePartners, setActivePartners] = useState<any[]>([]);
  const [partnerName, setPartnerName] = useState("Partner");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [partnerSheet, setPartnerSheet] = useState(false);

  const [myPick, setMyPick] = useState<"a" | "b" | null>(null);
  const [theirPick, setTheirPick] = useState<"a" | "b" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [debugText, setDebugText] = useState("");
  
  // A small local counter so we can show "Card 1 of 3" etc while moving through them
  // This is offset by cardsAnsweredToday on mount.
  const [localIndex, setLocalIndex] = useState(0);
  const currentCardIndex = cardsAnsweredToday + localIndex;

  useEffect(() => {
    async function loadData() {
      try {
        const [profile, streakData, dailyData, resultsData] = await Promise.all([
          getVibeProfile().catch(() => null),
          getVibeStreak().catch(() => ({ current_streak: 0, cards_answered_today: 0 })),
          getDailyCards().catch(() => ({ questions: [] })),
          getVibeResults().catch(() => ({ data: [] }))
        ]);

        const allPartners = [...(profile?.active_users || []), ...(profile?.inactive_users || [])];
        if (profile) setMyUserId(profile.user_id);
        if (allPartners.length > 0) {
          setActivePartners(allPartners);
          
          // Use explicitly selected partner if it exists, otherwise default to first
          const currentPId = partnerId || allPartners[0].user_id;
          const currentPName = partnerId ? (allPartners.find((p: any) => p.user_id === partnerId)?.name || "Partner") : (allPartners[0].name || "Partner");
          
          setPartnerName(currentPName);
          if (!partnerId) {
            setPartnerId(currentPId);
          }

          // Fetch results for all partners
          setAllResults(resultsData?.data || []);
          
          // Match rate for currently selected partner
          const currentPartnerResult = resultsData?.data?.find((r: any) => r.partner_name === currentPName);
          if (currentPartnerResult) {
             setMatchRate(currentPartnerResult.cumulative_match_percent || 0);
          }
        }
        
        setStreak(streakData?.current_streak || 0);
        setCardsAnsweredToday(streakData?.cards_answered_today || 0);
        setDailyCards(dailyData?.questions || []);

      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [partnerId]); // Re-run loadData when partner changes so we get their specific stats

  const limitReached = currentCardIndex >= DAILY_LIMIT || currentCardIndex >= dailyCards.length;
  const card = !limitReached && dailyCards.length > 0 ? dailyCards[currentCardIndex] : null;

  // WebSocket / Polling for partner's answer
  useEffect(() => {
    let ws: WebSocket | null = null;
    let cancelled = false;
    let interval: NodeJS.Timeout | null = null;
    
    if (revealed && theirPick === null && card && partnerId && myUserId) {
      const cardId = card.id; // capture to avoid stale closures
      const currentPartnerId = partnerId;
      
      const checkPartnerAnswer = async () => {
        if (cancelled) return;
        try {
          setDebugText(`Polling... partnerId=${currentPartnerId}`);
          const results = await getVibeResults();
          if (cancelled) return;
          
          if (results?.data) {
            setAllResults(results.data);
            const partnerData = results.data.find((r: any) => r.partner_name === partnerName);
            const matchedAns = partnerData?.matched_answers?.find((a: any) => a.question_id === cardId);
            if (matchedAns && matchedAns.partner_selected_option) {
              setDebugText(`Found answer: ${matchedAns.partner_selected_option}`);
              setTheirPick(matchedAns.partner_selected_option.toLowerCase() as "a" | "b");
              if (interval) clearInterval(interval);
            } else {
              setDebugText(`Results fetched, no matchedAns for cardId=${cardId}. answers count: ${partnerData?.matched_answers?.length}`);
            }
          } else {
             setDebugText(`Results fetched, but length is 0 (or undefined).`);
          }
        } catch (e: any) {
          setDebugText(`Poll error: ${e.message}`);
        }
      };
      
      // Immediate first check
      checkPartnerAnswer();
      
      // ALWAYS start polling (as a reliable fallback for ngrok/websocket issues)
      interval = setInterval(checkPartnerAnswer, 2000);
      
      // Connect to WebSocket
      const baseUrl = api.defaults.baseURL || "http://localhost:8006";
      const wsUrl = `${baseUrl.replace('http', 'ws')}/vibecheck/cards/ws/${myUserId}`;
      
      try {
          ws = new WebSocket(wsUrl, null, {
            headers: {
              'ngrok-skip-browser-warning': 'true'
            }
          });

          ws.onopen = () => {
            console.log("WS Connected:", wsUrl);
          };

          ws.onmessage = (event) => {
            console.log("WS Message received:", event.data);
            try {
              const data = JSON.parse(event.data);
              if (data.type === "PARTNER_ANSWERED" && data.partner_id === currentPartnerId) {
                // Partner answered! Re-fetch the result
                checkPartnerAnswer();
              }
            } catch(e) {}
          };
          
          ws.onerror = (e) => {
            console.error("WebSocket error:", e);
            if (!interval && !cancelled) {
                console.log("Falling back to polling...");
                interval = setInterval(checkPartnerAnswer, 2000);
            }
          };

          ws.onclose = () => {
            console.log("WS Closed");
            if (!interval && !cancelled) {
                console.log("Falling back to polling...");
                interval = setInterval(checkPartnerAnswer, 2000);
            }
          };
      } catch (e) {
          console.error("Failed to setup WS:", e);
          if (!interval && !cancelled) {
              interval = setInterval(checkPartnerAnswer, 2000);
          }
      }
    }
    return () => {
      cancelled = true;
      if (ws) ws.close();
      if (interval) clearInterval(interval);
    };
  }, [revealed, theirPick, card?.id, partnerId, myUserId]);

  const matched = revealed && myPick !== null && theirPick !== null && myPick === theirPick;

  const handlePick = async (pick: "a" | "b") => {
    setMyPick(pick);
    if (!card) return;

    try {
      const option = pick === "a" ? "A" : "B";
      // Submit single answer to backend
      await submitVibeAnswers([{ question_id: card.id, selected_option: option }]);
      
      // Check if partner answered
      let foundMatch = false;
      const results = await getVibeResults();
      if (results?.data) {
          setAllResults(results.data);
          const partnerData = results.data.find((r: any) => r.partner_name === partnerName);
          if (partnerData) {
              const matchedAns = partnerData.matched_answers?.find((a: any) => a.question_id === card.id);
              if (matchedAns?.partner_selected_option) {
                  setTheirPick(matchedAns.partner_selected_option.toLowerCase() as "a" | "b");
                  setRevealed(true);
                  foundMatch = true;
              }
          }
      }

      if (!foundMatch) {
          setTheirPick(null);
          setRevealed(true);
      }

    } catch (e) {
      console.error("Failed to submit answer", e);
      setRevealed(true);
    }
  };

  const handlePartnerSelect = (partner: any) => {
    setPartnerId(partner.user_id);
    setPartnerName(partner.name);
    setPartnerSheet(false);
    // Reset game state for new partner
    setMyPick(null);
    setTheirPick(null);
    setRevealed(false);
    setLocalIndex(0);
  };

  const nextCard = () => {
    setLocalIndex(prev => prev + 1);
    setMyPick(null);
    setTheirPick(null);
    setRevealed(false);
  };

  if (loading) {
      return (
          <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator color={Colors.accent} size="large" />
          </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SamVibeNav 
          onPartnerChange={(newPartnerId) => {
            const p = activePartners.find(p => p.user_id === newPartnerId);
            if (p) handlePartnerSelect(p);
          }} 
        />
        {/* Stats strip */}
        <View style={styles.stats1}>
          <View style={styles.stats}>
            <View style={{ gap: 2 }}>
              <AppText variant="smallCaps" color={Colors.muted}>
                Streak
              </AppText>
              <AppText
                variant="display"
                size={22}
                color={Colors.ink}
                style={{ lineHeight: 22 }}
              >
                {streak}
                <AppText variant="mono" size={11} color={Colors.muted}>
                  {" "}
                  d
                </AppText>
              </AppText>
            </View>
            <View style={styles.divider} />
            <View style={{ gap: 2 }}>
              <AppText variant="smallCaps" color={Colors.muted}>
                Match
              </AppText>
              <AppText
                variant="display"
                size={22}
                color={Colors.accent}
                style={{ lineHeight: 22 }}
              >
                {Math.round(matchRate)}
                <AppText variant="mono" size={13} color={Colors.muted}>
                  %
                </AppText>
              </AppText>
            </View>
            <TouchableOpacity onPress={() => setPartnerSheet(true)} style={styles.partnerPill}>
              <AppText
                variant="mono"
                color={Colors.accent}
                style={{ fontSize: 10 }}
              >
                ● {partnerName.toUpperCase()}
              </AppText>
              {activePartners.length > 1 && (
                <AppText color={Colors.accent} style={{ fontSize: 10, marginLeft: 4 }}>▼</AppText>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inner}>
          {limitReached ? (
            <View style={styles.limitCard}>
              <AppText
                size={32}
                color={Colors.accent}
                style={{ marginBottom: 10 }}
              >
                ◓
              </AppText>
              <AppText
                variant="display"
                size={24}
                style={{ lineHeight: 28, marginBottom: 6, textAlign: "center" }}
              >
                That's your{" "}
                <AppText variant="serifItalic" size={24} color={Colors.accent}>
                  {numberToWord(DAILY_LIMIT)}
                </AppText>{" "}
                for today.
              </AppText>
              <AppText
                variant="serifItalic"
                size={14}
                color={Colors.muted}
                style={{ textAlign: "center", lineHeight: 22 }}
              >
                {getDailyMessage()}
              </AppText>
            </View>
          ) : card ? (
            <>
              {/* Prompt */}
              <View style={styles.prompt}>
                <AppText
                  variant="smallCaps"
                  color={Colors.accent}
                  style={{ marginBottom: 10 }}
                >
                  Card {currentCardIndex + 1} of {DAILY_LIMIT}
                </AppText>
                <AppText
                  variant="display"
                  size={32}
                  style={{ lineHeight: 32, marginBottom: 6 }}
                >
                  This or that
                  <AppText size={32} color={Colors.accent}>
                    ?
                  </AppText>
                </AppText>
                <AppText variant="serifItalic" size={14} color={Colors.muted}>
                  {card.category} · pick the one that's more you
                </AppText>
              </View>

              {/* The card */}
              <ThisOrThatCard
                card={{ a: card.option_a, b: card.option_b, cat: card.category || "General" }}
                myPick={myPick}
                theirPick={theirPick}
                revealed={revealed}
                partnerName={partnerName}
                onPick={handlePick}
                allPartnerPicks={allResults
                  .map((r: any) => {
                    const matchedAns = r.matched_answers?.find((a: any) => a.question_id === card.id);
                    if (matchedAns && matchedAns.partner_selected_option) {
                      return {
                        name: r.partner_name,
                        pick: matchedAns.partner_selected_option.toLowerCase() as "a" | "b"
                      };
                    }
                    return null;
                  })
                  .filter(Boolean)}
              />

              {/* Status */}
              {!myPick && (
                <AppText
                  variant="serifItalic"
                  size={15}
                  color={Colors.muted}
                  style={{
                    textAlign: "center",
                    lineHeight: 22,
                    marginBottom: 24,
                  }}
                >
                  Pick to lock in.
                </AppText>
              )}
              {myPick && !revealed && (
                <AppText
                  variant="smallCaps"
                  color={Colors.accent}
                  style={{ textAlign: "center", marginBottom: 24 }}
                >
                  Waiting for reveal...
                </AppText>
              )}
              {revealed && (
                <View style={{ marginBottom: 24, gap: 12 }}>
                  {activePartners.map((partner) => {
                      const pPickData = allResults
                        .map((r: any) => {
                          const matchedAns = r.matched_answers?.find((a: any) => a.question_id === card.id);
                          if (matchedAns && matchedAns.partner_selected_option) {
                            return {
                              name: r.partner_name,
                              pick: matchedAns.partner_selected_option.toLowerCase() as "a" | "b"
                            };
                          }
                          return null;
                        })
                        .filter(Boolean)
                        ?.find(p => p?.name === partner.name);
                      
                      if (!pPickData) {
                          return (
                              <View key={partner.user_id} style={[styles.resultCard, styles.resultDiffer]}>
                                  <AppText variant="display" size={24} color={Colors.ink} style={{ lineHeight: 28, textAlign: 'center' }}>
                                      Waiting for <AppText variant="serifItalic" size={24} color={Colors.accent}>{partner.name}</AppText>
                                  </AppText>
                                  <AppText variant="serifItalic" size={14} color={Colors.muted} style={{ marginTop: 6, textAlign: 'center' }}>
                                      We'll let you know when they answer.
                                  </AppText>
                              </View>
                          );
                      }
                      
                      const pMatched = pPickData.pick === myPick;
                      return (
                          <View key={partner.user_id} style={[styles.resultCard, pMatched ? styles.resultMatch : styles.resultDiffer]}>
                              <AppText
                                  variant="display"
                                  size={24}
                                  color={pMatched ? Colors.sage : Colors.ink}
                                  style={{ lineHeight: 28, textAlign: 'center' }}
                              >
                                  You {pMatched ? (
                                      <AppText variant="serifItalic" size={24} color={Colors.sage}>matched</AppText>
                                  ) : (
                                      <AppText variant="serifItalic" size={24} color={Colors.accent}>differ</AppText>
                                  )} with {partner.name}.
                              </AppText>
                              <AppText
                                  variant="serifItalic"
                                  size={14}
                                  color={Colors.muted}
                                  style={{ marginTop: 6, textAlign: 'center' }}
                              >
                                  {pMatched ? "Same energy." : "Worth a second look — or a laugh."}
                              </AppText>
                          </View>
                      );
                  })}
                  
                  <AppButton full variant="solid" size="lg" onPress={nextCard} style={{ marginTop: 12 }}>
                    Next card →
                  </AppButton>
                </View>
              )}
            </>
          ) : null}

          {/* Pulse teaser */}
          {(currentCardIndex > 0 || cardsAnsweredToday > 0) && (
            <Pressable
                style={styles.pulseTease}
                onPress={() => navigation.navigate("Pulse")}
            >
                <View style={{ flex: 1 }}>
                <AppText
                    variant="smallCaps"
                    color={Colors.accent}
                    style={{ marginBottom: 4 }}
                >
                    The Pulse · unlocked
                </AppText>

                <AppText
                    variant="heading"
                    size={16}
                    color={Colors.bone}
                    style={{ marginBottom: 2 }}
                >
                    You're {Math.round(matchRate)}% in sync
                </AppText>

                <AppText
                    variant="serifItalic"
                    size={13}
                    color={Colors.cream2}
                >
                    See your patterns →
                </AppText>
                </View>

                <AppText size={18} color={Colors.accent}>
                →
                </AppText>
            </Pressable>
          )}

          <AppText
            variant="serifItalic"
            color={Colors.muted}
            style={{ textAlign: "center", marginTop: 40, fontSize: 12 }}
          >
            One card a day. Build the streak.
          </AppText>
          <AppButton
            variant="outline"
            size="md"
            style={{ marginTop: 20 }}
            onPress={() => navigation.navigate("History")}
          >
            View History
          </AppButton>


          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* Partner Selector Sheet */}
      <BottomSheet
        open={partnerSheet}
        onClose={() => setPartnerSheet(false)}
        title="Select Partner"
        kicker="PLAYING WITH"
      >
        <View style={{ gap: 12 }}>
          {activePartners.length === 0 && (
            <AppText color={Colors.muted} style={{ textAlign: 'center', marginVertical: 20 }}>
              No active partners found.
            </AppText>
          )}
          {activePartners.map((p, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.partnerSelectBtn,
                partnerId === p.user_id && styles.partnerSelectBtnActive
              ]}
              onPress={() => handlePartnerSelect(p)}
            >
              <View>
                <AppText variant="heading" size={18} color={partnerId === p.user_id ? Colors.bone : Colors.ink}>
                  {p.name}
                </AppText>
                <AppText variant="mono" size={11} color={partnerId === p.user_id ? Colors.bone : Colors.muted}>
                  MATCH: {Math.round(p.match_percentage)}%  •  STREAK: {p.streak_days}d
                </AppText>
              </View>
              {partnerId === p.user_id && (
                <AppText color={Colors.bone} variant="mono" size={12}>
                  ACTIVE
                </AppText>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bone },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  stats1: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
    paddingHorizontal: 20,
  },
  divider: { width: 1, height: 30, backgroundColor: Colors.rule },
  partnerPill: {
    marginLeft: "auto",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: `${Colors.accent}15`,
    flexDirection: "row",
    alignItems: "center",
  },
  partnerSelectBtn: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.rule,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cream,
  },
  partnerSelectBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  inner: { padding: 24 },
  prompt: { textAlign: "center", alignItems: "center", marginBottom: 26 },
  limitCard: {
    padding: 32,
    borderRadius: 14,
    backgroundColor: Colors.cream,
    alignItems: "center",
    marginBottom: 24,
  },
  resultCard: {
    alignItems: "center",
    padding: 20,
    borderRadius: 14,
    marginBottom: 16,
  },
  resultMatch: { backgroundColor: `${Colors.sage}12` },
  resultDiffer: { backgroundColor: `${Colors.cream}99` },
  pulseTease: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.ink,
    borderRadius: 14,
    padding: 18,
    marginTop: 14,
    marginBottom: 30,
  },
});
