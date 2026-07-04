import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Colors } from '../../constants/colors';
import { AppText } from '../../components/ui/AppText';
import { AppButton } from '../../components/ui/AppButton';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { ThreadEntryCard } from '../../components/thread/ThreadEntry';
import { usePersist } from '../../hooks/usePersist';
import { ThreadEntry } from '../../types';
import AlignedNav from '@/components/ui/AlignedNav';

const SEED: ThreadEntry[] = [
  { id: 1, from: 'amanda', type: 'letter', text: 'I was thinking about you on my walk today...', date: 'February 22', time: '3:40 PM' },
  { id: 2, from: 'lou', type: 'appreciation', text: 'You inspire me every single day.', date: 'February 18', time: '6:30 PM' },
];

const TYPES = ['all', 'letter', 'voice', 'photo', 'prompt', 'appreciation', 'checkin'] as const;

const COMPOSE_TYPES = [
  { k: 'letter', l: 'Letter', mark: '❦' },
  { k: 'voice', l: 'Voice', mark: '◉' },
  { k: 'photo', l: 'Photo', mark: '◇' },
  { k: 'prompt', l: 'Prompt', mark: '◈' },
  { k: 'appreciation', l: 'Appreciation', mark: '❦' },
  { k: 'checkin', l: 'Check-in', mark: '◈' },
];

export const ThreadScreen: React.FC = () => {
  const [thread, setThread] = usePersist<ThreadEntry[]>('thread.entries', SEED);
  const [filter, setFilter] = useState<string>('all');
  const [sheet, setSheet] = useState(false);
  const [composeType, setComposeType] = useState<'letter' | 'voice' | 'photo' | 'prompt' | 'appreciation' | 'checkin'>('letter');

  // For Prompt tab
  const [promptTab, setPromptTab] = useState<'romantic' | 'desire'>('romantic');

  const filtered = filter === 'all' 
    ? thread 
    : thread.filter(t => t.type === filter);

  const sendEntry = (text: string) => {
    const now = new Date();
    const newEntry: ThreadEntry = {
      id: Date.now(),
      from: 'lou',
      type: composeType,
      text,
      date: 'Today',
      time: now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };
    setThread(p => [newEntry, ...p]);
    setSheet(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AlignedNav></AlignedNav>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <AppText variant="display" size={42} style={{ lineHeight: 42, marginBottom: 6 }}>
            Thread<AppText size={42} color={Colors.accent}>.</AppText>
          </AppText>
          <AppText variant="serifItalic" size={16} color={Colors.muted} style={{ lineHeight: 24, marginBottom: 22 }}>
            A shared record — letters, voices, photos.
          </AppText>

          {/* Compose Grid */}
          <View style={styles.composeGrid}>
            {COMPOSE_TYPES.map((c) => (
              <Pressable
                key={c.k}
                style={({ pressed }) => [
                  styles.composeCard,
                  pressed && { opacity: 0.85, backgroundColor: Colors.cream }
                ]}
                onPress={() => {
                  setComposeType(c.k as any);
                  setSheet(true);
                }}
              >
                <AppText style={{ marginBottom: 8, fontSize: 28 }} color={Colors.accent}>
                  {c.mark}
                </AppText>
                <AppText variant="heading" size={17} style={{ textAlign: 'center' }}>
                  {c.l}
                </AppText>
              </Pressable>
            ))}
          </View>

          {/* Filter Chips - KEPT AS REQUESTED */}
          <View style={{ marginTop: 8, marginBottom: 28 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {TYPES.map((t) => (
                  <Pressable key={t} onPress={() => setFilter(t)}>
                    <AppText 
                      variant="smallCaps" 
                      style={{ 
                        paddingHorizontal: 18, 
                        paddingVertical: 9, 
                        backgroundColor: filter === t ? Colors.ink : Colors.bone,
                        color: filter === t ? '#fff' : Colors.ink,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: Colors.rule,
                      }}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Entries */}
          {filtered.map((entry) => (
            <ThreadEntryCard key={entry.id} entry={entry} />
          ))}
          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* ==================== COMPOSE BOTTOM SHEETS ==================== */}
      <BottomSheet
        open={sheet}
        onClose={() => setSheet(false)}
        kicker={`NEW ${composeType.toUpperCase()}`}
        title={
          composeType === 'letter' ? "Write a letter" :
          composeType === 'voice' ? "Record your voice" :
          composeType === 'photo' ? "Share a moment" :
          composeType === 'prompt' ? "Send a question" :
          composeType === 'appreciation' ? "A love note" : "Check in"
        }
      >
        {composeType === 'letter' && (
          <View>
            <AppText variant="serifItalic" size={15} color={Colors.muted} style={{ marginBottom: 12 }}>
              My Love,
            </AppText>
            <AppTextInput multiline placeholder="Write your letter here..." style={{ minHeight: 180 }} />
            <AppButton full variant="solid" size="lg" onPress={() => sendEntry("A beautiful letter...")}>
              Send Letter →
            </AppButton>
          </View>
        )}

        {composeType === 'voice' && (
          <View style={{ alignItems: 'center', paddingVertical: 50 }}>
            <AppText variant="display" size={60} color={Colors.accent}>◉</AppText>
            <AppText variant="heading" size={20} style={{ marginTop: 24 }}>Hold to Record</AppText>
            <AppButton full variant="solid" size="lg" style={{ marginTop: 40 }}>
              START RECORDING
            </AppButton>
          </View>
        )}

        {composeType === 'photo' && (
          <View>
            <Pressable style={styles.photoPlaceholder}>
              <AppText color={Colors.muted}>+ Select a Photo</AppText>
            </Pressable>
            <AppTextInput label="Caption" n="01" placeholder="First light on the Pont..." />
            <AppButton full variant="solid" size="lg" onPress={() => sendEntry("Shared a beautiful moment")}>
              Share →
            </AppButton>
          </View>
        )}

        {composeType === 'prompt' && (
          <View>
            <AppText variant="serifItalic" size={15} color={Colors.muted} style={{ marginBottom: 20, lineHeight: 22 }}>
              A question to deepen the conversation. They'll see it, answer privately, then both reveal in Thread.
            </AppText>

            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              {['ROMANTIC', 'DESIRE'].map((tab) => (
                <Pressable
                  key={tab}
                  style={[styles.promptTab, promptTab === tab.toLowerCase() && styles.promptTabActive]}
                  onPress={() => setPromptTab(tab.toLowerCase() as any)}
                >
                  <AppText style={{ color: promptTab === tab.toLowerCase() ? '#fff' : Colors.ink }}>
                    {tab}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <AppTextInput multiline placeholder="Write or pick a question..." style={{ minHeight: 100 }} />
            <AppButton full variant="solid" size="lg" onPress={() => sendEntry("Deep question sent")}>
              Send to Amanda →
            </AppButton>
          </View>
        )}

        {composeType === 'appreciation' && (
          <View>
            <AppText variant="serifItalic" size={15} color={Colors.muted} style={{ marginBottom: 18, lineHeight: 22 }}>
              One thing you noticed about them this week. Small is fine — true is better.
            </AppText>
            <AppTextInput multiline placeholder="One thing I love about you is..." style={{ minHeight: 140 }} />
            <AppButton full variant="solid" size="lg" onPress={() => sendEntry("Appreciation sent")}>
              Send →
            </AppButton>
          </View>
        )}

        {composeType === 'checkin' && (
          <View>
            <AppText variant="serifItalic" size={15} color={Colors.muted} style={{ marginBottom: 20, lineHeight: 22 }}>
              A pulse on where you are today. Three small questions.
            </AppText>
            <AppTextInput label="How are you feeling?" n="01" placeholder="Honestly, I'm..." />
            <AppTextInput label="What do you need most" n="02" placeholder="I Could use..." />
            <AppTextInput label="One thing on your mind" n="03" placeholder="I've been thinking about..." />
            <AppButton full variant="solid" size="lg" style={{ marginTop: 20 }} onPress={() => sendEntry("Check-in sent")}>
              Send Check-in →
            </AppButton>
          </View>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bone },
  inner: { padding: 24 },

  composeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  composeCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Colors.bone,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoPlaceholder: {
    height: 160,
    backgroundColor: '#EAE2D4',
   
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  
    borderColor: Colors.rule,
    marginBottom: 16,
  },

  promptTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F5F0E8',
    borderRadius: 12,
    marginRight: 8,
  },
  promptTabActive: {
    backgroundColor: '#1C1C1E',
  },
});