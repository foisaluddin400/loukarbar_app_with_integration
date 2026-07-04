import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { AppTextInput } from '../components/ui/AppTextInput';
import { RootStackParamList } from '../types';
import { forgotPassword } from '../services/authApi';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleForgot = async () => {
    if (!email) {
      Alert.alert('Missing Field', 'Please enter your email address.');
      return;
    }
    try {
      setLoading(true);
      await forgotPassword(email);
      navigation.navigate('ResetPassword', { email });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'An error occurred.';
      if (error.response?.status === 404 || errorMessage.toLowerCase().includes('account not found')) {
         Alert.alert(
           'Account Not Found', 
           'No account exists with this email address. Would you like to create a new account?',
           [
             { text: 'Try Again', style: 'cancel' },
             { text: 'Sign Up', onPress: () => navigation.navigate('Signup' as any) }
           ]
         );
      } else {
         Alert.alert('Request Failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <AppText variant="smallCaps" color={Colors.accent} style={{ marginBottom: 14 }}>
            RECOVERY
          </AppText>
          <AppText variant="display" size={42} style={{ lineHeight: 42, marginBottom: 14 }}>
            Forgot Password
          </AppText>
          <AppText variant="serifItalic" size={18} color={Colors.muted} style={{ marginBottom: 36, lineHeight: 27 }}>
            Enter your email to receive a reset code.
          </AppText>

          <AppTextInput
            label="Email address"
            n="01"
            value={email}
            onChangeText={setEmail}
            placeholder="lou@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.actions}>
          <AppButton variant="solid" size="lg" onPress={handleForgot} disabled={loading} style={{ width: '100%', marginBottom: 16 }}>
            {loading ? 'Sending...' : 'Send Reset Code →'}
          </AppButton>
          
          <Pressable onPress={() => navigation.navigate('Login')} style={{ paddingVertical: 12 }}>
            <AppText variant="smallCaps" color={Colors.ink} style={{ textAlign: 'center' }}>
              Remembered it? <AppText variant="smallCaps" color={Colors.accent}>Sign In</AppText>
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

export default ForgotPassword;
