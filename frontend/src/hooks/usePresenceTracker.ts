import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { logPresence } from '../services/notificationApi';

export const usePresenceTracker = () => {
  const appState = useRef(AppState.currentState);

  const trackPresence = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let latitude = null;
      let longitude = null;
      let city = null;

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
        
        try {
          const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (reverseGeocode && reverseGeocode.length > 0) {
            city = reverseGeocode[0].city || reverseGeocode[0].region;
          }
        } catch (e) {
          // Silently catch known Android emulator reverse geocode NPE
        }
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await logPresence({
        timezone,
        latitude,
        longitude,
        city
      });
      console.log("Presence tracked successfully.");
    } catch (e) {
      console.log("Failed to track presence:", e);
    }
  };

  useEffect(() => {
    // Track on initial mount
    trackPresence();

    // Track on app resume
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        trackPresence();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);
};
