import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../constants/ctx';
import { emitPartnerRefresh, subscribePartnerRefresh } from '../../lib/app-events';
import { partnerApi } from '../../lib/api';
import { globalCurrencies, normalizeCurrency } from '../../lib/global-options';

export const IOS = Platform.OS === 'ios';
const grad1 = '#085161';
const grad2 = '#11a2c1';

const accountItems = [
    { icon: 'person-outline', title: 'Doctor profile', value: 'Specialty, bio, and consult info', route: '/profile' },
    { icon: 'time-outline', title: 'Availability', value: 'Booking days and open slots', route: '/availability' },
    { icon: 'wallet-outline', title: 'Payouts', value: 'Earnings and withdrawal status', route: '/earnings' },
    { icon: 'language-outline', title: 'Language', value: 'App language preference', route: '/language' },
    { icon: 'key-outline', title: 'Change Password', value: 'Update your account password', route: '/change-password' },
    { icon: 'phone-portrait-outline', title: 'Trusted Devices', value: 'Review signed-in devices', route: '/trusted-devices' },
    { icon: 'shield-checkmark-outline', title: 'Privacy & Security', value: 'Permissions and data controls', route: '/privacy-security' },
    { icon: 'card-outline', title: 'Payment Methods', value: 'Cards used for care lead unlocks', route: '/payment-methods' },
    { icon: 'help-circle-outline', title: 'Help & Support', value: 'Contact HealthClan support', route: '/help-support' },
    { icon: 'document-text-outline', title: 'Terms & Conditions', value: 'Read partner usage terms', route: '/terms-conditions' },
    { icon: 'lock-closed-outline', title: 'Privacy Policy', value: 'Read data handling details', route: '/privacy-policy' },
];

export default function Settings() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { signOut } = useSession();
    const [notifications, setNotifications] = useState(true);
    const [reminders, setReminders] = useState(true);
    const [walletCurrency, setWalletCurrency] = useState('GBP');
    const [openDropdown, setOpenDropdown] = useState('');
    const [notice, setNotice] = useState('');
    const walletPreferenceLoaded = useRef(false);

    useEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    const loadSettings = useCallback(() => {
        partnerApi.preferences()
            .then(preferences => {
                setNotifications(preferences?.paymentAlerts !== false && preferences?.securityAlerts !== false);
                setReminders(preferences?.appointmentAlerts !== false);
                const preferredCurrency = normalizeCurrency(preferences?.walletCurrency || preferences?.currency, '');
                if (preferredCurrency) {
                    walletPreferenceLoaded.current = true;
                    setWalletCurrency(preferredCurrency);
                }
            })
            .catch(() => null);

        partnerApi.profile()
            .then(payload => {
                const profileCurrency = normalizeCurrency(payload?.profile?.currency, '');
                if (profileCurrency && !walletPreferenceLoaded.current) setWalletCurrency(profileCurrency);
            })
            .catch(() => null);
    }, []);

    useFocusEffect(loadSettings);

    useEffect(() => subscribePartnerRefresh(['preferences', 'profile'], loadSettings), [loadSettings]);

    const updateNotifications = (value: boolean) => {
        setNotifications(value);
        partnerApi.savePreferences({
            paymentAlerts: value,
            securityAlerts: value,
        })
            .then(() => emitPartnerRefresh('preferences', 'notification-preferences-updated'))
            .catch(() => {
                setNotifications(!value);
                setNotice('Unable to update notification preferences.');
            });
    };

    const updateReminders = (value: boolean) => {
        setReminders(value);
        partnerApi.savePreferences({ appointmentAlerts: value })
            .then(() => emitPartnerRefresh('preferences', 'appointment-reminders-updated'))
            .catch(() => {
                setReminders(!value);
                setNotice('Unable to update appointment reminder preferences.');
            });
    };

    const updateWalletCurrency = (value: string) => {
        const nextCurrency = normalizeCurrency(value, walletCurrency);
        walletPreferenceLoaded.current = true;
        setWalletCurrency(nextCurrency);
        setOpenDropdown('');
        partnerApi.savePreferences({ walletCurrency: nextCurrency, currency: nextCurrency })
            .then(() => emitPartnerRefresh('preferences', 'wallet-currency-updated', { currency: nextCurrency }))
            .catch(() => setNotice('Unable to save wallet currency preference.'));
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
                    <Text style={styles.title}>Settings</Text>
                    <Text style={styles.subtitle}>Control your account and app preferences</Text>
                </LinearGradient>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    {!!notice && <Text style={styles.notice}>{notice}</Text>}
                    <View style={styles.settingRow}>
                        <View style={styles.settingIcon}>
                            <Ionicons name="notifications-outline" size={20} color={grad1} />
                        </View>
                        <View style={styles.settingText}>
                            <Text style={styles.settingTitle}>Push Notifications</Text>
                            <Text style={styles.settingValue}>Appointment updates and messages</Text>
                        </View>
                        <Switch
                            value={notifications}
                            onValueChange={updateNotifications}
                            trackColor={{ false: '#C6D5DE', true: 'rgba(19, 202, 214, 0.45)' }}
                            thumbColor={notifications ? grad1 : '#fff'}
                        />
                    </View>
                    <View style={styles.settingRow}>
                        <View style={styles.settingIcon}>
                            <Ionicons name="alarm-outline" size={20} color={grad1} />
                        </View>
                        <View style={styles.settingText}>
                            <Text style={styles.settingTitle}>Appointment Reminders</Text>
                            <Text style={styles.settingValue}>Remind me before consults</Text>
                        </View>
                        <Switch
                            value={reminders}
                            onValueChange={updateReminders}
                            trackColor={{ false: '#C6D5DE', true: 'rgba(19, 202, 214, 0.45)' }}
                            thumbColor={reminders ? grad1 : '#fff'}
                        />
                    </View>
                    <View style={[styles.settingRow, styles.currencyRow]}>
                        <View style={styles.settingIcon}>
                            <Ionicons name="cash-outline" size={20} color={grad1} />
                        </View>
                        <View style={styles.settingText}>
                            <Text style={styles.settingTitle}>Wallet Currency</Text>
                            <Text style={styles.settingValue}>Used for wallet totals</Text>
                        </View>
                        <Dropdown
                            value={walletCurrency}
                            options={globalCurrencies}
                            open={openDropdown === 'walletCurrency'}
                            onToggle={() => setOpenDropdown(openDropdown === 'walletCurrency' ? '' : 'walletCurrency')}
                            onChange={updateWalletCurrency}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    {accountItems.map(item => (
                        <TouchableOpacity
                            key={item.title}
                            activeOpacity={0.7}
                            style={styles.linkRow}
                            onPress={() => item.route && router.push(item.route as any)}
                        >
                            <View style={styles.settingIcon}>
                                <Ionicons name={item.icon as any} size={20} color={grad1} />
                            </View>
                            <View style={styles.settingText}>
                                <Text style={styles.settingTitle}>{item.title}</Text>
                                <Text style={styles.settingValue}>{item.value}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={grad1} />
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity activeOpacity={0.7} style={styles.signOutButton} onPress={signOut}>
                    <Ionicons name="log-out-outline" size={22} color="#E94D5F" />
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

function Dropdown({
    value,
    options,
    open,
    onToggle,
    onChange,
}: {
    value: string;
    options: string[];
    open: boolean;
    onToggle: () => void;
    onChange: (value: string) => void;
}) {
    return (
        <View style={styles.dropdownBlock}>
            <TouchableOpacity activeOpacity={0.75} style={styles.dropdownButton} onPress={onToggle}>
                <Text style={styles.dropdownValue}>{value}</Text>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={grad1} />
            </TouchableOpacity>
            {open && (
                <ScrollView style={styles.dropdownMenu} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {options.map(option => {
                        const active = option === value;

                        return (
                            <TouchableOpacity
                                key={option}
                                activeOpacity={0.72}
                                style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                                onPress={() => onChange(option)}
                            >
                                <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>{option}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}
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
    sectionTitle: {
        color: '#252525',
        fontSize: 18,
        fontFamily: 'Poppins',
        fontWeight: '800',
        marginBottom: 12,
    },
    notice: {
        color: grad1,
        fontSize: 12,
        fontFamily: 'Poppins',
        fontWeight: '900',
        marginBottom: 10,
    },
    settingRow: {
        minHeight: 76,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        marginBottom: 10,
    },
    currencyRow: {
        alignItems: 'flex-start',
        paddingVertical: 14,
    },
    linkRow: {
        minHeight: 70,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        marginBottom: 10,
    },
    settingIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(19, 202, 214, 0.12)',
        marginRight: 12,
    },
    settingText: {
        flex: 1,
        minWidth: 0,
    },
    settingTitle: {
        color: '#252525',
        fontSize: 14,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
    settingValue: {
        color: grad1,
        fontSize: 12,
        fontFamily: 'Poppins',
        fontWeight: '600',
        marginTop: 3,
    },
    dropdownBlock: {
        width: 112,
    },
    dropdownButton: {
        minHeight: 38,
        borderRadius: 12,
        backgroundColor: '#E9F6FE',
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
    },
    dropdownValue: {
        color: grad1,
        fontSize: 13,
        fontFamily: 'Poppins',
        fontWeight: '900',
    },
    dropdownMenu: {
        maxHeight: 190,
        borderRadius: 12,
        backgroundColor: '#F6FBFE',
        borderWidth: 1,
        borderColor: 'rgba(8,81,97,0.12)',
        marginTop: 6,
    },
    dropdownOption: {
        minHeight: 40,
        justifyContent: 'center',
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(8,81,97,0.08)',
    },
    dropdownOptionActive: {
        backgroundColor: 'rgba(8,81,97,0.1)',
    },
    dropdownOptionText: {
        color: '#252525',
        fontSize: 13,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
    dropdownOptionTextActive: {
        color: grad1,
        fontWeight: '900',
    },
    signOutButton: {
        width: '90%',
        minHeight: 52,
        alignSelf: 'center',
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fff',
        marginTop: 14,
    },
    signOutText: {
        color: '#E94D5F',
        fontSize: 16,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
});
