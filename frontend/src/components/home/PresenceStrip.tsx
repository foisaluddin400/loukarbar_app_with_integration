import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Image, DeviceEventEmitter, Alert } from 'react-native';
import { Colors } from '../../constants/colors';
import { AppText } from '../ui/AppText';
import { formatTime } from '../../utils/dateUtils';
import { getPartnerProfile, alignWithPartner } from '../../services/userApi';
import { getMyNotifications } from '../../services/notificationApi';
import { getMe } from '../../services/authApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { BottomSheet } from '../ui/BottomSheet';
import { AppTextInput } from '../ui/AppTextInput';
import { AppButton } from '../ui/AppButton';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { markNotificationSeen, markNotificationUnread, deleteNotification, hideNotification, unhideNotification, clearAllNotifications } from '../../services/notificationApi';
export interface PresenceStripProps {
  onRedirect?: (type: string, data?: any) => void;
  refreshTrigger?: number;
}

export const PresenceStrip: React.FC<PresenceStripProps> = ({ onRedirect, refreshTrigger = 0 }) => {
  const rowRefs = React.useRef<{[key: string]: any}>({});
  const [showHidden, setShowHidden] = useState(false);
  const [now, setNow] = useState(new Date());
  const [partner, setPartner] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [presenceNotifications, setPresenceNotifications] = useState<any[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [inputKey, setInputKey] = useState("");
  const [isAligning, setIsAligning] = useState(false);

  const fetchPresenceData = async () => {
      try {
        const [profileRes, notificationsRes, meRes] = await Promise.all([
          getPartnerProfile().catch(() => ({ success: false })),
          getMyNotifications(1, 50).catch(() => ({ success: false })),
          getMe().catch(() => null)
        ]);

        if (profileRes.success && profileRes.data) {
          setPartner(profileRes.data);
        } else {
          setPartner(null);
        }

        if (meRes) {
          setMe(meRes);
        }

        if (notificationsRes.success && notificationsRes.data) {
          const presenceOnly = notificationsRes.data.filter((n: any) => n.type === 'Presence' || n.type === 'Partner Check-in' || n.type === 'Ritual Completed' || n.type === 'Proposal' || n.type === 'Reunion' || n.type === 'Mood Change');
          setPresenceNotifications(presenceOnly);
        }
      } catch (e) {
        console.log("Error fetching presence data", e);
      }
    };

  useEffect(() => {
    fetchPresenceData();

    const sub = DeviceEventEmitter.addListener('OPEN_PRESENCE_HISTORY', () => {
      setIsSheetOpen(true);
    });

    const t = setInterval(() => {
      setNow(new Date());
      fetchPresenceData(); // Refresh every minute
    }, 60_000);
    
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [refreshTrigger]);

  const handleAlign = async () => {
    if (!inputKey.trim()) return;
    setIsAligning(true);
    try {
      await alignWithPartner(inputKey.trim());
      await fetchPresenceData();
    } catch (e) {
      console.log("Alignment failed", e);
      alert("Failed to align. Check the key and try again.");
    } finally {
      setIsAligning(false);
    }
  };

  if (!partner) {
    return (
      <View style={[styles.container, styles.alignmentContainer]}>
        <AppText variant="serifItalic" size={18} color={Colors.ink} style={{ marginBottom: 12 }}>
          Not aligned with a partner yet.
        </AppText>
        <AppText variant="smallCaps" color={Colors.muted} style={{ marginBottom: 4 }}>
          YOUR SECRET KEY
        </AppText>
        <View style={styles.secretKeyContainer}>
          <AppText variant="mono" color={Colors.ink} style={styles.secretKeyText} selectable>
            {me?.secret_key || "Loading..."}
          </AppText>
          <Pressable 
            style={styles.copyButton}
            onPress={async () => {
              if (me?.secret_key) {
                await Clipboard.setStringAsync(me.secret_key);
                alert("Copied to clipboard!");
              }
            }}
          >
            <Ionicons name="copy-outline" size={18} color={Colors.ink} />
          </Pressable>
        </View>

        <View style={{ width: '100%', marginTop: 20 }}>
          <AppTextInput
            label="PARTNER'S KEY"
            n="01"
            value={inputKey}
            onChangeText={setInputKey}
            placeholder="Enter their key to connect"
          />
        </View>

        <AppButton
          variant="solid"
          size="lg"
          full
          onPress={handleAlign}
          disabled={isAligning || !inputKey.trim()}
          style={{ marginTop: 15 }}
        >
          {isAligning ? "Connecting..." : "Connect →"}
        </AppButton>
      </View>
    );
  }

  // Calculate dot color and active status string based on last_active_at
  let dotColor = Colors.accent; // Default red
  let isOnline = false;
  let activeStatusStr = '○ AWAY';

  if (partner.last_active_at) {
    const lastActive = new Date(partner.last_active_at);
    const diffMins = Math.floor((now.getTime() - lastActive.getTime()) / 60000);
    
    if (diffMins < 5) {
      dotColor = '#4CAF50'; // Green
      isOnline = true;
      activeStatusStr = '● ACTIVE NOW';
    } else if (diffMins < 60) {
      dotColor = '#FFC107'; // Yellow
      activeStatusStr = `○ ACTIVE ${diffMins}M AGO`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) {
        activeStatusStr = `○ ACTIVE ${diffHours}H AGO`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        activeStatusStr = `○ ACTIVE ${diffDays}D AGO`;
      }
    }
  }

  const latestPresence = presenceNotifications.length > 0 ? presenceNotifications[0] : null;
  const partnerName = partner.name || 'Partner';
  
  // Calculate partner local time based on the timezone from their latest presence or fallback
  let partnerTime = new Date();
  let locationStr = partner.location_city ? partner.location_city.toUpperCase() : 'UNKNOWN';
  
  if (latestPresence) {
    // If we have a timezone, try to calculate their local time
    try {
      const pTimeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: latestPresence.timezone,
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false,
      }).format(now);
      partnerTime = new Date(pTimeStr);
    } catch (e) {}
  }

  const phrase = latestPresence ? latestPresence.message : 'probably asleep';

  return (
    <>
      <View style={styles.container}>
        <View style={styles.left}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              {partner.profile_photo_url ? (
                <Image source={{ uri: `${api.defaults.baseURL}/${partner.profile_photo_url.replace(/\\/g, '/')}` }} style={{ width: '100%', height: '100%', borderRadius: 18 }} />
              ) : (
                <AppText variant="mono" color={Colors.bone} style={{ fontSize: 13, fontWeight: '500' }}>
                  {partnerName[0].toUpperCase()}
                </AppText>
              )}
            </View>
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
          </View>
          <View>
            <AppText variant="smallCaps" color={Colors.muted} style={{ marginBottom: 2 }}>
              {locationStr} · {formatTime(partnerTime)}
            </AppText>
            <AppText variant="serifItalic" size={15} color={Colors.ink2}>
              {partnerName}, <AppText variant="serifItalic" size={15} color={Colors.muted}>{phrase}</AppText>
            </AppText>
          </View>
        </View>
        <Pressable onPress={() => setIsSheetOpen(true)} style={styles.seeMoreBtn}>
          <AppText variant="mono" color={Colors.light} style={{ fontSize: 10 }}>
            {activeStatusStr}
          </AppText>
          <AppText 
            variant="mono" 
            color={presenceNotifications.some(n => n.status !== "Seen") ? Colors.accent : Colors.muted} 
            style={{ 
              fontSize: 9, 
              marginTop: 4, 
              fontWeight: presenceNotifications.some(n => n.status !== "Seen") ? 'bold' : 'normal' 
            }}
          >
            SEE MORE
          </AppText>
        </Pressable>
      </View>

      <BottomSheet
        open={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={`${partnerName}'s Activity`}
        kicker="PRESENCE HISTORY"
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10, paddingHorizontal: 20, marginTop: 10 }}>
          <Pressable onPress={() => {
            Alert.alert(
              "Clear All Notifications",
              "Are you sure you want to permanently delete all notifications? This action cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Clear All",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await clearAllNotifications();
                      setPresenceNotifications([]);
                      DeviceEventEmitter.emit('REFRESH_ALIGNED_DATA');
                    } catch (e) {
                      console.log("Error clearing notifications:", e);
                    }
                  }
                }
              ]
            );
          }}>
            <AppText color={'#D9534F'} size={14} style={{ fontWeight: '600' }}>
              Clear All
            </AppText>
          </Pressable>
          <Pressable onPress={() => setShowHidden(!showHidden)}>
            <AppText color={Colors.accent} size={14}>
              {showHidden ? "Back to History" : "Archived"}
            </AppText>
          </Pressable>
        </View>
        <ScrollView style={{ maxHeight: 400 }}>
          {presenceNotifications.length === 0 ? (
            <AppText color={Colors.muted} style={{ textAlign: 'center', marginTop: 20 }}>
              No recent activity recorded.
            </AppText>
          ) : (
            presenceNotifications
            .filter(n => showHidden ? n.is_hidden : !n.is_hidden)
            .map((n, idx) => {
              const isUnread = n.status !== "Seen";
              const borderC = isUnread ? Colors.accent : Colors.rule;
              const bgC = isUnread ? '#ffffff' : 'transparent';
              const isHidden = n.is_hidden;

              const renderLeftActions = () => (
                <View style={{ justifyContent: 'center', height: '100%', flex: 1, alignItems: 'flex-start', paddingLeft: 24 }}>
                  <Ionicons name="trash-outline" size={20} color={'#D9534F'} />
                  <AppText color={'#D9534F'} variant="mono" style={{ fontSize: 10, marginTop: 4, letterSpacing: 1 }}>DELETE</AppText>
                </View>
              );

              const renderRightActions = () => (
                <View style={{ justifyContent: 'center', height: '100%', flex: 1, alignItems: 'flex-end', paddingRight: 24 }}>
                  <Ionicons name={isHidden ? "archive" : "archive-outline"} size={20} color={Colors.accent} />
                  <AppText color={Colors.accent} variant="mono" style={{ fontSize: 10, marginTop: 4, letterSpacing: 1 }}>{isHidden ? "UNARCHIVE" : "ARCHIVE"}</AppText>
                </View>
              );

              return (
                <View key={n.id || idx} style={{ marginBottom: 16 }}>
                  <Swipeable
                    ref={ref => {
                      if (ref) rowRefs.current[n.id] = ref;
                    }}
                    renderLeftActions={renderLeftActions}
                    renderRightActions={renderRightActions}
                    overshootLeft={true}
                    overshootRight={true}
                    friction={1.5}
                    onSwipeableLeftOpen={async () => {
                      await deleteNotification(n.id);
                      setPresenceNotifications(prev => prev.filter(x => x.id !== n.id));
                      DeviceEventEmitter.emit('REFRESH_ALIGNED_DATA');
                      setTimeout(() => {
                        if (rowRefs.current[n.id]) {
                          rowRefs.current[n.id].close();
                        }
                      }, 200);
                    }}
                    onSwipeableRightOpen={async () => {
                      if (isHidden) {
                        await unhideNotification(n.id);
                        setPresenceNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_hidden: false } : x));
                        DeviceEventEmitter.emit('REFRESH_ALIGNED_DATA');
                      } else {
                        await hideNotification(n.id);
                        setPresenceNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_hidden: true } : x));
                        DeviceEventEmitter.emit('REFRESH_ALIGNED_DATA');
                      }
                      setTimeout(() => {
                        if (rowRefs.current[n.id]) {
                          rowRefs.current[n.id].close();
                        }
                      }, 200);
                    }}
                  >
                    <Pressable
                      style={({ pressed }) => [
                        { backgroundColor: bgC, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: borderC, marginHorizontal: 20 },
                        pressed && { opacity: 0.7 }
                      ]}
                      onPress={async () => {
                        if (isUnread) {
                          await markNotificationSeen(n.id);
                          setPresenceNotifications(prev => {
                            const newList = [...prev];
                            const index = newList.findIndex(x => x.id === n.id);
                            if (index > -1) newList[index] = { ...newList[index], status: "Seen" };
                            return newList;
                          });
                          DeviceEventEmitter.emit('REFRESH_ALIGNED_DATA');
                        }
                        if (n.type === 'Partner Check-in') {
                          setIsSheetOpen(false);
                          if (onRedirect) onRedirect('Partner Check-in', partner);
                        }
                        if (n.type === 'Ritual Completed') {
                          setIsSheetOpen(false);
                          if (onRedirect) onRedirect('Ritual Completed', partner);
                        }
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          {isUnread && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent, marginRight: 6, marginTop: 2 }} />}
                          <AppText variant="serifItalic" size={16} color={Colors.ink} style={{ fontWeight: isUnread ? "bold" : "normal" }}>
                            {n.message}
                          </AppText>
                        </View>
                        <AppText variant="mono" color={Colors.muted} style={{ fontSize: 11, marginLeft: 8, paddingTop: 4 }}>
                          {formatTime(new Date(n.created_at))}
                        </AppText>
                      </View>
                      <AppText variant="smallCaps" color={Colors.muted} style={{ marginTop: 4, marginLeft: isUnread ? 12 : 0 }}>
                        {new Date(n.created_at).toLocaleDateString()}
                      </AppText>
                    </Pressable>
                  </Swipeable>
                </View>
              );
            })
          )}
        </ScrollView>
      </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.bone,
  },
  seeMoreBtn: {
    alignItems: 'flex-end',
    padding: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  historyLeft: {
    flex: 1,
  },
  alignmentContainer: {
    height: 'auto',
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 20,
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 12,
    marginHorizontal: 10,
    marginTop: 10,
  },
  secretKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EFEA',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.rule,
    width: '100%',
    overflow: 'hidden',
  },
  secretKeyText: {
    flex: 1,
    fontSize: 16,
    padding: 12,
    textAlign: 'center',
    letterSpacing: 2
  },
  copyButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#E5E4DF',
    borderLeftWidth: 1,
    borderLeftColor: Colors.rule,
    justifyContent: 'center',
    alignItems: 'center'
  }
});