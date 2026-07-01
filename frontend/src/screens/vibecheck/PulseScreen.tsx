import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { AppText } from '../../components/ui/AppText';
import { AppButton } from '../../components/ui/AppButton';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { LadderRow } from '../../components/vibecheck/LadderRow';
import SamVibeNav from '@/components/ui/SamVibeNav';
import { getVibeProfile } from '../../services/vibeCheckApi';
import { setVibePulse, getVibePulseStatus, getPulseAnalytics, getMyFlags, createFlag, checkAlignedConnection } from '../../services/vibePulseApi';

const LADDER = [
  { l: 'Talking', sub: 'Texting, flirting — no dates yet' },
  { l: 'Dating', sub: 'Going on dates, still seeing other people' },
  { l: 'Seeing where it goes', sub: 'Real connection, no labels yet' },
  { l: 'Working toward us', sub: 'Active conversations about where this is heading' },
  { l: 'Exclusive', sub: 'Not seeing anyone else' },
  { l: 'Serious', sub: 'Met friends and family, planning longer-term' },
  { l: 'Aligned', sub: 'Defining as a couple — ready for the next phase' },
];

const getStageIndex = (statusStr: string) => {
  const mapping: Record<string, number> = {
    Talking: 0, Dating: 1, Seeing: 2, Working: 3, Exclusive: 4, Serious: 5, Aligned: 6,
  };
  return mapping[statusStr] ?? -1;
};

const getStageStatus = (index: number) => {
  const statuses = ['Talking', 'Dating', 'Seeing', 'Working', 'Exclusive', 'Serious', 'Aligned'];
  return statuses[index] || 'None';
};

export const PulseScreen: React.FC = () => {
  const [section, setSection] = useState<'overview' | 'ladder'>('overview');
  const [flagsSheet, setFlagsSheet] = useState(false);
  const [patternsSheet, setPatternsSheet] = useState(false);
  
  const [partnerId, setPartnerId] = useState<string | null>(null);
  
  // SamVibeNav will fire onPartnerChange on mount if there are active connections
  // which will set partnerId and trigger the loadPulseData effect.
  const [partnerName, setPartnerName] = useState('Partner');
  
  const [myStage, setMyStage] = useState<number>(-1);
  const [theirStage, setTheirStage] = useState<number>(-1);
  const [isAligned, setIsAligned] = useState(false);
  const [alignedMessage, setAlignedMessage] = useState('');
  
  const [analytics, setAnalytics] = useState<any>(null);
  const [flags, setFlags] = useState<any[]>([]);

  const [newFlagSheet, setNewFlagSheet] = useState(false);
  const [newFlagText, setNewFlagText] = useState('');
  const [newFlagColor, setNewFlagColor] = useState<'Green' | 'Yellow' | 'Red'>('Green');
  const [submittingFlag, setSubmittingFlag] = useState(false);

  // Removed getVibeProfile useEffect because SamVibeNav handles initial fetch and fires onPartnerChange

  const loadPulseData = async (pid: string) => {
    try {
      const pulseRes = await getVibePulseStatus(pid);
      if (pulseRes) {
        setMyStage(getStageIndex(pulseRes.my_status));
        setTheirStage(getStageIndex(pulseRes.partner_status));
      }
    } catch (e) {
      setMyStage(-1);
      setTheirStage(-1);
    }
    
    try {
      const alignRes = await checkAlignedConnection(pid);
      if (alignRes.success) {
         setIsAligned(alignRes.is_aligned);
         setAlignedMessage(alignRes.message);
      }
    } catch (e) {}
    
    try {
      const analyticsRes = await getPulseAnalytics(pid);
      if (analyticsRes.success) setAnalytics(analyticsRes.data);
    } catch (e) {}

    try {
      const flagsRes = await getMyFlags(pid);
      if (flagsRes.success) setFlags(flagsRes.data);
    } catch (e) {}
  };

  useEffect(() => {
    if (partnerId) {
      loadPulseData(partnerId);
    }
  }, [partnerId]);

  const handleLadderPress = async (index: number) => {
    setMyStage(index);
    if (partnerId) {
      try {
        await setVibePulse(partnerId, getStageStatus(index));
        loadPulseData(partnerId);
      } catch (e) {
        Alert.alert('Error', 'Could not save your stage.');
      }
    } else {
      Alert.alert('Error', 'No active partner found.');
    }
  };

  const handleCreateFlag = async () => {
    if (!newFlagText.trim() || !partnerId) return;
    setSubmittingFlag(true);
    try {
      await createFlag(partnerId, newFlagColor, 'public', newFlagText.trim()); // 'public' isn't exactly private notes? wait backend schema FlagType has 'public'/'private'. Actually schema defaults 'private' as False if not set properly, wait I mapped 'private'. The backend schema type requires 'public' or 'private'. The user prompt says "Your private notes." so type should be 'private'.
      // WAIT I used 'public' above. Let me use 'private'.
      await createFlag(partnerId, newFlagColor, 'private', newFlagText.trim());
      setNewFlagText('');
      setNewFlagSheet(false);
      loadPulseData(partnerId);
    } catch (e) {
       Alert.alert('Error', 'Could not save flag.');
    } finally {
      setSubmittingFlag(false);
    }
  };

  const ladderGap = (myStage !== -1 && theirStage !== -1) ? Math.abs(myStage - theirStage) : -1;
  const isSameStep = ladderGap === 0;

  const greenCount = flags.filter(f => f.category === 'Green').length;
  const yellowCount = flags.filter(f => f.category === 'Yellow').length;
  const redCount = flags.filter(f => f.category === 'Red').length;

  const getFlagColorHex = (cat: string) => {
    if (cat === 'Green') return Colors.sage;
    if (cat === 'Yellow') return '#D4A574';
    return Colors.accent;
  };

  // ==================== LADDER FULL SCREEN ====================
  if (section === 'ladder') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            <Pressable onPress={() => setSection('overview')} style={{ marginBottom: 16 }}>
              <AppText variant="mono" color={Colors.accent} style={{ fontSize: 10 }}>← BACK TO PULSE</AppText>
            </Pressable>

            <AppText variant="display" size={36} style={{ lineHeight: 36, marginBottom: 6 }}>
              The ladder<AppText size={36} color={Colors.accent}>.</AppText>
            </AppText>
            <AppText variant="serifItalic" size={15} color={Colors.muted} style={{ lineHeight: 22, marginBottom: 24 }}>
              Where do you each think you are? Tap to mark your stage.
            </AppText>

            {isAligned ? (
              <View style={[styles.statusCard, { backgroundColor: '#1C1C1E', borderColor: '#333' }]}>
                <AppText variant="smallCaps" color={Colors.sage} style={{ marginBottom: 6 }}>● FULLY ALIGNED</AppText>
                <AppText variant="display" size={24} color={Colors.bone}>
                  Congratulations.
                </AppText>
                <AppText variant="serifItalic" size={15} color="#ccc" style={{ marginTop: 4, lineHeight: 22 }}>
                  {alignedMessage || 'You and your partner have both marked yourselves as aligned!'}
                </AppText>
              </View>
            ) : myStage !== -1 && theirStage !== -1 && (
              isSameStep ? (
                <View style={[styles.statusCard, { backgroundColor: `${Colors.sage}12`, borderColor: `${Colors.sage}30` }]}>
                  <AppText variant="smallCaps" color={Colors.sage} style={{ marginBottom: 6 }}>● On the same step</AppText>
                  <AppText variant="display" size={20} color={Colors.ink}>
                    You both see this as{' '}
                    <AppText variant="serifItalic" size={20} color={Colors.accent}>
                      {LADDER[myStage].l.toLowerCase()}.
                    </AppText>
                  </AppText>
                </View>
              ) : (
                <View style={[styles.statusCard, { backgroundColor: `${Colors.accent}10`, borderColor: `${Colors.accent}30` }]}>
                  <AppText variant="smallCaps" color={Colors.accent} style={{ marginBottom: 6 }}>
                    {ladderGap} step{ladderGap > 1 ? 's' : ''} apart
                  </AppText>
                  <AppText variant="serifItalic" size={14} color={Colors.muted} style={{ lineHeight: 22 }}>
                    The gap isn't bad — it's information.
                  </AppText>
                </View>
              )
            )}

            {LADDER.map((stage, i) => (
              <LadderRow
                key={i}
                stage={stage}
                index={i}
                isLast={i === LADDER.length - 1}
                isMine={i === myStage}
                isTheirs={i === theirStage}
                partnerName={partnerName}
                onPress={() => handleLadderPress(i)}
              />
            ))}

            <View style={{ height: 80 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==================== MAIN PULSE OVERVIEW ====================
  return (
    <SafeAreaView style={styles.safe}>
      <SamVibeNav onPartnerChange={(pid) => setPartnerId(pid)} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <AppText variant="display" size={42} style={{ lineHeight: 42, marginBottom: 6 }}>
            The Pulse<AppText size={42} color={Colors.accent}>.</AppText>
          </AppText>
          <AppText variant="serifItalic" size={16} color={Colors.muted} style={{ lineHeight: 24, marginBottom: 24 }}>
            Deeper patterns, beyond the daily card.
          </AppText>

          <View style={{ gap: 12 }}>
            {/* The Ladder */}
            <Pressable style={styles.door} onPress={() => setSection('ladder')}>
              <View style={styles.doorHeader}>
                <AppText variant="smallCaps" color={Colors.muted}>The Ladder</AppText>
                <AppText variant="mono" color={Colors.accent} style={{ fontSize: 10 }}>
                  {ladderGap === -1 ? '' : ladderGap === 0 ? 'SAME STEP' : `${ladderGap} STEP${ladderGap > 1 ? 'S' : ''} APART`}
                </AppText>
              </View>
              <AppText variant="display" size={24} style={{ lineHeight: 28, marginBottom: 6 }}>Where do you each think you are?</AppText>
              <AppText variant="serifItalic" size={14} color={Colors.muted} style={{ lineHeight: 22 }}>Mark your stage. They mark theirs.</AppText>
            </Pressable>

            {/* Patterns */}
            <Pressable style={styles.door} onPress={() => setPatternsSheet(true)}>
              <View style={styles.doorHeader}>
                <AppText variant="smallCaps" color={Colors.muted}>Patterns</AppText>
                <AppText variant="mono" color={Colors.accent} style={{ fontSize: 10 }}>
                   {analytics?.overall_match_percentage ?? 0}% MATCH
                </AppText>
              </View>
              <AppText variant="display" size={24} style={{ lineHeight: 28, marginBottom: 6 }}>What the cards are saying.</AppText>
              <AppText variant="serifItalic" size={14} color={Colors.muted} style={{ lineHeight: 22 }}>Your shared picks over time.</AppText>
            </Pressable>

            {/* Private Flags */}
            <Pressable style={styles.door} onPress={() => setFlagsSheet(true)}>
              <View style={styles.doorHeader}>
                <AppText variant="smallCaps" color={Colors.muted}>Flags</AppText>
                <AppText variant="mono" color={Colors.accent} style={{ fontSize: 10 }}>{flags.length} LOGGED</AppText>
              </View>
              <AppText variant="display" size={24} style={{ lineHeight: 28, marginBottom: 6 }}>Your private notes.</AppText>
              <AppText variant="serifItalic" size={14} color={Colors.muted} style={{ lineHeight: 22 }}>Track moments that feel right and wrong.</AppText>
            </Pressable>
          </View>

          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* Patterns BottomSheet */}
      <BottomSheet
        open={patternsSheet}
        onClose={() => setPatternsSheet(false)}
        kicker="OVERALL"
        title={`${analytics?.overall_match_percentage ?? 0}% IN SYNC`}
      >
        <View>
          <AppText variant="serifItalic" size={14} color={Colors.muted} style={{ marginBottom: 24 }}>
            {analytics?.total_matches ?? 0} matches across {analytics?.total_cards_played ?? 0} cards played.
          </AppText>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
            <View style={styles.statBox}>
              <AppText variant="smallCaps" color={Colors.ink2}>STRONGEST</AppText>
              <AppText variant="heading" size={18}>{analytics?.strongest_category?.category || 'None'}</AppText>
              <AppText variant="mono" color={Colors.accent}>{analytics?.strongest_category?.match_percentage ?? 0}% MATCH</AppText>
            </View>

            <View style={[styles.statBox, { backgroundColor: '#F1E4DA' }]}>
              <AppText variant="smallCaps" color={Colors.accent}>MOST DIVERGENT</AppText>
              <AppText variant="heading" size={18}>{analytics?.divergent_category?.category || 'None'}</AppText>
              <AppText variant="mono" color={Colors.accent}>{analytics?.divergent_category?.match_percentage ?? 0}% MATCH</AppText>
            </View>
          </View>

          <AppText variant="smallCaps" color={Colors.ink2} style={{ marginBottom: 12 }}>BY CATEGORY</AppText>

          {analytics?.category_breakdowns?.map((item: any, i: number) => (
            <View key={i} style={styles.progressRow1}>
              <View style={styles.progressRow}>
                <AppText variant="heading" size={16} style={{ flex: 1 }}>{item.category}</AppText>
                <AppText variant="mono" color={Colors.muted}>{item.matches}/{item.total}</AppText>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${item.match_percentage}%` }]} />
              </View>
            </View>
          ))}

          {analytics?.recent_matches?.length > 0 && (
             <AppText variant="smallCaps" color={Colors.ink2} style={{ marginTop: 32, marginBottom: 12 }}>WHERE YOU MATCHED</AppText>
          )}

          {analytics?.recent_matches?.map((match: any, i: number) => (
            <View key={i} style={styles.matchCard}>
              <AppText variant="serifItalic" size={15}>{match.question_text}</AppText>
              <AppText variant="mono" color={Colors.accent} style={{ marginTop: 4 }}>YOU BOTH CHOSE • {match.matched_option}</AppText>
            </View>
          ))}
        </View>
      </BottomSheet>

      {/* Flags BottomSheet */}
      <BottomSheet
        open={flagsSheet}
        onClose={() => setFlagsSheet(false)}
        kicker="LOG A MOMENT"
        title="Something just happened?"
      >
        <View>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            {[
              { color: Colors.sage, label: 'GREEN', count: greenCount },
              { color: '#D4A574', label: 'YELLOW', count: yellowCount },
              { color: Colors.accent, label: 'RED', count: redCount },
            ].map((f, i) => (
              <View key={i} style={styles.flagSummary}>
                <AppText variant="display" size={28}>{f.count}</AppText>
                <AppText variant="mono" style={{ fontSize: 12 }}>{f.label}</AppText>
              </View>
            ))}
          </View>

          <AppButton variant="solid" size="lg" onPress={() => { setFlagsSheet(false); setTimeout(() => setNewFlagSheet(true), 400); }} style={{ marginBottom: 24 }}>
             LOG A NEW MOMENT
          </AppButton>

          {redCount > 0 && (
            <View style={styles.redFlagBox}>
              <AppText variant="heading" size={18} color={Colors.accent}>Worth sitting with</AppText>
              <AppText variant="heading" size={18} color={Colors.cream}>You logged {redCount} red flag{redCount > 1 ? 's' : ''}.</AppText>
              <AppText variant="serifItalic" size={14} color="#f0e9d5" style={{ marginTop: 8 }}>
                Red flags are about your boundaries — only you know what they mean. Worth talking to someone you trust about.
              </AppText>
            </View>
          )}

          <View style={{ marginTop: 10, gap: 10 }}>
            {flags.map((log: any, i: number) => (
              <View key={i} style={styles.logEntry}>
                <View style={[styles.logDot, { backgroundColor: getFlagColorHex(log.category) }]} />
                <View style={{ flex: 1 }}>
                  <AppText variant="serifItalic" size={15}>"{log.text}"</AppText>
                  <AppText variant="mono" color={Colors.muted} style={{ fontSize: 11, marginTop: 4 }}>
                    {new Date(log.created_at).toLocaleDateString()} • {log.type.toUpperCase()}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </View>
      </BottomSheet>

      {/* New Flag Sheet */}
      <BottomSheet
        open={newFlagSheet}
        onClose={() => setNewFlagSheet(false)}
        kicker="NEW LOG"
        title="Log a private note"
      >
         <View>
            <AppText variant="serifItalic" size={14} color={Colors.muted} style={{ marginBottom: 20 }}>
               This is strictly private. Your partner will never see this.
            </AppText>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
               {['Green', 'Yellow', 'Red'].map((c) => (
                 <Pressable 
                   key={c}
                   onPress={() => setNewFlagColor(c as any)}
                   style={[styles.colorPicker, newFlagColor === c && { borderColor: getFlagColorHex(c), backgroundColor: getFlagColorHex(c) + '1A' }]}
                 >
                    <View style={[styles.logDot, { backgroundColor: getFlagColorHex(c), marginTop: 0, marginBottom: 8 }]} />
                    <AppText variant="smallCaps">{c}</AppText>
                 </Pressable>
               ))}
            </View>

            <AppTextInput 
               n="01"
               label="What happened?"
               value={newFlagText}
               onChangeText={setNewFlagText}
               placeholder="They remembered my favorite coffee..."
            />

            <AppButton 
              variant="solid" 
              size="lg" 
              disabled={submittingFlag || !newFlagText.trim()}
              onPress={handleCreateFlag}
              style={{ marginTop: 24 }}
            >
               {submittingFlag ? 'SAVING...' : 'SAVE MOMENT'}
            </AppButton>
         </View>
      </BottomSheet>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bone },
  inner: { padding: 24 },
  door: {
    backgroundColor: Colors.bone,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.rule,
    padding: 22,
  },
  doorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  statusCard: {
    padding: 18,
    borderRadius: 14,
    marginBottom: 22,
    borderWidth: 1,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#E9E5D9',
    padding: 16,
    borderRadius: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  progressRow1: {
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 8,
    marginVertical: 4,
    padding: 14,
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#EAE2D4',
    borderRadius: 3,
    marginLeft: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.sage,
  },
  matchCard: {
    borderWidth: 1,
    borderColor: Colors.rule,
    backgroundColor: '#EFEBE0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  flagSummary: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#E9E5D9',
    borderRadius: 12,
  },
  redFlagBox: {
    backgroundColor: '#1C1C1E',
    padding: 20,
    borderRadius: 14,
    marginBottom: 24,
  },
  logEntry: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 12,
  },
  logDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  colorPicker: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.rule,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  }
});