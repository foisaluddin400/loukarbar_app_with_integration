import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  Switch,
  Modal,
  DeviceEventEmitter,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../../constants/colors';
import { AppText } from '../../components/ui/AppText';
import { AppButton } from '../../components/ui/AppButton';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { CustomAlert } from '../../components/ui/CustomAlert';
import { RootStackParamList } from '../../types';
import {
  getVibeProfile,
  updateVibeProfile,
  updateVibeSettings,
  uploadProfilePicture,
  deleteVibeProfile,
  regenerateKey,
  getConnections,
  restoreConnection,
  connectWithKey,
  getRequests,
  respondToRequest,
} from '../../services/vibeCheckApi';
import { signoutUser } from '../../services/authApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

let CameraView: any = null;
let useCameraPermissions: any = () => [null, async () => {}];
if (Platform.OS !== "web") {
  const ExpoCamera = require("expo-camera");
  CameraView = ExpoCamera.CameraView;
  useCameraPermissions = ExpoCamera.useCameraPermissions;
}

type Nav = StackNavigationProp<RootStackParamList>;

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export const VCProfileScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editSheet, setEditSheet] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  // QR state
  const qrRef = React.useRef<any>(null);
  const [qrSheet, setQrSheet] = useState(false);

  // Picture state
  const [pictureSheet, setPictureSheet] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Connect state
  const [connectKey, setConnectKey] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Scanner state
  const [scannerSheet, setScannerSheet] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Delete confirmation
  const [deleteSheet, setDeleteSheet] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sign out confirmation
  const [signoutSheet, setSignoutSheet] = useState(false);

  // Connections & Requests
  const [connectionsSheet, setConnectionsSheet] = useState(false);
  const [connectionsTab, setConnectionsTab] = useState<'active' | 'requests'>('active');
  const [connections, setConnections] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const [data, connData, reqData] = await Promise.all([
         getVibeProfile(),
         getConnections(),
         getRequests()
      ]);
      setProfile(data);
      if (connData?.data) setConnections(connData.data);
      if (reqData?.data) setRequests(reqData.data);
    } catch (error) {
      console.log('Error fetching vibe profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const profilePictureUrl = profile?.profile_picture
    ? `${API_BASE}/${profile.profile_picture.replace(/\\/g, '/')}`
    : null;

  // ─── Handlers ──────────────────────────────────────────────

  const handleUpdateName = async () => {
    if (!editName.trim()) {
      CustomAlert.alert('Missing Name', 'Please enter a name.');
      return;
    }
    try {
      setSaving(true);
      const updated = await updateVibeProfile(editName.trim());
      setProfile(updated);
      setEditSheet(false);
      CustomAlert.alert('Updated', 'Your name has been updated.');
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || 'Failed to update.';
      CustomAlert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        setUploading(true);
        const updated = await uploadProfilePicture(result.assets[0].uri);
        setProfile(updated);
        setPictureSheet(false);
        CustomAlert.alert('Uploaded', 'Profile picture updated.');
      } catch (error: any) {
        const msg = error.response?.data?.detail || error.message || 'Upload failed.';
        CustomAlert.alert('Error', msg);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDeletePicture = async () => {
    try {
      setUploading(true);
      await deleteProfilePicture();
      setProfile((prev: any) => ({ ...prev, profile_picture: null }));
      setPictureSheet(false);
      CustomAlert.alert('Removed', 'Profile picture removed.');
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || 'Failed to remove.';
      CustomAlert.alert('Error', msg);
    } finally {
      setUploading(false);
    }
  };

  const handleRegenerateKey = async () => {
    const doRegenerate = async () => {
      try {
        const result = await regenerateKey();
        CustomAlert.alert('Done', result.message);
        fetchProfile();
      } catch (error: any) {
        const msg = error.response?.data?.detail || error.message || 'Failed.';
        CustomAlert.alert('Error', msg);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Regenerate Key? Your current Vibe Key will stop working. Anyone trying to connect with the old key won\'t be able to.')) {
        doRegenerate();
      }
    } else {
      CustomAlert.alert(
        'Regenerate Key?',
        'Your current Vibe Key will stop working. Anyone trying to connect with the old key won\'t be able to.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Regenerate', onPress: doRegenerate },
        ]
      );
    }
  };

  const handleCopyKey = async () => {
    if (!profile?.vibe_key) return;
    await Clipboard.setStringAsync(profile.vibe_key);
    CustomAlert.alert('Copied', 'Vibe Key copied to clipboard.');
  };

  const handleToggleVibeKey = async (value: boolean) => {
    try {
      const updated = await updateVibeSettings({ vibe_key_enabled: value });
      setProfile((prev: any) => ({ ...prev, vibe_key_enabled: updated.vibe_key_enabled }));
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || 'Failed to update settings.';
      CustomAlert.alert('Error', msg);
    }
  };

  const handleConnect = async (keyToUse?: string) => {
    const finalKey = (keyToUse || connectKey).trim();
    if (!finalKey) {
      CustomAlert.alert('Missing Key', 'Please enter a Vibe Key.');
      return;
    }
    try {
      setConnecting(true);
      await connectWithKey(finalKey);
      setConnectKey('');
      CustomAlert.alert('Request Sent', 'A connection request has been sent.');
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || 'Failed to connect.';
      CustomAlert.alert('Error', msg);
    } finally {
      setConnecting(false);
    }
  };

  const handleRestoreConnection = async (partnerId: string) => {
    try {
      await restoreConnection(partnerId);
      fetchProfile();
      CustomAlert.alert('Restored', 'Connection restored successfully.');
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || 'Failed to restore.';
      CustomAlert.alert('Error', msg);
    }
  };

  const handleRespondRequest = async (requestId: string, accept: boolean) => {
    try {
      setLoading(true);
      await respondToRequest(requestId, accept);
      CustomAlert.alert(accept ? 'Accepted' : 'Rejected', accept ? 'Connection request accepted!' : 'Connection request rejected.');
      fetchProfile();
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || 'Failed to respond to request.';
      CustomAlert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScannerSheet(false);
    setConnectKey(data);
    setTimeout(() => {
       handleConnect(data);
    }, 500); 
  };

  const handleDownloadQR = () => {
    if (qrRef.current && profile?.vibe_key) {
      qrRef.current.toDataURL(async (data: string) => {
        try {
          if (Platform.OS === 'web') {
            fetch(`data:image/png;base64,${data}`)
              .then(res => res.blob())
              .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `VibeKey-${profile.vibe_key}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
              })
              .catch(() => CustomAlert.alert('Error', 'Failed to download QR code.'));
          } else {
            CustomAlert.alert('Notice', 'Mobile download is temporarily disabled for testing.');
          }
        } catch (e: any) {
          CustomAlert.alert('Error', 'Failed to save or share QR code.');
        }
      });
    }
  };

  const handleDeleteProfile = async () => {
    try {
      setDeleting(true);
      await deleteVibeProfile();
      setDeleteSheet(false);
      CustomAlert.alert('Deleted', 'Your VibeCheck profile has been permanently deleted.', [
        { text: 'OK', onPress: () => nav.reset({ index: 0, routes: [{ name: 'ModeSelector' }] }) },
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || 'Failed to delete.';
      CustomAlert.alert('Error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const performSignout = async (route: 'ModeSelector' | 'Login') => {
    try {
      setLoading(true);
      await signoutUser().catch(() => {});
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
      nav.reset({ index: 0, routes: [{ name: route }] });
    } catch (e) {
       CustomAlert.alert('Error', 'Failed to sign out locally.');
       setLoading(false);
    }
  };

  const handleSignout = () => {
    setSignoutSheet(true);
  };

  // ─── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <AppText variant="serifItalic" size={16} color={Colors.muted}>
            Profile not found.
          </AppText>
          <AppButton variant="outline" size="md" onPress={() => nav.goBack()} style={{ marginTop: 20 }}>
            Go Back
          </AppButton>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => nav.goBack()}>
            <AppText variant="mono" color={Colors.accent} style={{ fontSize: 12 }}>
              ← BACK
            </AppText>
          </Pressable>
          <AppText variant="smallCaps" color={Colors.muted}>PROFILE</AppText>
        </View>

        {/* Profile Picture Section */}
        <View style={styles.avatarSection}>
          <Pressable onPress={() => setPictureSheet(true)}>
            {profilePictureUrl ? (
              <Image source={{ uri: profilePictureUrl }} style={styles.avatarLarge} />
            ) : (
              <View style={styles.avatarLargePlaceholder}>
                <AppText style={{ color: '#fff', fontSize: 42, fontWeight: '600' }}>
                  {profile.name?.charAt(0).toUpperCase() || '?'}
                </AppText>
              </View>
            )}
            <View style={styles.editBadge}>
              <AppText style={{ color: '#fff', fontSize: 12 }}>✎</AppText>
            </View>
          </Pressable>

          <AppText variant="display" size={32} style={{ marginTop: 16, lineHeight: 34 }}>
            {profile.name}
          </AppText>
          <AppText variant="mono" color={Colors.muted} style={{ fontSize: 11, marginTop: 4 }}>
            MEMBER SINCE {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
          </AppText>
        </View>

        <View style={styles.inner}>
          {/* Vibe Key Card */}
          <View style={[styles.keyCard, profile.vibe_key_enabled === false && { opacity: 0.6 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <AppText variant="smallCaps" color={Colors.muted}>
                YOUR VIBE KEY
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppText size={12} color={Colors.muted}>
                  {profile.vibe_key_enabled === false ? 'Disabled' : 'Enabled'}
                </AppText>
                <Switch 
                  value={profile.vibe_key_enabled !== false} 
                  onValueChange={handleToggleVibeKey} 
                  trackColor={{ false: '#333', true: Colors.accent }}
                  thumbColor={Colors.bone}
                  style={{ transform: [{ scale: 0.7 }] }}
                />
              </View>
            </View>
            
            <AppText variant="display" size={22} color={Colors.accent} style={{ letterSpacing: 2, textDecorationLine: profile.vibe_key_enabled === false ? 'line-through' : 'none' }}>
              {profile.vibe_key}
            </AppText>
            <AppText variant="serifItalic" size={13} color={Colors.muted} style={{ marginTop: 8, lineHeight: 20 }}>
              {profile.vibe_key_enabled === false 
                ? "Your Vibe Key is disabled. No one can use it to connect with you."
                : "Share this key with people so they can connect with you."}
            </AppText>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <AppButton variant="solid" size="sm" style={{ flex: 1, backgroundColor: '#1C1C1E' }} onPress={handleCopyKey} disabled={profile.vibe_key_enabled === false}>
                COPY KEY
              </AppButton>
              <AppButton variant="outline" size="sm" style={{ flex: 1 }} onPress={() => setQrSheet(true)} disabled={profile.vibe_key_enabled === false}>
                SHOW QR
              </AppButton>
              <AppButton variant="outline" size="sm" style={{ flex: 1 }} onPress={handleRegenerateKey} disabled={profile.vibe_key_enabled === false}>
                REGENERATE
              </AppButton>
            </View>
          </View>

          {/* Connect with Vibe Key Card */}
          <View style={[styles.keyCard, { marginTop: 16 }]}>
            <AppText variant="smallCaps" color={Colors.muted} style={{ marginBottom: 8 }}>
              CONNECT WITH KEY
            </AppText>
            <AppTextInput
              label="Enter a friend's Vibe Key"
              n="01"
              value={connectKey}
              onChangeText={setConnectKey}
              placeholder="e.g. VIBE-k7d2x"
              autoCapitalize="none"
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <AppButton variant="solid" size="sm" style={{ flex: 1, backgroundColor: Colors.accent }} onPress={handleConnect} disabled={connecting}>
                {connecting ? "SENDING..." : "SEND REQUEST"}
              </AppButton>
              <AppButton variant="outline" size="sm" style={{ flex: 1 }} onPress={() => setScannerSheet(true)}>
                SCAN QR
              </AppButton>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <AppText variant="display" size={28} color={Colors.ink}>{profile.connect}</AppText>
              <AppText variant="smallCaps" color={Colors.muted}>Connections</AppText>
            </View>
            <View style={styles.statCard}>
              <AppText variant="display" size={28} color={Colors.sage}>{profile.active}</AppText>
              <AppText variant="smallCaps" color={Colors.muted}>Active</AppText>
            </View>
            <View style={styles.statCard}>
              <AppText variant="display" size={28} color={Colors.light}>{profile.inactive}</AppText>
              <AppText variant="smallCaps" color={Colors.muted}>Inactive</AppText>
            </View>
          </View>

          {/* Actions */}
          <AppText variant="smallCaps" color={Colors.ink2} style={{ marginBottom: 12, marginTop: 8 }}>
            MANAGE
          </AppText>

          <Pressable
            style={styles.menuItem}
            onPress={() => setConnectionsSheet(true)}
          >
            <View>
              <AppText variant="heading" size={17}>Manage connections</AppText>
              <AppText variant="mono" color={Colors.muted} style={{ fontSize: 10, marginTop: 2 }}>
                VIEW ACTIVE AND RESTORE RELEASED
              </AppText>
            </View>
            <AppText color={Colors.accent}>→</AppText>
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => {
              setEditName(profile.name);
              setEditSheet(true);
            }}
          >
            <View>
              <AppText variant="heading" size={17}>Edit name</AppText>
              <AppText variant="mono" color={Colors.muted} style={{ fontSize: 10, marginTop: 2 }}>
                CURRENTLY: {profile.name.toUpperCase()}
              </AppText>
            </View>
            <AppText color={Colors.accent}>→</AppText>
          </Pressable>

          <Pressable style={styles.menuItem} onPress={() => setPictureSheet(true)}>
            <View>
              <AppText variant="heading" size={17}>Profile picture</AppText>
              <AppText variant="mono" color={Colors.muted} style={{ fontSize: 10, marginTop: 2 }}>
                {profilePictureUrl ? 'UPDATE OR REMOVE' : 'ADD A PHOTO'}
              </AppText>
            </View>
            <AppText color={Colors.accent}>→</AppText>
          </Pressable>

          <Pressable style={styles.menuItem} onPress={handleSignout}>
            <View>
              <AppText variant="heading" size={17}>Sign out</AppText>
              <AppText variant="mono" color={Colors.muted} style={{ fontSize: 10, marginTop: 2 }}>
                LOG OUT OF YOUR ACCOUNT
              </AppText>
            </View>
            <AppText color={Colors.accent}>→</AppText>
          </Pressable>

          {/* Danger Zone */}
          <AppText variant="smallCaps" color={Colors.accent} style={{ marginBottom: 12, marginTop: 28 }}>
            DANGER ZONE
          </AppText>

          <Pressable style={styles.dangerItem} onPress={() => setDeleteSheet(true)}>
            <View>
              <AppText variant="heading" size={17} color={Colors.accent}>Delete VibeCheck ID</AppText>
              <AppText variant="mono" color={Colors.muted} style={{ fontSize: 10, marginTop: 2 }}>
                PERMANENTLY REMOVE YOUR PROFILE & ALL DATA
              </AppText>
            </View>
          </Pressable>

          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* ==================== EDIT NAME SHEET ==================== */}
      <BottomSheet
        open={editSheet}
        onClose={() => setEditSheet(false)}
        kicker="EDIT"
        title="Update your name"
      >
        <View>
          <AppTextInput
            label="Your name"
            n="01"
            value={editName}
            onChangeText={setEditName}
            placeholder="Your first name"
          />
          <AppButton
            full
            variant="solid"
            size="lg"
            style={{ marginTop: 20 }}
            onPress={handleUpdateName}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save →'}
          </AppButton>
        </View>
      </BottomSheet>

      {/* ==================== PICTURE SHEET ==================== */}
      <BottomSheet
        open={pictureSheet}
        onClose={() => setPictureSheet(false)}
        kicker="PHOTO"
        title="Profile picture"
      >
        <View>
          {profilePictureUrl && (
            <View style={styles.picturePreview}>
              <Image source={{ uri: profilePictureUrl }} style={styles.previewImage} />
            </View>
          )}

          <AppButton
            full
            variant="solid"
            size="lg"
            onPress={handlePickImage}
            disabled={uploading}
            style={{ marginBottom: 10 }}
          >
            {uploading ? 'UPLOADING...' : profilePictureUrl ? 'CHANGE PHOTO' : 'CHOOSE PHOTO'}
          </AppButton>

          {profilePictureUrl && (
            <AppButton
              full
              variant="outline"
              size="lg"
              onPress={handleDeletePicture}
              disabled={uploading}
            >
              REMOVE PHOTO
            </AppButton>
          )}
        </View>
      </BottomSheet>

      {/* ==================== SIGNOUT CONFIRMATION SHEET ==================== */}
      <BottomSheet
        open={signoutSheet}
        onClose={() => setSignoutSheet(false)}
        kicker="SIGN OUT OR SWITCH"
        title="Where to?"
      >
        <View>
          <View style={styles.warningCard}>
            <AppText variant="serifItalic" size={14} color="#ccc" style={{ lineHeight: 22 }}>
              Do you want to completely log out of your account, or just switch to the Mode Selector?
            </AppText>
          </View>

          <AppButton
            full
            variant="solid"
            size="lg"
            style={{ marginBottom: 10 }}
            onPress={() => {
              setSignoutSheet(false);
              nav.reset({ index: 0, routes: [{ name: 'ModeSelector' }] });
            }}
            disabled={loading}
          >
            SWITCH TO MODE SELECTOR
          </AppButton>

          <AppButton
            full
            variant="solid"
            size="lg"
            style={{ backgroundColor: Colors.accent, marginBottom: 10 }}
            onPress={() => {
              setSignoutSheet(false);
              performSignout('Login');
            }}
            disabled={loading}
          >
            {loading ? 'SIGNING OUT...' : 'SIGN IN PAGE'}
          </AppButton>

          <AppButton
            full
            variant="outline"
            size="lg"
            onPress={() => setSignoutSheet(false)}
            disabled={loading}
          >
            CANCEL
          </AppButton>
        </View>
      </BottomSheet>

      {/* ==================== DELETE CONFIRMATION SHEET ==================== */}
      <BottomSheet
        open={deleteSheet}
        onClose={() => setDeleteSheet(false)}
        kicker="⚠ WARNING"
        title="Delete your VibeCheck?"
      >
        <View>
          <View style={styles.warningCard}>
            <AppText variant="heading" size={16} color="#fff" style={{ marginBottom: 8 }}>
              This cannot be undone.
            </AppText>
            <AppText variant="serifItalic" size={14} color="#ccc" style={{ lineHeight: 22 }}>
              Your profile, all connections, pending requests, invite links, match history, 
              streaks, and profile picture will be permanently deleted.
            </AppText>
          </View>

          <AppButton
            full
            variant="solid"
            size="lg"
            style={{ backgroundColor: Colors.accent, marginBottom: 10 }}
            onPress={handleDeleteProfile}
            disabled={deleting}
          >
            {deleting ? 'DELETING...' : 'YES, DELETE EVERYTHING'}
          </AppButton>

          <AppButton
            full
            variant="outline"
            size="lg"
            onPress={() => setDeleteSheet(false)}
          >
            CANCEL
          </AppButton>
        </View>
      </BottomSheet>

      {/* ==================== CONNECTIONS SHEET ==================== */}
      <BottomSheet
        open={connectionsSheet}
        onClose={() => setConnectionsSheet(false)}
        kicker="NETWORK"
        title="Your Connections"
      >
        <View style={{ flexDirection: 'row', marginBottom: 16, backgroundColor: '#EAE2D4', borderRadius: 8, padding: 4 }}>
          <Pressable 
            style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: connectionsTab === 'active' ? Colors.bone : 'transparent', borderRadius: 6 }}
            onPress={() => setConnectionsTab('active')}
          >
            <AppText variant="smallCaps" color={connectionsTab === 'active' ? Colors.ink : Colors.muted}>Active</AppText>
          </Pressable>
          <Pressable 
            style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: connectionsTab === 'requests' ? Colors.bone : 'transparent', borderRadius: 6 }}
            onPress={() => setConnectionsTab('requests')}
          >
            <AppText variant="smallCaps" color={connectionsTab === 'requests' ? Colors.ink : Colors.muted}>
              Requests {requests.length > 0 ? `(${requests.length})` : ''}
            </AppText>
          </Pressable>
        </View>

        <ScrollView style={{ maxHeight: 400 }}>
          {connectionsTab === 'active' ? (
            connections.length === 0 ? (
              <AppText color={Colors.muted} style={{ textAlign: 'center', marginTop: 20 }}>
                No connections found.
              </AppText>
            ) : (
              connections.map((conn, idx) => {
                const isReleased = conn.status === "released";
                return (
                  <View key={`conn-${idx}`} style={[styles.menuItem, { backgroundColor: isReleased ? `${Colors.cream}50` : Colors.cream }]}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="heading" size={17} color={isReleased ? Colors.muted : Colors.ink}>
                        {conn.partner_name || conn.partner_id}
                      </AppText>
                      <AppText variant="mono" color={Colors.muted} style={{ fontSize: 10, marginTop: 2 }}>
                        {isReleased ? "RELEASED" : `ACTIVE • DAY ${conn.current_journey_day || 1}`}
                      </AppText>
                    </View>
                    {isReleased && (
                      <AppButton variant="outline" size="sm" onPress={() => handleRestoreConnection(conn.partner_id)}>
                        RESTORE
                      </AppButton>
                    )}
                  </View>
                );
              })
            )
          ) : (
            requests.length === 0 ? (
              <AppText color={Colors.muted} style={{ textAlign: 'center', marginTop: 20 }}>
                No pending requests.
              </AppText>
            ) : (
              requests.map((req, idx) => (
                <View key={`req-${idx}`} style={[styles.menuItem, { backgroundColor: Colors.cream, flexDirection: 'column', alignItems: 'stretch' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <AppText color={Colors.bone} size={18}>{req.direction === 'incoming' ? req.sender_name.charAt(0).toUpperCase() : req.recipient_name.charAt(0).toUpperCase()}</AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="heading" size={17} color={Colors.ink}>
                        {req.direction === 'incoming' ? req.sender_name : req.recipient_name}
                      </AppText>
                      <AppText variant="mono" color={Colors.muted} style={{ fontSize: 10, marginTop: 2 }}>
                        {req.direction === 'incoming' ? 'WANTS TO CONNECT' : 'REQUEST SENT'}
                      </AppText>
                    </View>
                  </View>
                  {req.direction === 'incoming' && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <AppButton variant="solid" size="sm" style={{ flex: 1, backgroundColor: Colors.ink }} onPress={() => handleRespondRequest(req.request_id, true)}>
                        ACCEPT
                      </AppButton>
                      <AppButton variant="outline" size="sm" style={{ flex: 1 }} onPress={() => handleRespondRequest(req.request_id, false)}>
                        REJECT
                      </AppButton>
                    </View>
                  )}
                  {req.direction === 'outgoing' && (
                    <AppText color={Colors.muted} style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 13 }}>
                      Waiting for them to accept.
                    </AppText>
                  )}
                </View>
              ))
            )
          )}
        </ScrollView>
      </BottomSheet>

      {/* ==================== QR CODE SHEET ==================== */}
      <BottomSheet
        open={qrSheet}
        onClose={() => setQrSheet(false)}
        kicker="SHARE"
        title="Your Vibe Key"
      >
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <View style={styles.qrContainer}>
            {profile?.vibe_key ? (
              <QRCode
                value={profile.vibe_key}
                size={220}
                color={Colors.ink}
                backgroundColor={Colors.bone}
                getRef={(c) => (qrRef.current = c)}
              />
            ) : null}
          </View>
          <AppText variant="display" size={28} color={Colors.accent} style={{ marginTop: 24, letterSpacing: 2 }}>
            {profile?.vibe_key}
          </AppText>
          <AppButton variant="outline" size="md" onPress={handleDownloadQR} style={{ marginTop: 20 }}>
            SAVE QR CODE
          </AppButton>
          <AppText variant="serifItalic" size={14} color={Colors.muted} style={{ marginTop: 16, textAlign: 'center' }}>
            Let your friend scan this code to connect instantly.
          </AppText>
        </View>
      </BottomSheet>

      {/* ==================== FULL SCREEN SCANNER MODAL ==================== */}
      <Modal
        visible={scannerSheet}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setScannerSheet(false)}
      >
        <View style={{ flex: 1, backgroundColor: Colors.ink }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 24, paddingTop: 40 }}>
            <View>
              <AppText variant="smallCaps" color={Colors.muted}>SCAN</AppText>
              <AppText variant="display" size={28} color={Colors.bone}>Scan QR Code</AppText>
            </View>
            <AppButton variant="ghost" size="sm" onPress={() => setScannerSheet(false)} style={{ borderWidth: 1, borderColor: Colors.rule, borderRadius: 30 }}>
              <AppText color={Colors.bone}>Close</AppText>
            </AppButton>
          </View>
          
          <View style={{ flex: 1, padding: 24 }}>
            {Platform.OS !== 'web' ? (
              permission?.granted ? (
                <View style={[styles.cameraContainer, { flex: 1, aspectRatio: undefined }]}>
                  <CameraView
                    style={styles.camera}
                    onBarcodeScanned={handleBarcodeScanned}
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr'],
                    }}
                  />
                  <View style={styles.scannerOverlay}>
                    <View style={styles.scannerFrame} />
                    <AppText color={Colors.bone} style={{ marginTop: 24, textAlign: 'center', opacity: 0.8 }}>
                      Align the QR code within the frame to scan.
                    </AppText>
                  </View>
                </View>
              ) : (
                <View style={[styles.cameraContainer, { flex: 1, aspectRatio: undefined, justifyContent: 'center', backgroundColor: '#333' }]}>
                  <AppText color="#fff" style={{ textAlign: 'center' }}>Camera permission is required.</AppText>
                  <AppButton variant="solid" size="sm" onPress={requestPermission} style={{ marginTop: 16, alignSelf: 'center' }}>
                    Grant Permission
                  </AppButton>
                </View>
              )
            ) : (
              <View style={[styles.cameraContainer, { flex: 1, aspectRatio: undefined, justifyContent: 'center', backgroundColor: Colors.bone, padding: 20 }]}>
                <Ionicons name="camera-outline" size={48} color={Colors.muted} style={{ alignSelf: 'center', marginBottom: 12 }} />
                <AppText color={Colors.muted} style={{ textAlign: 'center' }}>
                  Live scanning is only available on the mobile app. Please upload a QR code from your gallery.
                </AppText>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bone },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.accent,
  },
  avatarLargePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: `${Colors.accent}50`,
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.bone,
  },
  inner: { padding: 24 },
  keyCard: {
    backgroundColor: '#EAE2D4',
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.rule,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.rule,
    backgroundColor: Colors.bone,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 12,
    marginBottom: 8,
  },
  dangerItem: {
    padding: 18,
    borderWidth: 1,
    borderColor: `${Colors.accent}40`,
    borderRadius: 12,
    backgroundColor: `${Colors.accent}08`,
  },
  picturePreview: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: Colors.rule,
  },
  warningCard: {
    backgroundColor: '#1C1C1E',
    padding: 20,
    borderRadius: 14,
    marginBottom: 20,
  },
  qrContainer: {
    padding: 24,
    backgroundColor: Colors.bone,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.rule,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#444',
    marginTop: 20,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
});
