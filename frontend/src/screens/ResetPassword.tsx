import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert, Pressable } from 'react-native';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { AppTextInput } from '../components/ui/AppTextInput';
import { RootStackParamList } from '../types';
import { resetPassword } from '../services/authApi';

type ResetPasswordRouteProp = RouteProp<RootStackParamList, 'ResetPassword'>;

const ResetPassword = () => {
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<ResetPasswordRouteProp>();
  const email = route.params.email;

  const handleReset = async () => {
    if (!otp || !newPassword) {
      Alert.alert('Missing Fields', 'Please enter the reset code and your new password.');
      return;
    }
    try {
      setLoading(true);
      const data = await resetPassword(email, otp, newPassword);
      await AsyncStorage.setItem('access_token', data.access_token);
      await AsyncStorage.setItem('refresh_token', data.refresh_token);
      navigation.navigate('ModeSelector');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Reset failed.';
      Alert.alert('Reset Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <AppText variant="smallCaps" color={Colors.accent} style={{ marginBottom: 14 }}>
            SECURE YOUR ACCOUNT
          </AppText>
          <AppText variant="display" size={42} style={{ lineHeight: 42, marginBottom: 14 }}>
            Reset Password
          </AppText>
          <AppText variant="serifItalic" size={18} color={Colors.muted} style={{ marginBottom: 36, lineHeight: 27 }}>
            Enter the 6-digit code sent to your email and a new password.
          </AppText>

          <AppTextInput
            label="Reset code"
            n="01"
            value={otp}
            onChangeText={setOtp}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
          />

          <View style={{ marginTop: 24 }}>
            <AppTextInput
              label="New password"
              n="02"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="••••••••"
              isPassword
            />
          </View>
        </View>

        <View style={styles.actions}>
          <AppButton variant="solid" size="lg" onPress={handleReset} disabled={loading} style={{ width: '100%', marginBottom: 16 }}>
            {loading ? 'Resetting...' : 'Reset Password →'}
          </AppButton>
          
          <Pressable onPress={() => navigation.navigate('Login')} style={{ paddingVertical: 12 }}>
            <AppText variant="smallCaps" color={Colors.ink} style={{ textAlign: 'center' }}>
              Cancel and <AppText variant="smallCaps" color={Colors.accent}>Return to Login</AppText>
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

export default ResetPassword;
