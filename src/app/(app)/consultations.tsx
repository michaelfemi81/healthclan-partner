import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiStateCard } from '../../components/api-state';
import { useDoctorVerification } from '../../contexts/doctor-verification';
import { emitPartnerRefresh, subscribePartnerRefresh } from '../../lib/app-events';
import { partnerApi } from '../../lib/api';

const grad1 = '#085161';
const grad2 = '#11a2c1';

function appointmentTimestamp(appointment: any) {
  const raw = appointment?.startTime || appointment?.scheduledAt || appointment?.appointmentDate || appointment?.date || appointment?.createdAt;
  const date = new Date(raw || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatTime(value?: string) {
  if (!value) return 'Scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Scheduled';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(value?: string) {
  if (!value) return 'Date to be confirmed';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date to be confirmed';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatStatus(value?: string) {
  return String(value || 'scheduled').replace(/_/g, ' ');
}

function patientName(appointment: any) {
  return appointment?.patient?.fullName || [appointment?.patient?.firstName, appointment?.patient?.lastName].filter(Boolean).join(' ') || 'Patient';
}

function statusColor(value?: string) {
  if (value === 'confirmed') return '#0F8F62';
  if (value === 'requested') return '#8A5BDE';
  if (value === 'pending_payment') return '#B36B00';
  if (value === 'completed') return '#4863D9';
  if (value === 'cancelled' || value === 'rejected') return '#D0475A';
  return grad1;
}

export default function Consultations() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ appointmentId?: string }>();
  const insets = useSafeAreaInsets();
  const { approved } = useDoctorVerification();
  const { width } = useWindowDimensions();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [activeId, setActiveId] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [savedNoteId, setSavedNoteId] = useState('');
  const [notesByVisit, setNotesByVisit] = useState<Record<string, string>>({});
  const isWide = Platform.OS === 'web' && width >= 900;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadVisits = () => {
    setLoading(true);
    partnerApi.appointments()
      .then(items => {
        const sorted = Array.isArray(items)
          ? [...items].sort((first, second) => appointmentTimestamp(second) - appointmentTimestamp(first))
          : [];
        setAppointments(sorted);
        setActiveId(current => params.appointmentId || current || sorted[0]?._id || '');
        setNotice('');
      })
      .catch(error => {
        setAppointments([]);
        setNotice(error instanceof Error ? error.message : 'Unable to load consultations from HealthClan.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadVisits, []);
  useEffect(() => subscribePartnerRefresh(['appointments', 'notifications'], loadVisits), []);

  const activeVisit = appointments.find(item => item._id === activeId) ?? appointments[0];
  const activeVisitId = activeVisit?._id || '';
  const activeNotes = notesByVisit[activeVisitId] ?? activeVisit?.consultationNotes ?? '';
  const confirmed = appointments.filter(item => item.status === 'confirmed').length;
  const completed = appointments.filter(item => item.status === 'completed').length;
  const pending = appointments.filter(item => ['requested', 'pending_payment'].includes(item.status)).length;
  const upcoming = useMemo(
    () => appointments.filter(item => appointmentTimestamp(item) >= Date.now() && item.status === 'confirmed'),
    [appointments],
  );

  async function saveNotes() {
    if (savingNote || !activeVisitId) return;
    if (!approved) {
      setNotice('Admin verification is required before saving consultation notes.');
      return;
    }

    const savedNotes = activeNotes.trim() || 'No notes added yet.';
    setSavingNote(true);
    setNotesByVisit(current => ({ ...current, [activeVisitId]: savedNotes }));

    try {
      const savedAppointment = await partnerApi.saveNotes(activeVisitId, savedNotes, { markCompleted: true });
      const persistedNotes = String(savedAppointment?.consultationNotes || '').trim();
      if (persistedNotes !== savedNotes) throw new Error('HealthClan did not confirm the saved consultation notes.');

      setAppointments(current => current.map(visit => visit._id === activeVisitId ? {
        ...visit,
        ...savedAppointment,
        consultationNotes: persistedNotes,
      } : visit));
      setNotesByVisit(current => ({ ...current, [activeVisitId]: persistedNotes }));
      setSavedNoteId(activeVisitId);
      setNotice('Consultation notes saved to HealthClan and shared with the patient.');
      emitPartnerRefresh('appointments', 'consultation-notes-saved', savedAppointment);
      emitPartnerRefresh('notifications', 'consultation-notes-saved', savedAppointment);
      emitPartnerRefresh('dashboard', 'consultation-notes-saved', savedAppointment);
    } catch (error) {
      setSavedNoteId('');
      setNotice(error instanceof Error ? error.message : 'Unable to save consultation notes to HealthClan.');
    } finally {
      setSavingNote(false);
    }
  }

  function openVideoRoom(appointment: any) {
    router.push({ pathname: '/video-room', params: { appointmentId: appointment._id } } as any);
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, isWide && styles.contentWide, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 112 }]}>
        <LinearGradient colors={[grad1, grad2]} style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.kicker}>Consultations</Text>
              <Text style={styles.title}>Video appointments</Text>
            </View>
            <View style={styles.headerIcon}>
              <Ionicons name="videocam-outline" size={24} color="#fff" />
            </View>
          </View>
          <Text style={styles.subtitle}>Open a consultation to enter the dedicated camera room, then save clinical notes back to HealthClan.</Text>
          <View style={styles.stats}>
            <View style={styles.stat}><Text style={styles.statValue}>{upcoming.length}</Text><Text style={styles.statLabel}>Upcoming</Text></View>
            <View style={styles.stat}><Text style={styles.statValue}>{confirmed}</Text><Text style={styles.statLabel}>Confirmed</Text></View>
            <View style={styles.stat}><Text style={styles.statValue}>{pending}</Text><Text style={styles.statLabel}>Needs action</Text></View>
          </View>
        </LinearGradient>

        {!!notice && <Text style={styles.notice}>{notice}</Text>}

        <View style={[styles.layout, isWide && styles.layoutWide]}>
          <View style={styles.listPanel}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Appointments</Text>
                <Text style={styles.sectionSubtitle}>{appointments.length} total | {completed} completed</Text>
              </View>
              <TouchableOpacity activeOpacity={0.75} style={styles.refreshButton} onPress={loadVisits}>
                <Ionicons name="refresh-outline" size={17} color={grad1} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ApiStateCard loading title="Loading consultations" message="Fetching your video appointment queue." />
            ) : !appointments.length ? (
              <ApiStateCard icon="videocam-outline" title="No consultations yet" message="Confirmed and past video appointments will appear here." />
            ) : (
              <View style={styles.list}>
                {appointments.map(appointment => {
                  const selected = appointment._id === activeVisitId;
                  const color = statusColor(appointment.status);
                  const patient = patientName(appointment);

                  return (
                    <TouchableOpacity
                      key={appointment._id}
                      activeOpacity={0.78}
                      style={[styles.card, selected && styles.cardActive]}
                      onPress={() => openVideoRoom(appointment)}
                    >
                      <View style={styles.timeBlock}>
                        <Text style={styles.timeMonth}>{formatDate(appointment.startTime || appointment.scheduledAt).split(' ').slice(0, 2).join(' ')}</Text>
                        <Text style={styles.timeText}>{formatTime(appointment.startTime || appointment.scheduledAt)}</Text>
                      </View>
                      <View style={styles.cardCopy}>
                        <View style={styles.cardTop}>
                          <Text style={styles.patient} numberOfLines={1}>{patient}</Text>
                          <View style={[styles.statusPill, { backgroundColor: `${color}1F` }]}>
                            <Text style={[styles.status, { color }]}>{formatStatus(appointment.status)}</Text>
                          </View>
                        </View>
                        <Text style={styles.reason} numberOfLines={2}>{appointment.reasonForVisit || appointment.service?.name || 'Video consultation'}</Text>
                        <TouchableOpacity activeOpacity={0.75} style={styles.openButton} onPress={() => openVideoRoom(appointment)}>
                          <Ionicons name="videocam-outline" size={16} color="#fff" />
                          <Text style={styles.openButtonText}>Open camera room</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.notesPanel}>
            <View style={styles.notesTop}>
              <View>
                <Text style={styles.sectionTitle}>Consultation notes</Text>
                <Text style={styles.sectionSubtitle}>{activeVisit ? patientName(activeVisit) : 'Select an appointment'}</Text>
              </View>
              {savedNoteId === activeVisitId && <Text style={styles.savedText}>Saved</Text>}
            </View>
            {!activeVisit ? (
              <ApiStateCard icon="document-text-outline" title="No appointment selected" message="Select a consultation before writing notes." />
            ) : (
              <>
                <TextInput
                  style={styles.notes}
                  value={activeNotes}
                  onChangeText={value => {
                    setSavedNoteId('');
                    setNotesByVisit(current => ({ ...current, [activeVisitId]: value }));
                  }}
                  multiline
                  textAlignVertical="top"
                  placeholder="Write diagnosis, medication plan, next steps, and follow-up instructions"
                />
                <TouchableOpacity style={[styles.saveButton, (!approved || !activeVisitId) && styles.buttonDisabled]} onPress={saveNotes} disabled={savingNote || !activeVisitId}>
                  {savingNote ? <ActivityIndicator color="#fff" /> : <Ionicons name={savedNoteId === activeVisitId ? 'checkmark-circle' : 'save-outline'} size={18} color="#fff" />}
                  <Text style={styles.saveText}>{savingNote ? 'Saving notes' : !approved ? 'Verification required' : savedNoteId === activeVisitId ? 'Notes saved' : 'Save notes'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E9F6FE' },
  content: { paddingHorizontal: 18 },
  contentWide: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
  header: { minHeight: 224, borderRadius: 24, padding: 22, justifyContent: 'space-between' },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  kicker: { color: 'rgba(255,255,255,0.84)', fontSize: 13, fontWeight: '900' },
  title: { color: '#fff', fontSize: 31, lineHeight: 37, fontWeight: '900', marginTop: 8 },
  subtitle: { color: 'rgba(255,255,255,0.86)', fontSize: 14, lineHeight: 21, fontWeight: '700', marginTop: 18 },
  headerIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  stats: { flexDirection: 'row', gap: 10, marginTop: 18 },
  stat: { flex: 1, minHeight: 68, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.17)', padding: 12 },
  statValue: { color: '#fff', fontSize: 23, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 11, fontWeight: '900', marginTop: 2 },
  notice: { color: grad1, fontSize: 12, lineHeight: 18, fontWeight: '900', marginTop: 12 },
  layout: { gap: 14, marginTop: 16 },
  layoutWide: { flexDirection: 'row', alignItems: 'flex-start' },
  listPanel: { flex: 1.2, gap: 12 },
  notesPanel: { flex: 1, borderRadius: 18, backgroundColor: '#fff', padding: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { color: '#252525', fontSize: 19, fontWeight: '900' },
  sectionSubtitle: { color: '#58727A', fontSize: 12, fontWeight: '800', marginTop: 3 },
  refreshButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  list: { gap: 10 },
  card: { borderRadius: 18, backgroundColor: '#fff', padding: 12, flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: 'rgba(8,81,97,0.08)' },
  cardActive: { borderColor: 'rgba(8,81,97,0.34)' },
  timeBlock: { width: 76, minHeight: 84, borderRadius: 18, backgroundColor: '#E9F6FE', alignItems: 'center', justifyContent: 'center', padding: 8 },
  timeMonth: { color: grad1, fontSize: 11, fontWeight: '900', textAlign: 'center' },
  timeText: { color: '#252525', fontSize: 13, fontWeight: '900', marginTop: 5, textAlign: 'center' },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  patient: { flex: 1, color: '#252525', fontSize: 15, fontWeight: '900' },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  status: { fontSize: 10, fontWeight: '900', textTransform: 'capitalize' },
  reason: { color: '#58727A', fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 7 },
  openButton: { alignSelf: 'flex-start', minHeight: 38, borderRadius: 19, backgroundColor: grad1, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, marginTop: 10 },
  openButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  notesTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
  savedText: { color: '#0F8F62', fontSize: 12, fontWeight: '900' },
  notes: { minHeight: 220, borderRadius: 16, backgroundColor: '#E9F6FE', padding: 14, color: '#252525', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  saveButton: { minHeight: 50, borderRadius: 16, backgroundColor: grad1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  buttonDisabled: { opacity: 0.58 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
