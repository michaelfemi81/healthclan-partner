import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { ApiStateCard } from '../../components/api-state';
import { SettingsDetailScreen, SettingsNotice, SettingsRow } from '../../components/settings-detail-screen';
import { emitPartnerRefresh, subscribePartnerRefresh } from '../../lib/app-events';
import { partnerApi } from '../../lib/api';

const languages = ['English', 'French', 'Spanish', 'Yoruba', 'Igbo', 'Hausa'];

export default function LanguageSettings() {
  const [selected, setSelected] = useState('English');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [notice, setNotice] = useState('');

  const loadLanguage = useCallback(() => {
    setLoading(true);
    partnerApi.preferences()
      .then(preferences => {
        const language = String(preferences?.language || preferences?.appLanguage || 'English');
        setSelected(languages.includes(language) ? language : 'English');
        setNotice('');
      })
      .catch(() => setNotice('Unable to load language preference.'))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(loadLanguage);

  useEffect(() => subscribePartnerRefresh('preferences', loadLanguage), [loadLanguage]);

  const chooseLanguage = async (language: string) => {
    if (saving || language === selected) return;

    const previous = selected;
    setSelected(language);
    setSaving(language);
    setNotice('');

    try {
      await partnerApi.savePreferences({ language, appLanguage: language });
      emitPartnerRefresh('preferences', 'language-updated', { language });
      setNotice(`${language} selected.`);
    } catch (error) {
      setSelected(previous);
      setNotice(error instanceof Error ? error.message : 'Unable to save language preference.');
    } finally {
      setSaving('');
    }
  };

  return (
    <SettingsDetailScreen title="Language" subtitle="Choose how HealthClan Partner displays text.">
      {!!notice && <SettingsNotice>{notice}</SettingsNotice>}
      {loading ? (
        <ApiStateCard loading title="Loading language" message="Fetching your language preference from HealthClan." />
      ) : languages.map(language => (
        <SettingsRow
          key={language}
          icon="language-outline"
          title={language}
          subtitle={language === selected ? 'Current language' : 'Available language'}
          right={saving === language ? 'Saving' : language === selected ? 'Selected' : undefined}
          onPress={() => chooseLanguage(language)}
        />
      ))}
      {!!saving && <ActivityIndicator color="#085161" />}
    </SettingsDetailScreen>
  );
}
