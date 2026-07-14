import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import {
    SafeAreaView
} from 'react-native-safe-area-context';
import { useSession } from '../constants/ctx';
export const IOS = Platform.OS === "ios";
const grad1 = '#085161'
const grad2 = '#11a2c1';
export default function SignIn() {
    const [email, setEmail] = useState('');
    const [tokensent, setTokensent] = useState(false);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmVisible, setConfirmVisible] = useState(false);
    const personal = [
        "Full name",
        "Email address",
        "Phone number",
        "Date of birth",
        "Gender",
        "Home address",
        "Profile photo (optional)",
    ];
    const handleChange = (name: any, val: any) => {
        if (name === 'email') {
            setEmail(val)
        } else if (name === 'password') {
            setPassword(val);
        } else if (name === 'confirm') {
            setConfirm(val);
        }
    }

    const { signIn } = useSession();
    const navigation = useNavigation();
    const router = useRouter();
    useEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    const gotoLogin = () => {
        router.replace('sign-in' as any);
    }
    const handleSubmit = () => {
        setLoading(true);
    }
    const handleSubmit2 = () => {
        setLoading(true);
    }
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={[styles.slide, {
                backgroundColor: '#E9F6FE', alignSelf: 'center',
                width: '100%',
            }]}>
                {
                    <KeyboardAvoidingView style={[styles.log, { alignSelf: 'center', width: '100%', justifyContent: 'flex-start', flex: 1 }]}>
                        <LinearGradient
                            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} colors={[grad1, grad2]}
                            locations={[0.196, 1]}
                            style={[styles.top, {
                                flexDirection: 'row', alignContent: 'center', padding: 0, alignItems: 'center',
                                justifyContent: 'flex-start', paddingLeft: 20,

                            }]}
                        >
                            <Ionicons name="chevron-back" size={24} color="#fff" onPress={
                                () => {
                                    router.back();
                                }
                            } />
                            <Text style={[styles.create]} >
                                Privacy Policy

                            </Text>

                        </LinearGradient>
                        <Text style={[styles.last, { textDecorationLine: 'underline', textDecorationColor: '#13CAD6', textDecorationStyle: 'solid' }]}>
                            Last updated: April 30, 2026
                        </Text>
                        <Text style={styles.sub}>
                            Your privacy is important to us. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our mobile application, website, and related healthcare services.

                            By using our platform, you agree to the practices described in this Privacy Policy.
                        </Text>
                        <Text style={styles.wel}>
                            1. Information We Collect
                        </Text>
                        <Text style={styles.wel2}>
                            Personal Information
                        </Text>
                        <View style={{ padding: 20, width: '90%', backgroundColor: 'rgba(19, 202, 214, 0.2)', borderRadius: 10, marginVertical: 10 }}>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Full name</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Email address</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Phone number</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Date of birth</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Gender</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Home address</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>
                                • Profile photo (optional)
                            </Text>
                        </View>
                        <Text style={styles.wel2}>
                            Health Information
                        </Text>
                        <View style={{ padding: 20, width: '90%', backgroundColor: 'rgba(19, 202, 214, 0.2)', borderRadius: 10, marginVertical: 10 }}>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Username and password</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Login activity</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Device information</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• IP address </Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• App usage data</Text>
                        </View>
                        <Text style={styles.wel2}>
                            Account Information
                        </Text>
                        <View style={{ padding: 20, width: '90%', backgroundColor: 'rgba(19, 202, 214, 0.2)', borderRadius: 10, marginVertical: 10 }}>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Symptoms and medical concerns</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>•  Consultation notes</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Prescriptions</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Medical history provided by you </Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Uploaded medical documents or images</Text>
                        </View>
                        <Text style={styles.wel2}>
                            Payment Information
                        </Text>
                        <View style={{ padding: 20, width: '90%', backgroundColor: 'rgba(19, 202, 214, 0.2)', borderRadius: 10, marginVertical: 10 }}>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Billing details</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Transaction history</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Subscription details</Text>
                        </View>
                        <Text style={styles.last}>
                            Payment card information may be processed securely by third-party payment providers and may not be stored directly by us.
                        </Text>

                        <Text style={styles.wel}>
                            2. How We Use Your Information
                        </Text>
                        <Text style={styles.wel2}>
                            We use your information to:
                        </Text>
                        <View style={{ padding: 20, width: '90%', backgroundColor: 'rgba(19, 202, 214, 0.2)', borderRadius: 10, marginVertical: 10 }}>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Create and manage your account</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Connect you with licensed healthcare professionals</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Schedule appointments and consultations</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Provide telemedicine services</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Improve app performance and user experience</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Improve our services through analytics</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Maintain medical records and consultation history </Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Process payments and subscriptions</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Send appointment reminders and notifications</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Detect fraud, abuse, or unauthorized activity</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Comply with legal and regulatory obligations</Text>

                        </View>
                        <Text style={styles.wel}>
                            3. Sharing of Information
                        </Text>
                        <Text style={styles.sub}>
                            We may share your information with:
                        </Text>
                        <Text style={styles.wel2}>
                            Healthcare Professionals
                        </Text>
                        <Text style={styles.sub}>
                            Doctors, clinicians, or care providers involved in your treatment.
                        </Text>
                        <Text style={styles.wel2}>
                            Service Providers
                        </Text>
                        <Text style={styles.sub}>
                            Trusted third parties that help us operate the platform, such as:
                        </Text>
                        <View style={{ padding: 20, width: '90%', backgroundColor: 'rgba(19, 202, 214, 0.2)', borderRadius: 10, marginVertical: 10 }}>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Payment processors</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Cloud hosting providers</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Video communication providers</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Analytics tools</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Email or SMS notification services</Text>

                        </View>
                        <Text style={styles.wel2}>
                            Legal Requirements
                        </Text>
                        <Text style={styles.last}>
                            We may disclose information if required by law, court order, or to protect rights, safety, or security.
                        </Text>
                        <Text style={styles.wel}>
                            4. Medical Confidentiality
                        </Text>
                        <Text style={styles.sub}>
                            We take healthcare privacy seriously. Information shared during consultations is treated confidentially and only accessible to authorized individuals involved in delivering services.

                            However, no internet-based system can guarantee absolute security.
                        </Text>
                        <Text style={styles.wel}>
                            5. Data Retention
                        </Text>
                        <Text style={styles.sub}>
                            We keep your information only as long as necessary to:
                        </Text>
                        <View style={{ padding: 20, width: '90%', backgroundColor: 'rgba(19, 202, 214, 0.2)', borderRadius: 10, marginVertical: 10 }}>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Provide our services</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Maintain medical records where required</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Resolve disputes</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Meet legal or regulatory obligations</Text>

                        </View>
                        <Text style={styles.sub}>
                            When no longer required, data may be securely deleted or anonymized.
                        </Text>
                        <Text style={styles.wel}>
                            6. Security Measures
                        </Text>
                        <Text style={styles.sub}>

                            We use reasonable technical and organizational safeguards including:
                        </Text>
                        <View style={{ padding: 20, width: '90%', backgroundColor: 'rgba(19, 202, 214, 0.2)', borderRadius: 10, marginVertical: 10 }}>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Encryption where appropriate</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Secure servers</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Access controls</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Authentication systems</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Monitoring for suspicious activity</Text>

                        </View>
                        <Text style={styles.sub}>
                            You are responsible for keeping your login credentials secure.
                        </Text>
                        <Text style={styles.wel}>
                            7. Your Rights and Choices
                        </Text>
                        <Text style={styles.sub}>

                            Depending on your location, you may have rights to:
                        </Text>
                        <View style={{ padding: 20, width: '90%', backgroundColor: 'rgba(19, 202, 214, 0.2)', borderRadius: 10, marginVertical: 10 }}>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Access your personal data</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Correct inaccurate data</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Request deletion of data</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Withdraw consent where applicable</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Manage notifications</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Request a copy of your data</Text>

                        </View>
                        <Text style={styles.sub}>
                            To exercise your rights, contact us using the details below.
                        </Text>
                        <Text style={styles.wel}>
                            8. Cookies and Analytics
                        </Text>
                        <Text style={styles.sub}>
                            Our website or app may use cookies, analytics tools, and similar technologies to improve functionality, remember preferences, and understand usage trends.

                            You may manage certain permissions through your device settings.
                        </Text>
                        <Text style={styles.wel}>
                            9. Children&apos;s Privacy
                        </Text>
                        <Text style={styles.sub}>
                            Our services are not intended for children without parent or guardian involvement where required by law. We do not knowingly collect data unlawfully from minors.
                        </Text>
                        <Text style={styles.wel}>
                            10. International Data Transfers
                        </Text>
                        <Text style={styles.sub}>
                            Your information may be stored or processed in countries different from your own. We take reasonable steps to ensure appropriate safeguards are in place.
                        </Text>
                        <Text style={styles.wel}>
                            11. Third-Party Links and Services
                        </Text>
                        <Text style={styles.sub}>
                            Our platform may integrate third-party services. Their privacy practices are governed by their own policies, and we encourage you to review them.
                        </Text>
                        <Text style={styles.wel}>
                            12. Changes to This Policy
                        </Text>
                        <Text style={styles.sub}>
                            We may update this Privacy Policy from time to time. Changes become effective once posted within the app or website.
                        </Text>
                        <Text style={styles.wel}>
                            13. Contact Us
                        </Text>
                        <Text style={styles.sub}>
                            If you have any questions about this Privacy Policy or your data, please contact us at:
                            {"\n\n"}
                            <Text style={{ color: "#252525", fontWeight: "800" }}>Email: &nbsp;</Text>
                            <Text
                                style={{ color: grad1 }}
                                onPress={() => Linking.openURL("mailto:support@healthclan.com")}
                            >
                                support@healthclan.com
                            </Text>
                        </Text>
                        <Text style={styles.wel}>
                            14. Consent
                        </Text>
                        <Text style={styles.sub}>
                            By creating an account or using our services, you acknowledge that you have read and understood this Privacy Policy.
                        </Text>

                    </KeyboardAvoidingView>
                }



            </ScrollView>
        </SafeAreaView>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E9F6FE',

    },
    top: {
        height: 80,
        width: '100%',
        marginBottom: 20,
        maxHeight: 80,
        flexDirection: 'column',
        alignContent: 'center',
        alignItems: 'center',
        justifyContent: 'center'
    },
    field: {
        width: '80%',
        alignSelf: 'center',
        borderRadius: 10,
        height: 45,
        borderWidth: 0.8,
        borderColor: 'rgba(255,255,255,0.5)',
        paddingHorizontal: 10,
        marginVertical: 8,
        backgroundColor: 'rgba(19, 202, 214, 0.2)',
        color: '#000',
    },
    passwordField: {
        width: '80%',
        height: 45,
        alignSelf: 'center',
        borderRadius: 10,
        borderWidth: 0.8,
        borderColor: 'rgba(255,255,255,0.5)',
        marginVertical: 8,
        backgroundColor: 'rgba(19, 202, 214, 0.2)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    passwordInput: {
        flex: 1,
        height: '100%',
        paddingLeft: 10,
        paddingRight: 44,
        color: '#000',
    },
    passwordToggle: {
        position: 'absolute',
        right: 0,
        width: 44,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    intext: {
        textAlign: 'left', color: '#000', fontSize: 20, marginTop: 12, marginBottom: 6, width: '100%',
        paddingLeft: 31, fontFamily: 'Poppins', fontWeight: '600'

    },
    wel: {
        textAlign: 'left', color: grad1, fontSize: 24, marginTop: 12, marginBottom: 6, width: '100%',
        paddingLeft: 31, fontFamily: 'Poppins', fontWeight: '800'

    },
    wel2: {
        textAlign: 'left', color: grad1, fontSize: 18, marginTop: 12, marginBottom: 6, width: '100%',
        paddingLeft: 31, fontFamily: 'Poppins', fontWeight: '800'

    },
    last: {
        textAlign: 'left', color: '#252525', fontSize: 12, marginTop: 12, marginBottom: 6, width: '100%',
        paddingLeft: 31, fontFamily: 'Poppins', fontWeight: '800', paddingHorizontal: 15

    },
    sub: {
        textAlign: 'left', color: '#252525', fontSize: 12, marginTop: 12, marginBottom: 6, width: '100%',
        paddingHorizontal: 31, fontFamily: 'Poppins', fontWeight: '600'

    },
    // Slide styles
    slide: {
        flex: 1,
        width: '100%',
        // Take up all screen
        // Center horizontally
    },
    log: {
        flex: 1,
        width: '100%',
        maxWidth: 920,                    // Take up all screen
        //  justifyContent: 'center',   // Center vertically
        alignItems: 'center',       // Center horizontally

    },

    label: {
        color: '#fff'
    },
    input: {
        borderColor: '#fff',
        color: '#fff'
    },
    button: {
        width: 327,
        height: 48,
        maxHeight: 48,
        borderRadius: 10,
        borderWidth: 0,
        maxWidth: '80%',
    },
    header: {
        color: '#ffffff',
        fontFamily: 'Montserrat-Regular',
        lineHeight: 25,
        fontSize: 18,
        fontWeight: '500',
        textAlign: 'center',
        height: 25,
        marginTop: 5,
        marginBottom: 20,

    },
    header2: {
        color: '#333333',
        fontFamily: 'Montserrat-Regular',
        lineHeight: 25,
        height: 25,
        fontSize: 18,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 5,
        marginBottom: 20,
    },
    // Text below header
    text: {
        color: '#C0C0C0',
        fontFamily: 'Lato-Regular',
        fontSize: 18,
        marginHorizontal: 20,
        textAlign: 'center',
    },
    create: {
        color: '#fff',
        fontFamily: 'Poppinsht',
        lineHeight: 25,
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        height: 25,
        marginLeft: 10,
        width: '80%'
    },
});
