import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, useColorScheme, View } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { DoctorVerificationProvider } from '../../contexts/doctor-verification';
import { emitPartnerRefresh, type PartnerRefreshTopic } from '../../lib/app-events';
import { getRealtimeUrl, partnerApi } from '../../lib/api';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState('pending');
  const approved = verificationStatus === 'approved' && accountStatus === 'active';

  const refreshVerification = useCallback(async () => {
    const payload = await partnerApi.profile();
    setVerificationStatus(payload?.profile?.verificationStatus || 'pending');
    setAccountStatus(payload?.user?.status || 'pending');
  }, []);

  useEffect(() => {
    refreshVerification()
      .catch(() => setVerificationStatus('pending'));
  }, [refreshVerification]);

  useEffect(() => {
    let closed = false;
    let source: EventSource | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    const refresh = (topic: PartnerRefreshTopic = 'verification', reason?: string) => {
      if (closed) return;
      emitPartnerRefresh(topic, reason);
      refreshVerification().catch(() => null);
    };

    const topicsForRealtimeType = (type?: string): PartnerRefreshTopic[] => {
      if (!type) return ['all'];
      if (type.includes('availability')) return ['availability', 'appointments', 'notifications', 'dashboard'];
      if (type.startsWith('appointment') || type === 'consultation_notes') return ['appointments', 'notifications', 'dashboard'];
      if (type.startsWith('payment') || type.startsWith('card') || type.startsWith('payout') || type === 'lead_unlocked') return ['payments', 'cards', 'careRequests', 'notifications', 'dashboard'];
      if (type.startsWith('care_request')) return ['careRequests', 'notifications', 'dashboard'];
      if (type.includes('support')) return ['support', 'notifications'];
      if (type.startsWith('notification')) return ['notifications'];
      if (type.includes('device')) return ['devices', 'notifications'];
      if (type.includes('preference')) return ['preferences'];
      if (type.includes('profile') || type.includes('account') || type.includes('document') || type.includes('verification') || type.includes('approval')) return ['profile', 'verification', 'notifications', 'dashboard'];
      return ['notifications', 'dashboard'];
    };

    getRealtimeUrl()
      .then((url) => {
        if (closed || typeof EventSource === 'undefined') return;

        source = new EventSource(url);
        const handleUpdate = (event?: MessageEvent) => {
          const type = event?.type;
          topicsForRealtimeType(type).forEach(topic => refresh(topic, type));
        };

        source.addEventListener('partner.approval.updated', handleUpdate);
        source.addEventListener('account.status.updated', handleUpdate);
        source.addEventListener('document.updated', handleUpdate);
        source.addEventListener('document.requested', handleUpdate);
        source.addEventListener('appointment.updated', handleUpdate);
        source.addEventListener('appointment.created', handleUpdate);
        source.addEventListener('availability_update', handleUpdate);
        source.addEventListener('availability.updated', handleUpdate);
        source.addEventListener('payment.updated', handleUpdate);
        source.addEventListener('card.updated', handleUpdate);
        source.addEventListener('care_request.updated', handleUpdate);
        source.addEventListener('notification.created', handleUpdate);
        source.addEventListener('trusted_device.updated', handleUpdate);
        source.addEventListener('message', (event) => {
          try {
            const payload = JSON.parse(event.data || '{}');
            topicsForRealtimeType(payload.type).forEach(topic => refresh(topic, payload.type));
          } catch {
            return;
          }
        });
        source.onerror = () => {
          source?.close();
          source = null;
        };
      })
      .catch(() => null);

    interval = setInterval(() => refresh('all', 'poll'), 20000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh('all', 'app-active');
    });

    return () => {
      closed = true;
      source?.close();
      if (interval) clearInterval(interval);
      subscription.remove();
    };
  }, [refreshVerification]);

  const providerValue = useMemo(
    () => ({
      approved,
      verificationStatus: verificationStatus || 'pending',
      accountStatus,
      refreshVerification,
    }),
    [accountStatus, approved, refreshVerification, verificationStatus],
  );

  if (!verificationStatus) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#085161" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <DoctorVerificationProvider {...providerValue}>
        <AppTabs />
      </DoctorVerificationProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9F6FE',
  },
});
