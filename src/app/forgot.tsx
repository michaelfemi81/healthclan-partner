import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthButton, AuthField, AuthHeader, AuthScreen, authColors } from '../components/auth-ui';
import { partnerApi } from '../lib/api';
import { isValidEmail } from '../lib/validation';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function recover() {
    if (loading) return;

    const trimmedEmail = email.trim();

    if (!isValidEmail(trimmedEmail)) {
      setMessage('Enter a valid email address.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await partnerApi.auth.forgotPassword({ email: trimmedEmail, type: 'doctor' });
      setMessage('Reset instructions sent. Enter the code from your email to continue.');
      router.push({
        pathname: '/password',
        params: { email: trimmedEmail },
      } as any);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to send reset instructions.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeader title="Recover" backTo="/sign-in" />
      <View style={styles.form}>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.sub}>Enter your email to receive a 6-digit password reset code.</Text>
        <AuthField
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          inputProps={{ autoCapitalize: 'none', autoCorrect: false, keyboardType: 'email-address' }}
        />
        {!!message && <Text style={styles.message}>{message}</Text>}
        <AuthButton title={loading ? 'Sending...' : 'Recover'} onPress={recover} loading={loading} />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14, alignItems: 'center' },
  title: { color: authColors.ink, fontFamily: 'Poppins', fontSize: 26, fontWeight: '900' },
  sub: { color: authColors.muted, fontFamily: 'Poppins', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  message: { color: authColors.teal, fontFamily: 'Poppins', fontSize: 12, fontWeight: '800', textAlign: 'center' },
});
