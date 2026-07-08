import { Text } from 'react-native';
import { SettingsDetailScreen, SettingsSectionTitle } from '../../components/settings-detail-screen';

export default function TermsConditions() {
  return (
    <SettingsDetailScreen title="Terms & Conditions" subtitle="Partner use of HealthClan services.">
      <SettingsSectionTitle>Partner Responsibilities</SettingsSectionTitle>
      <Text style={{ color: '#252525', fontSize: 14, lineHeight: 22, fontWeight: '700' }}>
        Providers must upload valid verification documents and wait for admin approval before performing clinical doctor operations. Approved doctors are responsible for accurate availability, professional conduct, consultation notes, and compliance with applicable healthcare rules.
      </Text>
      <SettingsSectionTitle>Payments & Leads</SettingsSectionTitle>
      <Text style={{ color: '#252525', fontSize: 14, lineHeight: 22, fontWeight: '700' }}>
        Pending doctor partners may review and pay to unlock care requester information as care partners. Doctor consultations, availability, clinical payouts, and related tools require admin approval. HealthClan may update pricing, verification requirements, and platform rules as needed.
      </Text>
    </SettingsDetailScreen>
  );
}
