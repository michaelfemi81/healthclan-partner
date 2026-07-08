import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { emitPartnerRefresh } from '../../lib/app-events';
import { partnerApi } from '../../lib/api';
import { currencyForPhoneOption, formatMoney, globalCurrencies, normalizeCurrency } from '../../lib/global-options';

const grad1 = '#085161';
const grad2 = '#11a2c1';
const fieldBorder = '#CFE7EF';
const defaultDoctorImage = require('../../../assets/images/default-doctor-illustration.png');
const DEFAULT_CONSULTATION_FEE = 50;
const MIN_CONSULTATION_FEE = 5;
const MAX_CONSULTATION_FEE = 500;

const titles = ['Dr', 'Mr', 'Mrs', 'Miss', 'Ms', 'Prof'];
const experienceOptions = Array.from({ length: 41 }, (_, index) => String(index));
const formKeys: (keyof FormState)[] = [
    'fullName',
    'avatar',
    'countryCode',
    'phone',
    'title',
    'specialization',
    'licenseNumber',
    'registrationBody',
    'yearsOfExperience',
    'languages',
    'bio',
    'consultationFee',
    'currency',
];
const doctorProfileKeys: (keyof FormState)[] = [
    'title',
    'specialization',
    'licenseNumber',
    'registrationBody',
    'yearsOfExperience',
    'languages',
    'bio',
    'consultationFee',
    'currency',
];
const defaultSpecialties = [
    'General Practitioner',
    'Family Medicine',
    'Internal Medicine',
    'Cardiology',
    'Dermatology',
    'Paediatrics',
    'Gynaecology',
    'Neurology',
    'Psychiatry',
    'Orthopaedics',
    'Dentistry',
    'Ophthalmology',
];

type FormState = {
    fullName: string;
    avatar: string;
    countryCode: string;
    phone: string;
    title: string;
    specialization: string;
    licenseNumber: string;
    registrationBody: string;
    yearsOfExperience: string;
    languages: string;
    bio: string;
    consultationFee: string;
    currency: string;
};

const initialForm: FormState = {
    fullName: '',
    avatar: '',
    countryCode: '',
    phone: '',
    title: 'Dr',
    specialization: '',
    licenseNumber: '',
    registrationBody: '',
    yearsOfExperience: '0',
    languages: '',
    bio: '',
    consultationFee: String(DEFAULT_CONSULTATION_FEE),
    currency: 'GBP',
};

function splitFullName(fullName: string) {
    const parts = fullName.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
    const firstName = parts.shift() || '';
    const lastName = parts.join(' ');

    return { firstName, lastName, fullName: [firstName, lastName].filter(Boolean).join(' ') };
}

function toText(value: unknown) {
    if (value === undefined || value === null) return '';
    return String(value);
}

function doctorProfileFieldValue(state: FormState, key: keyof FormState) {
    if (key === 'yearsOfExperience') return Number(state.yearsOfExperience || 0);
    if (key === 'languages') {
        return state.languages
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
    }
    if (key === 'consultationFee') return Number(state.consultationFee || DEFAULT_CONSULTATION_FEE);
    if (key === 'currency') return normalizeCurrency(state.currency, 'GBP');
    if (key === 'specialization') return state.specialization.trim();
    if (key === 'licenseNumber') return state.licenseNumber.trim();
    if (key === 'registrationBody') return state.registrationBody.trim();
    if (key === 'bio') return state.bio.trim();
    if (key === 'title') return state.title;
    return state[key].trim();
}

function buildChangedDoctorProfilePayload(state: FormState, original: FormState) {
    const payload: Record<string, unknown> = {};

    doctorProfileKeys.forEach(key => {
        if (state[key].trim() !== original[key].trim()) {
            payload[key] = doctorProfileFieldValue(state, key);
        }
    });

    if (Object.keys(payload).length) {
        payload.videoProvider = 'twilio';
    }

    return payload;
}

export default function EditProfile() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [form, setForm] = useState<FormState>(initialForm);
    const [originalForm, setOriginalForm] = useState<FormState | null>(null);
    const [specialties, setSpecialties] = useState(defaultSpecialties);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [openDropdown, setOpenDropdown] = useState('');
    const [notice, setNotice] = useState('');
    const avatarSource = form.avatar ? { uri: form.avatar } : defaultDoctorImage;
    const hasChanges = useMemo(() => {
        if (!originalForm) return false;
        return formKeys.some(key => form[key].trim() !== originalForm[key].trim());
    }, [form, originalForm]);

    useEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    useEffect(() => {
        partnerApi.specialties()
            .then(items => {
                const apiSpecialties = items
                    .map((item: any) => typeof item === 'string' ? item : item?.name)
                    .filter(Boolean);

                setSpecialties([...new Set([...apiSpecialties, ...defaultSpecialties])]);
            })
            .catch(() => null);

        partnerApi.profile()
            .then((payload: any) => {
                const user = payload?.user || {};
                const profile = payload?.profile || {};
                const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();

                const loadedCurrency = normalizeCurrency(profile.currency, currencyForPhoneOption('', user.countryCode, 'GBP'));
                const loadedForm = {
                    fullName,
                    avatar: toText(user.avatar),
                    countryCode: toText(user.countryCode),
                    phone: toText(user.phone),
                    title: titles.includes(profile.title) ? profile.title : 'Dr',
                    specialization: toText(profile.specialization),
                    licenseNumber: toText(profile.licenseNumber),
                    registrationBody: toText(profile.registrationBody),
                    yearsOfExperience: profile.yearsOfExperience === undefined || profile.yearsOfExperience === null || profile.yearsOfExperience === ''
                        ? '0'
                        : toText(profile.yearsOfExperience),
                    languages: Array.isArray(profile.languages) ? profile.languages.join(', ') : toText(profile.languages),
                    bio: toText(profile.bio),
                    consultationFee: profile.consultationFee === undefined || profile.consultationFee === null || profile.consultationFee === ''
                        ? String(DEFAULT_CONSULTATION_FEE)
                        : toText(profile.consultationFee),
                    currency: loadedCurrency,
                };

                if (loadedForm.specialization) {
                    setSpecialties(current => [...new Set([loadedForm.specialization, ...current])]);
                }
                setForm(loadedForm);
                setOriginalForm(loadedForm);
            })
            .catch(error => {
                setNotice(error instanceof Error ? error.message : 'Unable to load your profile.');
            })
            .finally(() => setLoading(false));
    }, []);

    const selectedSpecialtyKnown = useMemo(
        () => specialties.some(item => item.toLowerCase() === form.specialization.trim().toLowerCase()),
        [form.specialization],
    );

    const updateField = (key: keyof FormState, value: string) => {
        setNotice('');
        setForm(current => ({ ...current, [key]: value }));
    };

    const choosePicture = async () => {
        setNotice('');

        try {
            const result = await DocumentPicker.getDocumentAsync({
                copyToCacheDirectory: true,
                multiple: false,
                type: ['image/jpeg', 'image/png', 'image/webp'],
            });

            if (result.canceled) return;

            const asset = result.assets[0];
            if (!asset) return;

            updateField('avatar', asset.uri);
        } catch {
            setNotice('Unable to choose a profile picture.');
        }
    };

    const validate = () => {
        const original = originalForm || initialForm;
        const changed = (key: keyof FormState) => form[key].trim() !== original[key].trim();

        if (changed('fullName') && (!splitFullName(form.fullName).firstName || !splitFullName(form.fullName).lastName)) {
            return 'Enter your first and last name.';
        }

        if (changed('specialization') && !form.specialization.trim()) {
            return 'Select or enter your medical specialty.';
        }

        if (changed('yearsOfExperience') && form.yearsOfExperience.trim() && Number.isNaN(Number(form.yearsOfExperience))) {
            return 'Years of experience must be a number.';
        }

        if (changed('consultationFee') && !form.consultationFee.trim()) {
            return `Consultation fee is required. Default fee is ${formatMoney(DEFAULT_CONSULTATION_FEE, form.currency)}.`;
        }

        if (changed('consultationFee') && Number.isNaN(Number(form.consultationFee))) {
            return 'Consultation fee must be a number.';
        }

        const fee = Number(form.consultationFee);

        if (changed('consultationFee') && (fee < MIN_CONSULTATION_FEE || fee > MAX_CONSULTATION_FEE)) {
            return `Consultation fee must be between ${formatMoney(MIN_CONSULTATION_FEE, form.currency)} and ${formatMoney(MAX_CONSULTATION_FEE, form.currency)}.`;
        }

        if (changed('phone') && form.phone.trim() && !/^[0-9\s()+-]{7,20}$/.test(form.phone.trim())) {
            return 'Enter a valid phone number.';
        }

        return '';
    };

    const saveProfile = async () => {
        const validationError = validate();

        if (validationError) {
            setNotice(validationError);
            return;
        }

        const original = originalForm || initialForm;
        const changed = (key: keyof FormState) => form[key].trim() !== original[key].trim();
        const name = splitFullName(form.fullName);
        const userPayload: Record<string, unknown> = {};
        const doctorPayload = buildChangedDoctorProfilePayload(form, original);

        if (changed('fullName')) {
            userPayload.firstName = name.firstName;
            userPayload.lastName = name.lastName;
            userPayload.fullName = name.fullName;
        }

        if (changed('avatar')) userPayload.avatar = form.avatar.trim();
        if (changed('countryCode')) userPayload.countryCode = form.countryCode.trim();
        if (changed('phone')) userPayload.phone = form.phone.trim();

        if (!Object.keys(userPayload).length && !Object.keys(doctorPayload).length) {
            setNotice('Make a change first, then tap Save changes.');
            return;
        }

        setSaving(true);
        setNotice('');

        try {
            if (Object.keys(userPayload).length) await partnerApi.updateUser(userPayload);
            if (Object.keys(doctorPayload).length) await partnerApi.doctorProfile(doctorPayload);
            const freshProfile = await partnerApi.profile().catch(() => null);
            const savedSpecialization = String(freshProfile?.profile?.specialization || '').trim();
            const expectedSpecialization = form.specialization.trim();

            if (changed('specialization') && savedSpecialization.toLowerCase() !== expectedSpecialization.toLowerCase()) {
                throw new Error('Specialty was not saved by the server. Please try again.');
            }

            setNotice('Profile updated successfully.');
            setOriginalForm(form);
            emitPartnerRefresh('profile', 'profile-updated', { userPayload, doctorPayload, profile: freshProfile });
            emitPartnerRefresh('dashboard', 'profile-updated', { userPayload, doctorPayload, profile: freshProfile });
            emitPartnerRefresh('notifications', 'profile-updated', { userPayload, doctorPayload, profile: freshProfile });
            setTimeout(() => router.replace('/profile' as any), 450);
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Unable to update your profile.');
        } finally {
            setSaving(false);
        }
    };

    const updateCurrency = async (nextCurrency: string) => {
        const currency = normalizeCurrency(nextCurrency, form.currency);
        const previousCurrency = form.currency;
        const fee = Number(form.consultationFee || DEFAULT_CONSULTATION_FEE);
        updateField('currency', currency);
        setOpenDropdown('');

        if (currency !== previousCurrency && Number.isFinite(fee) && fee >= 0) {
            try {
                const converted = await partnerApi.convertCurrency({
                    amount: fee,
                    from: previousCurrency,
                    to: currency,
                });
                updateField('consultationFee', String(converted.convertedAmount));
                setNotice('Currency and consultation fee converted with backend exchange rates.');
            } catch (error) {
                setNotice(error instanceof Error ? error.message : 'Currency changed, but the backend could not convert the fee right now.');
            }
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#E9F6FE', paddingTop: insets.top }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.screen}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: insets.bottom + 118 }}
                >
                    <LinearGradient
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        colors={[grad1, grad2]}
                        locations={[0.196, 1]}
                        style={styles.header}
                    >
                        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={22} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerIcon}>
                            <Ionicons name="id-card-outline" size={26} color="#fff" />
                        </View>
                        <Text style={styles.headerTitle}>Edit Profile</Text>
                        <Text style={styles.headerText}>Keep your professional details current for admin verification.</Text>
                    </LinearGradient>

                    {loading ? (
                        <View style={styles.loadingCard}>
                            <ActivityIndicator color={grad1} />
                            <Text style={styles.loadingText}>Loading profile</Text>
                        </View>
                    ) : (
                        <View style={styles.form}>
                            {!!notice && (
                                <View style={styles.notice}>
                                    <Ionicons name="information-circle-outline" size={18} color={grad1} />
                                    <Text style={styles.noticeText}>{notice}</Text>
                                </View>
                            )}

                            <View style={styles.avatarPanel}>
                                <Image source={avatarSource} style={styles.avatar} resizeMode="cover" />
                                <View style={styles.avatarActions}>
                                    <TouchableOpacity activeOpacity={0.75} style={styles.avatarButton} onPress={choosePicture}>
                                        <Ionicons name="image-outline" size={18} color="#fff" />
                                        <Text style={styles.avatarButtonText}>Change picture</Text>
                                    </TouchableOpacity>
                                    {!!form.avatar && (
                                        <TouchableOpacity activeOpacity={0.75} style={styles.avatarButtonLight} onPress={() => updateField('avatar', '')}>
                                            <Text style={styles.avatarButtonLightText}>Use default</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Personal details</Text>
                                <Field label="Full name" value={form.fullName} onChangeText={value => updateField('fullName', value)} />
                                <View style={styles.inlineFields}>
                                    <Field label="Code" value={form.countryCode} onChangeText={value => updateField('countryCode', value)} placeholder="+44" compact />
                                    <Field label="Phone" value={form.phone} onChangeText={value => updateField('phone', value)} keyboardType="phone-pad" flex />
                                </View>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Professional details</Text>
                                <Dropdown label="Title" options={titles} value={form.title} open={openDropdown === 'title'} onToggle={() => setOpenDropdown(openDropdown === 'title' ? '' : 'title')} onChange={value => { updateField('title', value); setOpenDropdown(''); }} />
                                <Text style={styles.label}>Specialty</Text>
                                <View style={styles.chips}>
                                    {specialties.map(item => {
                                        const active = item.toLowerCase() === form.specialization.trim().toLowerCase();

                                        return (
                                            <TouchableOpacity
                                                key={item}
                                                activeOpacity={0.72}
                                                style={[styles.chip, active && styles.activeChip]}
                                                onPress={() => updateField('specialization', item)}
                                            >
                                                <Text style={[styles.chipText, active && styles.activeChipText]}>{item}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                <Field
                                    label={selectedSpecialtyKnown ? 'Specialty' : 'Custom specialty'}
                                    value={form.specialization}
                                    onChangeText={value => updateField('specialization', value)}
                                    placeholder="Enter specialty"
                                />
                                <Field label="License number" value={form.licenseNumber} onChangeText={value => updateField('licenseNumber', value)} />
                                <Field label="Registration body" value={form.registrationBody} onChangeText={value => updateField('registrationBody', value)} placeholder="GMC, MDCN, NMC..." />
                                <Dropdown label="Years of experience" options={experienceOptions} value={form.yearsOfExperience || '0'} open={openDropdown === 'experience'} onToggle={() => setOpenDropdown(openDropdown === 'experience' ? '' : 'experience')} onChange={value => { updateField('yearsOfExperience', value); setOpenDropdown(''); }} />
                                <Field label="Languages" value={form.languages} onChangeText={value => updateField('languages', value)} placeholder="English, Yoruba" />
                                <Field label="Bio" value={form.bio} onChangeText={value => updateField('bio', value)} multiline />
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Consultation setup</Text>
                                <Text style={styles.helperText}>Default fee is {formatMoney(DEFAULT_CONSULTATION_FEE, form.currency)}. Allowed range: {formatMoney(MIN_CONSULTATION_FEE, form.currency)}-{formatMoney(MAX_CONSULTATION_FEE, form.currency)}. Exchange rates are applied by the backend.</Text>
                                <View style={styles.inlineFields}>
                                    <Field label="Fee" value={form.consultationFee} onChangeText={value => updateField('consultationFee', value)} keyboardType="numeric" compact />
                                    <Dropdown label="Currency" options={globalCurrencies} value={form.currency} open={openDropdown === 'currency'} onToggle={() => setOpenDropdown(openDropdown === 'currency' ? '' : 'currency')} onChange={updateCurrency} flex />
                                </View>
                            </View>

                            <View style={styles.inlineSavePanel}>
                                <View style={styles.inlineSaveText}>
                                    <Text style={styles.inlineSaveTitle}>{hasChanges ? 'Unsaved profile changes' : 'Profile is ready'}</Text>
                                    <Text style={styles.inlineSaveSubtitle}>{hasChanges ? 'Send your latest details to HealthClan.' : 'Change any field, then send it to HealthClan.'}</Text>
                                </View>
                                <TouchableOpacity
                                    activeOpacity={0.75}
                                    style={[styles.inlineSaveButton, saving && styles.disabledButton]}
                                    onPress={saveProfile}
                                    disabled={saving}
                                >
                                    {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="cloud-upload-outline" size={19} color="#fff" />}
                                    <Text style={styles.inlineSaveButtonText}>{saving ? 'Saving' : 'Send changes'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </ScrollView>

                {!loading && (
                    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                        <TouchableOpacity
                            activeOpacity={0.75}
                            style={[styles.saveButton, saving && styles.disabledButton]}
                            onPress={saveProfile}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="save-outline" size={20} color="#fff" />}
                            <Text style={styles.saveText}>{saving ? 'Saving' : 'Save changes'}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

function Field({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    multiline,
    compact,
    flex,
}: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    multiline?: boolean;
    compact?: boolean;
    flex?: boolean;
}) {
    return (
        <View style={[styles.field, compact && styles.compactField, flex && styles.flexField]}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder || label}
                placeholderTextColor="#7B98A0"
                keyboardType={keyboardType}
                multiline={multiline}
                style={[styles.input, multiline && styles.multilineInput]}
            />
        </View>
    );
}

function OptionRow({
    label,
    options,
    value,
    onChange,
    flex,
}: {
    label: string;
    options: string[];
    value: string;
    onChange: (value: string) => void;
    flex?: boolean;
}) {
    return (
        <View style={[styles.optionBlock, flex && styles.flexField]}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.optionRow}>
                {options.map(option => {
                    const active = option === value;

                    return (
                        <TouchableOpacity
                            key={option}
                            activeOpacity={0.72}
                            style={[styles.optionButton, active && styles.optionButtonActive]}
                            onPress={() => onChange(option)}
                        >
                            <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.replace(/_/g, ' ')}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

function Dropdown({
    label,
    options,
    value,
    open,
    onToggle,
    onChange,
    flex,
}: {
    label: string;
    options: string[];
    value: string;
    open: boolean;
    onToggle: () => void;
    onChange: (value: string) => void;
    flex?: boolean;
}) {
    return (
        <View style={[styles.dropdownBlock, flex && styles.flexField]}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity activeOpacity={0.75} style={styles.dropdownButton} onPress={onToggle}>
                <Text style={styles.dropdownValue}>{value || `Select ${label.toLowerCase()}`}</Text>
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
        minHeight: 214,
        paddingHorizontal: 22,
        paddingTop: 18,
        paddingBottom: 26,
        justifyContent: 'flex-end',
    },
    backButton: {
        position: 'absolute',
        top: 18,
        left: 18,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    headerIcon: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.18)',
        marginBottom: 12,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 26,
        fontFamily: 'Poppins',
        fontWeight: '900',
    },
    headerText: {
        color: '#fff',
        fontSize: 13,
        lineHeight: 19,
        fontFamily: 'Poppins',
        fontWeight: '600',
        marginTop: 6,
        opacity: 0.92,
        maxWidth: 330,
    },
    loadingCard: {
        width: '90%',
        alignSelf: 'center',
        minHeight: 116,
        borderRadius: 16,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 22,
        gap: 10,
    },
    loadingText: {
        color: grad1,
        fontSize: 13,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
    form: {
        width: '90%',
        alignSelf: 'center',
        marginTop: 20,
        gap: 16,
    },
    avatarPanel: {
        borderRadius: 16,
        backgroundColor: '#fff',
        padding: 14,
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 108,
        height: 108,
        borderRadius: 54,
        backgroundColor: '#E9F6FE',
    },
    avatarActions: {
        width: '100%',
        flexDirection: 'row',
        gap: 10,
    },
    avatarButton: {
        flex: 1,
        minHeight: 46,
        borderRadius: 14,
        backgroundColor: grad1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingHorizontal: 12,
    },
    avatarButtonText: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Poppins',
        fontWeight: '900',
    },
    avatarButtonLight: {
        flex: 1,
        minHeight: 46,
        borderRadius: 14,
        backgroundColor: '#E9F6FE',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    avatarButtonLightText: {
        color: grad1,
        fontSize: 13,
        fontFamily: 'Poppins',
        fontWeight: '900',
    },
    notice: {
        minHeight: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(19, 202, 214, 0.14)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
    },
    noticeText: {
        flex: 1,
        color: grad1,
        fontSize: 12,
        lineHeight: 17,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
    section: {
        borderRadius: 16,
        backgroundColor: '#fff',
        padding: 14,
        gap: 12,
    },
    sectionTitle: {
        color: '#252525',
        fontSize: 17,
        fontFamily: 'Poppins',
        fontWeight: '900',
    },
    inlineFields: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
    },
    field: {
        gap: 7,
    },
    flexField: {
        flex: 1,
    },
    compactField: {
        width: 104,
    },
    label: {
        color: grad1,
        fontSize: 12,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
    helperText: {
        color: '#58727A',
        fontSize: 12,
        lineHeight: 17,
        fontFamily: 'Poppins',
        fontWeight: '700',
    },
    input: {
        minHeight: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: fieldBorder,
        backgroundColor: '#F9FDFF',
        color: '#252525',
        fontSize: 14,
        fontFamily: 'Poppins',
        fontWeight: '700',
        paddingHorizontal: 12,
    },
    multilineInput: {
        minHeight: 104,
        paddingTop: 12,
        textAlignVertical: 'top',
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        minHeight: 36,
        borderRadius: 18,
        backgroundColor: '#E9F6FE',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    activeChip: {
        backgroundColor: grad1,
    },
    chipText: {
        color: grad1,
        fontSize: 12,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
    activeChipText: {
        color: '#fff',
    },
    optionBlock: {
        gap: 7,
    },
    optionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionButton: {
        minHeight: 38,
        borderRadius: 19,
        borderWidth: 1,
        borderColor: fieldBorder,
        backgroundColor: '#F9FDFF',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    optionButtonActive: {
        borderColor: grad1,
        backgroundColor: grad1,
    },
    optionText: {
        color: grad1,
        fontSize: 12,
        textTransform: 'capitalize',
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
    optionTextActive: {
        color: '#fff',
    },
    dropdownBlock: {
        gap: 7,
    },
    dropdownButton: {
        minHeight: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: fieldBorder,
        backgroundColor: '#F9FDFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        paddingHorizontal: 12,
    },
    dropdownValue: {
        flex: 1,
        color: '#252525',
        fontSize: 14,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
    dropdownMenu: {
        maxHeight: 220,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: fieldBorder,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    dropdownOption: {
        minHeight: 42,
        justifyContent: 'center',
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(8,81,97,0.08)',
    },
    dropdownOptionActive: {
        backgroundColor: 'rgba(19, 202, 214, 0.12)',
    },
    dropdownOptionText: {
        color: '#252525',
        fontSize: 13,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
    dropdownOptionTextActive: {
        color: grad1,
    },
    inlineSavePanel: {
        borderRadius: 16,
        backgroundColor: '#fff',
        padding: 14,
        gap: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(8,81,97,0.12)',
    },
    inlineSaveText: {
        gap: 4,
    },
    inlineSaveTitle: {
        color: '#252525',
        fontSize: 15,
        fontFamily: 'Poppins',
        fontWeight: '900',
    },
    inlineSaveSubtitle: {
        color: '#58727A',
        fontSize: 12,
        lineHeight: 17,
        fontFamily: 'Poppins',
        fontWeight: '700',
    },
    inlineSaveButton: {
        minHeight: 52,
        borderRadius: 15,
        backgroundColor: grad1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    inlineSaveButtonText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'Poppins',
        fontWeight: '900',
    },
    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 18,
        paddingTop: 12,
        backgroundColor: 'rgba(233,246,254,0.96)',
        borderTopColor: 'rgba(8,81,97,0.1)',
        borderTopWidth: 1,
    },
    saveButton: {
        minHeight: 54,
        borderRadius: 16,
        backgroundColor: grad1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    disabledButton: {
        opacity: 0.6,
    },
    saveText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: 'Poppins',
        fontWeight: '900',
    },
});
