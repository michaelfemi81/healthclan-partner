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
                            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} colors={[grad1, grad2,]}
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
                                Terms of Use

                            </Text>

                        </LinearGradient>
                        <Text style={[styles.last, { textDecorationLine: 'underline', textDecorationColor: '#13CAD6', textDecorationStyle: 'solid' }]}>
                            Last updated: April 30, 2026
                        </Text>
                        <Text style={styles.sub}>
                            Welcome to our platform. These Terms of Use govern your access to and use of our mobile application, website, and related healthcare services. By creating an account or using our services, you agree to be bound by these Terms.

                            If you do not agree with these Terms, please do not use the platform.
                        </Text>
                        <Text style={styles.wel}>
                            1. Eligibility
                        </Text>
                        <Text style={styles.sub}>
                            You must be at least the legal age required in your jurisdiction to use the platform or have the consent of a parent or legal guardian where permitted.

                            By using the platform, you confirm that the information you provide is accurate and complete.
                        </Text>

                        <Text style={styles.wel}>
                            2. Our Services
                        </Text>
                        <Text style={styles.wel2}>
                            We provide a digital platform that may allow users to:
                        </Text>
                        <View style={{ padding: 20, width: '90%', backgroundColor: 'rgba(19, 202, 214, 0.2)', borderRadius: 10, marginVertical: 10 }}>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Search for healthcare professionals</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Book appointments</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Participate in video consultations</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Access health records and consultation history</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Receive notifications and reminders</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Manage personal account information</Text>

                        </View>
                        <Text style={styles.wel2}>
                            We may update, modify, suspend, or discontinue features at any time.
                        </Text>
                        <Text style={styles.wel}>
                            3. Account Registration
                        </Text>
                        <Text style={styles.sub}>
                            To use certain features, you may need to create an account.
                            {'\n\n'}
                            You agree to:
                        </Text>
                        <View style={{ padding: 20, width: '90%', backgroundColor: 'rgba(19, 202, 214, 0.2)', borderRadius: 10, marginVertical: 10 }}>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Provide accurate information</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Keep your login credentials confidential</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Notify us of unauthorized access</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Accept responsibility for activity under your account</Text>

                        </View>
                        <Text style={styles.last}>
                            We may suspend or terminate accounts that violate these Terms.
                        </Text>

                        <Text style={styles.wel}>
                            4. Medical Disclaimer
                        </Text>
                        <Text style={styles.sub}>
                            Our platform helps connect users with healthcare providers but does not itself provide medical treatment unless explicitly stated.

                            Information available through the platform is for general informational purposes and should not replace professional medical advice, diagnosis, or emergency care.

                            If you believe you are experiencing a medical emergency, contact local emergency services immediately.
                        </Text>
                        <Text style={styles.wel}>
                            5. User Responsibilities
                        </Text>
                        <Text style={styles.sub}>
                            You agree not to:
                        </Text>
                        <View style={{ padding: 20, width: '90%', backgroundColor: 'rgba(19, 202, 214, 0.2)', borderRadius: 10, marginVertical: 10 }}>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Use the platform unlawfully</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Impersonate another person</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Provide false or misleading information</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Abuse, harass, or threaten others</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Upload harmful software or malicious code</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Attempt unauthorized access to systems or accounts</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Interfere with platform operations</Text>
                        </View>

                        <Text style={styles.wel}>
                            6. Appointments and Consultations
                        </Text>
                        <Text style={styles.sub}>

                            Appointments, consultations, availability, and response times depend on participating healthcare professionals.
                            {'\n\n'}
                            We do not guarantee:
                        </Text>
                        <View style={{ padding: 20, width: '90%', backgroundColor: 'rgba(19, 202, 214, 0.2)', borderRadius: 10, marginVertical: 10 }}>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Immediate availability</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Specific treatment outcomes</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Continuous access without interruption</Text>

                        </View>
                        <Text style={styles.sub}>
                            Users are responsible for attending scheduled appointments on time.
                        </Text>
                        <Text style={styles.wel}>
                            7. Payments and Fees
                        </Text>
                        <Text style={styles.sub}>

                            Some services may require payment.

                            By purchasing paid services, you agree to applicable pricing, billing terms, cancellation rules, and refund policies shown at the time of purchase.

                            Third-party payment providers may process transactions securely.
                        </Text>

                        <Text style={styles.wel}>
                            8. Privacy
                        </Text>
                        <Text style={styles.sub}>
                            Your use of the platform is also governed by our Privacy Policy, which explains how your information is collected, used, and protected.
                        </Text>
                        <Text style={styles.wel}>
                            9. Intellectual Property
                        </Text>
                        <Text style={styles.sub}>
                            All content, branding, logos, software, text, graphics, and platform features are owned by us or our licensors and protected by applicable laws.

                            You may not copy, modify, distribute, reverse engineer, or exploit platform content without permission.
                        </Text>
                        <Text style={styles.wel}>
                            10. Third-Party Services
                        </Text>
                        <Text style={styles.sub}>
                            The platform may integrate third-party tools or services such as payment processors, communication providers, or analytics platforms.

                            We are not responsible for third-party services or their separate terms.
                        </Text>
                        <Text style={styles.wel}>
                            11. Suspension or Termination
                        </Text>
                        <Text style={styles.sub}>
                            We may suspend, restrict, or terminate access if you:
                        </Text>
                        <View style={{ padding: 20, width: '90%', backgroundColor: 'rgba(19, 202, 214, 0.2)', borderRadius: 10, marginVertical: 10 }}>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Violate these Terms</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Misuse the platform</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Create legal or security risk</Text>
                            <Text style={{ fontSize: 16, marginBottom: 8 }}>• Provide false information</Text>
                        </View>
                        <Text style={styles.wel}>
                            12. Limitation of Liability
                        </Text>
                        <Text style={styles.sub}>
                            To the maximum extent permitted by law, we are not liable for indirect, incidental, special, or consequential damages arising from use of the platform.

                            We do not guarantee uninterrupted, error-free, or always-available service.
                        </Text>
                        <Text style={styles.wel}>
                            13. Indemnification
                        </Text>
                        <Text style={styles.sub}>
                            You agree to defend and hold us harmless from claims, damages, losses, or expenses arising from your misuse of the platform or violation of these Terms.
                        </Text>
                        <Text style={styles.wel}>
                            14. Changes to These Terms
                        </Text>
                        <Text style={styles.sub}>
                            We may update these Terms from time to time. Updated versions become effective when posted within the app or website.

                            Continued use after updates means you accept the revised Terms.
                        </Text>
                        <Text style={styles.wel}>
                            15. Governing Law
                        </Text>
                        <Text style={styles.sub}>
                            These Terms are governed by the laws applicable in the jurisdiction where our business operates, unless otherwise required by local law.
                        </Text>
                        <Text style={styles.wel}>
                            16. Contact Us
                        </Text>
                        <Text style={styles.sub}>
                            If you have questions regarding these Terms, contact us at:
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
                            17. Acceptance
                        </Text>
                        <Text style={styles.sub}>
                            By accessing or using our platform, you acknowledge that you have read, understood, and agreed to these Terms of Use.
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
