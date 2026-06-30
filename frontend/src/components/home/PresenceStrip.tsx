import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Colors } from '../../constants/colors';
import { AppText } from '../ui/AppText';
import { formatTime } from '../../utils/dateUtils';
import { getPartnerProfile, alignWithPartner } from '../../services/userApi';
import { getMyNotifications } from '../../services/notificationApi';
import { getMe } from '../../services/authApi';
import { BottomSheet } from '../ui/BottomSheet';
import { AppTextInput } from '../ui/AppTextInput';
import { AppButton } from '../ui/AppButton';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

export const PresenceStrip: React.FC = () => {
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
          const presenceOnly = notificationsRes.data.filter((n: any) => n.type === 'Presence' || n.type === 'Partner Check-in');
          setPresenceNotifications(presenceOnly);
        }
      } catch (e) {
        console.log("Error fetching presence data", e);
      }
    };

  useEffect(() => {
    fetchPresenceData();

    const t = setInterval(() => {
      setNow(new Date());
      fetchPresenceData(); // Refresh every minute
    }, 60_000);
    
    return () => clearInterval(t);
  }, []);

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

  // Calculate dot color based on last_active_at
  let dotColor = Colors.accent; // Default red
  let isOnline = false;
  if (partner.last_active_at) {
    const lastActive = new Date(partner.last_active_at);
    const diffMins = (now.getTime() - lastActive.getTime()) / 60000;
    
    if (diffMins < 5) {
      dotColor = '#4CAF50'; // Green
      isOnline = true;
    } else if (diffMins < 60) {
      dotColor = '#FFC107'; // Yellow
    }
  }

  const latestPresence = presenceNotifications.length > 0 ? presenceNotifications[0] : null;
  const partnerName = partner.name || 'Partner';
  
  // Calculate partner local time based on the timezone from their latest presence or fallback
  let partnerTime = new Date();
  let locationStr = partner.city_name ? partner.city_name.toUpperCase() : 'UNKNOWN';
  
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
              <AppText variant="mono" color={Colors.bone} style={{ fontSize: 13, fontWeight: '500' }}>
                {partnerName[0].toUpperCase()}
              </AppText>
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
            {isOnline ? '● HERE' : '○ AWAY'}
          </AppText>
          <AppText variant="mono" color={Colors.muted} style={{ fontSize: 9, marginTop: 4 }}>
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
        <ScrollView style={{ maxHeight: 400, marginTop: 10 }}>
          {presenceNotifications.length === 0 ? (
            <AppText color={Colors.muted} style={{ textAlign: 'center', marginTop: 20 }}>
              No recent activity recorded.
            </AppText>
          ) : (
            presenceNotifications.map((n, idx) => (
              <View key={n.id || idx} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <AppText variant="serifItalic" size={16} color={Colors.ink}>
                    {n.message}
                  </AppText>
                  <AppText variant="smallCaps" color={Colors.muted} style={{ marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleDateString()}
                  </AppText>
                </View>
                <AppText variant="mono" color={Colors.muted} style={{ fontSize: 11 }}>
                  {formatTime(new Date(n.created_at))}
                </AppText>
              </View>
            ))
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