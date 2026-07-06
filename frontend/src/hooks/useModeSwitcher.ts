import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../types';
import { getMe } from '../services/authApi';
import { checkVibeStatus } from '../services/vibeCheckApi';

type Nav = StackNavigationProp<RootStackParamList>;

/**
 * Reusable hook that encapsulates the ModeSelector switching logic.
 * Used by profile avatar gesture and "Go to Aligned/Vibe Check" buttons.
 */
export function useModeSwitcher() {
  const nav = useNavigation<Nav>();

  const switchToAligned = async (direction?: 'up' | 'down') => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        nav.navigate('Login', { returnTo: 'aligned' });
        return;
      }
      const user = await getMe();
      if (user.is_aligned || user.partner || user.secret_key) {
        nav.navigate('AlignedApp' as any, { direction });
      } else {
        nav.navigate('AlignedOnboarding');
      }
    } catch (error: any) {
      console.log('Error switching to aligned:', error);
      if (error?.response?.status === 401) {
        nav.navigate('Login', { returnTo: 'aligned' });
      } else {
        nav.navigate('AlignedOnboarding');
      }
    }
  };

  const switchToVibeCheck = async (direction?: 'up' | 'down') => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        nav.navigate('Login', { returnTo: 'vibe' });
        return;
      }
      const status = await checkVibeStatus();
      if (status.success) {
        nav.navigate('VibeApp' as any, { direction });
      } else {
        nav.navigate('VibeOnboarding');
      }
    } catch (error: any) {
      console.log('Error switching to vibe check:', error);
      if (error?.response?.status === 401) {
        nav.navigate('Login', { returnTo: 'vibe' });
      } else {
        nav.navigate('VibeOnboarding');
      }
    }
  };

  return { switchToAligned, switchToVibeCheck };
}
