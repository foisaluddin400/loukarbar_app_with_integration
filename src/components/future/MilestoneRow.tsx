import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { AppText } from '../ui/AppText';
import { Milestone } from '../../types';

interface MilestoneRowProps {
  milestone: Milestone;
  onPress: () => void;
}

export const MilestoneRow: React.FC<MilestoneRowProps> = ({ milestone: m, onPress }) => {
  const done = m.steps.filter(s => s.done).length;
  const pct = m.isLocked ? 0 : Math.round((done / Math.max(m.steps.length, 1)) * 100);

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
          <AppText size={18} color={Colors.accent}>{m.icon}</AppText>
          <AppText variant="heading" size={20}>
            {m.label}
            {m.private && (
              <AppText variant="mono" size={11} color={Colors.light}> · private</AppText>
            )}
          </AppText>
        </View>
        <AppText variant="mono" color={Colors.accent} style={{ fontSize: 10 }}>
          {m.isLocked ? '🔒' : `${pct}%`}
        </AppText>
      </View>
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          {!m.isLocked && <View style={[styles.progressFill, { width: `${pct}%` }]} />}
        </View>
        <AppText variant="mono" color={Colors.muted} style={{ fontSize: 9 }}>
          {m.isLocked ? 'locked' : `${done}/${m.steps.length}`}
        </AppText>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 30,
  },
  progressTrack: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.rule,
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    top: -1,
    left: 0,
    height: 3,
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
});