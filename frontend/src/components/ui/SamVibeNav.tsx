import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, Alert, ActivityIndicator, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
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
import * as Clipboard from "expo-clipboard";

const API_BASE = 'http://localhost:8006';

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

  // Profile & connections state
  const [profile, setProfile] = useState<any>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
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
      const [profileData, connectionsData, requestsData] = await Promise.all([
        getVibeProfile().catch(() => null),
        getConnections().catch(() => ({ data: [] })),
        getRequests().catch(() => ({ data: [] })),
      ]);
      if (profileData) setProfile(profileData);
      
      const conns = connectionsData?.data || [];
      setConnections(conns);
      setRequests(requestsData?.data || []);
      
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
  }, [fetchData]);

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
      Alert.alert("Error", msg);
    } finally {
      setConnectLoading(false);
    }
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

  return (
    <View>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <AppText variant="display" style={{ fontSize: 25 }}>
          vibe check.
        </AppText>
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

      {/* Active Connection Card */}
      <Pressable style={styles.samCard} onPress={() => setSwitchSheet(true)}>
        <View style={styles.samLeft}>
          <View style={styles.avatar}>
            <AppText style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>
              {activePartnerInitial}
            </AppText>
          </View>
          <View>
            <AppText variant="heading" size={13}>
              {activePartnerName}
            </AppText>
            <AppText
              variant="mono"
              color={Colors.accent}
              style={{ fontSize: 8 }}
            >
              {profile ? `${profile.active} ACTIVE • ${profile.connect} CONNECTIONS` : "LOADING..."}
            </AppText>
          </View>
        </View>

        <View style={styles.samRight}>
          <View style={styles.activeBadge}>
            <AppText
              variant="mono"
              style={{ fontSize: 10, color: Colors.muted }}
            >
              {profile ? `${profile.active} ACTIVE` : "..."}
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
                style={styles.menuItem}
                onPress={() => {
                  setSettingsSheet(false);
                  setRequestsSheet(true);
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

            <Pressable style={styles.menuItem}>
              <AppText variant="heading" size={17}>
                Notifications
              </AppText>
            </Pressable>

            <Pressable style={styles.menuItem}>
              <AppText variant="heading" size={17}>
                Privacy
              </AppText>
            </Pressable>

            <Pressable style={styles.blackCard}>
              <AppText variant="heading" size={17} color="#fff">
                Flip to aligned.
              </AppText>
              <AppText variant="mono" color="#ccc">
                The other side — for couples
              </AppText>
            </Pressable>
          </View>
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
                <View style={[styles.avatarBig, i === activeIdx ? { backgroundColor: "#C44D4D" } : { backgroundColor: "#e8b4b4af" }]}>
                  <AppText style={{ color: "#fff", fontSize: 24 }}>
                    {conn.name?.charAt(0).toUpperCase() || "?"}
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="heading" size={18} color={i === activeIdx ? Colors.white : Colors.ink}>
                    {conn.name}
                  </AppText>
                  <AppText variant="mono" color={Colors.muted}>
                    CONNECTED {new Date(conn.connected_at).toLocaleDateString().toUpperCase()}
                  </AppText>
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
});
