import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Image, Alert, PanResponder, DeviceEventEmitter, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/colors';
import { AppText } from '../../components/ui/AppText';
import { getMe } from '../../services/authApi';
import api from '../../services/api';
import { BottomSheet } from './BottomSheet';
import { AppTextInput } from './AppTextInput';
import { AppButton } from './AppButton';
import { updateUserName, uploadProfilePhoto, breakAlignment, deleteAccount } from '../../services/userApi';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useModeSwitcher } from '../../hooks/useModeSwitcher';
import { Ionicons } from '@expo/vector-icons';
import { getMyNotifications } from '../../services/notificationApi';

const AlignedNav: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [photoKey, setPhotoKey] = useState(Date.now());

  const [isBreakAlignmentOpen, setIsBreakAlignmentOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

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

  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUserAndNotifications = async () => {
    try {
      const t = await AsyncStorage.getItem('access_token');
      setToken(t);
      const data = await getMe();
      setUser(data);
      if (data && data.name) {
        setEditName(data.name);
      }
      
      const notifsData = await getMyNotifications(1, 20, ["Presence", "Partner Check-in", "Ritual Completed", "Proposal", "Reunion"], false);
      if (notifsData && notifsData.data) {
          setUnreadCount(notifsData.unread_count || 0);
      }
    } catch (err) {
      console.log("Error fetching user or notifs for nav:", err);
    }
  };

  useEffect(() => {
    fetchUserAndNotifications();
    const sub = DeviceEventEmitter.addListener('REFRESH_ALIGNED_DATA', fetchUserAndNotifications);
    return () => sub.remove();
  }, []);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setIsSaving(true);
      try {
        await uploadProfilePhoto(result.assets[0].uri);
        setPhotoKey(Date.now()); // bust image cache
        await fetchUser(); // reload user data to get new photo
      } catch (e) {
        console.error("Photo upload failed", e);
        Alert.alert("Upload Failed", "Could not upload profile photo.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      if (editName.trim()) {
        await updateUserName(editName.trim());
      }
      await fetchUser();
      setIsProfileOpen(false);
    } catch (e) {
      console.error("Profile update failed", e);
      Alert.alert("Update Failed", "Could not update your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('refresh_token');
    setIsProfileOpen(false);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleBreakAlignment = async () => {
    setIsSaving(true);
    try {
      await breakAlignment();
      setIsBreakAlignmentOpen(false);
      setIsProfileOpen(false);
      navigation.reset({ index: 0, routes: [{ name: 'ModeSelector' }] });
    } catch (e) {
      console.error("Break alignment failed", e);
      Alert.alert("Error", "Could not break alignment.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return;
    setIsSaving(true);
    try {
      await deleteAccount(deletePassword, 'aligned');
      setIsDeleteAccountOpen(false);
      setIsProfileOpen(false);
      navigation.reset({ index: 0, routes: [{ name: 'ModeSelector' }] });
    } catch (e: any) {
      console.error("Delete account failed", e);
      Alert.alert("Error", e?.response?.data?.detail || "Could not delete data. Check your password.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppText variant="display" style={styles.alignedText}>
        aligned.
      </AppText>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }} {...panResponder.panHandlers}>
        <Pressable onPress={() => DeviceEventEmitter.emit('OPEN_PRESENCE_HISTORY')} style={{ position: 'relative', marginTop: 4 }}>
          <Ionicons name="notifications-outline" size={24} color={Colors.ink} />
          {unreadCount > 0 && (
            <View style={{
              position: 'absolute',
              top: -2,
              right: -2,
              backgroundColor: Colors.accent,
              minWidth: 14,
              height: 14,
              borderRadius: 7,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: Colors.bone,
              paddingHorizontal: 2
            }}>
              <AppText style={{ color: Colors.white, fontSize: 8, fontWeight: 'bold', lineHeight: 10 }}>
                {unreadCount}
              </AppText>
            </View>
          )}
        </Pressable>

        <Pressable style={styles.partnerContainer} onPress={() => setIsProfileOpen(true)}>
          <AppText variant="smallCaps" style={styles.partnerName}>
            {user && user.name ? user.name.toUpperCase() : 'USER'}
          </AppText>
          <View style={styles.avatar}>
            {user && user.profile_photo_url ? (
              <Image 
                source={{ 
                  uri: `${api.defaults.baseURL}/${user.profile_photo_url.replace(/\\/g, '/')}?t=${photoKey}`
                }} 
                style={{ width: 32, height: 32, borderRadius: 16 }}
              />
            ) : (
              <AppText style={styles.avatarText}>
                {user && user.name ? user.name[0].toUpperCase() : 'U'}
              </AppText>
            )}
          </View>
        </Pressable>
      </View>

      <BottomSheet
        open={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        title="Your Profile"
        kicker="EDIT PROFILE"
      >
        <View style={styles.sheetContent}>
          <View style={styles.sheetAvatarContainer}>
            <Pressable onPress={handlePickImage} disabled={isSaving}>
              <View style={[styles.avatar, { width: 80, height: 80, borderRadius: 40 }]}>
                {user && user.profile_photo_url ? (
                  <Image 
                    source={{ 
                      uri: `${api.defaults.baseURL}/${user.profile_photo_url.replace(/\\/g, '/')}?t=${photoKey}`
                    }} 
                    style={{ width: 80, height: 80, borderRadius: 40 }}
                  />
                ) : (
                  <AppText style={[styles.avatarText, { fontSize: 36 }]}>
                    {user && user.name ? user.name[0].toUpperCase() : 'U'}
                  </AppText>
                )}
              </View>
              <AppText variant="smallCaps" color={Colors.accent} style={{ textAlign: 'center', marginTop: 12 }}>
                CHANGE PHOTO
              </AppText>
            </Pressable>
          </View>

          <View style={{ marginBottom: 32 }}>
            <AppTextInput 
              label="Your name" 
              n="01" 
              value={editName} 
              onChangeText={setEditName} 
              placeholder="What should we call you?"
            />
          </View>

          <AppButton 
            variant="solid" 
            size="lg" 
            full 
            onPress={handleSaveProfile} 
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Profile →"}
          </AppButton>
          
          <Pressable style={styles.blackCard} onPress={() => { setIsProfileOpen(false); switchToVibeCheck(); }}>
            <AppText variant="heading" size={17} color="#fff">
              Flip to vibe check.
            </AppText>
            <AppText variant="mono" color="#ccc">
              The other side — for figuring it out
            </AppText>
          </Pressable>
          
          <View style={styles.actionButtons}>
            <Pressable onPress={handleLogout} style={styles.actionBtn}>
              <AppText variant="smallCaps" color={Colors.muted} style={styles.actionText}>LOG OUT</AppText>
            </Pressable>
            
            <Pressable onPress={() => { setIsProfileOpen(false); setIsBreakAlignmentOpen(true); }} style={styles.actionBtn}>
              <AppText variant="smallCaps" color={Colors.muted} style={styles.actionText}>BREAK ALIGNMENT</AppText>
            </Pressable>
            
            <Pressable onPress={() => { setIsProfileOpen(false); setIsDeleteAccountOpen(true); }} style={styles.actionBtn}>
              <AppText variant="smallCaps" color="#FF3B30" style={styles.actionText}>DELETE ALIGNED DATA</AppText>
            </Pressable>
          </View>
        </View>
      </BottomSheet>

      {/* Break Alignment BottomSheet */}
      <BottomSheet
        open={isBreakAlignmentOpen}
        onClose={() => setIsBreakAlignmentOpen(false)}
        title="Break Alignment?"
        kicker="WARNING"
      >
        <View style={styles.sheetContent}>
          <AppText style={{ marginBottom: 30, lineHeight: 22, color: Colors.ink2 }}>
            Are you sure you want to disconnect? Your partner will be notified, and you'll both need to re-align or find new partners to use aligned features again.
          </AppText>
          <AppButton 
            variant="solid" 
            size="lg" 
            full 
            onPress={handleBreakAlignment} 
            disabled={isSaving}
            style={{ backgroundColor: '#FF3B30' }}
          >
            {isSaving ? "Disconnecting..." : "Break Alignment"}
          </AppButton>
        </View>
      </BottomSheet>

      {/* Delete Account BottomSheet */}
      <BottomSheet
        open={isDeleteAccountOpen}
        onClose={() => setIsDeleteAccountOpen(false)}
        title="Delete Aligned Data?"
        kicker="DANGER ZONE"
      >
        <View style={styles.sheetContent}>
          <AppText style={{ marginBottom: 20, lineHeight: 22, color: Colors.ink2 }}>
            This action cannot be undone. All your Aligned data, check-ins, and streaks will be permanently deleted. Your Vibe Check data and login will remain intact. Please confirm your password.
          </AppText>
          <View style={{ marginBottom: 30 }}>
            <AppTextInput 
              label="Password" 
              n="01" 
              value={deletePassword} 
              onChangeText={setDeletePassword} 
              placeholder="Enter your password"
              secureTextEntry
            />
          </View>
          <AppButton 
            variant="solid" 
            size="lg" 
            full 
            onPress={handleDeleteAccount} 
            disabled={isSaving || !deletePassword}
            style={{ backgroundColor: '#FF3B30' }}
          >
            {isSaving ? "Deleting..." : "Delete Aligned Data"}
          </AppButton>
        </View>
      </BottomSheet>
    </View>
  );
};

export default AlignedNav;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.bone,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule
  },
  alignedText: {
    fontSize: 23,
    letterSpacing: 0.5,
    color: Colors.ink,
  },
  partnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  partnerName: {
    fontSize: 10,
    letterSpacing: 0.5,
    color: Colors.muted,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  sheetContent: {
    paddingVertical: 10,
  },
  sheetAvatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  actionButtons: {
    marginTop: 30,
    gap: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.rule,
    alignItems: 'center',
  },
  blackCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 20,
    marginTop: 16,
  },
  actionBtn: {
    paddingVertical: 5,
  },
  actionText: {
    textAlign: 'center',
    fontSize: 12,
  }
});