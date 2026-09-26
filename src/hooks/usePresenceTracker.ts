import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logPresence } from '../services/notificationApi';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DENIAL_KEY = 'location_denied_at';

export const usePresenceTracker = () => {
  const appState = useRef(AppState.currentState);
  const lastTrackedAt = useRef<number>(0);
  const isTracking = useRef<boolean>(false);

  const trackPresence = async (force = false) => {
    // Throttle: don't track if already tracking or if tracked less than 3 minutes ago (unless forced)
    const now = Date.now();
    if (isTracking.current) return;
    if (!force && now - lastTrackedAt.current < 3 * 60 * 1000) {
      return;
    }

    isTracking.current = true;
    try {
      let latitude = null;
      let longitude = null;
      let city = null;

      try {
        // First check current permission status quietly without showing a dialog
        let perm = await Location.getForegroundPermissionsAsync();
        let status = perm.status;

        if (status !== 'granted') {
          const deniedAtStr = await AsyncStorage.getItem(DENIAL_KEY);
          const deniedAt = deniedAtStr ? parseInt(deniedAtStr, 10) : 0;
          const isCoolingDown = deniedAt > 0 && (now - deniedAt < SEVEN_DAYS_MS);

          // Only prompt user if they haven't denied in the last 7 days and can ask again
          if (!isCoolingDown && perm.canAskAgain) {
            const req = await Location.requestForegroundPermissionsAsync();
            status = req.status;
            if (status !== 'granted') {
              await AsyncStorage.setItem(DENIAL_KEY, now.toString());
            }
          }
        }

        if (status === 'granted') {
          // Timeout after 8 seconds to prevent hangs on Xiaomi/Android location service delays
          const location = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))
          ]);

          if (location && location.coords) {
            latitude = location.coords.latitude;
            longitude = location.coords.longitude;

            try {
              const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
              if (reverseGeocode && reverseGeocode.length > 0) {
                city = reverseGeocode[0].city || reverseGeocode[0].region || null;
              }
            } catch (e) {
              // Ignore reverse geocode failures
            }
          }
        }
      } catch (locErr) {
        console.log("Location permission/position check skipped:", locErr);
      }

      let timezone = 'UTC';
      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      } catch (e) {
        timezone = 'UTC';
      }

      await logPresence({
        timezone,
        latitude,
        longitude,
        city
      });
      lastTrackedAt.current = Date.now();
      console.log("Presence tracked successfully.");
    } catch (e) {
      console.log("Failed to track presence:", e);
    } finally {
      isTracking.current = false;
    }
  };

  useEffect(() => {
    // Track on initial mount
    trackPresence();

    // Track every 5 minutes while the app is active
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        trackPresence();
      }
    }, 5 * 60 * 1000);

    // Track on app resume
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        trackPresence();
      }
      appState.current = nextAppState;
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);
};

