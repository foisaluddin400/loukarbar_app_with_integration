import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, StackCardInterpolationProps } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

import { ModeSelector } from '../screens/ModeSelector';
import { Welcome } from '../screens/Welcome';
import { Onboarding } from '../screens/Onboarding';
import { AlignedTabs } from './AlignedTabs';
import { VCWelcome } from '../screens/vibecheck/VCWelcome';
import { VCOnboarding } from '../screens/vibecheck/VCOnboarding';
import { VibeTabs } from './VibeTabs';
import { VCProfileScreen } from '../screens/vibecheck/VCProfileScreen';
import Login from '@/screens/Login';
import Signup from '@/screens/Signup';
import VerifyEmail from '@/screens/VerifyEmail';
import ForgotPassword from '@/screens/ForgotPassword';
import ResetPassword from '@/screens/ResetPassword';

const Stack = createStackNavigator<RootStackParamList>();

const forSlideDown = ({ current, layouts: { screen } }: StackCardInterpolationProps) => {
  return {
    cardStyle: {
      transform: [
        {
          translateY: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [-screen.height, 0],
          }),
        },
      ],
    },
  };
};

const forSlideUp = ({ current, layouts: { screen } }: StackCardInterpolationProps) => {
  return {
    cardStyle: {
      transform: [
        {
          translateY: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [screen.height, 0],
          }),
        },
      ],
    },
  };
};

const forFade = ({ current }: StackCardInterpolationProps) => {
  return {
    cardStyle: {
      opacity: current.progress,
    },
  };
};

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animationEnabled: true }}
        initialRouteName="Login"
      >
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Signup" component={Signup} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmail} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        <Stack.Screen name="ResetPassword" component={ResetPassword} />
        <Stack.Screen name="ModeSelector" component={ModeSelector} />
        <Stack.Screen name="AlignedWelcome" component={Welcome} />
        <Stack.Screen name="AlignedOnboarding" component={Onboarding} />
        <Stack.Screen 
          name="AlignedApp" 
          component={AlignedTabs} 
          options={({ route }: any) => {
            const dir = route.params?.direction;
            const interpolator = dir === 'up' ? forSlideUp : dir === 'down' ? forSlideDown : forFade;
            return { cardStyleInterpolator: interpolator, gestureEnabled: false };
          }} 
        />
        <Stack.Screen name="VibeWelcome" component={VCWelcome} />
        <Stack.Screen name="VibeOnboarding" component={VCOnboarding} />
        <Stack.Screen 
          name="VibeApp" 
          component={VibeTabs} 
          options={({ route }: any) => {
            const dir = route.params?.direction;
            const interpolator = dir === 'up' ? forSlideUp : dir === 'down' ? forSlideDown : forFade;
            return { cardStyleInterpolator: interpolator, gestureEnabled: false };
          }} 
        />
        <Stack.Screen name="VibeProfile" component={VCProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}