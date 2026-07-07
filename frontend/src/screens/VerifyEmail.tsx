import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { AppTextInput } from '../components/ui/AppTextInput';
import { RootStackParamList } from '../types';
import { verifyEmail, resendOtp } from '../services/authApi';

type VerifyEmailRouteProp = RouteProp<RootStackParamList, 'VerifyEmail'>;

const VerifyEmail = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<VerifyEmailRouteProp>();
  const email = route.params.email;

  const handleVerify = async () => {
    setErrorMsg('');
    if (!otp) {
      setErrorMsg('Please enter the verification code.');
      return;
    }
    try {
      setLoading(true);
      const data = await verifyEmail(email, otp);
      await AsyncStorage.setItem('access_token', data.access_token);
      await AsyncStorage.setItem('refresh_token', data.refresh_token);
      navigation.navigate('ModeSelector');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Verification failed.';
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setErrorMsg('');
    try {
      setResending(true);
      await resendOtp(email);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to resend code.';
      setErrorMsg(errorMessage);
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <AppText variant="smallCaps" color={Colors.accent} style={{ marginBottom: 14 }}>
            ALMOST THERE
          </AppText>
          <AppText variant="display" size={42} style={{ lineHeight: 42, marginBottom: 14 }}>
            Verify Email
          </AppText>
          <AppText variant="serifItalic" size={18} color={Colors.muted} style={{ marginBottom: 36, lineHeight: 27 }}>
            We sent a 6-digit code to {email}.
          </AppText>

          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="000000"
              placeholderTextColor={Colors.muted}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
            />
            {errorMsg ? (
              <AppText color="red" style={{ marginTop: 8, fontSize: 13 }}>
                {errorMsg}
              </AppText>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          <AppButton variant="solid" size="lg" onPress={handleVerify} disabled={loading} style={{ width: '100%', marginBottom: 16 }}>
            {loading ? 'Verifying...' : 'Verify →'}
          </AppButton>
          
          <Pressable onPress={handleResend} disabled={resending} style={{ paddingVertical: 12 }}>
            <AppText variant="smallCaps" color={Colors.ink} style={{ textAlign: 'center' }}>
              Didn't receive it? <AppText variant="smallCaps" color={Colors.accent}>{resending ? 'Sending...' : 'Resend Code'}</AppText>
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bone },
  container: { flexGrow: 1, padding: 32 },
  content: { flex: 1, justifyContent: 'center' },
  actions: { paddingBottom: 20 },
});

export default VerifyEmail;
