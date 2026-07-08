import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthButton, AuthCodeInput, AuthField, AuthHeader, AuthScreen, authColors } from '../components/auth-ui';
import { partnerApi } from '../lib/api';
import { isValidPassword, onlyDigits } from '../lib/validation';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

function isValidCode(value: string) {
  return onlyDigits(value).length === 6;
}

export default function Password() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const email = useMemo(() => firstParam(params.email), [params.email]);
  const initialToken = useMemo(() => onlyDigits(firstParam(params.token)).slice(0, 6), [params.token]);
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function updatePassword() {
    if (loading) return;

    if (!isValidCode(token)) {
      setMessage('Enter the 6-digit reset code from your email.');
      return;
    }

    if (!isValidPassword(password)) {
      setMessage('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords must match.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await partnerApi.auth.resetPassword({ token, password, type: 'doctor' });
      setMessage('Password updated. You can sign in now.');
      setTimeout(() => router.replace('/sign-in' as any), 500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeader title="Reset Password" backTo="/forgot" />
      <View style={styles.form}>
        <Text style={styles.sub}>
          {email ? `Enter the 6-digit reset code sent to ${email}.` : 'Enter the 6-digit reset code from your email.'}
        </Text>
        <AuthCodeInput value={token} onChangeText={value => setToken(onlyDigits(value).slice(0, 6))} />
        <AuthField
          placeholder="New Password"
          secureTextEntry={!passwordVisible}
          value={password}
          onChangeText={setPassword}
          rightLabel={passwordVisible ? 'Hide' : 'Show'}
          onRightPress={() => setPasswordVisible(current => !current)}
        />
        <AuthField
          placeholder="Confirm Password"
          secureTextEntry={!confirmPasswordVisible}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          rightLabel={confirmPasswordVisible ? 'Hide' : 'Show'}
          onRightPress={() => setConfirmPasswordVisible(current => !current)}
        />
        {!!message && <Text style={styles.message}>{message}</Text>}
        <AuthButton title={loading ? 'Updating...' : 'Update Password'} onPress={updatePassword} loading={loading} />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12, alignItems: 'center' },
  sub: { maxWidth: 430, color: authColors.muted, fontFamily: 'Poppins', fontSize: 14, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  message: { color: authColors.teal, fontFamily: 'Poppins', fontSize: 12, fontWeight: '800', textAlign: 'center' },
});
