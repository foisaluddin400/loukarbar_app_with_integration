import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Alert, Modal, Image, SafeAreaView } from 'react-native';
import { Colors } from '../../constants/colors';
import { AppText } from '../../components/ui/AppText';
import { AppButton } from '../../components/ui/AppButton';
import * as ImagePicker from 'expo-image-picker';
import { uploadSecret, getReceivedSecrets, getSecretViewUrl } from '../../services/secretApi';

const Confidential: React.FC = () => {
  const [secrets, setSecrets] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingSecret, setViewingSecret] = useState<any | null>(null);

  const loadSecrets = async () => {
    try {
      const res = await getReceivedSecrets();
      if (res.success) {
        setSecrets(res.data);
      }
    } catch (e) {
      console.log("Failed to load secrets", e);
    }
  };

  useEffect(() => {
    loadSecrets();
  }, []);

  const handleCompose = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setIsUploading(true);
      try {
        await uploadSecret(result.assets[0].uri, false);
        Alert.alert("Success", "Secret sent successfully!");
      } catch (error) {
        Alert.alert("Upload Failed", "Could not send the secret.");
        console.error(error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleViewSecret = (secret: any) => {
    setViewingSecret(secret);
  };

  const closeSecretView = () => {
    setViewingSecret(null);
    loadSecrets(); // Refresh list after viewing to remove viewed ones
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="mono" style={styles.headerText}>CONFIDENTIAL</AppText>
      </View>

      <AppText variant="display" size={35} style={styles.title}>
        Just between {""}
        <AppText variant="serifItalic" size={32} style={{ color: "#E06C6C" }}>
         you two.
        </AppText>
      </AppText>

      <AppText variant="serifItalic" size={13} color={Colors.cream} style={styles.subtitle}>
        Photos that open once, then disappear. No screenshots, no storage.
      </AppText>

      {secrets.length === 0 ? (
        <AppText variant="serifItalic" color={Colors.muted} style={{ marginTop: 20, marginBottom: 40 }}>
          No new secrets received.
        </AppText>
      ) : (
        secrets.map((secret) => (
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
                OPENS ONCE • {secret.delete_after}
              </AppText>
              <AppButton 
                variant="solid" 
                size="sm" 
                style={styles.openButton}
                onPress={() => handleViewSecret(secret)}
              >
                OPEN →
              </AppButton>
            </View>
          </View>
        ))
      )}

      <View style={styles.composeSection}>
        <AppText variant="smallCaps" style={styles.composeLabel}>COMPOSE</AppText>
        <Pressable style={styles.composeButton} onPress={handleCompose} disabled={isUploading}>
          <AppText variant="heading" size={17} style={{ color: '#fff' }}>
            {isUploading ? "Sending..." : "Send something private"}
          </AppText>
          <AppText style={{ color: '#E8B4A0', fontSize: 18 }}>→</AppText>
        </Pressable>
      </View>

      <Modal visible={!!viewingSecret} transparent={false} animationType="fade">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
          {viewingSecret && (
            <>
              <Image 
                source={{ uri: getSecretViewUrl(viewingSecret.id) }} 
                style={{ width: '100%', height: '80%', resizeMode: 'contain' }}
              />
              <AppButton 
                variant="outline" 
                style={{ margin: 20, borderColor: '#fff' }} 
                onPress={closeSecretView}
              >
                <AppText style={{ color: '#fff' }}>Close & Destroy</AppText>
              </AppButton>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default Confidential;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: -20,
    backgroundColor: "#1D1815",
    padding: 20,
    marginVertical: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerText: { fontSize: 10, letterSpacing: 1, color: '#AD442E' },
  title: { color: "#fff", marginBottom: 4 },
  subtitle: { marginTop: -7, marginBottom: 24 },
  messageCard: {
    backgroundColor: '#2D1D1A',
    borderRadius: 16,
    padding: 10,
    marginBottom: 24,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E06C6C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fromText: {
    fontSize: 11,
    color: '#AD442E',
    letterSpacing: 1,
  },
  messageMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  openButton: {
    backgroundColor: '#B7553E',
    paddingHorizontal: 20,
  },
  composeSection: {
    marginTop: 8,
  },
  composeLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#8C7F75',
    marginBottom: 10,
  },
  composeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2E2622',
    padding: 20,
    borderRadius: 14,
  },
});