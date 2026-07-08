import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDoctorVerification } from '../../contexts/doctor-verification';
import { emitPartnerRefresh } from '../../lib/app-events';
import { partnerApi } from '../../lib/api';

export const IOS = Platform.OS === 'ios';
const grad1 = '#085161';
const grad2 = '#11a2c1';
const defaultDoctorImage = require('../../../assets/images/default-doctor-illustration.png');
const timeOptions = ['08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM'];

function getDoctorSeed(doctorId: string) {
    return doctorId.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
}

function formatShortDate(date: Date) {
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatFullDate(date: Date) {
    return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function createDoctorSchedule(doctorId: string) {
    const seed = getDoctorSeed(doctorId);

    return Array.from({ length: 14 }).map((_, dayIndex) => {
        const date = new Date();
        date.setDate(date.getDate() + dayIndex);
        const slotCount = 3 + ((seed + dayIndex) % 4);
        const startIndex = (seed + dayIndex * 2) % 7;

        return {
            date: formatShortDate(date),
            fullDate: formatFullDate(date),
            slots: Array.from({ length: slotCount }).map((__, slotIndex) => {
                const time = timeOptions[(startIndex + slotIndex * 2) % timeOptions.length];
                const booked = (seed + dayIndex + slotIndex) % 3 === 0;
                return {
                    time,
                    mode: 'Online',
                    status: booked ? 'booked' : 'free',
                };
            }),
        };
    });
}

export default function DoctorProfile() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { approved } = useDoctorVerification();
    const { id } = useLocalSearchParams();
    const doctorId = typeof id === 'string' ? id : 'me';
    const [doctor, setDoctor] = useState({
        id: doctorId,
        name: 'Doctor profile unavailable',
        specialty: 'Doctor',
        rating: 'New',
        experience: 'HealthClan partner',
        location: 'Online',
        bio: 'Doctor details will appear here once this profile is available.',
        image: defaultDoctorImage,
    });
    const scheduleDays = createDoctorSchedule(doctor.id);
    const [favorite, setFavorite] = useState(false);
    const [notice, setNotice] = useState('');
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [selectedSlot, setSelectedSlot] = useState<{ time: string; mode: string; status: string } | null>(null);
    const selectedDay = scheduleDays[selectedDayIndex];

    useEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    useEffect(() => {
        partnerApi.profile()
            .then((payload: any) => {
                const user = payload?.user || {};
                const profile = payload?.profile || {};
                setDoctor({
                    id: String(user._id || doctorId),
                    name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Doctor profile unavailable',
                    specialty: profile.specialization || 'Doctor',
                    rating: String(profile.ratingAverage || 'New'),
                    experience: profile.yearsOfExperience ? `${profile.yearsOfExperience} years` : 'HealthClan partner',
                    location: [user.address?.city, user.address?.country].filter(Boolean).join(', ') || 'Online',
                    bio: profile.bio || 'Doctor details will appear here once this profile is available.',
                    image: user.avatar ? { uri: user.avatar } : defaultDoctorImage,
                });
            })
            .catch(() => null);
    }, [doctorId]);

    useEffect(() => {
        if (doctorId === 'me') return;

        partnerApi.favoriteDoctors()
            .then(items => {
                setFavorite(items.some((item: any) => String(item.doctor?._id || item.doctor) === doctorId));
            })
            .catch(() => null);
    }, [doctorId]);

    const toggleFavorite = async () => {
        if (!doctorId || doctorId === 'me') return;

        if (!approved) {
            setNotice('Admin verification is required before changing favorites.');
            return;
        }

        const next = !favorite;
        setFavorite(next);

        try {
            if (next) {
                await partnerApi.addFavoriteDoctor(doctorId);
            } else {
                await partnerApi.removeFavoriteDoctor(doctorId);
            }
            emitPartnerRefresh('profile', next ? 'favorite-doctor-added' : 'favorite-doctor-removed', { doctorId });
            emitPartnerRefresh('dashboard', next ? 'favorite-doctor-added' : 'favorite-doctor-removed', { doctorId });
        } catch {
            setFavorite(!next);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#E9F6FE', paddingTop: insets.top }}>
            <ScrollView
                style={styles.screen}
                contentInsetAdjustmentBehavior="automatic"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 34 }}
            >
                <LinearGradient
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    colors={[grad1, grad2]}
                    locations={[0.196, 1]}
                    style={styles.header}
                >
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => router.back()}
                        style={styles.back}
                    >
                        <Ionicons name="chevron-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={toggleFavorite}
                        style={styles.favoriteButton}
                    >
                        <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={24} color="#fff" />
                    </TouchableOpacity>
                    <Image source={doctor.image} style={styles.profileImage} />
                    <Text style={styles.name}>{doctor.name}</Text>
                    <Text style={styles.specialty}>{doctor.specialty}</Text>
                    <View style={styles.statusPill}>
                        <View style={[styles.statusDot, styles.onlineDot]} />
                        <Text style={styles.statusText}>Online</Text>
                    </View>
                </LinearGradient>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Ionicons name="star" size={20} color={grad1} />
                        <Text style={styles.statValue}>{doctor.rating}</Text>
                        <Text style={styles.statLabel}>Rating</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="briefcase-outline" size={20} color={grad1} />
                        <Text style={styles.statValue}>{doctor.experience}</Text>
                        <Text style={styles.statLabel}>Experience</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="location-outline" size={20} color={grad1} />
                        <Text style={styles.statValue} numberOfLines={1}>{doctor.location}</Text>
                        <Text style={styles.statLabel}>Location</Text>
                    </View>
                </View>
                {!!notice && <Text style={styles.notice}>{notice}</Text>}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About Doctor</Text>
                    <Text style={styles.bodyText}>{doctor.bio}</Text>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Calendar</Text>
                        <View style={styles.legend}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, styles.freeDot]} />
                                <Text style={styles.legendText}>Free</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, styles.bookedDot]} />
                                <Text style={styles.legendText}>Booked</Text>
                            </View>
                        </View>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.calendarDays}
                    >
                        {scheduleDays.map((day, index) => {
                            const selected = index === selectedDayIndex;

                            return (
                                <TouchableOpacity
                                    key={day.date}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        setSelectedDayIndex(index);
                                        setSelectedSlot(null);
                                    }}
                                    style={[styles.dayButton, selected && styles.selectedDayButton]}
                                >
                                    <Text style={[styles.dayText, selected && styles.selectedDayText]}>{day.date}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    <View style={styles.timeGrid}>
                        {selectedDay.slots.map(slot => {
                            const isBooked = slot.status === 'booked';
                            const isSelected = selectedSlot?.time === slot.time && selectedSlot?.mode === slot.mode;

                            return (
                                <TouchableOpacity
                                    key={`${selectedDay.date}-${slot.time}-${slot.mode}`}
                                    activeOpacity={isBooked ? 1 : 0.7}
                                    disabled={isBooked}
                                    onPress={() => setSelectedSlot(slot)}
                                    style={[
                                        styles.timeSlot,
                                        isBooked ? styles.bookedSlot : styles.freeSlot,
                                        isSelected && styles.selectedSlot,
                                    ]}
                                >
                                    <Text style={[styles.timeSlotText, isBooked ? styles.bookedSlotText : styles.freeSlotText]}>
                                        {slot.time}
                                    </Text>
                                    <Text style={[styles.timeSlotStatus, isBooked ? styles.bookedSlotText : styles.freeSlotText]}>
                                        {isBooked ? 'Booked' : `Free | ${slot.mode}`}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <LinearGradient
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    colors={[grad1, grad2]}
                    locations={[0.196, 1]}
                    style={styles.button}
                >
                    <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.buttonPressable}
                        onPress={() => router.push('/availability' as any)}
                    >
                        <Text style={styles.buttonText}>Manage Availability</Text>
                    </TouchableOpacity>
                </LinearGradient>
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
        minHeight: 300,
        alignItems: 'center',
        paddingTop: 34,
        paddingBottom: 26,
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
    favoriteButton: {
        position: 'absolute',
        right: 18,
        top: 32,
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.18)',
    },
    profileImage: {
        width: 118,
        height: 118,
        borderRadius: 59,
        marginTop: 18,
        marginBottom: 16,
        borderWidth: 3,
        borderColor: '#fff',
        backgroundColor: 'rgba(255,255,255,0.24)',
    },
    name: {
        color: '#fff',
        fontSize: 24,
        fontFamily: 'Poppins',
        fontWeight: '800',
        textAlign: 'center',
    },
    specialty: {
        color: '#fff',
        fontSize: 15,
        fontFamily: 'Poppins',
        fontWeight: '600',
        marginTop: 6,
        opacity: 0.92,
    },
    statusPill: {
        minHeight: 30,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: 'rgba(255,255,255,0.18)',
        paddingHorizontal: 12,
        marginTop: 12,
    },
    statusDot: {
        width: 9,
        height: 9,
        borderRadius: 5,
    },
    onlineDot: {
        backgroundColor: '#35D07F',
    },
    statusText: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
    statsRow: {
        width: '90%',
        alignSelf: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        gap: 10,
    },
    notice: {
        width: '90%',
        alignSelf: 'center',
        color: grad1,
        fontSize: 12,
        fontFamily: 'Poppins',
        fontWeight: '900',
        marginTop: 12,
        textAlign: 'center',
    },
    statItem: {
        flex: 1,
        minHeight: 92,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 8,
    },
    statValue: {
        color: '#252525',
        fontSize: 14,
        fontFamily: 'Poppins',
        fontWeight: '800',
        marginTop: 6,
        textAlign: 'center',
    },
    statLabel: {
        color: grad1,
        fontSize: 11,
        fontFamily: 'Poppins',
        fontWeight: '600',
        marginTop: 2,
    },
    section: {
        width: '90%',
        alignSelf: 'center',
        marginTop: 22,
    },
    sectionTitle: {
        color: '#252525',
        fontSize: 18,
        fontFamily: 'Poppins',
        fontWeight: '800',
        marginBottom: 10,
    },
    bodyText: {
        color: '#252525',
        fontSize: 14,
        lineHeight: 22,
        fontFamily: 'Poppins',
        fontWeight: '500',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    freeDot: {
        backgroundColor: grad1,
    },
    bookedDot: {
        backgroundColor: '#E94D5F',
    },
    legendText: {
        color: '#252525',
        fontSize: 11,
        fontFamily: 'Poppins',
        fontWeight: '600',
    },
    calendarDays: {
        gap: 8,
        marginBottom: 10,
    },
    dayButton: {
        minWidth: 98,
        height: 42,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(8, 81, 97, 0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 10,
    },
    selectedDayButton: {
        borderColor: grad1,
        backgroundColor: 'rgba(19, 202, 214, 0.16)',
    },
    dayText: {
        color: '#252525',
        fontSize: 12,
        fontFamily: 'Poppins',
        fontWeight: '700',
    },
    selectedDayText: {
        color: grad1,
    },
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    timeSlot: {
        width: '48%',
        minHeight: 62,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    freeSlot: {
        borderColor: 'rgba(8, 81, 97, 0.24)',
        backgroundColor: 'rgba(19, 202, 214, 0.12)',
    },
    bookedSlot: {
        borderColor: 'rgba(233, 77, 95, 0.24)',
        backgroundColor: 'rgba(233, 77, 95, 0.10)',
    },
    selectedSlot: {
        borderColor: grad1,
        borderWidth: 2,
        backgroundColor: 'rgba(19, 202, 214, 0.22)',
    },
    timeSlotText: {
        color: '#252525',
        fontSize: 14,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
    timeSlotStatus: {
        fontSize: 12,
        fontFamily: 'Poppins',
        fontWeight: '700',
        marginTop: 2,
    },
    freeSlotText: {
        color: grad1,
    },
    bookedSlotText: {
        color: '#E94D5F',
    },
    button: {
        width: '90%',
        height: 52,
        alignSelf: 'center',
        borderRadius: 12,
        marginTop: 18,
    },
    disabledButton: {
        opacity: 0.5,
    },
    buttonPressable: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
});
