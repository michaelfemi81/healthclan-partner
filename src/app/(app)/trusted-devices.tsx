import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ApiStateCard } from '../../components/api-state';
import { SettingsDetailScreen, SettingsNotice, settingsColors } from '../../components/settings-detail-screen';
import { emitPartnerRefresh, subscribePartnerRefresh } from '../../lib/app-events';
import { partnerApi } from '../../lib/api';

type TrustedDevice = {
  _id?: string;
  deviceId?: string;
  name?: string;
  platform?: string;
  lastActiveAt?: string;
  updatedAt?: string;
  createdAt?: string;
  isTrusted?: boolean;
};

function formatLastActive(value?: string) {
  if (!value) return 'Last active date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Last active date unavailable';
  return `Last active ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function deviceId(device: TrustedDevice) {
  return device._id || device.deviceId || '';
}

export default function TrustedDevices() {
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [removingId, setRemovingId] = useState('');

  const loadDevices = useCallback(() => {
    setLoading(true);
    setMessage('');
    partnerApi.trustedDevices()
      .then(items => {
        setDevices(Array.isArray(items) ? items : []);
        setMessage('');
      })
      .catch(error => {
        setDevices([]);
        setMessage(error instanceof Error ? error.message : 'Unable to load trusted devices from HealthClan.');
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(loadDevices);

  useEffect(() => subscribePartnerRefresh('devices', loadDevices), [loadDevices]);

  async function removeDevice(device: TrustedDevice) {
    const id = deviceId(device);
    if (!id || removingId) return;

    const previous = devices;
    setRemovingId(id);
    setMessage('');
    setDevices(current => current.filter(item => deviceId(item) !== id));

    try {
      await partnerApi.removeTrustedDevice(id);
      emitPartnerRefresh('devices', 'trusted-device-removed', { id });
      emitPartnerRefresh('notifications', 'trusted-device-removed', { id });
    } catch (error) {
      setDevices(previous);
      setMessage(error instanceof Error ? error.message : 'Unable to remove trusted device.');
    } finally {
      setRemovingId('');
    }
  }

  return (
    <SettingsDetailScreen title="Trusted Devices" subtitle="Review devices that have accessed your partner account.">
      {!!message && !loading && <SettingsNotice>{message}</SettingsNotice>}
      {loading ? (
        <ApiStateCard loading title="Loading devices" message="Checking trusted devices from the backend." />
      ) : message && !devices.length ? (
        <View style={styles.retryPanel}>
          <ApiStateCard icon="cloud-offline-outline" title="Devices unavailable" message="HealthClan could not load trusted devices right now." />
          <TouchableOpacity activeOpacity={0.75} style={styles.retryButton} onPress={loadDevices}>
            <Ionicons name="refresh-outline" size={16} color="#fff" />
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : !devices.length ? (
        <ApiStateCard icon="phone-portrait-outline" title="No trusted devices" message="Devices will appear here after the backend records trusted sign-ins." />
      ) : devices.map(device => (
        <View key={deviceId(device) || device.name} style={styles.card}>
          <View style={styles.icon}>
            <Ionicons name={String(device.platform || '').toLowerCase().includes('web') ? 'desktop-outline' : 'phone-portrait-outline'} size={22} color={settingsColors.grad1} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.name}>{device.name || 'Trusted device'}</Text>
            <Text style={styles.meta}>{device.platform || 'HealthClan Partner app'} | {formatLastActive(device.lastActiveAt || device.updatedAt || device.createdAt)}</Text>
            <Text style={[styles.status, device.isTrusted === false && styles.statusWarn]}>
              {device.isTrusted === false ? 'Review needed' : 'Trusted'}
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.75} style={styles.remove} onPress={() => removeDevice(device)}>
            {removingId === deviceId(device) ? <ActivityIndicator color={settingsColors.grad1} /> : <Text style={styles.removeText}>Remove</Text>}
          </TouchableOpacity>
        </View>
      ))}
    </SettingsDetailScreen>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 90, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(8,81,97,0.1)', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#E9F6FE', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  name: { color: '#252525', fontSize: 15, fontWeight: '900' },
  meta: { color: '#58727A', fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 4 },
  status: { color: '#11a26f', fontSize: 12, fontWeight: '900', marginTop: 5 },
  statusWarn: { color: '#B42318' },
  remove: { minHeight: 38, borderRadius: 999, backgroundColor: '#E9F6FE', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, minWidth: 78 },
  removeText: { color: settingsColors.grad1, fontSize: 12, fontWeight: '900' },
  retryPanel: { gap: 10 },
  retryButton: { minHeight: 44, borderRadius: 14, backgroundColor: settingsColors.grad1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '900' },
});
