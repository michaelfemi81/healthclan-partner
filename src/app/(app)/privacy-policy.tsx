import { Text } from 'react-native';
import { SettingsDetailScreen, SettingsSectionTitle } from '../../components/settings-detail-screen';

export default function PrivacyPolicy() {
  return (
    <SettingsDetailScreen title="Privacy Policy" subtitle="How HealthClan handles partner account data.">
      <SettingsSectionTitle>Information We Use</SettingsSectionTitle>
      <Text style={{ color: '#252525', fontSize: 14, lineHeight: 22, fontWeight: '700' }}>
        HealthClan processes account details, verification documents, availability, consultation records, payout information, and support messages to operate the partner service.
      </Text>
      <SettingsSectionTitle>Verification Documents</SettingsSectionTitle>
      <Text style={{ color: '#252525', fontSize: 14, lineHeight: 22, fontWeight: '700' }}>
        Doctor documents are used for admin verification and may be reviewed to confirm identity, professional status, and platform eligibility.
      </Text>
    </SettingsDetailScreen>
  );
}
