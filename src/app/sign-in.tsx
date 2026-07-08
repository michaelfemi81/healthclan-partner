import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {
    SafeAreaView
} from 'react-native-safe-area-context';
import { useSession } from '../constants/ctx';
import { partnerApi } from '../lib/api';
import { isValidEmail } from '../lib/validation';
export const IOS = Platform.OS === "ios";
const grad1 = '#085161'
const grad2 = '#11a2c1';
export default function SignIn() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const handleChange = (name: any, val: any) => {
        if (name === 'email') {
            setEmail(val)
        } else if (name === 'password') {
            setPassword(val);
        }
    }

    const { signIn } = useSession();
    const navigation = useNavigation();
    const router = useRouter();
    useEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    const gotoSignup = () => {
        router.replace('/create-account' as any);
    }
    const gotoforgot = () => {
        router.replace('/forgot' as any);
    }
    const handleSubmit = async () => {
        setMessage('');
        const trimmedEmail = email.trim();

        if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
            setMessage('Please enter a valid email address.');
            return;
        }

        if (!password) {
            setMessage('Please enter your password.');
            return;
        }

        setLoading(true);

        try {
            const response = await partnerApi.auth.login({ email: trimmedEmail, password, type: 'doctor' });
            signIn(response.token);
            router.replace('/');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to sign in.');
        } finally {
            setLoading(false);
        }
    }
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={[styles.slide, {
                backgroundColor: '#E9F6FE', alignSelf: 'center',
                width: '100%',
            }]}>
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
                                router.push('/onboard');
                            }
                        } />
                        <Text style={[styles.create]} >
                            Log In

                        </Text>

                    </LinearGradient>
                    <Text style={styles.wel}>
                        Welcome Back
                    </Text>
                    <Text style={styles.sub}>
                        Lets get you back on track with your health goals. Please sign in to continue.
                    </Text>



                    <TextInput
                        placeholder="Email"
                        placeholderTextColor={'rgba(19, 202, 214, 1)'}
                        autoCorrect={false}
                        autoCapitalize={'none'}
                        keyboardType={'email-address'}
                        value={email}
                        style={styles.field}
                        onChangeText={v => handleChange('email', v)}
                    />



                    <View style={styles.passwordField}>
                        <TextInput
                            placeholder="Password"
                            placeholderTextColor={'rgba(19, 202, 214, 1)'}
                            autoCorrect={false}
                            autoCapitalize={'none'}
                            value={password}
                            secureTextEntry={!passwordVisible}
                            style={styles.passwordInput}
                            onChangeText={v => handleChange('password', v)}
                        />
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => setPasswordVisible(current => !current)}
                            style={styles.passwordToggle}
                        >
                            <Ionicons
                                name={!passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                                size={22}
                                color="rgba(19, 202, 214, 1)"
                            />
                        </TouchableOpacity>
                    </View>


                    <Text style={{
                        textAlign: 'left', color: '#252525', fontSize: 12, width: '100%', marginLeft: '10%', marginVertical: 10,
                    }} >Forgot Password?&nbsp;&nbsp;
                        <Text style={{ color: grad1, fontWeight: '900' }} onPress={v => gotoforgot()}>Recover</Text>

                    </Text>


                    <LinearGradient
                        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} colors={[grad1, grad2,]}
                        locations={[0.196, 1]}
                        style={[styles.button, {
                            backgroundColor: '#13CAD6', flexDirection: 'row', alignContent: 'center', padding: 0, alignItems: 'center',
                            justifyContent: 'center', marginVertical: 15, minWidth: '90%'

                        }]}
                    >
                        <TouchableOpacity activeOpacity={.7}
                            style={{
                                width: '100%', height: '100%', flex: 1, flexDirection: 'row', alignContent: 'center', alignItems: 'center', justifyContent: 'center'

                            }}
                            onPress={handleSubmit}
                        >
                            <Text
                                style={{ fontFamily: 'Poppins', fontSize: 24, height: 48, fontWeight: 800, lineHeight: 48, textAlign: 'center', color: '#FFFFFF' }}
                            >Log In</Text>
                            <ActivityIndicator animating={loading} color={'#FFFFFF'} />
                        </TouchableOpacity>
                    </LinearGradient>

                    {!!message && (
                        <Text style={styles.errorText}>{message}</Text>
                    )}



                    <Text style={{
                        textAlign: 'center', color: '#252525', fontSize: 12, marginVertical: 15,
                    }} >Haven’t registered yet?&nbsp;&nbsp;
                        <Text style={{ color: grad1, fontWeight: '900' }} onPress={v => gotoSignup()}>Signup</Text>

                    </Text>



                </KeyboardAvoidingView>
            </ScrollView>
        </SafeAreaView>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E9F6FE',
        justifyContent: 'flex-start',
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
    intext: {
        textAlign: 'left', color: '#000', fontSize: 20, marginTop: 12, marginBottom: 6, width: '100%',
        paddingLeft: 15, fontFamily: 'Poppins', fontWeight: '600'

    },
    wel: {
        textAlign: 'left', color: grad1, fontSize: 30, marginTop: 12, marginBottom: 6, width: '100%',
        paddingLeft: 15, fontFamily: 'Poppins', fontWeight: '800'

    },
    sub: {
        textAlign: 'left', color: '#252525', fontSize: 15, marginTop: 12, marginBottom: 6, width: '100%',
        paddingHorizontal: 15, fontFamily: 'Poppins', fontWeight: '600'

    },
    field: {
        width: '90%',
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
        width: '90%',
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
    create: {
        color: '#fff',
        fontFamily: 'Poppins',
        lineHeight: 25,
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        height: 25,
        marginLeft: 10,
        width: '80%'
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
        maxWidth: 640,                    // Take up all screen
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
    errorText: {
        width: '90%',
        color: '#E94D5F',
        fontSize: 12,
        fontFamily: 'Poppins',
        fontWeight: '700',
        textAlign: 'center',
        marginTop: 8,
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
        fontFamily: 'Montserrat-Regular',
        fontSize: 18,
        marginHorizontal: 20,
        textAlign: 'center',
    },
});
