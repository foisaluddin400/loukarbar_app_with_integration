import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Image, PanResponder, DeviceEventEmitter } from 'react-native';
import { Colors } from '../../constants/colors';
import { AppText } from '../../components/ui/AppText';
import { getMe } from '../../services/authApi';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useModeSwitcher } from '../../hooks/useModeSwitcher';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

const AlignedNav: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [photoKey, setPhotoKey] = useState(Date.now());
  const navigation = useNavigation<any>();
  const { switchToVibeCheck } = useModeSwitcher();

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 30) {
          switchToVibeCheck('down');
        } else if (gestureState.dy < -30) {
          switchToVibeCheck('up');
        }
      },
    })
  ).current;

  const getImageUrl = (url: string | null | undefined, bustKey: number) => {
    if (!url) return null;
    let cleanUrl = url;
    if (!url.startsWith('http')) {
      const baseUrl = api.defaults.baseURL?.replace('/api/v1', '') || API_BASE || '';
      cleanUrl = `${baseUrl}/${url.replace(/^\//, '')}`;
    }
    const separator = cleanUrl.includes('?') ? '&' : '?';
    return `${cleanUrl}${separator}t=${bustKey}`;
  };

  const fetchUserData = async () => {
    try {
      const me = await getMe();
      if (me) {
        setUser(me);
        setPhotoKey(Date.now());
      }
    } catch (err) {
      console.log("Error fetching user for AlignedNav:", err);
    }
  };

  useEffect(() => {
    fetchUserData();
    const sub = DeviceEventEmitter.addListener('REFRESH_ALIGNED_DATA', fetchUserData);
    return () => sub.remove();
  }, []);

  const myInitial = user?.name ? user.name[0].toUpperCase() : 'U';
  const profilePictureUrl = getImageUrl(user?.profile_photo_url, photoKey);

  return (
    <View style={styles.topBar}>
      <AppText variant="display" style={{ fontSize: 25 }}>
        aligned.
      </AppText>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View {...panResponder.panHandlers}>
          <Pressable 
            onPress={() => navigation.navigate('AlignedProfile')} 
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            {user?.name && (
              <AppText variant="serifItalic" size={16} color={Colors.ink}>
                {user.name}
              </AppText>
            )}
            {profilePictureUrl ? (
              <Image 
                source={{ uri: profilePictureUrl }} 
                style={styles.navAvatar}
              />
            ) : (
              <View style={styles.navAvatarPlaceholder}>
                <AppText style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                  {myInitial}
                </AppText>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default AlignedNav;

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
    backgroundColor: Colors.bone,
  },
  navAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  navAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});