import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { ActivityIndicator, View } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { Colors } from './src/constants/colors';
import { CustomAlert } from './src/components/ui/CustomAlert';

import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// OneSignal Initialization
const ONE_SIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient || Constants.appOwnership === 'expo';

if (ONE_SIGNAL_APP_ID && Platform.OS !== 'web' && !isExpoGo) {
  try {
    const { OneSignal } = require('react-native-onesignal');
    OneSignal.initialize(ONE_SIGNAL_APP_ID);
    OneSignal.Notifications.requestPermission(true);
  } catch (e) {
    console.log("OneSignal initialization skipped:", e);
  }
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Fraunces-Light': require('./assets/fonts/Fraunces_72pt-Light.ttf'),
    'Fraunces-Regular': require('./assets/fonts/Fraunces_72pt-Regular.ttf'),
    'InstrumentSerif-Regular': require('./assets/fonts/InstrumentSerif-Regular.ttf'),
    'InstrumentSerif-Italic': require('./assets/fonts/InstrumentSerif-Italic.ttf'),
    'JetBrainsMono-Regular': require('./assets/fonts/ttf/JetBrainsMono-Regular.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bone }}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={Colors.bone} />
        <RootNavigator />
        <CustomAlert />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

