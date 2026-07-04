import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, Alert, ActivityIndicator, Image, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Swipeable } from 'react-native-gesture-handler';
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types";
import { Colors } from "../../constants/colors";
import { AppText } from "../../components/ui/AppText";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { AppButton } from "../../components/ui/AppButton";
import { AppTextInput } from "../../components/ui/AppTextInput";
import {
  getVibeProfile,
  getConnections,
  getRequests,
  generateInvite,
  connectWithKey,
  respondToRequest,
  deleteConnection,
  regenerateKey,
} from "../../services/vibeCheckApi";
import { deleteAccount } from "../../services/userApi";
import { getMyNotifications, markNotificationSeen, deleteNotification, clearAllNotifications } from "../../services/notificationApi";
import * as Clipboard from "expo-clipboard";
import { DeviceEventEmitter } from "react-native";

let CameraView: any = null;
let useCameraPermissions: any = () => [null, async () => {}];
if (Platform.OS !== "web") {
  const ExpoCamera = require("expo-camera");
  CameraView = ExpoCamera.CameraView;
  useCameraPermissions = ExpoCamera.useCameraPermissions;
}

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

type Nav = StackNavigationProp<RootStackParamList>;

interface SamVibeNavProps {
  onPartnerChange?: (partnerId: string) => void;
}

const SamVibeNav: React.FC<SamVibeNavProps> = ({ onPartnerChange }) => {
  const navigation = useNavigation<Nav>();
  const [settingsSheet, setSettingsSheet] = useState(false);
  const [inviteSheet, setInviteSheet] = useState(false);
  const [switchSheet, setSwitchSheet] = useState(false);
  const [connectSheet, setConnectSheet] = useState(false);
  const [requestsSheet, setRequestsSheet] = useState(false);
  const [notificationsSheet, setNotificationsSheet] = useState(false);
  const [scannerSheet, setScannerSheet] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isDeleteDataOpen, setIsDeleteDataOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  // Profile & connections state
  const [profile, setProfile] = useState<any>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite state
  const [inviteData, setInviteData] = useState<{ invite_code: string; invite_link: string } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Connect by key state
  const [keyInput, setKeyInput] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);

  // Active connection index (which connection is selected)
  const [activeIdx, setActiveIdx] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileData, connectionsData, requestsData, notifsData] = await Promise.all([
        getVibeProfile().catch(() => null),
        getConnections().catch(() => ({ data: [] })),
        getRequests().catch(() => ({ data: [] })),
        getMyNotifications(1, 50).catch(() => ({ data: [] })),
      ]);
      if (profileData) setProfile(profileData);
      
      const conns = connectionsData?.data || [];
      setConnections(conns);
      setRequests(requestsData?.data || []);
      setNotifications(notifsData?.data || []);
      
      if (conns.length > 0 && onPartnerChange) {
         onPartnerChange(conns[0].user_id);
      }
    } catch (error) {
      console.log("Error fetching vibe data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    DeviceEventEmitter.addListener("REFRESH_VIBE_DATA", fetchData);
    return () => {
      DeviceEventEmitter.removeAllListeners("REFRESH_VIBE_DATA");
    };
  }, [fetchData]);

  useEffect(() => {
    if (!profile?.user_id) return;
    
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let isMounted = true;
    
    const connectWs = () => {
      if (!isMounted) return;
      
      const wsUrl = process.env.EXPO_PUBLIC_BACKEND_URL
        ? process.env.EXPO_PUBLIC_BACKEND_URL.replace("http", "ws") + `/ws/notifications/${profile.user_id}`
        : `ws://localhost:8000/ws/notifications/${profile.user_id}`;
        
      ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "NEW_NOTIFICATION") {
             DeviceEventEmitter.emit("REFRESH_VIBE_DATA");
          }
        } catch (e) {}
      };

      ws.onclose = () => {
         if (isMounted) {
            reconnectTimer = setTimeout(connectWs, 3000);
         }
      };
    };
    
    connectWs();
    
    return () => {
      isMounted = false;
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [profile?.user_id]);

  const activeConnection = connections.length > 0 ? connections[activeIdx] || connections[0] : null;
  const activePartnerName = activeConnection?.name || "No connection";
  const activePartnerInitial = activePartnerName.charAt(0).toUpperCase();
  
  const myInitial = profile?.name?.charAt(0).toUpperCase() || '?';
  const profilePictureUrl = profile?.profile_picture
    ? `${API_BASE}/${profile.profile_picture.replace(/\\/g, '/')}`
    : null;

  // ─── Handlers ──────────────────────────────────────────────

  const handleGenerateInvite = async () => {
    try {
      setInviteLoading(true);
      const data = await generateInvite();
      setInviteData(data);
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || "Failed to generate invite.";
      Alert.alert("Error", msg);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInvite = async () => {
    if (inviteData) {
      const message = `hey — found this game thing, takes 5 seconds a day. wanna do a vibe check? ${inviteData.invite_link}`;
      await Clipboard.setStringAsync(message);
      Alert.alert("Copied!", "Invite message copied to clipboard.");
    }
  };

  const handleConnectWithKey = async () => {
    if (!keyInput.trim()) {
      Alert.alert("Missing Key", "Please enter a Vibe Key.");
      return;
    }
    try {
      setConnectLoading(true);
      await connectWithKey(keyInput.trim());
      Alert.alert("Success", "Connection request sent!");
      setKeyInput("");
      setConnectSheet(false);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || "Failed to connect.";
      Alert.alert("Error", error.message || "Failed to connect.");
    } finally {
      setConnectLoading(false);
    }
  };

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScannerSheet(false);
    setKeyInput(data);
    setTimeout(() => {
        setConnectSheet(true);
    }, 500);
  };

  const handleRespondToRequest = async (requestId: string, accept: boolean) => {
    try {
      await respondToRequest(requestId, accept);
      Alert.alert("Done", accept ? "Request accepted!" : "Request declined.");
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || "Failed to respond.";
      Alert.alert("Error", msg);
    }
  };

  const handleDeleteConnection = async (partnerId: string, partnerName: string) => {
    Alert.alert(
      "Remove Connection",
      `Are you sure you want to remove ${partnerName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteConnection(partnerId);
              Alert.alert("Done", "Connection removed.");
              fetchData();
            } catch (error: any) {
              const msg = error.response?.data?.detail || error.message || "Failed to remove.";
              Alert.alert("Error", msg);
            }
          },
        },
      ]
    );
  };

  const handleRegenerateKey = async () => {
    try {
      const result = await regenerateKey();
      Alert.alert("New Key", result.message);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || "Failed to regenerate key.";
      Alert.alert("Error", msg);
    }
  };

  const handleDeleteVibeData = async () => {
    if (!deletePassword) return;
    setConnectLoading(true);
    try {
      await deleteAccount(deletePassword, 'vibe_check');
      setIsDeleteDataOpen(false);
      setSettingsSheet(false);
      navigation.reset({ index: 0, routes: [{ name: 'ModeSelector' }] });
    } catch (error: any) {
      console.error("Delete data failed", error);
      Alert.alert("Error", error?.response?.data?.detail || "Could not delete data. Check your password.");
    } finally {
      setConnectLoading(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      fetchData();
    } catch (e) {
      console.error("Failed to delete notification", e);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await clearAllNotifications();
      fetchData();
    } catch (e) {
      console.error("Failed to clear notifications", e);
    }
  };

  const getConnectionText = () => {
    if (!activeConnection) return "LOADING...";
    const connectedAt = new Date(activeConnection.connected_at);
    
    // Start of current day vs start of connected day to count days accurately
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const connectedDate = new Date(connectedAt);
    connectedDate.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(today.getTime() - connectedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Day 1 is the day of connection
    
    if (diffDays > 90) {
      return `CONNECTED ${diffDays} DAYS`;
    } else {
      const remaining = 90 - diffDays;
      return `DAY ${diffDays} • ${remaining} REMAINING`;
    }
  };

  return (
    <View>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <AppText variant="display" style={{ fontSize: 25 }}>
          vibe check.
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable onPress={() => setNotificationsSheet(true)} style={{ position: 'relative', marginTop: 4 }}>
            <Ionicons name="notifications-outline" size={24} color={Colors.ink} />
            {(requests.length + notifications.filter(n => n.status !== "seen").length) > 0 && (
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
                  {requests.length + notifications.filter(n => n.status !== "seen").length}
                </AppText>
              </View>
            )}
          </Pressable>
          <Pressable onPress={() => navigation.navigate('VibeProfile')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {profile?.name && (
              <AppText variant="serifItalic" size={16} color={Colors.ink}>
                {profile.name}
              </AppText>
            )}
            {profilePictureUrl ? (
              <Image source={{ uri: profilePictureUrl }} style={styles.navAvatar} />
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

      {/* Active Connection Card */}
      <Pressable style={styles.samCard} onPress={() => setSwitchSheet(true)}>
        <View style={styles.samLeft}>
          <View style={{ position: 'relative' }}>
            {activeConnection?.profile_picture ? (
              <Image 
                source={{ uri: activeConnection.profile_picture.startsWith('http') ? activeConnection.profile_picture : `${API_BASE}/${activeConnection.profile_picture.replace(/\\/g, '/')}` }} 
                style={styles.avatar} 
              />
            ) : (
              <View style={styles.avatar}>
                <AppText style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>
                  {activePartnerInitial}
                </AppText>
              </View>
            )}
            {activeConnection?.is_online && (
              <View style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#ece5dd' }} />
            )}
          </View>
          <View>
            <AppText variant="heading" size={14}>
              {activePartnerName}
            </AppText>
            <AppText
              variant="mono"
              color={Colors.muted}
              style={{ fontSize: 9, marginTop: 2 }}
            >
              {getConnectionText()}
            </AppText>
          </View>
        </View>

        <View style={styles.samRight}>
          <View style={[styles.activeBadge, { backgroundColor: activeConnection?.is_online ? '#e8f5e9' : '#f5f5f5' }]}>
            <AppText
              variant="mono"
              style={{ fontSize: 10, color: activeConnection?.is_online ? '#2e7d32' : Colors.muted }}
            >
              {activeConnection?.is_online ? "ONLINE" : "OFFLINE"}
            </AppText>
          </View>
        </View>
      </Pressable>

      {/* ==================== SETTINGS BOTTOMSHEET ==================== */}
      <BottomSheet
        open={settingsSheet}
        onClose={() => setSettingsSheet(false)}
        kicker="MENU"
        title="Settings"
      >
        <View>
          <View style={styles.settingCard}>
            <AppText variant="smallCaps" color={Colors.muted}>
              PLAYING AS
            </AppText>
            <AppText variant="heading" size={20}>
              {profile?.name || "You"} {connections.length === 0 ? "• solo" : ""}
            </AppText>
            {profile?.vibe_key && (
              <View style={{ marginTop: 8 }}>
                <AppText variant="smallCaps" color={Colors.muted}>YOUR VIBE KEY</AppText>
                <AppText variant="mono" color={Colors.accent} style={{ fontSize: 12, marginTop: 2 }}>
                  {profile.vibe_key}
                </AppText>
              </View>
            )}
          </View>

          <View style={{ marginTop: 24, gap: 8 }}>
            <AppText variant="smallCaps" color={Colors.muted}>
              Quick Actions
            </AppText>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setSettingsSheet(false);
                setInviteSheet(true);
              }}
            >
              <AppText variant="heading" size={17}>
                Invite someone
              </AppText>
              <AppText variant="mono" color={Colors.muted}>
                Share your private link
              </AppText>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setSettingsSheet(false);
                setConnectSheet(true);
              }}
            >
              <AppText variant="heading" size={17}>
                Connect with key
              </AppText>
              <AppText variant="mono" color={Colors.muted}>
                Enter someone's Vibe Key
              </AppText>
            </Pressable>

            {requests.length > 0 && (
              <Pressable
                style={[styles.menuItem, { backgroundColor: Colors.accent }]}
                onPress={() => {
                  setSettingsSheet(false);
                  setNotificationsSheet(true);
                }}
              >
                <AppText variant="heading" size={17}>
                  Pending requests ({requests.length})
                </AppText>
                <AppText variant="mono" color={Colors.accent}>
                  Review connection requests
                </AppText>
              </Pressable>
            )}

            <Pressable style={styles.menuItem} onPress={handleRegenerateKey}>
              <AppText variant="heading" size={17}>
                Regenerate Vibe Key
              </AppText>
              <AppText variant="mono" color={Colors.muted}>
                Get a new unique key
              </AppText>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={() => {
                setSettingsSheet(false);
                setNotificationsSheet(true);
            }}>
              <AppText variant="heading" size={17}>
                Notifications
              </AppText>
            </Pressable>

            <Pressable style={styles.menuItem}>
              <AppText variant="heading" size={17}>
                Privacy
              </AppText>
            </Pressable>

            <Pressable style={styles.blackCard} onPress={() => navigation.navigate('AlignedApp')}>
              <AppText variant="heading" size={17} color="#fff">
                Flip to aligned.
              </AppText>
              <AppText variant="mono" color="#ccc">
                The other side — for couples
              </AppText>
            </Pressable>

            <Pressable style={[styles.menuItem, { borderColor: '#FF3B30' }]} onPress={() => { setSettingsSheet(false); setIsDeleteDataOpen(true); }}>
              <AppText variant="heading" size={17} color="#FF3B30">
                Delete Vibe Check Data
              </AppText>
              <AppText variant="mono" color={Colors.muted}>
                Wipes vibe profile and scores
              </AppText>
            </Pressable>
          </View>
        </View>
      </BottomSheet>

      {/* ==================== DELETE DATA BOTTOMSHEET ==================== */}
      <BottomSheet
        open={isDeleteDataOpen}
        onClose={() => setIsDeleteDataOpen(false)}
        title="Delete Vibe Check Data?"
        kicker="DANGER ZONE"
      >
        <View>
          <AppText style={{ marginBottom: 20, lineHeight: 22, color: Colors.ink2 }}>
            This action cannot be undone. All your Vibe Check data, scores, and connections will be permanently deleted. Your Aligned data and login will remain intact. Please confirm your password.
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
            onPress={handleDeleteVibeData} 
            disabled={connectLoading || !deletePassword}
            style={{ backgroundColor: '#FF3B30' }}
          >
            {connectLoading ? "Deleting..." : "Delete Vibe Check Data"}
          </AppButton>
        </View>
      </BottomSheet>

      {/* ==================== INVITE BOTTOMSHEET ==================== */}
      <BottomSheet
        open={inviteSheet}
        onClose={() => { setInviteSheet(false); setInviteData(null); }}
        kicker="INVITE"
        title="Invite someone to play"
      >
        <View>
          <AppText
            variant="serifItalic"
            size={15}
            color={Colors.muted}
            style={{ marginBottom: 20, lineHeight: 22 }}
          >
            Send the link. They open it, see one card, play their first round.
            No account needed for that first card.
          </AppText>

          {!inviteData ? (
            <AppButton
              full
              variant="solid"
              size="lg"
              onPress={handleGenerateInvite}
              disabled={inviteLoading}
              style={{ backgroundColor: "#1C1C1E" }}
            >
              {inviteLoading ? "GENERATING..." : "GENERATE INVITE LINK"}
            </AppButton>
          ) : (
            <View>
              <AppText variant="smallCaps" color={Colors.muted}>Suggested Message</AppText>
              <View style={styles.suggestedMessage}>
                <AppText variant="serifItalic" size={15}>
                  "hey — found this game thing, takes 5 seconds a day. wanna do a
                  vibe check? {inviteData.invite_link}"
                </AppText>
              </View>

              <AppButton
                full
                variant="solid"
                size="lg"
                style={{ marginTop: 20, backgroundColor: "#1C1C1E" }}
                onPress={handleCopyInvite}
              >
                COPY MESSAGE
              </AppButton>

              <View style={styles.shareButtons}>
                <AppButton variant="outline" size="md" style={{ flex: 1 }}>
                  iMESSAGE
                </AppButton>
                <AppButton variant="outline" size="md" style={{ flex: 1 }}>
                  WHATSAPP
                </AppButton>
                <AppButton variant="outline" size="md" style={{ flex: 1 }}>
                  OTHER
                </AppButton>
              </View>
            </View>
          )}

          <AppText
            variant="smallCaps"
            color={Colors.accent}
            style={{ marginTop: 30, marginBottom: 8 }}
          >
            WHAT THEY'LL SEE
          </AppText>
          <AppText variant="serifItalic" size={14} color={Colors.muted}>
            A simple card. No commitment language, no relationship questions.
            Just play one round with you. They can stop after that or keep
            going.
          </AppText>
        </View>
      </BottomSheet>

      {/* ==================== CONNECT WITH KEY BOTTOMSHEET ==================== */}
      <BottomSheet
        open={connectSheet}
        onClose={() => { setConnectSheet(false); setKeyInput(""); }}
        kicker="CONNECT"
        title="Enter a Vibe Key"
      >
        <View>
          <AppText
            variant="serifItalic"
            size={15}
            color={Colors.muted}
            style={{ marginBottom: 20, lineHeight: 22 }}
          >
            Ask for their Vibe Key and paste it below to send a connection request.
          </AppText>

          <AppTextInput
            label="Vibe Key"
            n="01"
            value={keyInput}
            onChangeText={setKeyInput}
            placeholder="e.g. VIBE-k7d2x"
            autoCapitalize="none"
          />

          <AppButton
            variant="outline"
            size="md"
            style={{ marginTop: 12 }}
            onPress={() => {
               setConnectSheet(false);
               setTimeout(() => setScannerSheet(true), 300);
            }}
          >
            SCAN QR CODE
          </AppButton>

          <AppButton
            full
            variant="solid"
            size="lg"
            style={{ marginTop: 20 }}
            onPress={handleConnectWithKey}
            disabled={connectLoading}
          >
            {connectLoading ? "CONNECTING..." : "SEND REQUEST →"}
          </AppButton>
        </View>
      </BottomSheet>

      {/* ==================== PENDING REQUESTS BOTTOMSHEET ==================== */}
      <BottomSheet
        open={requestsSheet}
        onClose={() => setRequestsSheet(false)}
        kicker="REQUESTS"
        title={`${requests.length} pending`}
      >
        <View>
          {requests.length === 0 ? (
            <AppText variant="serifItalic" size={15} color={Colors.muted}>
              No pending requests right now.
            </AppText>
          ) : (
            requests.map((req, i) => (
              <View key={req.request_id || i} style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <View style={[styles.avatarBig, { backgroundColor: "#e8b4b4af" }]}>
                    <AppText style={{ color: "#fff", fontSize: 24 }}>
                      {req.sender_name?.charAt(0).toUpperCase() || "?"}
                    </AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="heading" size={18}>
                      {req.sender_name}
                    </AppText>
                    <AppText variant="mono" color={Colors.muted} style={{ fontSize: 10 }}>
                      WANTS TO CONNECT
                    </AppText>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <AppButton
                    variant="solid"
                    size="sm"
                    style={{ flex: 1 }}
                    onPress={() => handleRespondToRequest(req.request_id, true)}
                  >
                    Accept
                  </AppButton>
                  <AppButton
                    variant="outline"
                    size="sm"
                    style={{ flex: 1 }}
                    onPress={() => handleRespondToRequest(req.request_id, false)}
                  >
                    Decline
                  </AppButton>
                </View>
              </View>
            ))
          )}
        </View>
      </BottomSheet>
      {/* ==================== NOTIFICATIONS SHEET ==================== */}
      <BottomSheet
        open={notificationsSheet}
        onClose={() => {
          setNotificationsSheet(false);
          fetchData(); // Refresh on close in case they read things
        }}
        kicker="UPDATES"
        title="Notifications"
      >
        <View style={{ gap: 16 }}>
          {notifications.length > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Pressable onPress={handleClearAllNotifications}>
                <AppText color={Colors.accent} size={14}>Clear All</AppText>
              </Pressable>
            </View>
          )}
          {requests.length === 0 && notifications.length === 0 ? (
            <AppText color={Colors.muted} style={{ textAlign: 'center', marginTop: 20 }}>
              No notifications.
            </AppText>
          ) : (
            <>
              {requests.map((req) => (
                <View key={req.id} style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.rule }}>
                  <AppText color={Colors.text} style={{ marginBottom: 12 }}>
                    <AppText color={Colors.text} style={{ fontWeight: "bold" }}>{req.sender_name}</AppText> wants to connect with you.
                  </AppText>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <AppButton variant="solid" size="sm" style={{ flex: 1 }} onPress={() => handleRespondToRequest(req.id, true)}>
                      Accept
                    </AppButton>
                    <AppButton variant="outline" size="sm" style={{ flex: 1 }} onPress={() => handleRespondToRequest(req.id, false)}>
                      Decline
                    </AppButton>
                  </View>
                </View>
              ))}
              
              {notifications.map((notif) => {
                const renderRightActions = () => (
                  <Pressable 
                    style={{ backgroundColor: '#ff4444', justifyContent: 'center', alignItems: 'center', width: 70, borderRadius: 12, marginLeft: 8 }}
                    onPress={() => handleDeleteNotification(notif.id)}
                  >
                    <Ionicons name="trash" size={24} color="#fff" />
                  </Pressable>
                );
                const renderLeftActions = () => (
                  <View style={{ backgroundColor: '#44aa44', justifyContent: 'center', alignItems: 'center', width: 70, borderRadius: 12, marginRight: 8 }}>
                    <Ionicons name="checkmark" size={24} color="#fff" />
                  </View>
                );
                
                return (
                  <Swipeable 
                    key={notif.id}
                    renderRightActions={renderRightActions}
                    renderLeftActions={notif.status !== 'seen' ? renderLeftActions : undefined}
                    onSwipeableLeftOpen={async () => {
                       if (notif.status !== "seen") {
                          await markNotificationSeen(notif.id);
                          fetchData();
                       }
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, opacity: notif.status === "seen" ? 0.6 : 1, borderWidth: 1, borderColor: Colors.rule }}>
                      <Pressable 
                        style={{ flex: 1, padding: 16 }}
                        onPress={async () => {
                           if (notif.status !== "seen") {
                              await markNotificationSeen(notif.id);
                              fetchData();
                           }
                           setNotificationsSheet(false);
                           if (notif.type === "VIBE_DATE" || notif.type === "DATE_PROPOSED") {
                               navigation.navigate("VCDates", { dateId: notif.metadata?.date_id });
                           }
                        }}
                      >
                        <AppText color={Colors.text} style={{ fontWeight: "bold", marginBottom: 4 }}>
                          {notif.title}
                        </AppText>
                        <AppText color={Colors.muted}>
                          {notif.message}
                        </AppText>
                      </Pressable>
                    </View>
                  </Swipeable>
                );
              })}
            </>
          )}
        </View>
      </BottomSheet>

      {/* ==================== SCANNER SHEET ==================== */}
      <BottomSheet
        open={scannerSheet}
        onClose={() => setScannerSheet(false)}
        kicker="SCAN"
        title="Scan QR Code"
        dark
      >
        <View style={{ alignItems: 'center' }}>
          {Platform.OS !== 'web' ? (
            permission?.granted ? (
              <View style={styles.cameraContainer}>
                <CameraView
                  style={styles.camera}
                  onBarcodeScanned={handleBarcodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                />
                <View style={styles.scannerOverlay}>
                  <View style={styles.scannerFrame} />
                </View>
              </View>
            ) : (
              <View style={[styles.cameraContainer, { justifyContent: 'center', backgroundColor: '#333' }]}>
                <AppText color="#fff">Camera permission is required.</AppText>
                <AppButton variant="solid" size="sm" onPress={requestPermission} style={{ marginTop: 16 }}>
                  Grant Permission
                </AppButton>
              </View>
            )
          ) : (
            <View style={[styles.cameraContainer, { justifyContent: 'center', backgroundColor: Colors.bone, padding: 20 }]}>
              <Ionicons name="camera-outline" size={48} color={Colors.muted} style={{ alignSelf: 'center', marginBottom: 12 }} />
              <AppText color={Colors.muted} style={{ textAlign: 'center' }}>
                Live scanning is only available on the mobile app. Please upload a QR code from your gallery.
              </AppText>
            </View>
          )}
        </View>
      </BottomSheet>

      {/* ==================== SWITCH OR ADD BOTTOMSHEET ==================== */}
      <BottomSheet
        open={switchSheet}
        onClose={() => setSwitchSheet(false)}
        kicker="YOUR CONNECTIONS"
        title="Switch or add"
      >
        <View>
          <AppText
            variant="serifItalic"
            size={14}
            color={Colors.muted}
            style={{ marginBottom: 20 }}
          >
            Each connection is separate — partners don't see each other. Premium
            unlocks more.
          </AppText>

          {loading ? (
            <ActivityIndicator color={Colors.accent} style={{ marginVertical: 20 }} />
          ) : connections.length === 0 ? (
            <View style={styles.emptyCard}>
              <AppText variant="serifItalic" size={15} color={Colors.muted} style={{ textAlign: "center", marginBottom: 12 }}>
                No connections yet. Invite someone or connect using a Vibe Key.
              </AppText>
            </View>
          ) : (
            connections.map((conn, i) => (
              <Pressable
                key={conn.user_id || i}
                style={i === activeIdx ? styles.connectionCardActive : styles.connectionCard}
                onPress={() => {
                  setActiveIdx(i);
                  setSwitchSheet(false);
                  if (onPartnerChange && conn.user_id) {
                    onPartnerChange(conn.user_id);
                  }
                }}
                onLongPress={() => handleDeleteConnection(conn.user_id, conn.name)}
              >
                <View style={{ position: 'relative' }}>
                  {conn.profile_picture ? (
                    <Image 
                      source={{ uri: conn.profile_picture.startsWith('http') ? conn.profile_picture : `${API_BASE}/${conn.profile_picture.replace(/\\/g, '/')}` }} 
                      style={[styles.avatarBig, i === activeIdx ? { borderWidth: 2, borderColor: Colors.white } : {}]} 
                    />
                  ) : (
                    <View style={[styles.avatarBig, i === activeIdx ? { backgroundColor: "#C44D4D" } : { backgroundColor: "#e8b4b4af" }]}>
                      <AppText style={{ color: "#fff", fontSize: 24 }}>
                        {conn.name?.charAt(0).toUpperCase() || "?"}
                      </AppText>
                    </View>
                  )}
                  {conn.is_online && (
                    <View style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: i === activeIdx ? Colors.accent : Colors.background }} />
                  )}
                </View>
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <AppText variant="heading" size={18} color={i === activeIdx ? Colors.white : Colors.ink}>
                    {conn.name}
                  </AppText>
                  <AppText variant="mono" color={Colors.muted} style={{ fontSize: 10 }}>
                    CONNECTED {new Date(conn.connected_at).toLocaleDateString().toUpperCase()}
                  </AppText>
                  {conn.pending_questions > 0 && (
                    <AppText variant="mono" color={i === activeIdx ? Colors.white : Colors.accent} style={{ fontSize: 10, marginTop: 4 }}>
                      • {conn.pending_questions} PENDING TODAY
                    </AppText>
                  )}
                </View>
                {i === activeIdx && (
                  <View style={styles.activeTag}>
                    <AppText variant="mono" style={{ color: "#fff", fontSize: 12 }}>
                      ACTIVE
                    </AppText>
                  </View>
                )}
              </Pressable>
            ))
          )}

          {requests.length > 0 && (
            <Pressable
              style={[styles.addConnection, { marginBottom: 8 }]}
              onPress={() => {
                setSwitchSheet(false);
                setRequestsSheet(true);
              }}
            >
              <AppText variant="mono" color={Colors.accent} style={{ fontSize: 10 }}>
                ● {requests.length} PENDING REQUEST{requests.length > 1 ? "S" : ""}
              </AppText>
              <AppText variant="mono" color={Colors.muted} style={{ fontSize: 10 }}>
                Tap to review
              </AppText>
            </Pressable>
          )}

          <Pressable
            style={styles.addConnection}
            onPress={() => {
              setSwitchSheet(false);
              setInviteSheet(true);
            }}
          >
            <AppText
              variant="mono"
              color={Colors.accent}
              style={{ fontSize: 10 }}
            >
              + ADD A CONNECTION
            </AppText>
            <AppText
              variant="mono"
              color={Colors.muted}
              style={{ fontSize: 10 }}
            >
              Invite or enter a Vibe Key
            </AppText>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
};

export default SamVibeNav;

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  samCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
    marginBottom: 20,
    paddingVertical: 9,
  },
  samLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 999,
    backgroundColor: "#EAE2D4",
    padding: 5,
    borderWidth: 1,
    borderColor: Colors.rule,
    paddingRight: 20,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  samRight: {
    alignItems: "flex-end",
  },
  activeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },

  settingCard: {
    backgroundColor: "#EAE2D4",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  menuItem: {
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 12,
    marginBottom: 8,
  },
  blackCard: {
    backgroundColor: "#1C1C1E",
    padding: 18,
    borderRadius: 12,
    marginVertical: 8,
  },

  // Invite Sheet Styles
  suggestedMessage: {
    backgroundColor: "#EAE2D4",
    borderWidth: 1,
    borderColor: Colors.rule,
    padding: 16,
    borderRadius: 12,
    marginTop: 7,
    marginBottom: 10,
  },
  shareButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  // Switch Sheet Styles
  connectionCardActive: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C1E",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  connectionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E7DFD2",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  avatarBig: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#C44D4D",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  activeTag: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  addConnection: {
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 12,
    backgroundColor: "#EAE2D4",
  },
  emptyCard: {
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 14,
    backgroundColor: "#EAE2D4",
    marginBottom: 12,
  },

  // Request styles
  requestCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: "#E7DFD2",
  },
  requestInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },

  // Nav avatar styles
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
    alignItems: "center",
    justifyContent: "center",
  },

  // Scanner styles
  cameraContainer: {
    width: 250,
    height: 250,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginTop: 20,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 180,
    height: 180,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16,
  },
});
