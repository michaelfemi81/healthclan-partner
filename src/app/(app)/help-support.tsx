import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ApiStateCard } from '../../components/api-state';
import { SettingsDetailScreen, SettingsNotice, SettingsRow, SettingsSectionTitle, settingsColors } from '../../components/settings-detail-screen';
import { emitPartnerRefresh, subscribePartnerRefresh } from '../../lib/app-events';
import { partnerApi } from '../../lib/api';

export default function HelpSupport() {
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [notice, setNotice] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
  const [fetchingTickets, setFetchingTickets] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadTickets = () => {
    partnerApi.supportTickets()
      .then(items => {
        setTickets(items);
        setNotice('');
      })
      .catch(() => {
        setTickets([]);
        setNotice('Unable to load support tickets from HealthClan.');
      })
      .finally(() => setFetchingTickets(false));
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => subscribePartnerRefresh('support', loadTickets), []);

  async function submit() {
    if (!subject.trim() || !messageBody.trim()) {
      setNotice('Enter a subject and message.');
      return;
    }
    setLoading(true);
    setNotice('');
    try {
      const ticket = await partnerApi.createSupportTicket({ subject: subject.trim(), message: messageBody.trim(), category: 'account' });
      if (ticket?._id) {
        setTickets(current => [ticket, ...current]);
      } else {
        partnerApi.supportTickets().then(setTickets).catch(() => null);
      }
      setNotice('Support ticket sent.');
      setSubject('');
      setMessageBody('');
      emitPartnerRefresh('support', 'support-ticket-created', ticket);
      emitPartnerRefresh('notifications', 'support-ticket-created', ticket);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to send support ticket.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SettingsDetailScreen title="Help & Support" subtitle="Send account, payment, or verification questions to HealthClan.">
      {!!notice && <SettingsNotice>{notice}</SettingsNotice>}
      <View style={styles.form}>
        <TextInput placeholder="Subject" placeholderTextColor="#13CAD6" value={subject} onChangeText={setSubject} style={styles.input} />
        <TextInput placeholder="Message" placeholderTextColor="#13CAD6" value={messageBody} onChangeText={setMessageBody} multiline textAlignVertical="top" style={[styles.input, styles.message]} />
        <TouchableOpacity activeOpacity={0.75} onPress={submit} disabled={loading} style={[styles.button, loading && styles.buttonDisabled]}>
          {loading && <ActivityIndicator color="#fff" />}
          <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Message'}</Text>
        </TouchableOpacity>
      </View>
      <SettingsSectionTitle>Recent tickets</SettingsSectionTitle>
      {fetchingTickets ? (
        <ApiStateCard loading title="Loading tickets" message="Fetching your support history from HealthClan." />
      ) : !tickets.length ? (
        <ApiStateCard icon="help-circle-outline" title="No support tickets" message="Messages you send to HealthClan support will appear here." />
      ) : tickets.map(ticket => (
        <SettingsRow
          key={ticket._id}
          icon="chatbubble-ellipses-outline"
          title={ticket.subject || 'Support ticket'}
          subtitle={ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'Submitted'}
          right={ticket.status || 'open'}
        />
      ))}
    </SettingsDetailScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  input: { minHeight: 50, borderRadius: 12, backgroundColor: 'rgba(19, 202, 214, 0.2)', paddingHorizontal: 14, color: '#252525', fontWeight: '800' },
  message: { minHeight: 130, paddingTop: 14 },
  button: { minHeight: 52, borderRadius: 14, backgroundColor: settingsColors.grad1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
