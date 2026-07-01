import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlignedTabParamList } from '../types';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';

import { HomeScreen } from '../screens/aligned/HomeScreen';
import { ConnectScreen } from '../screens/aligned/ConnectScreen';
import { DatesScreen } from '../screens/aligned/DatesScreen';
import { ThreadScreen } from '../screens/aligned/ThreadScreen';
import { FutureScreen } from '../screens/aligned/FutureScreen';
import { MapScreen } from '../screens/aligned/MapScreen';

const Tab = createBottomTabNavigator<AlignedTabParamList>();

const NAV_ITEMS = [
  { name: 'Home' as const, mark: '◐', label: 'Today' },
  { name: 'Connect' as const, mark: '◈', label: 'Connect' },
  { name: 'Dates' as const, mark: '✦', label: 'Dates' },
  { name: 'Thread' as const, mark: '❦', label: 'Thread' },
  { name: 'Future' as const, mark: '◉', label: 'Future' },
  { name: 'Map' as const, mark: '◇', label: 'Map' },
];

export function AlignedTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [styles.tabBar, { height: 60 + insets.bottom, paddingBottom: 8 + insets.bottom }],
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.muted,
        tabBarLabel: ({ focused, color }) => {
          const item = NAV_ITEMS.find(n => n.name === route.name);
          return (
            <Text style={[styles.tabLabel, { color }]}>
              {item?.label.toUpperCase()}
            </Text>
          );
        },
        tabBarIcon: ({ focused, color }) => {
          const item = NAV_ITEMS.find(n => n.name === route.name);
          return (
            <View style={styles.tabIconWrap}>
              {focused && <View style={styles.tabIndicator} />}
              <Text style={[styles.tabMark, { color }]}>{item?.mark}</Text>
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Connect" component={ConnectScreen} />
      <Tab.Screen name="Dates" component={DatesScreen} />
      <Tab.Screen name="Thread" component={ThreadScreen} />
      <Tab.Screen name="Future" component={FutureScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
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
    paddingTop: 0,
  },
  tabIconWrap: { alignItems: 'center', position: 'relative' },
  tabIndicator: {
    position: 'absolute',
    top: -10,
    width: 24,
    height: 2,
    backgroundColor: Colors.accent,
    borderRadius: 1,
  },
  tabMark: { fontSize: 15, lineHeight: 20 },
  tabLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 2,
  },
});