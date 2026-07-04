import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, DeviceEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VibeTabParamList } from '../types';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { getPendingDatesCount } from '../services/vibeCheckApi';

import { PlayScreen } from '../screens/vibecheck/PlayScreen';
import { VCDatesScreen } from '../screens/vibecheck/VCDatesScreen';
import { HistoryScreen } from '../screens/vibecheck/HistoryScreen';
import { PulseScreen } from '../screens/vibecheck/PulseScreen';

const Tab = createBottomTabNavigator<VibeTabParamList>();

const NAV_ITEMS = [
  { name: 'Play' as const, mark: '◐', label: 'Play' },
  { name: 'VCDates' as const, mark: '◇', label: 'Dates' },
  { name: 'History' as const, mark: '◈', label: 'History' },
  { name: 'Pulse' as const, mark: '✦', label: 'Pulse' },
];

export function VibeTabs() {
  const insets = useSafeAreaInsets();
  const [pendingDatesCount, setPendingDatesCount] = useState(0);

  const fetchPendingDates = async () => {
    try {
      const res = await getPendingDatesCount();
      if (res?.success) setPendingDatesCount(res.count);
    } catch (e) {
      console.log('Failed to fetch pending dates count', e);
    }
  };

  useEffect(() => {
    fetchPendingDates();
    const sub = DeviceEventEmitter.addListener('REFRESH_VIBE_DATA', fetchPendingDates);
    return () => sub.remove();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [styles.tabBar, { height: 60 + insets.bottom, paddingBottom: 8 + insets.bottom }],
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.muted,
        tabBarLabel: ({ color }) => {
          const item = NAV_ITEMS.find(n => n.name === route.name);
          return <Text style={[styles.label, { color }]}>{item?.label.toUpperCase()}</Text>;
        },
        tabBarIcon: ({ focused, color }) => {
          const item = NAV_ITEMS.find(n => n.name === route.name);
          return (
            <View style={styles.iconWrap}>
              {focused && <View style={styles.indicator} />}
              <Text style={[styles.mark, { color }]}>{item?.mark}</Text>
              {route.name === 'VCDates' && pendingDatesCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingDatesCount}</Text>
                </View>
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Play" component={PlayScreen} />
      <Tab.Screen name="VCDates" component={VCDatesScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Pulse" component={PulseScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bone,
    borderTopWidth: 1,
    borderTopColor: Colors.rule,
    height: 60,
    paddingBottom: 8,
  },
  iconWrap: { alignItems: 'center' },
  indicator: {
    position: 'absolute', top: -10,
    width: 24, height: 2,
    backgroundColor: Colors.accent, borderRadius: 1,
  },
  mark: { fontSize: 15, lineHeight: 20 },
  label: { fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 1, marginTop: 2 },
  badge: {
    position: 'absolute',
    top: -8,
    right: -10,
    backgroundColor: Colors.accent,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.bone,
    paddingHorizontal: 2
  },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: 'bold' }
});