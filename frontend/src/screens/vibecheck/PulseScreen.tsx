import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { Colors } from '../../constants/colors';
import { AppText } from '../../components/ui/AppText';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { LadderRow } from '../../components/vibecheck/LadderRow';
import { usePersist } from '../../hooks/usePersist';
import { VibeTabs } from '@/navigation/VibeTabs';
import SamVibeNav from '@/components/ui/SamVibeNav';
import { getVibeProfile } from '../../services/vibeCheckApi';

const LADDER = [
  { l: 'Talking', sub: 'Texting, flirting — no dates yet' },
  { l: 'Dating', sub: 'Going on dates, still seeing other people' },
  { l: 'Seeing where it goes', sub: 'Real connection, no labels yet' },
  { l: 'Working toward us', sub: 'Active conversations about where this is heading' },
  { l: 'Exclusive', sub: 'Not seeing anyone else' },
  { l: 'Serious', sub: 'Met friends and family, planning longer-term' },
  { l: 'Aligned', sub: 'Defining as a couple — ready for the next phase' },
];

export const PulseScreen: React.FC = () => {
  const [section, setSection] = useState<'overview' | 'ladder'>('overview');
  const [myStage, setMyStage] = usePersist<number>('vc.c1.pulse.myStage', 2);
  const [theirStage] = usePersist<number>('vc.c1.pulse.theirStage', 1);
  const [flagsSheet, setFlagsSheet] = useState(false);
  const [patternsSheet, setPatternsSheet] = useState(false);
  const [partnerName, setPartnerName] = useState('Partner');

  useEffect(() => {
    getVibeProfile()
      .then((profile) => {
        if (profile?.active_users?.length > 0) {
          setPartnerName(profile.active_users[0].name || 'Partner');
        }
      })
      .catch(() => {});
  }, []);

  const ladderGap = Math.abs(myStage - theirStage);

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

            {ladderGap === 0 ? (
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
                onPress={() => setMyStage(i)}
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
      <SamVibeNav></SamVibeNav>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <AppText variant="display" size={42} style={{ lineHeight: 42, marginBottom: 6 }}>
            The Pulse<AppText size={42} color={Colors.accent}>.</AppText>
          </AppText>
          <AppText variant="serifItalic" size={16} color={Colors.muted} style={{ lineHeight: 24, marginBottom: 24 }}>
            Deeper patterns, beyond the daily card.
          </AppText>

          {/* Doorways */}
          <View style={{ gap: 12 }}>
            {/* The Ladder */}
            <Pressable style={styles.door} onPress={() => setSection('ladder')}>
              <View style={styles.doorHeader}>
                <AppText variant="smallCaps" color={Colors.muted}>The Ladder</AppText>
                <AppText variant="mono" color={Colors.accent} style={{ fontSize: 10 }}>
                  {ladderGap === 0 ? 'SAME STEP' : `${ladderGap} STEP${ladderGap > 1 ? 'S' : ''} APART`}
                </AppText>
              </View>
              <AppText variant="display" size={24} style={{ lineHeight: 28, marginBottom: 6 }}>Where do you each think you are?</AppText>
              <AppText variant="serifItalic" size={14} color={Colors.muted} style={{ lineHeight: 22 }}>Mark your stage. They mark theirs.</AppText>
            </Pressable>

            {/* Patterns */}
            <Pressable style={styles.door} onPress={() => setPatternsSheet(true)}>
              <View style={styles.doorHeader}>
                <AppText variant="smallCaps" color={Colors.muted}>Patterns</AppText>
                <AppText variant="mono" color={Colors.accent} style={{ fontSize: 10 }}>80% MATCH</AppText>
              </View>
              <AppText variant="display" size={24} style={{ lineHeight: 28, marginBottom: 6 }}>What the cards are saying.</AppText>
              <AppText variant="serifItalic" size={14} color={Colors.muted} style={{ lineHeight: 22 }}>Your shared picks over time.</AppText>
            </Pressable>

            {/* Private Flags */}
            <Pressable style={styles.door} onPress={() => setFlagsSheet(true)}>
              <View style={styles.doorHeader}>
                <AppText variant="smallCaps" color={Colors.muted}>Flags</AppText>
                <AppText variant="mono" color={Colors.accent} style={{ fontSize: 10 }}>PRIVATE</AppText>
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
        title="80% IN SYNC"
      >
        <View >
          <AppText variant="serifItalic" size={14} color={Colors.muted} style={{ marginBottom: 24 }}>
            4 matches across 5 cards played.
          </AppText>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
            <View style={styles.statBox}>
              <AppText variant="smallCaps" color={Colors.ink2}>STRONGEST</AppText>
              <AppText variant="heading" size={18}>Travel</AppText>
              <AppText variant="mono" color={Colors.accent}>100% MATCH</AppText>
            </View>

            <View style={[styles.statBox, { backgroundColor: '#F1E4DA' }]}>
              <AppText variant="smallCaps" color={Colors.accent}>MOST DIVERGENT</AppText>
              <AppText variant="heading" size={18}>Style</AppText>
              <AppText variant="mono" color={Colors.accent}>0% MATCH</AppText>
            </View>
          </View>

          <AppText variant="smallCaps" color={Colors.ink2} style={{ marginBottom: 12 }}>BY CATEGORY</AppText>

          {[
            { cat: 'Travel', match: '1/1' },
            { cat: 'Energy', match: '2/2' },
            { cat: 'Social', match: '1/1' },
            { cat: 'Style', match: '0/1' },
          ].map((item, i) => (
            <View key={i} style={styles.progressRow1}>
              <View style={styles.progressRow}>
                <AppText variant="heading" size={16} style={{ flex: 1 }}>{item.cat}</AppText>
                <AppText variant="mono" color={Colors.muted}>{item.match}</AppText>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: item.match === '0/1' ? '0%' : '100%' }]} />
              </View>
            </View>
          ))}

          <AppText variant="smallCaps" color={Colors.ink2} style={{ marginTop: 32, marginBottom: 12 }}>WHERE YOU MATCHED</AppText>

          <View style={styles.matchCard}>
            <AppText variant="serifItalic" size={15}>Beach or Mountains?</AppText>
            <AppText variant="mono" color={Colors.accent} style={{ marginTop: 4 }}>YOU BOTH CHOSE • BEACH</AppText>
          </View>

          <View style={styles.matchCard}>
            <AppText variant="serifItalic" size={15}>Stay in or Go out?</AppText>
            <AppText variant="mono" color={Colors.accent} style={{ marginTop: 4 }}>YOU BOTH CHOSE • GO OUT</AppText>
          </View>
        </View>
      </BottomSheet>

      {/* Flags BottomSheet */}
      <BottomSheet
        open={flagsSheet}
        onClose={() => setFlagsSheet(false)}
        kicker="LOG A MOMENT"
        title="Something just happened?"
      >
        <View >
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            {[
              { color: Colors.sage, label: 'GREEN', count: 2 },
              { color: '#D4A574', label: 'YELLOW', count: 1 },
              { color: Colors.accent, label: 'RED', count: 1 },
            ].map((f, i) => (
              <View key={i} style={styles.flagSummary}>
                <AppText variant="display" size={28}>{f.count}</AppText>
                <AppText variant="mono" style={{ fontSize: 12 }}>{f.label}</AppText>
              </View>
            ))}
          </View>

          <View style={styles.redFlagBox}>
            <AppText variant="heading" size={18} color={Colors.accent}>Worth sitting with</AppText>
            <AppText variant="heading" size={18} color={Colors.cream}>You logged a red flag.</AppText>
            <AppText variant="serifItalic" size={14} color="#f0e9d5" style={{ marginTop: 8 }}>
              Red flags are about your boundaries — only you know what they mean. Worth talking to someone you trust about.
            </AppText>
          </View>

          <View style={{ marginTop: 20, gap: 10 }}>
            {[
              { text: "They remembered my hard meeting and called to check.", time: "TODAY", color: Colors.sage },
              { text: "Made me laugh harder than I have in months.", time: "3 DAYS AGO", color: Colors.sage },
              { text: "Cancelled plans last minute again.", time: "LAST WEEK", color: '#D4A574' },
              { text: "Lied about something small. Felt deeper than the lie itself.", time: "2 WEEKS AGO", color: Colors.accent },
            ].map((log, i) => (
              <View key={i} style={styles.logEntry}>
                <View style={[styles.logDot, { backgroundColor: log.color }]} />
                <View style={{ flex: 1 }}>
                  <AppText variant="serifItalic" size={15}>"{log.text}"</AppText>
                  <AppText variant="mono" color={Colors.muted} style={{ fontSize: 11, marginTop: 4 }}>{log.time} • PRIVATE</AppText>
                </View>
              </View>
            ))}
          </View>
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
});