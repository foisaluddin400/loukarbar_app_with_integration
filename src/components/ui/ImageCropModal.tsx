import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Image,
  PanResponder,
  useWindowDimensions,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { AppText } from './AppText';
import { AppButton } from './AppButton';

interface ImageCropModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onConfirm: (croppedUri: string) => Promise<void> | void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  visible,
  imageUri,
  onClose,
  onConfirm,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const CROP_SIZE = Math.min(screenWidth - 48, 300);

  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [processing, setProcessing] = useState<boolean>(false);

  const scaleRef = useRef(1);
  scaleRef.current = scale;
  const positionRef = useRef({ x: 0, y: 0 });
  positionRef.current = position;

  useEffect(() => {
    if (imageUri && visible) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      Image.getSize(
        imageUri,
        (w, h) => {
          setImageSize({ width: w, height: h });
        },
        () => {
          setImageSize({ width: 800, height: 800 });
        }
      );
    }
  }, [imageUri, visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        setPosition({
          x: positionRef.current.x + gestureState.dx * 0.4,
          y: positionRef.current.y + gestureState.dy * 0.4,
        });
      },
      onPanResponderRelease: (_, gestureState) => {
        setPosition((prev) => ({
          x: prev.x + gestureState.dx * 0.4,
          y: prev.y + gestureState.dy * 0.4,
        }));
      },
    })
  ).current;

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.75));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleCropAndSave = async () => {
    if (!imageUri) return;

    try {
      setProcessing(true);
      await onConfirm(imageUri);
      onClose();
    } catch (e) {
      console.error('Error saving image:', e);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  if (!visible || !imageUri) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerBtn} disabled={processing}>
            <Ionicons name="close" size={24} color={Colors.ink} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <AppText variant="smallCaps" color={Colors.accent} style={{ letterSpacing: 2 }}>
              PHOTO EDITOR
            </AppText>
            <AppText variant="display" size={22} style={{ marginTop: 2 }}>
              Crop & Position
            </AppText>
          </View>
          <Pressable onPress={handleReset} style={styles.headerBtn} disabled={processing}>
            <AppText variant="mono" color={Colors.muted} style={{ fontSize: 11 }}>
              RESET
            </AppText>
          </Pressable>
        </View>

        {/* Viewfinder Area */}
        <View style={styles.viewfinderContainer}>
          <View
            style={[
              styles.cropWindow,
              { width: CROP_SIZE, height: CROP_SIZE, borderRadius: CROP_SIZE / 2 },
            ]}
            {...panResponder.panHandlers}
          >
            {/* Image Preview */}
            <View
              style={{
                width: CROP_SIZE,
                height: CROP_SIZE,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [
                  { translateX: position.x },
                  { translateY: position.y },
                  { scale: scale },
                  { rotate: `${rotation}deg` },
                ],
              }}
            >
              <Image
                source={{ uri: imageUri }}
                style={{ width: CROP_SIZE, height: CROP_SIZE }}
                resizeMode="cover"
              />
            </View>

            {/* Circular Vignette Border */}
            <View
              pointerEvents="none"
              style={[
                styles.cropOverlay,
                { width: CROP_SIZE, height: CROP_SIZE, borderRadius: CROP_SIZE / 2 },
              ]}
            >
              {/* Subtle 3x3 framing guide */}
              <View style={styles.gridH1} />
              <View style={styles.gridH2} />
              <View style={styles.gridV1} />
              <View style={styles.gridV2} />
            </View>
          </View>

          <AppText variant="serifItalic" color={Colors.muted} size={14} style={{ marginTop: 16 }}>
            Drag to reposition • Use controls below to zoom & rotate
          </AppText>
        </View>

        {/* Editing Toolbar */}
        <View style={styles.toolbar}>
          <Pressable onPress={handleZoomOut} style={styles.toolBtn} disabled={processing}>
            <Ionicons name="remove-circle-outline" size={26} color={Colors.ink} />
            <AppText variant="mono" style={styles.toolLabel}>ZOOM -</AppText>
          </Pressable>

          <View style={styles.scaleBadge}>
            <AppText variant="mono" size={13} color={Colors.ink}>
              {Math.round(scale * 100)}%
            </AppText>
          </View>

          <Pressable onPress={handleZoomIn} style={styles.toolBtn} disabled={processing}>
            <Ionicons name="add-circle-outline" size={26} color={Colors.ink} />
            <AppText variant="mono" style={styles.toolLabel}>ZOOM +</AppText>
          </Pressable>

          <Pressable onPress={handleRotate} style={styles.toolBtn} disabled={processing}>
            <Ionicons name="refresh-outline" size={24} color={Colors.ink} />
            <AppText variant="mono" style={styles.toolLabel}>ROTATE</AppText>
          </Pressable>
        </View>

        {/* Bottom Actions */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <AppButton
            variant="outline"
            size="md"
            onPress={onClose}
            disabled={processing}
            style={{ flex: 1 }}
          >
            Cancel
          </AppButton>

          <AppButton
            variant="solid"
            size="md"
            onPress={handleCropAndSave}
            disabled={processing}
            style={{ flex: 2, backgroundColor: Colors.ink }}
          >
            {processing ? 'Saving...' : '✓ Use This Photo'}
          </AppButton>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bone,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  headerBtn: {
    padding: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  viewfinderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cropWindow: {
    backgroundColor: Colors.cream2,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: Colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropOverlay: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  gridH1: {
    position: 'absolute',
    top: '33.33%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  gridH2: {
    position: 'absolute',
    top: '66.66%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  gridV1: {
    position: 'absolute',
    left: '33.33%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  gridV2: {
    position: 'absolute',
    left: '66.66%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: Colors.cream,
    borderTopWidth: 1,
    borderTopColor: Colors.rule,
  },
  toolBtn: {
    alignItems: 'center',
    gap: 4,
    padding: 6,
  },
  toolLabel: {
    fontSize: 10,
    color: Colors.muted,
  },
  scaleBadge: {
    backgroundColor: Colors.bone,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.rule,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: Colors.bone,
    borderTopWidth: 1,
    borderTopColor: Colors.rule,
  },
});
