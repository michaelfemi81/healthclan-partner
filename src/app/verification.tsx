import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthButton, AuthCodeInput, AuthHeader, AuthScreen, authColors } from '../components/auth-ui';
import { useSession } from '../constants/ctx';
import { getApiToken, partnerApi } from '../lib/api';
import { onlyDigits } from '../lib/validation';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

function isValidCode(value: string) {
  return onlyDigits(value).length === 6;
}

export default function Verification() {
  const { signIn } = useSession();
  const params = useLocalSearchParams<{ token?: string; email?: string; authToken?: string; emailDelivery?: string }>();
  const initialToken = useMemo(() => onlyDigits(firstParam(params.token)).slice(0, 6), [params.token]);
  const email = useMemo(() => firstParam(params.email), [params.email]);
  const authToken = useMemo(() => firstParam(params.authToken), [params.authToken]);
  const emailDelivery = useMemo(() => firstParam(params.emailDelivery), [params.emailDelivery]);

  const [token, setToken] = useState(initialToken);
  const [message, setMessage] = useState(
    emailDelivery === 'failed'
      ? 'Your account was created, but the confirmation email could not be sent. Tap Resend Token or check the email provider setup.'
      : ''
  );
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (initialToken) setToken(initialToken);
  }, [initialToken]);

  async function confirmEmail() {
    if (loading) return;

    if (!isValidCode(token)) {
      setMessage('Enter the confirmation token from your email.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await partnerApi.auth.verifyEmail(token.trim());
      const tokenForLogin = authToken || await getApiToken();

      if (!tokenForLogin) {
        setMessage('Email confirmed. Please log in to continue.');
        setTimeout(() => router.replace('/sign-in' as any), 600);
        return;
      }

      setMessage('Email confirmed. Taking you to your dashboard.');
      signIn(tokenForLogin);
      setTimeout(() => router.replace('/' as any), 600);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to confirm email.');
    } finally {
      setLoading(false);
    }
  }

  async function resendToken() {
    if (resending) return;

    const tokenForResend = authToken || await getApiToken();

    if (!tokenForResend) {
      setMessage('Log in after signup before requesting another confirmation token.');
      return;
    }

    setResending(true);
    setMessage('');

    try {
      const response = await partnerApi.auth.resendVerificationEmail(tokenForResend) as { verificationEmailSent?: boolean } | undefined;
      setMessage(
        response?.verificationEmailSent === false
          ? 'The confirmation email could not be sent. Please check the email provider setup and try again.'
          : 'A new confirmation token has been sent to your email.'
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to resend confirmation email.');
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthScreen>
      <AuthHeader title="Confirm Email" backTo="/create-account" />
      <View style={styles.form}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.sub}>
          {email
            ? `We sent a confirmation token to ${email}. Enter it below to finish setting up your account.`
            : 'Enter the confirmation token from your HealthClan Partner email to finish setting up your account.'}
        </Text>
        <AuthCodeInput value={token} onChangeText={value => setToken(onlyDigits(value).slice(0, 6))} />
        {!!message && <Text style={styles.message}>{message}</Text>}
        <AuthButton title={loading ? 'Confirming...' : 'Confirm Email'} onPress={confirmEmail} loading={loading} />
        <AuthButton title={resending ? 'Sending...' : 'Resend Token'} onPress={resendToken} loading={resending} disabled={!authToken} />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14, alignItems: 'center' },
  title: { color: authColors.ink, fontFamily: 'Poppins', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  sub: { maxWidth: 430, color: authColors.muted, fontFamily: 'Poppins', fontSize: 14, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  message: { maxWidth: 430, color: authColors.teal, fontFamily: 'Poppins', fontSize: 12, fontWeight: '800', textAlign: 'center' },
});
