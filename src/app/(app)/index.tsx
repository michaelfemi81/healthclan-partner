import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiStateCard } from '../../components/api-state';
import { useDoctorVerification } from '../../contexts/doctor-verification';
import { subscribePartnerRefresh } from '../../lib/app-events';
import { partnerApi } from '../../lib/api';
import CalendarScreen from './calendar';

const grad1 = '#085161';
const grad2 = '#11a2c1';

const actions = [
  { icon: 'videocam-outline', title: 'Video consults', subtitle: 'Ready rooms and notes', route: '/consultations' },
  { icon: 'heart-outline', title: 'Care requests', subtitle: 'Home-care leads', route: '/care-requests' },
  { icon: 'time-outline', title: 'Availability', subtitle: 'Booking days and slots', route: '/availability' },
  { icon: 'wallet-outline', title: 'Wallet', subtitle: 'Earnings and payouts', route: '/earnings' },
  { icon: 'notifications-outline', title: 'Alerts', subtitle: 'Updates and reminders', route: '/notifications' },
];

function formatTime(value?: string) {
  if (!value) return 'Scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Scheduled';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatStatus(value?: string) {
  return String(value || 'scheduled').replace(/_/g, ' ');
}

function isUnreadNotification(item: any) {
  return item?.unread || item?.isRead === false;
}

function appointmentTimestamp(appointment: any) {
  const raw = appointment?.startTime || appointment?.scheduledAt || appointment?.appointmentDate || appointment?.date || appointment?.createdAt;
  const date = new Date(raw || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { approved, verificationStatus, accountStatus } = useDoctorVerification();
  const accountSuspended = ['suspended', 'deleted'].includes(accountStatus);
  const [dashboard, setDashboard] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [appointmentError, setAppointmentError] = useState('');

  const loadDashboard = () => {
    partnerApi.dashboard().then(setDashboard).catch(() => setDashboard(null));
    partnerApi.appointments()
      .then(items => {
        setAppointments(Array.isArray(items) ? items : []);
        setAppointmentError('');
      })
      .catch(() => {
        setAppointments([]);
        setAppointmentError('Unable to load appointments from HealthClan right now.');
      })
      .finally(() => setLoadingAppointments(false));
    partnerApi.notifications()
      .then(items => setUnreadNotifications((Array.isArray(items) ? items : []).filter(isUnreadNotification).length))
      .catch(() => setUnreadNotifications(0));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => subscribePartnerRefresh([
    'dashboard',
    'appointments',
    'availability',
    'payments',
    'careRequests',
    'notifications',
    'preferences',
    'profile',
    'support',
    'verification',
  ], loadDashboard), []);

  if (pathname.includes('calendar')) {
    return <CalendarScreen />;
  }

  const upcomingAppointments = [...appointments]
    .sort((first, second) => appointmentTimestamp(second) - appointmentTimestamp(first))
    .slice(0, 5);
  const pendingRequests = dashboard?.metrics?.pendingRequests ?? appointments.filter(item => item.status === 'requested').length;
  const todayActivity = dashboard?.metrics?.today ?? appointments.filter(item => {
    if (!item.startTime) return false;
    return new Date(item.startTime).toDateString() === new Date().toDateString();
  }).length;
  const readyRooms = dashboard?.metrics?.readyRooms ?? 0;
  const nextAppointment = [...appointments]
    .filter(item => appointmentTimestamp(item) >= Date.now())
    .sort((first, second) => appointmentTimestamp(first) - appointmentTimestamp(second))[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 112 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[grad1, grad2]} style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.kicker}>HealthClan Partner</Text>
              <Text style={styles.title}>Care dashboard</Text>
            </View>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
              {!!unreadNotifications && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Manage appointments, video consults, consult notes, availability, and payouts from one place.</Text>
          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{pendingRequests}</Text>
              <Text style={styles.metricLabel}>Requests</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{todayActivity}</Text>
              <Text style={styles.metricLabel}>Today</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{readyRooms}</Text>
              <Text style={styles.metricLabel}>Rooms</Text>
            </View>
          </View>
        </LinearGradient>

        {!approved && (
          <View style={styles.verificationReminder}>
            <View style={styles.reminderIcon}>
              <Ionicons name="shield-checkmark-outline" size={21} color={grad1} />
            </View>
            <View style={styles.reminderText}>
              <Text style={styles.reminderTitle}>
                {accountSuspended ? 'Partner account deactivated' : 'Admin verification pending'}
              </Text>
              <Text style={styles.reminderCopy}>
                {accountSuspended
                  ? 'Your partner account is currently deactivated. HealthClan will email and notify you when access changes.'
                  : `Doctor actions stay locked until HealthClan admin approves your verification. You can still review care requests and pay to unlock carer information while pending. Current status: ${verificationStatus}.`}
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.75} onPress={() => router.push('/profile' as any)} style={styles.reminderButton}>
              <Text style={styles.reminderButtonText}>Docs</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.nextCard}>
          <View style={styles.nextIcon}>
            <Ionicons name="calendar-outline" size={21} color={grad1} />
          </View>
          <View style={styles.nextText}>
            <Text style={styles.nextLabel}>Next appointment</Text>
            <Text style={styles.nextTitle}>
              {nextAppointment ? `${formatTime(nextAppointment.startTime)} with ${nextAppointment.patient?.fullName || 'Patient'}` : 'No upcoming appointment yet'}
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.75} style={styles.nextButton} onPress={() => router.push('/calendar' as any)}>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.quickGrid}>
          {actions.map(action => (
            <TouchableOpacity
              key={action.title}
              activeOpacity={0.75}
              style={styles.actionCard}
              onPress={() => action.route && router.push(action.route as any)}
            >
              <View style={styles.actionIcon}>
                <Ionicons name={action.icon as any} size={22} color={grad1} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Appointment requests</Text>
          <TouchableOpacity activeOpacity={0.75} style={styles.viewAllButton} onPress={() => router.push('/calendar')}>
            <Text style={styles.sectionLink}>View all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.requestList}>
          {loadingAppointments ? (
            <ApiStateCard loading title="Loading appointments" message="Fetching your live appointment schedule from HealthClan." />
          ) : appointmentError ? (
            <ApiStateCard icon="cloud-offline-outline" title="Appointments unavailable" message={appointmentError} />
          ) : !appointments.length ? (
            <ApiStateCard icon="calendar-clear-outline" title="No appointment requests yet" message="New patient appointment requests will appear here from the backend." />
          ) : upcomingAppointments.map(request => (
            <TouchableOpacity
              key={request._id}
              activeOpacity={0.75}
              style={styles.requestCard}
              onPress={() => router.push({ pathname: '/video-room', params: { appointmentId: request._id } } as any)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(request.patient?.fullName || 'P').charAt(0)}</Text>
              </View>
              <View style={styles.requestText}>
                <Text style={styles.requestName}>{request.patient?.fullName || 'Patient'}</Text>
                <Text style={styles.requestService}>{request.service?.name || 'Consultation'} | Video consultation</Text>
              </View>
              <View style={styles.requestMeta}>
                <Text style={styles.requestTime}>{formatTime(request.startTime)}</Text>
                <Text style={styles.requestStatus}>{formatStatus(request.status)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E9F6FE' },
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: 920, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 12 },
  hero: { borderRadius: 24, padding: 22, minHeight: 248, justifyContent: 'space-between' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  kicker: { color: 'rgba(255,255,255,0.86)', fontSize: 13, fontWeight: '800' },
  title: { color: '#fff', fontSize: 34, fontWeight: '900', marginTop: 8 },
  iconButton: { position: 'relative', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 20, marginLeft: -3 },
  notificationBadge: { position: 'absolute', right: 4, top: 3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#E94D5F', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  notificationBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  subtitle: { color: '#fff', fontSize: 16, lineHeight: 23, fontWeight: '600', maxWidth: 560, marginTop: 28 },
  metricRow: { flexDirection: 'row', gap: 10, marginTop: 22 },
  metric: { flex: 1, minHeight: 74, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', padding: 14 },
  metricValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
  metricLabel: { color: 'rgba(255,255,255,0.86)', fontSize: 12, fontWeight: '700', marginTop: 2 },
  verificationReminder: { minHeight: 82, borderRadius: 18, backgroundColor: '#fff', padding: 14, marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(8,81,97,0.16)' },
  reminderIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(19, 202, 214, 0.12)' },
  reminderText: { flex: 1, minWidth: 0 },
  reminderTitle: { color: grad1, fontSize: 14, fontWeight: '900' },
  reminderCopy: { color: '#58727A', fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 3 },
  reminderButton: { minHeight: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: grad1, paddingHorizontal: 12 },
  reminderButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  nextCard: { minHeight: 78, borderRadius: 18, backgroundColor: '#fff', padding: 14, marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(8,81,97,0.08)' },
  nextIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(19, 202, 214, 0.12)' },
  nextText: { flex: 1, minWidth: 0 },
  nextLabel: { color: grad1, fontSize: 12, fontWeight: '900' },
  nextTitle: { color: '#252525', fontSize: 14, lineHeight: 19, fontWeight: '800', marginTop: 3 },
  nextButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: grad1 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 },
  actionCard: { width: '48%', flexGrow: 1, minHeight: 132, borderRadius: 18, backgroundColor: '#fff', padding: 16 },
  actionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(19, 202, 214, 0.12)', marginBottom: 14 },
  actionTitle: { color: '#252525', fontSize: 15, fontWeight: '900' },
  actionSubtitle: { color: '#58727A', fontSize: 12, fontWeight: '700', marginTop: 6, lineHeight: 17 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 },
  sectionTitle: { color: '#252525', fontSize: 20, fontWeight: '900' },
  viewAllButton: { minHeight: 36, borderRadius: 18, backgroundColor: grad1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  sectionLink: { color: '#fff', fontSize: 14, fontWeight: '900' },
  requestList: { gap: 12 },
  requestCard: { minHeight: 78, borderRadius: 18, backgroundColor: '#fff', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2EAFF' },
  avatarText: { color: grad1, fontSize: 18, fontWeight: '900' },
  requestText: { flex: 1, minWidth: 0 },
  requestName: { color: '#252525', fontSize: 15, fontWeight: '900' },
  requestService: { color: '#58727A', fontSize: 12, fontWeight: '700', marginTop: 4 },
  requestMeta: { alignItems: 'flex-end' },
  requestTime: { color: '#252525', fontSize: 12, fontWeight: '900' },
  requestStatus: { color: grad1, fontSize: 11, fontWeight: '900', marginTop: 6 },
});
