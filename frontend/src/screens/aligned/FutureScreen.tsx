import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { Colors } from '../../constants/colors';
import { AppText } from '../../components/ui/AppText';
import { AppButton } from '../../components/ui/AppButton';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { MilestoneRow } from '../../components/future/MilestoneRow';
import { usePersist } from '../../hooks/usePersist';
import { Milestone } from '../../types';
import AlignedNav from '@/components/ui/AlignedNav';

const SEED_MILESTONES: Milestone[] = [
  {
    id: 'm1', label: 'A Shared Home', icon: '◈', private: false, custom: false,
    description: 'Choosing each other in the everyday — logistics, geography, and a shared home.',
    steps: [
      { id: 's1', text: 'Have the "where is this going" conversation', done: true },
      { id: 's2', text: 'Visit each other\'s cities to imagine living there', done: true },
      { id: 's3', text: 'Agree on a timeline for moving in', done: false },
    ],
  },
  {
    id: 'm2', label: 'Meeting Our People', icon: '◇', private: false, custom: false,
    description: 'Bringing your worlds together.',
    steps: [
      { id: 's1', text: 'Meet each other\'s parents', done: true },
      { id: 's2', text: 'Spend a holiday with one family', done: true },
    ],
  },
  {
    id: 'm3', label: 'Marriage', icon: '✦', private: true, custom: false,
    description: 'When you know, you know.',
    steps: [],
  },
  {
    id: 'm4', label: 'Family', icon: '◆', private: true, custom: false,
    description: 'Building our own family, one day at a time.',
    steps: [],
  },
];

export const FutureScreen: React.FC = () => {
  const [milestones, setMilestones] = usePersist<Milestone[]>('future.milestones', SEED_MILESTONES);
  const [selected, setSelected] = useState<Milestone | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [newStep, setNewStep] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [unlockedMilestone, setUnlockedMilestone] = useState<Milestone | null>(null);

  const [newMilestoneName, setNewMilestoneName] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const toggleStep = (mId: string, sId: string) => {
    setMilestones(p => p.map(m =>
      m.id === mId 
        ? { ...m, steps: m.steps.map(s => s.id === sId ? { ...s, done: !s.done } : s) } 
        : m
    ));
  };

  const addStep = () => {
    if (!newStep.trim() || !selected) return;
    const newStepObj = {
      id: `step_${Date.now()}`,
      text: newStep.trim(),
      done: false,
    };
    setMilestones(p => p.map(m =>
      m.id === selected.id 
        ? { ...m, steps: [...m.steps, newStepObj] } 
        : m
    ));
    setNewStep('');
  };

  const checkPin = (milestone: Milestone) => {
    if (pinInput === '1234') {
      setUnlockedMilestone(milestone);
      setSheet('detail');
      setPinInput('');
    } else {
      Alert.alert('Incorrect PIN', 'Please try again.');
      setPinInput('');
    }
  };

  const openMilestone = (milestone: Milestone) => {
    if (milestone.private) {
      setSelected(milestone);
      setSheet('pin');
    } else {
      setSelected(milestone);
      setSheet('detail');
    }
  };

  const createMilestone = () => {
    if (!newMilestoneName.trim()) return;
    const newM: Milestone = {
      id: `cm${Date.now()}`,
      label: newMilestoneName.trim(),
      icon: '✦',
      description: newMilestoneDesc.trim(),
      private: isPrivate,
      custom: true,
      steps: [],
    };
    setMilestones(p => [...p, newM]);
    setNewMilestoneName('');
    setNewMilestoneDesc('');
    setIsPrivate(false);
    setSheet(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AlignedNav></AlignedNav>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <AppText variant="display" size={42} style={{ lineHeight: 42, marginBottom: 6 }}>
            Future<AppText size={42} color={Colors.accent}>.</AppText>
          </AppText>
          <AppText variant="serifItalic" size={16} color={Colors.muted} style={{ lineHeight: 24, marginBottom: 28 }}>
            Milestones, step by step.
          </AppText>

          <AppText variant="smallCaps" color={Colors.ink2} style={{ marginBottom: 8 }}>Relationship</AppText>
          
          <View style={{ borderTopWidth: 1, borderTopColor: Colors.rule }}>
            {milestones.map(m => (
              <MilestoneRow
                key={m.id}
                milestone={m}
                onPress={() => openMilestone(m)}
              />
            ))}
          </View>

          <Pressable style={styles.addBtn} onPress={() => setSheet('new')}>
            <AppText variant="smallCaps" color={Colors.accent}>+ Create a milestone</AppText>
          </Pressable>

          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* PIN Screen for Private Milestones */}
      <BottomSheet
        open={sheet === 'pin' && !!selected}
        onClose={() => { setSheet(null); setPinInput(''); }}
        kicker="PRIVATE"
        title="Enter PIN to Continue"
      >
        <AppTextInput
          label="PIN"
          value={pinInput}
          onChangeText={setPinInput}
          placeholder="1234"
          keyboardType="numeric"
          maxLength={4}
        />
        <AppButton 
          full 
          variant="solid" 
          size="lg" 
          style={{ marginTop: 20 }}
          onPress={() => checkPin(selected!)}
        >
          Unlock
        </AppButton>
      </BottomSheet>

      {/* Milestone Detail Sheet */}
      <BottomSheet
        open={sheet === 'detail' && !!selected}
        onClose={() => { setSheet(null); setNewStep(''); }}
        kicker={`CHAPTER · ${selected?.icon ?? ''}`}
        title={selected?.label ?? ''}
      >
        {selected && (
          <>
            <AppText variant="serifItalic" size={17} color={Colors.ink2} style={{ lineHeight: 26, marginBottom: 24 }}>
              {selected.description}
            </AppText>

            <AppText variant="smallCaps" color={Colors.muted} style={{ marginBottom: 12 }}>STEPS</AppText>
            
            {selected.steps.map((s, i) => (
              <Pressable key={s.id} onPress={() => toggleStep(selected.id, s.id)} style={styles.stepRow}>
                <AppText variant="mono" color={Colors.light} style={{ fontSize: 9, width: 24 }}>
                  {String(i + 1).padStart(2, '0')}
                </AppText>
                <View style={[styles.stepCheck, s.done && styles.stepCheckDone]}>
                  {s.done && <AppText size={11} color={Colors.bone}>✓</AppText>}
                </View>
                <AppText variant="heading" size={16} style={{ flex: 1, textDecorationLine: s.done ? 'line-through' : 'none' }}>
                  {s.text}
                </AppText>
              </Pressable>
            ))}

            {/* Add New Step */}
            <View style={{ marginTop: 20 }}>
              <AppTextInput
                label="Add a step"
                value={newStep}
                onChangeText={setNewStep}
                placeholder="Next thing to do..."
              />
              <AppButton variant="outline" full size="lg" onPress={addStep} style={{ marginTop: 10 }}>
                + Add Step
              </AppButton>
            </View>
          </>
        )}
      </BottomSheet>

      {/* New Milestone Sheet */}
      <BottomSheet open={sheet === 'new'} onClose={() => setSheet(null)} kicker="NEW" title="Compose a milestone">
        <AppTextInput
          label="Name" n="01"
          value={newMilestoneName}
          onChangeText={setNewMilestoneName}
          placeholder="Dream Vacation to Japan"
        />
        <AppTextInput
          label="Why it matters" n="02"
          value={newMilestoneDesc}
          onChangeText={setNewMilestoneDesc}
          placeholder="What does this mean to you both?"
          multiline
        />

        <Pressable style={styles.privateRow} onPress={() => setIsPrivate(!isPrivate)}>
          <AppText>Make this private</AppText>
          <View style={[styles.checkbox, isPrivate && styles.checkboxActive]}>
            {isPrivate && <AppText style={{ color: '#fff' }}>✓</AppText>}
          </View>
        </Pressable>

        <AppButton full variant="solid" size="lg" onPress={createMilestone} style={{ marginTop: 20 }}>
          Create Milestone
        </AppButton>
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bone },
  inner: { padding: 24 },
  addBtn: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.rule,
    marginTop: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  stepCheck: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: Colors.rule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCheckDone: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  privateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.rule,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
});