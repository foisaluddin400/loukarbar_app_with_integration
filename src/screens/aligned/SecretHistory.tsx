import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, Modal, Image, DeviceEventEmitter, ActivityIndicator, Animated, useWindowDimensions } from 'react-native';
import { CustomAlert } from '../../components/ui/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { AppText } from '../../components/ui/AppText';
import { preventScreenCaptureAsync, allowScreenCaptureAsync } from 'expo-screen-capture';
import { getReceivedSecrets, getSecretViewUrl, requestRewatchSecret } from '../../services/secretApi';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ReAnimated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export const SecretHistory: React.FC = () => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const navigation = useNavigation();
  const [secrets, setSecrets] = useState<any[]>([]);
  const [viewingSecret, setViewingSecret] = useState<any | null>(null);
  const [mediaDataUri, setMediaDataUri] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const progress = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const viewingSecretRef = useRef<any>(null);

  useEffect(() => {
    viewingSecretRef.current = viewingSecret;
  }, [viewingSecret]);

  // Pinch-to-zoom shared values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => { scale.value = savedScale.value * e.scale; })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1); savedScale.value = 1;
        translateX.value = withSpring(0); translateY.value = withSpring(0);
        savedTranslateX.value = 0; savedTranslateY.value = 0;
      } else { savedScale.value = scale.value; }
    });

  const panGesture = Gesture.Pan()
    .minPointers(2)
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1); savedScale.value = 1;
        translateX.value = withSpring(0); translateY.value = withSpring(0);
        savedTranslateX.value = 0; savedTranslateY.value = 0;
      } else { scale.value = withSpring(2.5); savedScale.value = 2.5; }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);
  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  useEffect(() => {
    if (viewingSecret) {
      preventScreenCaptureAsync().catch(console.error);
    } else {
      allowScreenCaptureAsync().catch(console.error);
      progress.stopAnimation();
      scale.value = 1; savedScale.value = 1;
      translateX.value = 0; translateY.value = 0;
      savedTranslateX.value = 0; savedTranslateY.value = 0;
    }
    return () => { allowScreenCaptureAsync().catch(console.error); };
  }, [viewingSecret]);

  const startTimer = (duration: number) => {
    animRef.current = Animated.timing(progress, {
      toValue: 0, duration, useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => { if (finished) handleViewSecretOut(); });
  };

  useEffect(() => {
    if (viewingSecret && mediaDataUri) {
      progress.setValue(1);
      startTimer(10000);
    }
  }, [viewingSecret, mediaDataUri]);

  const handlePause = () => {
    setIsPaused(true);
    progress.stopAnimation();
  };

  const handleResume = () => {
    setIsPaused(false);
    progress.stopAnimation((v) => startTimer(v * 10000));
  };

  const loadSecrets = async () => {
    try {
      const resRec = await getReceivedSecrets();
      if (resRec.success) setSecrets(resRec.data);
    } catch (e) { console.log("Failed to load secrets", e); }
  };

  useEffect(() => {
    const fetchToken = async () => {
      const token = await AsyncStorage.getItem('access_token');
      setAuthToken(token);
    };
    fetchToken();
    loadSecrets();
    const sub = DeviceEventEmitter.addListener('REFRESH_ALIGNED_DATA', loadSecrets);
    return () => sub.remove();
  }, []);

  const handleViewSecretIn = async (secret: any) => {
    setViewingSecret(secret);
    setIsPaused(false);
    if (!authToken) return;

    try {
      const res = await fetch(getSecretViewUrl(secret.id), {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => { setMediaDataUri(reader.result as string); };
      reader.readAsDataURL(blob);
    } catch (e) { console.log("Failed to load secret media", e); }
  };

  const handleViewSecretOut = () => {
    if (!viewingSecretRef.current) return;
    setSecrets(prev => prev.filter(s => s.id !== viewingSecretRef.current.id));
    setViewingSecret(null);
    setMediaDataUri(null);
    progress.stopAnimation();
    setIsPaused(false);
    loadSecrets();
  };

  const handleRequestRewatch = async (secretId: string) => {
    try {
      await requestRewatchSecret(secretId);
      loadSecrets();
      CustomAlert.alert("Requested", "Rewatch request sent to your partner.");
    } catch (e) {
      console.log(e);
      CustomAlert.alert("Error", "Could not request rewatch.");
    }
  };

  const renderSecret = (secret: any) => (
    <View key={secret.id} style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <View style={styles.avatar}>
          <AppText style={{ color: '#fff', fontSize: 14 }}>
            {secret.partner_name ? secret.partner_name[0].toUpperCase() : "P"}
          </AppText>
        </View>
        <View>
          <AppText variant="mono" style={styles.fromText}>
            FROM {secret.partner_name ? secret.partner_name.toUpperCase() : "PARTNER"}
          </AppText>
          <AppText variant="heading" size={17} style={{ color: '#fff' }}>
            Something just for you
          </AppText>
        </View>
      </View>

      <View style={styles.messageMeta}>
        <AppText variant="mono" style={{ color: '#8C7F75', fontSize: 12 }}>
          📷 OPENS ONCE • {secret.delete_after}
        </AppText>
        
        {(!secret.is_viewed || secret.rewatch_status === 'approved') ? (
          <Pressable onPress={() => handleViewSecretIn(secret)} style={styles.openButton}>
            <AppText variant="mono" style={{ color: '#fff', fontSize: 10 }}>TAP TO VIEW</AppText>
          </Pressable>
        ) : secret.rewatch_status === 'requested' ? (
          <View style={[styles.openButton, { backgroundColor: '#5c544d' }]}>
            <AppText variant="mono" style={{ color: '#fff', fontSize: 12 }}>WAITING...</AppText>
          </View>
        ) : (
          <Pressable onPress={() => handleRequestRewatch(secret.id)} style={[styles.openButton, { backgroundColor: '#8C7F75' }]}>
            <AppText variant="mono" style={{ color: '#fff', fontSize: 12 }}>ASK TO REWATCH</AppText>
          </Pressable>
        )}
      </View>
    </View>
  );

  const renderMediaViewer = () => {
    if (!mediaDataUri) {
      return (
        <View style={viewerStyles.loadingContainer}>
          <View style={viewerStyles.loadingPulse}>
            <ActivityIndicator size="large" color="#E06C6C" />
          </View>
          <AppText variant="mono" style={viewerStyles.loadingText}>DECRYPTING...</AppText>
          <AppText variant="serifItalic" style={viewerStyles.loadingSubtext}>
            Preparing your secret photo
          </AppText>
        </View>
      );
    }

    return (
      <GestureDetector gesture={composedGesture}>
        <ReAnimated.View 
          style={[{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }, animatedImageStyle]}
        >
          <Image 
            source={{ uri: mediaDataUri }} 
            style={{ width: windowWidth, height: windowHeight * 0.8, resizeMode: 'contain' }}
          />
        </ReAnimated.View>
      </GestureDetector>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={{ padding: 10, marginLeft: -10 }}>
          <AppText style={{ color: '#E06C6C', fontSize: 16 }}>← Back</AppText>
        </Pressable>
        <AppText variant="display" size={24} style={{ color: '#fff' }}>Secret History</AppText>
        <View style={{ width: 50 }} />
      </View>

      <View style={{ padding: 20 }}>
        {secrets.length <= 1 ? (
          <AppText variant="serifItalic" color={Colors.muted} style={{ marginTop: 20, marginBottom: 40 }}>
            No older secrets.
          </AppText>
        ) : (
          secrets.slice(1).map(secret => renderSecret(secret))
        )}
      </View>

      <Modal visible={!!viewingSecret} transparent={true} animationType="fade">
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={viewerStyles.container}>
            <LinearGradient colors={['rgba(0,0,0,0.8)', 'transparent']} style={viewerStyles.topGradient} />

            <Pressable onPress={handleViewSecretOut} style={viewerStyles.closeButton}>
              <View style={viewerStyles.closeButtonInner}>
                <AppText style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>✕</AppText>
              </View>
            </Pressable>

            <View style={viewerStyles.progressTrack}>
              <Animated.View style={[viewerStyles.progressBar, { 
                width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
              }]} />
            </View>

            {mediaDataUri && (
              <View style={viewerStyles.timerLabel}>
                <AppText variant="mono" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>
                  {isPaused ? 'PAUSED' : 'AUTO-DESTRUCT'}
                </AppText>
              </View>
            )}

            <View 
              style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}
              onStartShouldSetResponder={() => true}
              onResponderGrant={handlePause}
              onResponderRelease={handleResume}
              onResponderTerminate={handleResume}
            >
              {renderMediaViewer()}
            </View>

            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={viewerStyles.bottomGradient} />

            {mediaDataUri && (
              <View style={viewerStyles.bottomHint}>
                <AppText variant="mono" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9 }}>
                  HOLD TO PAUSE • PINCH TO ZOOM • DOUBLE TAP TO 2.5×
                </AppText>
              </View>
            )}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1D1815" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 10,
  },
  messageCard: { backgroundColor: '#2D1D1A', borderRadius: 16, padding: 10, marginBottom: 24 },
  messageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#E06C6C',
    alignItems: 'center', justifyContent: 'center',
  },
  fromText: { fontSize: 11, color: '#AD442E', letterSpacing: 1 },
  messageMeta: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#3D2A26', paddingTop: 12,
  },
  openButton: { backgroundColor: '#AD442E', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
});

const viewerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 150, zIndex: 5 },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, zIndex: 5 },
  closeButton: { position: 'absolute', top: 55, right: 20, zIndex: 10 },
  closeButtonInner: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  progressTrack: {
    position: 'absolute', top: 100, left: 24, right: 24, height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', zIndex: 10,
  },
  progressBar: { height: '100%', backgroundColor: '#E06C6C', borderRadius: 2 },
  timerLabel: { position: 'absolute', top: 108, right: 24, zIndex: 10 },
  loadingContainer: { alignItems: 'center', justifyContent: 'center' },
  loadingPulse: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(224,108,108,0.1)',
    borderWidth: 1, borderColor: 'rgba(224,108,108,0.2)', alignItems: 'center',
    justifyContent: 'center', marginBottom: 20,
  },
  loadingText: { color: '#E06C6C', fontSize: 12, letterSpacing: 3, marginBottom: 8 },
  loadingSubtext: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  pausedIcon: { fontSize: 48, color: '#fff', marginBottom: 12 },
  pausedText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, letterSpacing: 4 },
  bottomHint: { position: 'absolute', bottom: 30, alignSelf: 'center', zIndex: 10 },
});
