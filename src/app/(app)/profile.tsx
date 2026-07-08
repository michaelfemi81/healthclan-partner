import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../constants/ctx';
import { emitPartnerRefresh, subscribePartnerRefresh } from '../../lib/app-events';
import { partnerApi, type UploadableFile, type VerificationDocumentType } from '../../lib/api';
import { isAllowedVerificationFile } from '../../lib/validation';

export const IOS = Platform.OS === 'ios';
const grad1 = '#085161';
const grad2 = '#11a2c1';
const defaultDoctorImage = require('../../../assets/images/default-doctor-illustration.png');
const documentTypes: { label: string; value: VerificationDocumentType }[] = [
    { label: 'Medical license', value: 'medical_license' },
    { label: 'Identity document', value: 'identity_document' },
    { label: 'Insurance', value: 'insurance' },
    { label: 'CQC registration', value: 'cqc_registration' },
];

export default function Profile() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { signOut } = useSession();
    const [profile, setProfile] = useState<any>(null);
    const [documentType, setDocumentType] = useState<VerificationDocumentType>('medical_license');
    const [selectedFile, setSelectedFile] = useState<UploadableFile | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadNotice, setUploadNotice] = useState('');

    useEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    const loadProfile = () => {
        partnerApi.profile()
            .then(setProfile)
            .catch(() => null);
    };

    useEffect(() => {
        loadProfile();
    }, []);

    useEffect(() => subscribePartnerRefresh(['profile', 'verification'], loadProfile), []);

    const user = profile?.user || {};
    const doctorProfile = profile?.profile || {};
    const verificationDocuments = Array.isArray(profile?.verificationDocuments) ? profile.verificationDocuments : [];
    const verificationStatus = doctorProfile.verificationStatus || 'pending';
    const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'HealthClan Partner';
    const avatarSource = user.avatar ? { uri: user.avatar } : defaultDoctorImage;
    const profileItems = [
        { icon: 'person-outline', label: 'Full Name', value: fullName },
        { icon: 'medkit-outline', label: 'Specialty', value: doctorProfile.specialization || 'Doctor' },
        { icon: 'mail-outline', label: 'Email', value: user.email || 'Not added' },
        { icon: 'call-outline', label: 'Phone', value: [user.countryCode, user.phone].filter(Boolean).join(' ') || 'Not added' },
        { icon: 'briefcase-outline', label: 'Consultation Scope', value: 'Secure video consultations' },
        { icon: 'ribbon-outline', label: 'License', value: doctorProfile.licenseNumber || 'Not added' },
    ];

    const chooseDocument = () => {
        setUploadNotice('');

        DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            multiple: false,
            type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        })
            .then(result => {
                if (result.canceled) return;

                const asset = result.assets[0];

                setSelectedFile({
                    uri: asset.uri,
                    file: asset.file,
                    name: asset.name || 'verification-document',
                    type: asset.mimeType || 'application/octet-stream',
                    size: asset.size,
                });
            })
            .catch(() => setUploadNotice('Unable to open document picker.'));
    };

    const uploadDocument = async () => {
        if (!selectedFile) {
            setUploadNotice('Choose a license, identity document, insurance, or registration file first.');
            return;
        }

        if (!isAllowedVerificationFile(selectedFile.type, selectedFile.name)) {
            setUploadNotice('Only JPG, PNG, WEBP, and PDF files can be uploaded.');
            return;
        }

        const fileSize = Number(selectedFile.size || (selectedFile.file as any)?.size || 0);

        if (fileSize > 5 * 1024 * 1024) {
            setUploadNotice('Verification document must be 5MB or smaller.');
            return;
        }

        setUploading(true);
        setUploadNotice('');

        try {
            await partnerApi.uploadVerificationDocument(documentType, selectedFile);
            setUploadNotice('Verification document uploaded. HealthClan will review it shortly.');
            setSelectedFile(null);
            loadProfile();
            emitPartnerRefresh('profile', 'verification-document-uploaded', { documentType });
            emitPartnerRefresh('verification', 'verification-document-uploaded', { documentType });
            emitPartnerRefresh('notifications', 'verification-document-uploaded', { documentType });
        } catch (error) {
            setUploadNotice(error instanceof Error ? error.message : 'Unable to upload verification document.');
        } finally {
            setUploading(false);
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
                    <Text style={styles.headerTitle}>Doctor Profile</Text>
                    <Image source={avatarSource} style={styles.avatar} />
                    <Text style={styles.name}>{fullName}</Text>
                    <Text style={styles.memberId}>Provider ID: {String(user._id || 'HealthClan')}</Text>
                    <View style={styles.verificationPill}>
                        <Ionicons name="shield-checkmark-outline" size={15} color="#fff" />
                        <Text style={styles.verificationText}>{String(verificationStatus).toUpperCase()}</Text>
                    </View>
                </LinearGradient>

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{doctorProfile.completedAppointments || 0}</Text>
                        <Text style={styles.statLabel}>Consults</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{doctorProfile.totalPatients || 0}</Text>
                        <Text style={styles.statLabel}>Patients</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{doctorProfile.followUps || 0}</Text>
                        <Text style={styles.statLabel}>Follow-ups</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Professional Information</Text>
                        <TouchableOpacity activeOpacity={0.7} style={styles.editButton} onPress={() => router.push('/edit-profile' as any)}>
                            <Ionicons name="create-outline" size={18} color={grad1} />
                            <Text style={styles.editText}>Edit</Text>
                        </TouchableOpacity>
                    </View>

                    {profileItems.map(item => (
                        <View key={item.label} style={styles.infoRow}>
                            <View style={styles.infoIcon}>
                                <Ionicons name={item.icon as any} size={20} color={grad1} />
                            </View>
                            <View style={styles.infoText}>
                                <Text style={styles.infoLabel}>{item.label}</Text>
                                <Text style={styles.infoValue}>{item.value}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Doctor Verification</Text>
                    <View style={styles.documentCard}>
                        <View style={styles.documentHeader}>
                            <View style={styles.infoIcon}>
                                <Ionicons name="document-attach-outline" size={20} color={grad1} />
                            </View>
                            <View style={styles.infoText}>
                                <Text style={styles.infoLabel}>Verification document</Text>
                                <Text style={styles.infoValue}>{selectedFile?.name || 'No file selected'}</Text>
                            </View>
                        </View>

                        <View style={styles.typeGrid}>
                            {documentTypes.map(item => {
                                const active = documentType === item.value;

                                return (
                                    <TouchableOpacity
                                        key={item.value}
                                        activeOpacity={0.7}
                                        style={[styles.typeButton, active && styles.typeButtonActive]}
                                        onPress={() => setDocumentType(item.value)}
                                    >
                                        <Text style={[styles.typeText, active && styles.typeTextActive]}>{item.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.documentActions}>
                            <TouchableOpacity activeOpacity={0.7} style={styles.secondaryButton} onPress={chooseDocument}>
                                <Ionicons name="folder-open-outline" size={18} color={grad1} />
                                <Text style={styles.secondaryText}>Choose file</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                style={[styles.primaryButton, (!selectedFile || uploading) && styles.disabledButton]}
                                onPress={uploadDocument}
                                disabled={!selectedFile || uploading}
                            >
                                {uploading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Ionicons name="cloud-done-outline" size={18} color="#fff" />
                                )}
                                <Text style={styles.primaryText}>{uploading ? 'Uploading' : 'Upload'}</Text>
                            </TouchableOpacity>
                        </View>

                        {!!uploadNotice && <Text style={styles.uploadNotice}>{uploadNotice}</Text>}

                        {verificationDocuments.length > 0 && (
                            <View style={styles.submittedList}>
                                <Text style={styles.submittedTitle}>Submitted documents</Text>
                                {verificationDocuments.slice(0, 4).map((document: any) => (
                                    <View key={document._id || document.fileUrl} style={styles.submittedRow}>
                                        <View style={styles.submittedIcon}>
                                            <Ionicons name="document-text-outline" size={17} color={grad1} />
                                        </View>
                                        <View style={styles.infoText}>
                                            <Text style={styles.submittedName}>{String(document.documentType || 'document').replace(/_/g, ' ')}</Text>
                                            <Text style={styles.submittedMeta}>{document.createdAt ? new Date(document.createdAt).toLocaleDateString() : 'Submitted'}</Text>
                                        </View>
                                        <Text style={styles.submittedStatus}>{String(document.status || 'pending')}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>

                <TouchableOpacity activeOpacity={0.7} style={styles.signOutButton} onPress={signOut}>
                    <Ionicons name="log-out-outline" size={22} color="#E94D5F" />
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
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
        minHeight: 260,
        alignItems: 'center',
        paddingTop: 28,
        paddingBottom: 28,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 24,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
    avatar: {
        width: 104,
        height: 104,
        borderRadius: 52,
        borderWidth: 3,
        borderColor: '#fff',
        marginTop: 20,
        backgroundColor: 'rgba(255,255,255,0.22)',
    },
    name: {
        color: '#fff',
        fontSize: 22,
        fontFamily: 'Poppins',
        fontWeight: '800',
        marginTop: 14,
    },
    memberId: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Poppins',
        fontWeight: '600',
        marginTop: 4,
        opacity: 0.92,
    },
    verificationPill: {
        minHeight: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.18)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        marginTop: 10,
    },
    verificationText: {
        color: '#fff',
        fontSize: 11,
        fontFamily: 'Poppins',
        fontWeight: '900',
    },
    statsRow: {
        width: '90%',
        alignSelf: 'center',
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    statCard: {
        flex: 1,
        minHeight: 82,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    statValue: {
        color: grad1,
        fontSize: 22,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
    statLabel: {
        color: '#252525',
        fontSize: 12,
        fontFamily: 'Poppins',
        fontWeight: '600',
        marginTop: 2,
    },
    section: {
        width: '90%',
        alignSelf: 'center',
        marginTop: 24,
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
    editButton: {
        minHeight: 34,
        borderRadius: 17,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(19, 202, 214, 0.14)',
        paddingHorizontal: 12,
    },
    editText: {
        color: grad1,
        fontSize: 13,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
    infoRow: {
        minHeight: 68,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        marginBottom: 10,
    },
    infoIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(19, 202, 214, 0.12)',
        marginRight: 12,
    },
    infoText: {
        flex: 1,
    },
    infoLabel: {
        color: grad1,
        fontSize: 12,
        fontFamily: 'Poppins',
        fontWeight: '700',
    },
    infoValue: {
        color: '#252525',
        fontSize: 14,
        fontFamily: 'Poppins',
        fontWeight: '700',
        marginTop: 2,
    },
    documentCard: {
        borderRadius: 16,
        backgroundColor: '#fff',
        padding: 14,
    },
    documentHeader: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 14,
    },
    typeButton: {
        minHeight: 36,
        borderRadius: 18,
        backgroundColor: '#E9F6FE',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    typeButtonActive: {
        backgroundColor: grad1,
    },
    typeText: {
        color: grad1,
        fontSize: 12,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
    typeTextActive: {
        color: '#fff',
    },
    documentActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 14,
    },
    secondaryButton: {
        flex: 1,
        minHeight: 46,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        backgroundColor: 'rgba(19, 202, 214, 0.14)',
    },
    secondaryText: {
        color: grad1,
        fontSize: 13,
        fontFamily: 'Poppins',
        fontWeight: '900',
    },
    primaryButton: {
        flex: 1,
        minHeight: 46,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        backgroundColor: grad1,
    },
    disabledButton: {
        opacity: 0.48,
    },
    primaryText: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Poppins',
        fontWeight: '900',
    },
    uploadNotice: {
        color: grad1,
        fontSize: 12,
        lineHeight: 17,
        fontFamily: 'Poppins',
        fontWeight: '800',
        marginTop: 12,
        textAlign: 'center',
    },
    submittedList: {
        borderTopColor: 'rgba(8,81,97,0.12)',
        borderTopWidth: 1,
        marginTop: 14,
        paddingTop: 12,
        gap: 9,
    },
    submittedTitle: {
        color: '#252525',
        fontSize: 13,
        fontFamily: 'Poppins',
        fontWeight: '900',
    },
    submittedRow: {
        minHeight: 52,
        borderRadius: 14,
        backgroundColor: '#E9F6FE',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 10,
    },
    submittedIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    submittedName: {
        color: '#252525',
        fontSize: 12,
        textTransform: 'capitalize',
        fontFamily: 'Poppins',
        fontWeight: '900',
    },
    submittedMeta: {
        color: '#58727A',
        fontSize: 11,
        fontFamily: 'Poppins',
        fontWeight: '700',
        marginTop: 2,
    },
    submittedStatus: {
        color: grad1,
        fontSize: 11,
        textTransform: 'capitalize',
        fontFamily: 'Poppins',
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
        marginTop: 16,
    },
    signOutText: {
        color: '#E94D5F',
        fontSize: 16,
        fontFamily: 'Poppins',
        fontWeight: '800',
    },
});
