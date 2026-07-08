import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDoctorVerification } from '../../contexts/doctor-verification';
import { emitPartnerRefresh } from '../../lib/app-events';
import { partnerApi } from '../../lib/api';

const grad1 = '#085161';
const grad2 = '#11a2c1';
const slotOptions = Array.from({ length: 24 }, (_, hour) => toDisplayTime(`${String(hour).padStart(2, '0')}:00`));
type AvailabilityDay = { day: string; enabled: boolean; slots: string[] };
const initialDays: AvailabilityDay[] = [
  { day: 'Mon', enabled: false, slots: [] },
  { day: 'Tue', enabled: false, slots: [] },
  { day: 'Wed', enabled: false, slots: [] },
  { day: 'Thu', enabled: false, slots: [] },
  { day: 'Fri', enabled: false, slots: [] },
  { day: 'Sat', enabled: false, slots: [] },
  { day: 'Sun', enabled: false, slots: [] },
];
const dayNumbers = [1, 2, 3, 4, 5, 6, 0];

function toTwentyFourHour(time: string) {
  const [rawHour, rawMinutePeriod] = time.split(':');
  const [minute, period] = rawMinutePeriod.split(' ');
  let hour = Number(rawHour);

  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  return `${String(hour).padStart(2, '0')}:${minute}`;
}

function addOneHour(time: string) {
  const [hour, minute] = toTwentyFourHour(time).split(':').map(Number);
  return `${String(hour + 1).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function toDisplayTime(time: string) {
  const [rawHour, minute = '00'] = time.split(':');
  const hour = Number(rawHour);

  if (Number.isNaN(hour)) return time;

  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, '0')}:${minute} ${period}`;
}

function sortSlots(slots: string[]) {
  return [...slots].sort((first, second) => toTwentyFourHour(first).localeCompare(toTwentyFourHour(second)));
}

export default function Availability() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { approved } = useDoctorVerification();
  const [days, setDays] = useState(initialDays);
  const [visitMode, setVisitMode] = useState<'Video' | 'Phone'>('Video');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const totalSlots = days.reduce((sum, day) => sum + (day.enabled ? day.slots.length : 0), 0);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    partnerApi.availability()
      .then(payload => {
        const weeklySchedule = Array.isArray(payload?.weeklySchedule) ? payload.weeklySchedule : [];

        setDays(current => current.map((day, index) => {
          const scheduleForDay = weeklySchedule.filter((item: any) => Number(item.day) === dayNumbers[index]);
          return {
            ...day,
            enabled: scheduleForDay.some((item: any) => item.isAvailable !== false),
            slots: sortSlots(scheduleForDay.map((item: any) => toDisplayTime(item.startTime)).filter(Boolean)),
          };
        }));
      })
      .catch(() => null);
  }, []);

  function toggleDay(index: number) {
    setSaved(false);
    setDays(current => current.map((day, dayIndex) => dayIndex === index ? { ...day, enabled: !day.enabled } : day));
  }

  function toggleSlot(dayIndex: number, slot: string) {
    setSaved(false);
    setDays(current => current.map((day, index) => {
      if (index !== dayIndex) return day;
      const hasSlot = day.slots.includes(slot);
      return { ...day, slots: hasSlot ? day.slots.filter(item => item !== slot) : sortSlots([...day.slots, slot]) };
    }));
  }

  async function saveAvailability() {
    setMessage('');

    if (!approved) {
      setMessage('Admin verification is required before saving availability.');
      return;
    }

    const weeklySchedule = days.flatMap((day, index) =>
      day.slots.map(slot => ({
        day: dayNumbers[index],
        startTime: toTwentyFourHour(slot),
        endTime: addOneHour(slot),
        isAvailable: day.enabled,
        mode: visitMode.toLowerCase(),
      }))
    );

    if (!weeklySchedule.some(slot => slot.isAvailable)) {
      setMessage('Select at least one available day and time slot.');
      return;
    }

    setSaving(true);

    try {
      const availability = await partnerApi.saveAvailability({
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos',
        weeklySchedule,
      });
      setSaved(true);
      setMessage('Availability saved to HealthClan.');
      emitPartnerRefresh('availability', 'availability-saved', availability);
      emitPartnerRefresh('appointments', 'availability-saved', availability);
      emitPartnerRefresh('dashboard', 'availability-saved', availability);
      emitPartnerRefresh('notifications', 'availability-saved', availability);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save availability.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 116 }]}>
        <LinearGradient colors={[grad1, grad2]} style={styles.header}>
          <Text style={styles.kicker}>Availability</Text>
          <Text style={styles.title}>Set when patients can book you</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}><Text style={styles.summaryValue}>{totalSlots}</Text><Text style={styles.summaryLabel}>Open slots</Text></View>
            <View style={styles.summaryCard}><Text style={styles.summaryValue}>{days.filter(day => day.enabled).length}</Text><Text style={styles.summaryLabel}>Active days</Text></View>
          </View>
        </LinearGradient>

        <View style={styles.modeRow}>
          {(['Video', 'Phone'] as const).map(mode => (
            <TouchableOpacity key={mode} style={[styles.modeButton, visitMode === mode && styles.modeButtonActive]} onPress={() => { setVisitMode(mode); setSaved(false); }}>
              <Ionicons name={mode === 'Video' ? 'videocam-outline' : 'call-outline'} size={18} color={visitMode === mode ? '#fff' : grad1} />
              <Text style={[styles.modeText, visitMode === mode && styles.modeTextActive]}>{mode}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {days.map((day, dayIndex) => (
          <View key={day.day} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <View>
                <Text style={styles.dayName}>{day.day}</Text>
                <Text style={styles.dayMeta}>{day.enabled ? `${day.slots.length} ${visitMode.toLowerCase()} slots` : 'Unavailable'}</Text>
              </View>
              <Switch value={day.enabled} onValueChange={() => toggleDay(dayIndex)} trackColor={{ false: '#C6D5DE', true: 'rgba(19, 202, 214, 0.45)' }} thumbColor={day.enabled ? grad1 : '#fff'} />
            </View>
            {day.enabled && (
              <View style={styles.slotGrid}>
                {slotOptions.map(slot => {
                  const selected = day.slots.includes(slot);
                  return (
                    <TouchableOpacity key={slot} style={[styles.slot, selected && styles.slotSelected]} onPress={() => toggleSlot(dayIndex, slot)}>
                      <Text style={[styles.slotText, selected && styles.slotTextSelected]}>{slot}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity style={[styles.saveButton, (saving || !approved) && styles.buttonDisabled]} onPress={saveAvailability} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name={saved ? 'checkmark-circle' : 'save-outline'} size={19} color="#fff" />
          )}
          <Text style={styles.saveText}>{saving ? 'Saving availability' : !approved ? 'Verification required' : saved ? 'Availability saved' : 'Save availability'}</Text>
        </TouchableOpacity>
        {!!message && <Text style={styles.message}>{message}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E9F6FE' },
  content: { paddingHorizontal: 18 },
  header: { minHeight: 218, borderRadius: 24, padding: 22, justifyContent: 'space-between' },
  kicker: { color: 'rgba(255,255,255,0.84)', fontSize: 13, fontWeight: '900' },
  title: { color: '#fff', fontSize: 30, lineHeight: 36, fontWeight: '900', marginTop: 8 },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  summaryCard: { flex: 1, minHeight: 72, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', padding: 12 },
  summaryValue: { color: '#fff', fontSize: 23, fontWeight: '900' },
  summaryLabel: { color: 'rgba(255,255,255,0.84)', fontSize: 12, fontWeight: '800', marginTop: 2 },
  modeRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 14 },
  modeButton: { flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  modeButtonActive: { backgroundColor: grad1 },
  modeText: { color: grad1, fontSize: 14, fontWeight: '900' },
  modeTextActive: { color: '#fff' },
  dayCard: { borderRadius: 18, backgroundColor: '#fff', padding: 14, marginBottom: 12 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dayName: { color: '#252525', fontSize: 17, fontWeight: '900' },
  dayMeta: { color: '#58727A', fontSize: 12, fontWeight: '700', marginTop: 4 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  slot: { minHeight: 38, borderRadius: 999, backgroundColor: '#E9F6FE', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  slotSelected: { backgroundColor: grad1 },
  slotText: { color: grad1, fontSize: 12, fontWeight: '900' },
  slotTextSelected: { color: '#fff' },
  saveButton: { minHeight: 52, borderRadius: 16, backgroundColor: grad1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 },
  buttonDisabled: { opacity: 0.68 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  message: { color: grad1, fontSize: 13, fontWeight: '900', textAlign: 'center', marginTop: 12 },
});
