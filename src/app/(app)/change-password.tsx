import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SettingsDetailScreen, SettingsNotice, settingsColors } from '../../components/settings-detail-screen';
import { emitPartnerRefresh } from '../../lib/app-events';
import { partnerApi } from '../../lib/api';
import { isValidPassword } from '../../lib/validation';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!currentPassword) {
      setMessage('Enter your current password.');
      return;
    }
    if (!isValidPassword(newPassword)) {
      setMessage('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords must match.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      await partnerApi.changePassword({ currentPassword, newPassword });
      setMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      emitPartnerRefresh('notifications', 'password-changed');
      emitPartnerRefresh('devices', 'password-changed');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to change password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SettingsDetailScreen title="Change Password" subtitle="Update the password for your partner account.">
      {!!message && <SettingsNotice>{message}</SettingsNotice>}
      <View style={styles.form}>
        <TextInput secureTextEntry placeholder="Current password" placeholderTextColor="#13CAD6" value={currentPassword} onChangeText={setCurrentPassword} style={styles.input} />
        <TextInput secureTextEntry placeholder="New password" placeholderTextColor="#13CAD6" value={newPassword} onChangeText={setNewPassword} style={styles.input} />
        <TextInput secureTextEntry placeholder="Confirm new password" placeholderTextColor="#13CAD6" value={confirmPassword} onChangeText={setConfirmPassword} style={styles.input} />
        <TouchableOpacity activeOpacity={0.75} onPress={submit} disabled={loading} style={[styles.button, loading && styles.buttonDisabled]}>
          {loading && <ActivityIndicator color="#fff" />}
          <Text style={styles.buttonText}>{loading ? 'Updating...' : 'Update Password'}</Text>
        </TouchableOpacity>
      </View>
    </SettingsDetailScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  input: { minHeight: 50, borderRadius: 12, backgroundColor: 'rgba(19, 202, 214, 0.2)', paddingHorizontal: 14, color: '#252525', fontWeight: '800' },
  button: { minHeight: 52, borderRadius: 14, backgroundColor: settingsColors.grad1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
