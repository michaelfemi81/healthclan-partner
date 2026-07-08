import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { SettingsDetailScreen, SettingsNotice, SettingsRow, SettingsSectionTitle } from '../../components/settings-detail-screen';
import { subscribePartnerRefresh } from '../../lib/app-events';
import { partnerApi } from '../../lib/api';

export default function PrivacySecurity() {
  const [status, setStatus] = useState({
    verification: 'pending',
    account: 'pending',
    devices: 0,
    securityAlerts: true,
  });
  const [notice, setNotice] = useState('');

  const loadSecurity = useCallback(() => {
    Promise.all([
      partnerApi.profile().catch(() => null),
      partnerApi.trustedDevices().catch(() => []),
      partnerApi.preferences().catch(() => null),
    ])
      .then(([profile, devices, preferences]) => {
        setStatus({
          verification: profile?.profile?.verificationStatus || 'pending',
          account: profile?.user?.status || 'pending',
          devices: Array.isArray(devices) ? devices.length : 0,
          securityAlerts: preferences?.securityAlerts !== false,
        });
        setNotice('');
      })
      .catch(() => setNotice('Unable to load privacy and security status.'));
  }, []);

  useFocusEffect(loadSecurity);

  useEffect(() => subscribePartnerRefresh(['profile', 'verification', 'devices', 'preferences'], loadSecurity), [loadSecurity]);

  return (
    <SettingsDetailScreen title="Privacy & Security" subtitle="Account access, privacy controls, and verification status.">
      <SettingsNotice>{notice || 'Doctor actions remain locked until admin verification is complete. Account security settings remain available.'}</SettingsNotice>
      <SettingsSectionTitle>Security</SettingsSectionTitle>
      <SettingsRow icon="shield-checkmark-outline" title="Doctor verification" subtitle={`Account status: ${status.account}`} right={status.verification} onPress={() => router.push('/profile' as any)} />
      <SettingsRow icon="lock-closed-outline" title="Password protection" subtitle="Update account credentials any time." right="Change" onPress={() => router.push('/change-password' as any)} />
      <SettingsRow icon="phone-portrait-outline" title="Trusted devices" subtitle={`${status.devices} trusted device${status.devices === 1 ? '' : 's'} recorded`} right="Review" onPress={() => router.push('/trusted-devices' as any)} />
      <SettingsSectionTitle>Privacy</SettingsSectionTitle>
      <SettingsRow icon="notifications-outline" title="Security alerts" subtitle="Security and account notifications" right={status.securityAlerts ? 'On' : 'Off'} onPress={() => router.push('/settings' as any)} />
      <SettingsRow icon="document-text-outline" title="Data controls" subtitle="HealthClan uses provider data to run consultations, payments, verification, and support." onPress={() => router.push('/privacy-policy' as any)} />
      <SettingsRow icon="eye-off-outline" title="Hidden care leads" subtitle="Care requester details remain hidden until a partner account pays to unlock them." />
    </SettingsDetailScreen>
  );
}
