import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiStateCard } from '../../components/api-state';
import { useDoctorVerification } from '../../contexts/doctor-verification';
import { emitPartnerRefresh, subscribePartnerRefresh } from '../../lib/app-events';
import { partnerApi } from '../../lib/api';

const grad1 = '#085161';
const grad2 = '#11a2c1';
const statuses = ['all', 'requested', 'pending_payment', 'confirmed', 'completed', 'cancelled', 'rejected'] as const;
const INITIAL_DATE_OFFSET = 180;
const DATE_ITEM_WIDTH = 86;
const DATE_PILL_WIDTH = 76;
const DATE_BATCH_SIZE = 45;

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDayItem(date: Date) {
    return {
      key: date.toDateString(),
      day: date.getDate(),
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      longLabel: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      full: date,
    };
}

function buildDays(centerDate: Date, pastDays = INITIAL_DATE_OFFSET, futureDays = INITIAL_DATE_OFFSET) {
  return Array.from({ length: pastDays + futureDays + 1 }, (_, index) => toDayItem(addDays(centerDate, index - pastDays)));
}

function getAppointmentDate(appointment: any) {
  const raw = appointment?.startTime || appointment?.scheduledAt || appointment?.appointmentDate || appointment?.date;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function appointmentTimestamp(appointment: any) {
  return getAppointmentDate(appointment)?.getTime() || new Date(appointment?.createdAt || 0).getTime() || 0;
}

function dateKey(value?: string | Date | null) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toDateString();
}

function formatTime(value?: string) {
  if (!value) return 'Scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Scheduled';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatStatus(value?: string) {
  return String(value || 'scheduled').replace(/_/g, ' ');
}

function statusColor(value?: string) {
  if (value === 'confirmed') return '#0F8F62';
  if (value === 'requested') return '#8A5BDE';
  if (value === 'pending_payment') return '#B36B00';
  if (value === 'completed') return '#4863D9';
  if (value === 'cancelled' || value === 'rejected') return '#D0475A';
  return grad1;
}

function patientName(appointment: any) {
  return appointment?.patient?.fullName || [appointment?.patient?.firstName, appointment?.patient?.lastName].filter(Boolean).join(' ') || 'Patient';
}

function normalizeAppointmentResponse(response: any) {
  return response?.appointment || response?.data?.appointment || response?.data || response;
}

export default function CalendarScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { approved } = useDoctorVerification();
  const { width } = useWindowDimensions();
  const today = useMemo(() => startOfDay(), []);
  const dateListRef = useRef<FlatList<ReturnType<typeof toDayItem>> | null>(null);
  const dateListCentered = useRef(false);
  const dateListPrepending = useRef(false);
  const [dateListWidth, setDateListWidth] = useState(0);
  const [days, setDays] = useState(() => buildDays(today));
  const [selectedDay, setSelectedDay] = useState(today.toDateString());
  const [statusFilter, setStatusFilter] = useState<(typeof statuses)[number]>('all');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actingId, setActingId] = useState('');
  const isWide = Platform.OS === 'web' && width >= 900;
  const dateSidePadding = Math.max((dateListWidth - DATE_PILL_WIDTH) / 2, 0);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadAppointments = useCallback(() => {
    setLoading(true);
    setLoadError('');
    partnerApi.appointments()
      .then(items => {
        setAppointments(Array.isArray(items) ? items : []);
        setLoadError('');
      })
      .catch(error => {
        setAppointments([]);
        setLoadError(error instanceof Error ? error.message : 'Unable to load your appointment calendar from HealthClan.');
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(loadAppointments);

  useEffect(() => subscribePartnerRefresh(['appointments', 'availability', 'payments', 'profile'], () => {
    loadAppointments();
  }), [loadAppointments]);

  async function respondToRequest(id: string, action: 'accept' | 'reject') {
    if (!id || actingId) return;
    if (!approved) {
      setActionMessage('Admin verification is required before updating appointment requests.');
      return;
    }

    setActingId(id);
    setActionMessage('');

    try {
      const response = action === 'accept'
        ? await partnerApi.acceptAppointment(id)
        : await partnerApi.rejectAppointment(id);
      const updated = normalizeAppointmentResponse(response);
      const freshResponse = await partnerApi.appointment(id).catch(() => updated);
      const freshAppointment = normalizeAppointmentResponse(freshResponse) || updated;

      setAppointments(current => current.map(item => item._id === id ? freshAppointment : item));
      setActionMessage(action === 'accept' ? 'Appointment request accepted. Patient has been notified to pay.' : 'Appointment request rejected. Patient has been notified.');
      emitPartnerRefresh('appointments', `appointment-${action}`, freshAppointment);
      emitPartnerRefresh('notifications', `appointment-${action}`, freshAppointment);
      emitPartnerRefresh('dashboard', `appointment-${action}`, freshAppointment);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Unable to update appointment request.');
    } finally {
      setActingId('');
    }
  }

  const selected = days.find(day => day.key === selectedDay) ?? days.find(day => day.key === dateKey(new Date())) ?? days[0];
  const appointmentsForDay = useMemo(
    () => appointments
      .filter(item => {
        const itemKey = dateKey(getAppointmentDate(item));
        if (!itemKey) return selectedDay === days[0].key;
        return itemKey === selectedDay;
      })
      .sort((first, second) => appointmentTimestamp(second) - appointmentTimestamp(first)),
    [appointments, days, selectedDay],
  );
  const visibleAppointments = useMemo(
    () => statusFilter === 'all' ? appointmentsForDay : appointmentsForDay.filter(item => item.status === statusFilter),
    [appointmentsForDay, statusFilter],
  );
  const nextAppointment = [...appointmentsForDay]
    .filter(item => (getAppointmentDate(item)?.getTime() || 0) >= Date.now())
    .sort((first, second) => appointmentTimestamp(first) - appointmentTimestamp(second))[0] || appointmentsForDay[0];
  const requested = appointmentsForDay.filter(item => item.status === 'requested').length;
  const confirmed = appointmentsForDay.filter(item => item.status === 'confirmed').length;
  const pendingPayments = appointmentsForDay.filter(item => item.status === 'pending_payment').length;
  const completed = appointmentsForDay.filter(item => item.status === 'completed').length;

  useEffect(() => {
    if (days.some(day => day.key === selectedDay)) return;
    setSelectedDay(days.find(day => day.key === dateKey(new Date()))?.key || days[0]?.key || '');
  }, [days, selectedDay]);

  function centerToday() {
    if (dateListCentered.current || dateListWidth <= 0) return;
    dateListCentered.current = true;

    requestAnimationFrame(() => {
      dateListRef.current?.scrollToOffset({
        offset: INITIAL_DATE_OFFSET * DATE_ITEM_WIDTH,
        animated: false,
      });
    });
  }

  function loadMoreFutureDays() {
    setDays(current => {
      const last = current[current.length - 1]?.full || today;
      return [...current, ...Array.from({ length: DATE_BATCH_SIZE }, (_, index) => toDayItem(addDays(last, index + 1)))];
    });
  }

  function loadMorePastDays(offsetX: number) {
    if (dateListPrepending.current) return;
    dateListPrepending.current = true;

    setDays(current => {
      const first = current[0]?.full || today;
      return [
        ...Array.from({ length: DATE_BATCH_SIZE }, (_, index) => toDayItem(addDays(first, index - DATE_BATCH_SIZE))),
        ...current,
      ];
    });

    requestAnimationFrame(() => {
      dateListRef.current?.scrollToOffset({
        offset: offsetX + (DATE_BATCH_SIZE * DATE_ITEM_WIDTH),
        animated: false,
      });
      dateListPrepending.current = false;
    });
  }

  function handleDateScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const offsetX = event.nativeEvent.contentOffset.x;
    if (offsetX < DATE_ITEM_WIDTH * 3) loadMorePastDays(offsetX);
  }

  useEffect(() => {
    dateListCentered.current = false;
    centerToday();
  }, [dateListWidth]);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          isWide && styles.contentWide,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 112 },
        ]}
      >
        <LinearGradient colors={[grad1, grad2]} style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.kicker}>Calendar</Text>
              <Text style={styles.title}>Appointment calendar</Text>
            </View>
            <View style={styles.headerIcon}>
              <Ionicons name="calendar-outline" size={24} color="#fff" />
            </View>
          </View>
          <Text style={styles.subtitle}>
            {appointmentsForDay.length} appointment{appointmentsForDay.length === 1 ? '' : 's'} for {selected.longLabel}
          </Text>
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>{requested}</Text>
              <Text style={styles.headerStatLabel}>Requests</Text>
            </View>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>{pendingPayments}</Text>
              <Text style={styles.headerStatLabel}>Payment follow-up</Text>
            </View>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>{completed}</Text>
              <Text style={styles.headerStatLabel}>Completed</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.nextPanel}>
          <View style={styles.nextIcon}>
            <Ionicons name="alarm-outline" size={21} color={grad1} />
          </View>
          <View style={styles.nextText}>
            <Text style={styles.nextLabel}>Next appointment</Text>
            <Text style={styles.nextTitle}>
              {nextAppointment ? `${formatTime(getAppointmentDate(nextAppointment)?.toISOString())} with ${patientName(nextAppointment)}` : 'No appointment selected for this day'}
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.75} style={styles.nextButton} onPress={() => router.push('/availability' as any)}>
            <Ionicons name="time-outline" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarRail}>
          <FlatList
            ref={dateListRef}
            horizontal
            data={days}
            keyExtractor={item => item.key}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={INITIAL_DATE_OFFSET}
            getItemLayout={(_, index) => ({ length: DATE_ITEM_WIDTH, offset: DATE_ITEM_WIDTH * index, index })}
            onLayout={({ nativeEvent }) => setDateListWidth(nativeEvent.layout.width)}
            onContentSizeChange={centerToday}
            onScroll={handleDateScroll}
            scrollEventThrottle={32}
            onScrollToIndexFailed={() => setTimeout(centerToday, 80)}
            onEndReached={loadMoreFutureDays}
            onEndReachedThreshold={0.55}
            contentContainerStyle={[styles.dayList, { paddingLeft: dateSidePadding, paddingRight: dateSidePadding }]}
            renderItem={({ item: day }) => {
              const active = day.key === selectedDay;
              const count = appointments.filter(item => dateKey(getAppointmentDate(item)) === day.key).length;

              return (
                <TouchableOpacity
                  activeOpacity={0.78}
                  onPress={() => {
                    setSelectedDay(day.key);
                    setStatusFilter('all');
                  }}
                  style={[styles.dayPill, active && styles.dayPillActive]}
                >
                  <Text style={[styles.dayLabel, active && styles.dayTextActive]}>{day.label}</Text>
                  <Text style={[styles.dayNumber, active && styles.dayTextActive]}>{day.day}</Text>
                  <Text style={[styles.dayMonth, active && styles.dayTextActive]}>{dateKey(day.full) === dateKey(today) ? 'Today' : day.month}</Text>
                  {!!count && <View style={[styles.dayCount, active && styles.dayCountActive]}><Text style={[styles.dayCountText, active && styles.dayCountTextActive]}>{count}</Text></View>}
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {statuses.map(status => {
            const active = statusFilter === status;
            const count = status === 'all' ? appointmentsForDay.length : appointmentsForDay.filter(item => item.status === status).length;

            return (
              <TouchableOpacity key={status} activeOpacity={0.75} style={[styles.filterButton, active && styles.filterButtonActive]} onPress={() => setStatusFilter(status)}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{formatStatus(status)}</Text>
                <Text style={[styles.filterCount, active && styles.filterTextActive]}>{count}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>{selected.longLabel}</Text>
            <Text style={styles.pageSubtitle}>{visibleAppointments.length} visible appointments</Text>
          </View>
          <TouchableOpacity style={styles.patientButton} onPress={() => router.push('/availability' as any)}>
            <Ionicons name="time-outline" size={16} color={grad1} />
            <Text style={styles.patientButtonText}>Availability</Text>
          </TouchableOpacity>
        </View>
        {!!actionMessage && <Text style={styles.actionMessage}>{actionMessage}</Text>}

        <View style={[styles.appointmentGrid, isWide && styles.appointmentGridWide]}>
          {loading ? (
            <ApiStateCard loading title="Loading calendar" message="Fetching appointments from the backend." />
          ) : loadError ? (
            <View style={styles.retryPanel}>
              <ApiStateCard icon="cloud-offline-outline" title="Calendar unavailable" message={loadError} />
              <TouchableOpacity activeOpacity={0.75} style={styles.retryButton} onPress={loadAppointments}>
                <Ionicons name="refresh-outline" size={16} color="#fff" />
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : !appointmentsForDay.length ? (
            <ApiStateCard icon="calendar-clear-outline" title="No appointments on this day" message="Patient bookings for this date will appear here with status and visit details." />
          ) : !visibleAppointments.length ? (
            <ApiStateCard icon="filter-outline" title="No appointments match this filter" message="Change the status filter to see the rest of this day’s schedule." />
          ) : visibleAppointments.map(appointment => {
            const appointmentDate = getAppointmentDate(appointment);
            const patient = patientName(appointment);
            const color = statusColor(appointment.status);
            return (
            <TouchableOpacity
              key={appointment._id}
              activeOpacity={0.76}
              style={styles.appointmentCard}
              onPress={() => router.push({ pathname: '/video-room', params: { appointmentId: appointment._id } } as any)}
            >
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{patient.charAt(0)}</Text>
                </View>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.patient}>{patient}</Text>
                  <Text style={styles.type}>{appointment.service?.name || 'Consultation'} | Video consultation</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: `${color}1F` }]}>
                  <Text style={[styles.status, { color }]}>{formatStatus(appointment.status)}</Text>
                </View>
              </View>
              <View style={styles.timelineRow}>
                <View style={[styles.timelineDot, { backgroundColor: color }]} />
                <View style={styles.metaBlock}>
                  <Text style={styles.time}>{formatTime(appointmentDate?.toISOString())}</Text>
                  <Text style={styles.dateText}>{appointmentDate ? appointmentDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) : 'Date to be confirmed'}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoPill}>
                  <Ionicons name="card-outline" size={15} color={grad1} />
                  <Text style={styles.infoText}>{formatStatus(appointment.paymentStatus || appointment.status)}</Text>
                </View>
                <View style={styles.infoPill}>
                  <Ionicons name="person-outline" size={15} color={grad1} />
                  <Text style={styles.infoText}>{appointment.patient?.phone ? 'Contact added' : 'Patient profile'}</Text>
                </View>
              </View>
              <Text style={styles.note}>{appointment.reasonForVisit || 'No visit reason added yet.'}</Text>
              {appointment.status === 'requested' ? (
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={[styles.requestActionButton, styles.acceptButton, !approved && styles.buttonDisabled]}
                    onPress={() => respondToRequest(appointment._id, 'accept')}
                    disabled={actingId === appointment._id || !approved}
                  >
                    {actingId === appointment._id ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptText}>{approved ? 'Accept' : 'Verify first'}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={[styles.requestActionButton, styles.rejectButton, !approved && styles.buttonDisabled]}
                    onPress={() => respondToRequest(appointment._id, 'reject')}
                    disabled={actingId === appointment._id || !approved}
                  >
                    {actingId === appointment._id ? <ActivityIndicator color="#D0475A" /> : <Text style={styles.rejectText}>{approved ? 'Reject' : 'Locked'}</Text>}
                  </TouchableOpacity>
                </View>
              ) : null}
              <TouchableOpacity activeOpacity={0.75} style={styles.cardAction} onPress={() => router.push({ pathname: '/video-room', params: { appointmentId: appointment._id } } as any)}>
                <Ionicons name="videocam-outline" size={16} color={grad1} />
                <Text style={styles.cardActionText}>{appointment.status === 'confirmed' ? 'Open video room' : 'Open appointment'}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )})}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E9F6FE',
  },
  content: {
    paddingHorizontal: 18,
  },
  contentWide: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
  },
  header: {
    minHeight: 238,
    borderRadius: 22,
    padding: 22,
    justifyContent: 'space-between',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 18,
  },
  kicker: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '900',
  },
  title: {
    color: '#fff',
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '900',
    marginTop: 8,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  subtitle: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    marginTop: 24,
    opacity: 0.92,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  headerStat: {
    flex: 1,
    minHeight: 68,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    padding: 12,
  },
  headerStatValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  headerStatLabel: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  calendarRail: {
    marginTop: 16,
  },
  dayList: {
    gap: 10,
    paddingBottom: 16,
  },
  dayPill: {
    width: 76,
    minHeight: 96,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    position: 'relative',
  },
  dayPillActive: {
    backgroundColor: grad1,
  },
  dayLabel: {
    color: '#58727A',
    fontSize: 12,
    fontWeight: '800',
  },
  dayNumber: {
    color: '#252525',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  dayMonth: {
    color: grad1,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  dayTextActive: {
    color: '#fff',
  },
  dayCount: {
    position: 'absolute',
    right: 8,
    top: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(19, 202, 214, 0.16)',
    paddingHorizontal: 5,
  },
  dayCountActive: {
    backgroundColor: '#fff',
  },
  dayCountText: {
    color: grad1,
    fontSize: 10,
    fontWeight: '900',
  },
  dayCountTextActive: {
    color: grad1,
  },
  nextPanel: {
    minHeight: 78,
    borderRadius: 18,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginTop: 14,
  },
  nextIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(19, 202, 214, 0.12)',
  },
  nextText: {
    flex: 1,
    minWidth: 0,
  },
  nextLabel: {
    color: grad1,
    fontSize: 12,
    fontWeight: '900',
  },
  nextTitle: {
    color: '#252525',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    marginTop: 3,
  },
  nextButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: grad1,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 16,
  },
  filterButton: {
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(8,81,97,0.08)',
  },
  filterButtonActive: {
    backgroundColor: grad1,
    borderColor: grad1,
  },
  filterText: {
    color: grad1,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  filterCount: {
    color: '#58727A',
    fontSize: 12,
    fontWeight: '900',
  },
  filterTextActive: {
    color: '#fff',
  },
  appointmentGrid: {
    gap: 12,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  pageTitle: {
    color: '#252525',
    fontSize: 19,
    fontWeight: '900',
  },
  pageSubtitle: {
    color: '#58727A',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  patientButton: {
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  patientButtonText: {
    color: grad1,
    fontSize: 12,
    fontWeight: '900',
  },
  appointmentGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  retryPanel: {
    gap: 10,
  },
  retryButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: grad1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  appointmentCard: {
    flexGrow: 1,
    flexBasis: 420,
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(8,81,97,0.08)',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2EAFF',
  },
  avatarText: {
    color: grad1,
    fontSize: 18,
    fontWeight: '900',
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  patient: {
    color: '#252525',
    fontSize: 16,
    fontWeight: '900',
  },
  type: {
    color: '#58727A',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  statusPill: {
    borderRadius: 999,
    backgroundColor: 'rgba(19, 202, 214, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  status: {
    color: grad1,
    fontSize: 11,
    fontWeight: '900',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  metaBlock: {
    flex: 1,
    minWidth: 0,
  },
  time: {
    color: grad1,
    fontSize: 15,
    fontWeight: '900',
  },
  dateText: {
    color: '#58727A',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  note: {
    color: '#252525',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    marginTop: 10,
  },
  actionMessage: {
    color: grad1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  requestActionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: grad1,
  },
  rejectButton: {
    backgroundColor: '#FFECEF',
  },
  buttonDisabled: {
    opacity: 0.58,
  },
  acceptText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  rejectText: {
    color: '#D0475A',
    fontSize: 12,
    fontWeight: '900',
  },
  infoPill: {
    flexGrow: 1,
    minHeight: 34,
    borderRadius: 12,
    backgroundColor: '#E9F6FE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    marginTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoText: {
    color: '#252525',
    fontSize: 12,
    fontWeight: '800',
  },
  cardAction: {
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(19, 202, 214, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 14,
  },
  cardActionText: {
    color: grad1,
    fontSize: 12,
    fontWeight: '900',
  },
});
