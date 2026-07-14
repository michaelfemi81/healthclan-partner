import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiStateCard } from '../../components/api-state';
import { CardEntryForm } from '../../components/card-entry-form';
import { emitPartnerRefresh, subscribePartnerRefresh } from '../../lib/app-events';
import { partnerApi } from '../../lib/api';

const grad1 = '#085161';
const grad2 = '#11a2c1';

function requestTimestamp(request: any) {
  const raw = request?.createdAt || request?.updatedAt || request?.requestedAt || request?.date;
  const date = new Date(raw || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatPreferredDate(request: any) {
  const raw = request?.preferredDate || request?.preferredTime;
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Preferred date not specified';
  return date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatDuration(request: any) {
  const fallbackLabels: Record<string, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    all_night: 'All Night',
    full_day: 'Full Day',
    custom: 'Custom',
    six_hours_daycare: '6 hours daycare',
    eight_hours_daycare: '8 hours daycare',
    ten_hours_daycare: '10 hours daycare',
    twelve_hours_daycare: '12 hours daycare',
    live_in_24_7: '24/7 live in care',
    overnight_care: 'Overnight care',
  };
  const label = request?.durationLabel || fallbackLabels[request?.durationType] || 'Not specified';
  const hours = request?.numberOfHours ? `, ${request.numberOfHours} hour${Number(request.numberOfHours) === 1 ? '' : 's'}` : '';
  return `${label}${hours}`;
}

function detailText(value: unknown, fallback = 'Not provided') {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || fallback;
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).filter(item => typeof item === 'string' && item.trim()).join(', ') || fallback;
  }
  return String(value || '').trim() || fallback;
}

function requestName(request: any) {
  return request?.patientName || request?.careRecipient?.name || request?.contact?.name || 'HealthClan patient';
}

export default function CareRequests() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [careRequests, setCareRequests] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [paidRequestIds, setPaidRequestIds] = useState<string[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [receipt, setReceipt] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [loadingCards, setLoadingCards] = useState(true);
  const [loadError, setLoadError] = useState('');
  const sortedCareRequests = useMemo(
    () => [...careRequests].sort((first, second) => requestTimestamp(second) - requestTimestamp(first)),
    [careRequests],
  );
  const selected = selectedId ? careRequests.find(request => request._id === selectedId) : null;
  const selectedUnlocked = Boolean(selected?.contactUnlocked || paidRequestIds.includes(selected?._id));
  const defaultCard = cards.find(card => card.isDefault) || cards[0];
  const cardSaved = Boolean(defaultCard);

  const selectRequest = async (request: any) => {
    if (!request?._id) return;

    setSelectedId(request._id);
    setReceipt('');
    setLoadingSelected(true);

    try {
      const latest = await partnerApi.careRequest(request._id);
      setCareRequests(current => current.map(item => item._id === request._id ? { ...item, ...latest, patientStatus: 'viewed' } : item));
    } catch {
      setCareRequests(current => current.map(item => item._id === request._id ? { ...item, patientStatus: 'viewed' } : item));
    } finally {
      setLoadingSelected(false);
    }
  };

  const handleCardSaved = async (card: any) => {
    const latestCards = await partnerApi.cards().catch(() => card ? [card] : []);
    setCards(Array.isArray(latestCards) ? latestCards : []);
    emitPartnerRefresh('cards', 'card-saved', latestCards);
    emitPartnerRefresh('payments', 'card-saved', latestCards);
    setReceipt('Card verified by Stripe and saved. You can now unlock requester phone and email.');
  };

  const unlockRequest = async () => {
    if (unlocking) return;

    if (!selected || selectedUnlocked) {
      if (!selected) setReceipt('Select a care request before unlocking.');
      return;
    }

    if (!selected._id) {
      setReceipt('Selected care request is invalid.');
      return;
    }

    if (!defaultCard?._id) {
      setReceipt('Add a saved card first, then pay only to unlock the requester phone and email.');
      return;
    }

    setUnlocking(true);

    try {
      const payment = await partnerApi.chargeSavedCard({
        cardId: defaultCard._id,
        purpose: 'lead_unlock',
        careRequest: selected._id,
      });

      if (payment?._id) {
        await partnerApi.unlockCareRequest(selected._id, payment._id).catch(() => null);
      }

      const unlocked = await partnerApi.careRequest(selected._id).catch(() => selected);

      setCareRequests(current => current.map(request => request._id === selected._id ? { ...request, ...unlocked } : request));
      setPaidRequestIds(current => [...new Set([...current, selected._id])]);
      setReceipt('Payment successful. Requester phone and email unlocked.');
      emitPartnerRefresh('careRequests', 'care-request-unlocked', unlocked);
      emitPartnerRefresh('payments', 'care-request-unlocked', payment);
      emitPartnerRefresh('notifications', 'care-request-unlocked', unlocked);
      emitPartnerRefresh('dashboard', 'care-request-unlocked', unlocked);
    } catch (error) {
      setReceipt(error instanceof Error ? error.message : 'Unable to unlock care patient information.');
    } finally {
      setUnlocking(false);
    }
  };

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadCareRequests = useCallback(() => {
    setLoadingRequests(true);
    partnerApi.careRequests()
      .then(items => {
        setCareRequests(Array.isArray(items) ? items : []);
        setSelectedId('');
        setLoadError('');
      })
      .catch(() => {
        setCareRequests([]);
        setLoadError('Unable to load care requests from HealthClan.');
      })
      .finally(() => setLoadingRequests(false));
  }, []);

  const loadCards = useCallback(() => {
    setLoadingCards(true);
    partnerApi.cards()
      .then(setCards)
      .catch(() => setCards([]))
      .finally(() => setLoadingCards(false));
  }, []);

  useFocusEffect(useCallback(() => {
    loadCareRequests();
    loadCards();
  }, [loadCards, loadCareRequests]));

  useEffect(() => subscribePartnerRefresh(['careRequests', 'cards', 'payments'], event => {
    if (event.topic === 'cards' || event.topic === 'payments') loadCards();
    if (event.topic === 'careRequests' || event.topic === 'payments') loadCareRequests();
  }), [loadCards, loadCareRequests]);

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 116 }]}>
        <LinearGradient colors={[grad1, grad2]} style={styles.header}>
          <Text style={styles.kicker}>Care requests</Text>
          <Text style={styles.title}>Care information leads</Text>
          <Text style={styles.subtitle}>Clients request care support for free. Pending doctor partners can still work as care partners and only pay when they unlock requester information.</Text>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Requests</Text>
        <View style={styles.requestList}>
          {loadingRequests ? (
            <ApiStateCard loading title="Loading care requests" message="Fetching open care leads from HealthClan." />
          ) : loadError ? (
            <ApiStateCard icon="cloud-offline-outline" title="Care requests unavailable" message={loadError} />
          ) : !sortedCareRequests.length ? (
            <ApiStateCard icon="heart-outline" title="No open care requests" message="When patients submit care support requests, they will appear here from the backend." />
          ) : sortedCareRequests.map(request => {
            const active = request._id === selectedId;
            const unlocked = Boolean(request.contactUnlocked || paidRequestIds.includes(request._id));
            const status = unlocked ? 'Contact unlocked' : 'Contact locked';

            return (
              <TouchableOpacity
                key={request._id}
                activeOpacity={0.76}
                onPress={() => selectRequest(request)}
                style={[styles.requestCard, active && styles.requestCardActive]}
              >
                <View style={styles.requestTop}>
                  <View style={styles.requestIcon}>
                    <Ionicons name={unlocked ? 'people-outline' : 'lock-closed-outline'} size={20} color={grad1} />
                  </View>
                  <View style={styles.requestText}>
                    <Text style={styles.client}>{requestName(request)}</Text>
                    <Text style={styles.service}>{request.careType || request.serviceType || 'Home care support'}</Text>
                    <Text style={styles.visibleMeta}>{formatPreferredDate(request)}</Text>
                    <Text style={styles.visibleMeta}>Duration: {formatDuration(request)}</Text>
                  </View>
                  <Text style={styles.amount}>Unlock</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'Recently requested'}</Text>
                  <Text style={[styles.status, !unlocked && styles.lockedStatus]}>{status}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Request details</Text>
        <View style={styles.detailCard}>
          {!selected ? (
            <ApiStateCard icon="document-lock-outline" title="No request selected" message="Select an open care request to view its locked details." />
          ) : (
          <>
          {!selectedUnlocked && (
            <View style={styles.lockNotice}>
              <Ionicons name="lock-closed-outline" size={19} color={grad1} />
              <Text style={styles.lockNoticeText}>{loadingSelected ? 'Opening care request...' : 'Requester phone and email are hidden. Add a card and pay only when you want to contact this requester.'}</Text>
            </View>
          )}

          <Text style={styles.label}>Client</Text>
          <Text style={styles.readonly}>{requestName(selected)}</Text>
          <Text style={styles.label}>Care type</Text>
          <Text style={styles.readonly}>{detailText(selected?.careType || selected?.serviceType).replace(/_/g, ' ')}</Text>
          <Text style={styles.label}>Preferred date</Text>
          <Text style={styles.readonly}>{formatPreferredDate(selected)}</Text>
          <Text style={styles.label}>Duration</Text>
          <Text style={styles.readonly}>{formatDuration(selected)}</Text>
          <Text style={styles.label}>Date of birth</Text>
          <Text style={styles.readonly}>{detailText(selected?.dateOfBirth)}</Text>
          <Text style={styles.label}>Gender at birth</Text>
          <Text style={styles.readonly}>{selected?.genderAtBirth ? String(selected.genderAtBirth).replace(/_/g, ' ') : 'Not provided'}</Text>
          <Text style={styles.label}>Chronic illnesses</Text>
          <Text style={styles.readonly}>{detailText(selected?.chronicIllnesses, 'None provided')}</Text>
          <Text style={styles.label}>Chronic medication</Text>
          <Text style={styles.readonly}>{detailText(selected?.chronicMedication, 'None provided')}</Text>
          <Text style={styles.label}>Allergies</Text>
          <Text style={styles.readonly}>{detailText(selected?.allergies, 'None provided')}</Text>
          <Text style={styles.label}>Care location</Text>
          <Text style={styles.readonly}>{detailText(selected?.location)}</Text>
          <Text style={styles.label}>Care notes</Text>
          <Text style={styles.readonly}>{detailText(selected?.notes || selected?.description)}</Text>
          <Text style={styles.label}>Medical consent</Text>
          <Text style={styles.readonly}>{selected?.medicalConsent?.accepted ? selected.medicalConsent.text || 'Consent accepted' : 'Consent not recorded'}</Text>
          <Text style={styles.label}>Requester</Text>
          <Text style={styles.readonly}>{selected?.contact?.name || 'Requester'}</Text>
          <Text style={styles.label}>Requester phone</Text>
          <LockedValue value={selected?.contact?.phone || 'Hidden'} unlocked={selectedUnlocked} />
          <Text style={styles.label}>Requester email</Text>
          <LockedValue value={selected?.contact?.email || 'Hidden'} unlocked={selectedUnlocked} />

          {!selectedUnlocked && (
            <View style={styles.paymentBox}>
              <View style={styles.paymentHeader}>
                <View style={styles.cardIcon}>
                  <Ionicons name="card-outline" size={19} color={grad1} />
                </View>
                <View style={styles.paymentText}>
                  <Text style={styles.paymentTitle}>{cardSaved ? 'Payment card ready' : 'Add payment card'}</Text>
                  <Text style={styles.paymentSubtitle}>{cardSaved ? 'Card will be charged only when you unlock this requester’s contact details' : 'Required before unlocking requester phone and email'}</Text>
                </View>
                <Text style={styles.cardStatus}>{cardSaved ? 'Saved' : 'Needed'}</Text>
              </View>
              <Text style={styles.readonly}>
                {loadingCards ? 'Checking saved cards...' : cardSaved ? `${defaultCard.brand || 'Card'} ending ${defaultCard.last4 || '----'}` : 'No saved card found'}
              </Text>
              {!loadingCards && !cardSaved ? (
                <CardEntryForm
                  onSaved={handleCardSaved}
                  onMessage={setReceipt}
                  buttonTitle="Save card"
                />
              ) : null}
              {cardSaved ? <Text style={styles.savedCardHint}>Add or manage other cards in Settings.</Text> : null}
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.payButton, selectedUnlocked && styles.paidButton, (((!selectedUnlocked && (!cardSaved || loadingCards)) || unlocking) && styles.disabledPayButton)]}
              onPress={unlockRequest}
              disabled={unlocking || selectedUnlocked || loadingCards}
            >
              {unlocking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name={selectedUnlocked ? 'checkmark-circle-outline' : 'card-outline'} size={18} color="#fff" />
              )}
              <Text style={styles.payText}>{unlocking ? 'Unlocking contact' : selectedUnlocked ? 'Contact unlocked' : cardSaved ? 'Pay to unlock contact' : 'Add card to unlock contact'}</Text>
            </TouchableOpacity>
          </View>

          {!!receipt && <Text style={styles.receipt}>{receipt}</Text>}
          </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function LockedValue({ value, unlocked }: { value: string; unlocked: boolean }) {
  if (unlocked) {
    return <Text style={styles.readonly}>{value}</Text>;
  }

  return (
    <View style={[styles.readonly, styles.lockedValue]}>
      <View style={[styles.blurBar, { width: '78%' }]} />
      <View style={[styles.blurBar, { width: '54%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E9F6FE' },
  content: { paddingHorizontal: 18 },
  header: { minHeight: 226, borderRadius: 24, padding: 22, justifyContent: 'center' },
  kicker: { color: 'rgba(255,255,255,0.84)', fontSize: 13, fontWeight: '900' },
  title: { color: '#fff', fontSize: 31, lineHeight: 37, fontWeight: '900', marginTop: 8 },
  subtitle: { color: '#fff', fontSize: 15, lineHeight: 22, fontWeight: '700', marginTop: 12, opacity: 0.92 },
  sectionTitle: { color: '#252525', fontSize: 19, fontWeight: '900', marginTop: 22, marginBottom: 12 },
  requestList: { gap: 10 },
  requestCard: { borderRadius: 18, backgroundColor: '#fff', padding: 14, borderWidth: 1, borderColor: 'transparent' },
  requestCardActive: { borderColor: 'rgba(8,81,97,0.24)' },
  requestTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  requestIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(19, 202, 214, 0.12)', alignItems: 'center', justifyContent: 'center' },
  requestText: { flex: 1, minWidth: 0 },
  client: { color: '#252525', fontSize: 15, fontWeight: '900' },
  blurredName: { minHeight: 37, justifyContent: 'center', gap: 6 },
  blurBar: { height: 9, borderRadius: 999, backgroundColor: 'rgba(88,114,122,0.22)' },
  service: { color: '#58727A', fontSize: 12, fontWeight: '700', marginTop: 4 },
  visibleMeta: { color: grad1, fontSize: 11, lineHeight: 16, fontWeight: '900', marginTop: 3 },
  amount: { color: grad1, fontSize: 15, fontWeight: '900' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12 },
  metaText: { color: '#58727A', fontSize: 12, fontWeight: '800' },
  status: { color: grad1, fontSize: 12, fontWeight: '900' },
  lockedStatus: { color: '#C17C12' },
  detailCard: { borderRadius: 20, backgroundColor: '#fff', padding: 16 },
  lockNotice: { minHeight: 58, borderRadius: 16, backgroundColor: 'rgba(19, 202, 214, 0.12)', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  lockNoticeText: { flex: 1, minWidth: 0, color: grad1, fontSize: 12, lineHeight: 17, fontWeight: '900' },
  label: { color: grad1, fontSize: 12, fontWeight: '900', marginTop: 12, marginBottom: 6 },
  readonly: { minHeight: 44, borderRadius: 14, backgroundColor: '#E9F6FE', color: '#252525', fontSize: 14, fontWeight: '800', paddingHorizontal: 12, paddingTop: 12 },
  lockedValue: { justifyContent: 'center', gap: 7, paddingTop: 0 },
  input: { minHeight: 44, borderRadius: 14, backgroundColor: '#E9F6FE', color: '#252525', fontSize: 14, fontWeight: '800', paddingHorizontal: 12 },
  lockedInput: { color: '#58727A' },
  paymentBox: { borderRadius: 16, backgroundColor: 'rgba(19, 202, 214, 0.08)', padding: 12, gap: 10, marginTop: 14 },
  paymentHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  paymentText: { flex: 1, minWidth: 0 },
  paymentTitle: { color: '#252525', fontSize: 13, fontWeight: '900' },
  paymentSubtitle: { color: '#58727A', fontSize: 11, lineHeight: 16, fontWeight: '800', marginTop: 3 },
  cardStatus: { color: grad1, fontSize: 11, fontWeight: '900' },
  savedCardHint: { color: '#58727A', fontSize: 11, lineHeight: 16, fontWeight: '800', textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  payButton: { flex: 1, minHeight: 50, borderRadius: 16, backgroundColor: grad1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  paidButton: { backgroundColor: '#11a26f' },
  disabledPayButton: { opacity: 0.58 },
  payText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  secondaryButton: { flex: 1, minHeight: 50, borderRadius: 16, backgroundColor: 'rgba(19, 202, 214, 0.12)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  savedCardButton: { backgroundColor: 'rgba(17, 162, 111, 0.12)' },
  disabledButton: { opacity: 0.42 },
  secondaryText: { color: grad1, fontSize: 13, fontWeight: '900' },
  receipt: { color: '#11a26f', fontSize: 13, fontWeight: '900', marginTop: 12, textAlign: 'center' },
});
