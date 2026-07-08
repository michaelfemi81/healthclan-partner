import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiStateCard } from '../../components/api-state';
import { emitPartnerRefresh, subscribePartnerRefresh } from '../../lib/app-events';
import { partnerApi } from '../../lib/api';

export const IOS = Platform.OS === 'ios';
const grad1 = '#085161';
const grad2 = '#11a2c1';
const REMINDER_WINDOW_MINUTES = 30;

function appointmentTime(value?: string) {
    if (!value) return 'soon';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'soon';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function patientName(appointment: any) {
    return appointment?.patient?.fullName || appointment?.patientName || appointment?.user?.fullName || 'Patient';
}

function isUnreadNotification(item: any) {
    return item?.unread || item?.isRead === false;
}

function notificationLabel(type?: string) {
    return String(type || 'general').replace(/_/g, ' ');
}

function formatNotificationTime(value?: string) {
    if (!value) return 'Recently';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently';
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function routeForNotification(item: any) {
    const type = String(item?.type || '');
    const data = item?.data || {};

    if (type.startsWith('appointment') || type === 'consultation_notes' || data.appointmentId) {
        if (type === 'appointment_confirmed' || type === 'appointment_reminder') return '/consultations';
        return '/calendar';
    }

    if (type.startsWith('care_request') || type === 'lead_unlocked') return '/care-requests';
    if (type.startsWith('payment') || type.startsWith('card') || type.startsWith('refund')) return '/payment-methods';
    if (type.startsWith('payout') || type === 'earnings_update') return '/earnings';
    if (type.startsWith('verification') || type.startsWith('document')) return '/profile';
    if (type === 'password_changed' || type === 'security_alert' || type === 'trusted_device') return '/privacy-security';
    if (type === 'support_update') return '/help-support';
    if (type === 'profile_update' || type === 'account_update') return '/profile';

    return null;
}

function upcomingOnlineReminders(appointments: any[]) {
    const now = Date.now();
    const windowEnd = now + REMINDER_WINDOW_MINUTES * 60 * 1000;

    return appointments
        .filter(appointment => {
            const startsAt = new Date(appointment?.startTime || appointment?.scheduledAt || 0).getTime();
            const status = String(appointment?.status || '').toLowerCase();
            const videoStatus = String(appointment?.videoStatus || '').toLowerCase();
            const isConfirmed = ['confirmed', 'accepted', 'scheduled'].includes(status);
            const isOnline = Boolean(!appointment?.type || String(appointment.type).toLowerCase().includes('video') || videoStatus || appointment?.meetingUrl);

            return isConfirmed && isOnline && startsAt >= now && startsAt <= windowEnd;
        })
        .sort((first, second) => new Date(first.startTime || first.scheduledAt || 0).getTime() - new Date(second.startTime || second.scheduledAt || 0).getTime());
}

export default function Notifications() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [appointmentReminders, setAppointmentReminders] = useState<any[]>([]);
    const [readIds, setReadIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState('');
    const [deletingId, setDeletingId] = useState('');

    useEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    const loadNotifications = useCallback(() => {
        setLoading(true);
        setNotice('');
        const now = new Date();
        const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

        Promise.all([
            partnerApi.notifications().catch(() => {
                setNotice('Unable to load notifications from HealthClan.');
                return [];
            }),
            partnerApi.appointments({
                startDate: now.toISOString(),
                endDate: windowEnd.toISOString(),
            }).catch(() => []),
        ])
            .then(([items, appointments]) => {
                setNotifications(Array.isArray(items) ? items : []);
                setAppointmentReminders(upcomingOnlineReminders(Array.isArray(appointments) ? appointments : []));
            })
            .finally(() => setLoading(false));
    }, []);

    useFocusEffect(loadNotifications);

    useEffect(() => subscribePartnerRefresh([
        'notifications',
        'appointments',
        'availability',
        'payments',
        'careRequests',
        'preferences',
        'profile',
        'support',
        'verification',
    ], () => {
        loadNotifications();
    }), [loadNotifications]);

    const unreadCount = appointmentReminders.length + notifications.filter(item => isUnreadNotification(item) && !readIds.includes(item._id)).length;

    const markOneRead = (id: string) => {
        if (!id) return;

        const previous = notifications;
        setNotifications(current => current.map(item => item._id === id ? { ...item, unread: false, isRead: true } : item));
        setReadIds(current => current.includes(id) ? current : [...current, id]);
        partnerApi.markNotificationRead(id)
            .then(() => emitPartnerRefresh('notifications', 'notification-read', { id }))
            .catch(error => {
                setNotifications(previous);
                setNotice(error instanceof Error ? error.message : 'Unable to update notification.');
            });
    };

    const markAllRead = () => {
        if (!notifications.length && !appointmentReminders.length) return;

        const previous = notifications;
        setNotifications(current => current.map(item => ({ ...item, unread: false, isRead: true })));
        setReadIds(notifications.map(item => item._id));
        setAppointmentReminders([]);
        partnerApi.markAllNotificationsRead()
            .then(() => emitPartnerRefresh('notifications', 'notifications-read-all'))
            .catch(error => {
                setNotifications(previous);
                setNotice(error instanceof Error ? error.message : 'Unable to mark notifications as read.');
                loadNotifications();
            });
    };

    const openNotification = (item: any) => {
        markOneRead(item._id);
        const route = routeForNotification(item);
        if (route) router.push(route as any);
    };

    const deleteNotification = async (id: string) => {
        if (!id || deletingId) return;

        const previous = notifications;
        setDeletingId(id);
        setNotice('');
        setNotifications(current => current.filter(item => item._id !== id));

        try {
            await partnerApi.deleteNotification(id);
            emitPartnerRefresh('notifications', 'notification-deleted', { id });
        } catch (error) {
            setNotifications(previous);
            setNotice(error instanceof Error ? error.message : 'Unable to delete notification.');
        } finally {
            setDeletingId('');
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#E9F6FE', paddingTop: insets.top }}>
            <ScrollView
                style={styles.screen}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 116 }}
            >
                <LinearGradient
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    colors={[grad1, grad2]}
                    locations={[0.196, 1]}
                    style={styles.header}
                >
                    <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.back}>
                        <Ionicons name="chevron-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Notifications</Text>
                    <Text style={styles.subtitle}>{unreadCount} unread updates</Text>
                </LinearGradient>

                <View style={styles.section}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryCopy}>
                            <Text style={styles.summaryTitle}>{unreadCount} unread</Text>
                            <Text style={styles.summarySub}>Appointment, payment, care lead, and account updates appear here as they happen.</Text>
                        </View>
                        <TouchableOpacity activeOpacity={0.7} onPress={markAllRead} style={styles.summaryButton}>
                            <Text style={styles.summaryButtonText}>Mark all</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Updates</Text>
                        <TouchableOpacity activeOpacity={0.7} onPress={markAllRead}>
                            <Text style={styles.markAll}>Mark all read</Text>
                        </TouchableOpacity>
                    </View>
                    {!!notice && <Text style={styles.notice}>{notice}</Text>}

                    {loading ? (
                        <ApiStateCard loading title="Loading notifications" message="Fetching your latest HealthClan updates." />
                    ) : !notifications.length && !appointmentReminders.length ? (
                        <ApiStateCard icon="notifications-off-outline" title="No notifications" message="Appointment reminders, payments, care leads, verification, and security updates will appear here." />
                    ) : (
                        <>
                        {appointmentReminders.map((appointment, index) => (
                            <TouchableOpacity
                                key={`reminder-${appointment._id || index}`}
                                activeOpacity={0.7}
                                style={[styles.notificationCard, styles.notificationMain, styles.unreadCard]}
                                onPress={() => router.push('/consultations' as any)}
                            >
                                <View style={styles.iconWrap}>
                                    <Ionicons name="alarm-outline" size={22} color={grad1} />
                                </View>
                                <View style={styles.notificationText}>
                                    <View style={styles.notificationHeader}>
                                        <Text style={styles.notificationTitle} numberOfLines={1}>Online meeting starts soon</Text>
                                        <View style={styles.unreadDot} />
                                    </View>
                                    <Text style={styles.notificationMessage}>{patientName(appointment)} has a video consultation at {appointmentTime(appointment.startTime || appointment.scheduledAt)}.</Text>
                                    <Text style={styles.notificationTime}>Tap to open consultations</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                        {notifications.map(item => {
                        const unread = isUnreadNotification(item) && !readIds.includes(item._id);

                        return (
                            <View key={item._id} style={[styles.notificationCard, unread && styles.unreadCard]}>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={styles.notificationMain}
                                    onPress={() => openNotification(item)}
                                >
                                    <View style={styles.iconWrap}>
                                        <Ionicons name={(item.icon || 'notifications-outline') as any} size={22} color={grad1} />
                                    </View>
                                    <View style={styles.notificationText}>
                                        <View style={styles.notificationHeader}>
                                            <Text style={styles.notificationTitle} numberOfLines={1}>{item.title || 'HealthClan update'}</Text>
                                            {unread && <View style={styles.unreadDot} />}
                                        </View>
                                        <Text style={styles.notificationMessage}>{item.message || item.subtitle || 'You have a new update.'}</Text>
                                        <Text style={styles.notificationTime}>{notificationLabel(item.type)} | {formatNotificationTime(item.createdAt)}</Text>
                                    </View>
                                    <Text style={styles.readStatus}>{unread ? 'New' : 'Read'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity activeOpacity={0.72} style={styles.deleteButton} onPress={() => deleteNotification(item._id)}>
                                    {deletingId === item._id ? <ActivityIndicator color={grad1} /> : <Text style={styles.deleteText}>Delete</Text>}
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                    </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    header: {
        width: '100%',
        minHeight: 176,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    back: {
        position: 'absolute',
        left: 12,
        top: 30,
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontFamily: 'Poppins',
        fontWeight: '800',
        textAlign: 'center',
        marginTop: 20,
    },
    subtitle: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'Poppins',
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 8,
        opacity: 0.9,
    },
    section: {
        width: '90%',
        alignSelf: 'center',
        marginTop: 24,
    },
    notice: {
        color: grad1,
        fontSize: 12,
        fontFamily: 'Poppins',
        fontWeight: '900',
        marginBottom: 10,
    },
    summaryCard: {
        borderRadius: 18,
        backgroundColor: '#fff',
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(8, 81, 97, 0.08)',
    },
    summaryCopy: {
        flex: 1,
        minWidth: 0,
    },
    summaryTitle: {
        color: '#252525',
        fontSize: 20,
        fontFamily: 'Poppins',
        fontWeight: '900',
    },
    summarySub: {
        color: '#58727A',
        fontSize: 12,
        lineHeight: 18,
        fontFamily: 'Poppins',
        fontWeight: '700',
        marginTop: 4,
    },
    summaryButton: {
        minHeight: 40,
        borderRadius: 999,
        backgroundColor: grad1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
    },
    summaryButtonText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'Poppins',
        fontWeight: '900',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: {
        color: '#252525',
        fontSize: 18,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
    markAll: {
        color: grad1,
        fontSize: 13,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
    notificationCard: {
        borderRadius: 16,
        backgroundColor: '#fff',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    notificationMain: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    unreadCard: {
        borderColor: 'rgba(8, 81, 97, 0.18)',
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
    },
    iconWrap: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(19, 202, 214, 0.12)',
        marginRight: 12,
    },
    notificationText: {
        flex: 1,
        minWidth: 0,
    },
    notificationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    notificationTitle: {
        flex: 1,
        color: '#252525',
        fontSize: 15,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
    unreadDot: {
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: grad1,
    },
    notificationMessage: {
        color: '#252525',
        fontSize: 13,
        lineHeight: 19,
        fontFamily: 'Poppins',
        fontWeight: '500',
        marginTop: 5,
    },
    notificationTime: {
        color: grad1,
        fontSize: 12,
        fontFamily: 'Poppins',
        fontWeight: '700',
        marginTop: 8,
        textTransform: 'capitalize',
    },
    readStatus: {
        color: grad1,
        fontSize: 11,
        fontFamily: 'Poppins',
        fontWeight: '900',
        marginLeft: 8,
    },
    deleteButton: {
        minHeight: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(8, 81, 97, 0.08)',
        backgroundColor: '#F6FCFF',
    },
    deleteText: {
        color: grad1,
        fontSize: 12,
        fontFamily: 'Poppins',
        fontWeight: '900',
    },
});
