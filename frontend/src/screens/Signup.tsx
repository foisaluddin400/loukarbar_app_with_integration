import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { AppTextInput } from '../components/ui/AppTextInput';
import { RootStackParamList } from '../types';
import { signupUser } from '../services/authApi';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleSignup = async () => {
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    try {
      setLoading(true);
      await signupUser(email, password);
      navigation.navigate('VerifyEmail', { email });
    } catch (error: any) {
      let errorMessage = error.response?.data?.detail || error.message || 'An error occurred during signup.';
      if (errorMessage.toLowerCase() === 'network error') {
        errorMessage = 'No internet connection available. Please check your network and try again.';
      }
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <AppText variant="smallCaps" color={Colors.accent} style={{ marginBottom: 14 }}>
            NEW BEGINNINGS
          </AppText>
          <AppText variant="display" size={42} style={{ lineHeight: 42, marginBottom: 14 }}>
            Sign Up
          </AppText>
          <AppText variant="serifItalic" size={18} color={Colors.muted} style={{ marginBottom: 36, lineHeight: 27 }}>
            Create an account to start your journey.
          </AppText>

          <AppTextInput
            label="Email address"
            n="01"
            value={email}
            onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
            placeholder="lou@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />

          <View style={{ marginTop: 24 }}>
            <AppTextInput
              label="Password"
              n="02"
              value={password}
              onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
              placeholder="••••••••"
              isPassword
              autoComplete="new-password"
              textContentType="newPassword"
            />
          </View>
        </View>

        <View style={styles.actions}>
          {errorMsg ? (
            <AppText variant="serifItalic" size={14} color={Colors.accent} style={{ textAlign: 'center', marginBottom: 16 }}>
              {errorMsg}
            </AppText>
          ) : null}
          <AppButton variant="solid" size="lg" onPress={handleSignup} disabled={loading} style={{ width: '100%', marginBottom: 16 }}>
            {loading ? 'Creating...' : 'Create Account →'}
          </AppButton>
          
          <Pressable onPress={() => navigation.navigate('Login')} style={{ paddingVertical: 12 }}>
            <AppText variant="smallCaps" color={Colors.ink} style={{ textAlign: 'center' }}>
              Already have an account? <AppText variant="smallCaps" color={Colors.accent}>Sign In</AppText>
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

export default Signup;
