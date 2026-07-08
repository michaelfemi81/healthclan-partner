import Constants from 'expo-constants';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StatusBar, View } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from '../constants/ctx';
import { useOfflineSync } from '../hooks/use-offline-sync';
import SplashScreenController from './splash';

const APP_BACKGROUND = '#E9F6FE';
const STATUS_BAR_BACKGROUND = '#E2EAFF';
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? Constants.statusBarHeight : 0;

export default function Root() {
    useOfflineSync();

    useEffect(() => {
        if (Platform.OS !== 'web') {
            return;
        }

        const root = globalThis.document?.documentElement;
        const body = globalThis.document?.body;

        if (!root || !body) {
            return;
        }

        body.style.margin = '0';
        body.style.backgroundColor = APP_BACKGROUND;
        root.style.minHeight = '100%';
        body.style.minHeight = '100%';
    }, []);

    useEffect(() => {
        StatusBar.setBarStyle('dark-content');

        if (Platform.OS === 'android') {
            NavigationBar.setStyle('dark');
            NavigationBar.setVisibilityAsync('visible');
        }
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: APP_BACKGROUND }}>
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: STATUS_BAR_HEIGHT,
                    backgroundColor: STATUS_BAR_BACKGROUND,
                    zIndex: 1,
                }}
            />
            <SessionProvider>
                <SplashScreenController />
                <SafeAreaProvider style={{ flex: 1 }}>
                    <RootNavigator />
                </SafeAreaProvider>
            </SessionProvider>
        </View>
    );
}

function RootNavigator() {
    const { isAuthenticated, isOnboard } = useSession();

    return (

        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { flex: 1, backgroundColor: APP_BACKGROUND },
                animation: 'fade',
            }}
        >
            <Stack.Protected guard={!!isAuthenticated}>
                <Stack.Screen name="(app)" />
                <Stack.Screen name="calendar" />
            </Stack.Protected>

            <Stack.Protected guard={!isAuthenticated}>
                <Stack.Protected guard={!isAuthenticated && !isOnboard}>
                    <Stack.Screen name="onboard" />
                </Stack.Protected>
                <Stack.Screen name="sign-in" />
                <Stack.Screen name="create-account" />
                <Stack.Screen name="email-confirmation" />
                <Stack.Screen name="verification" />
                <Stack.Screen name="password" />
                <Stack.Screen name="forgot" />
                <Stack.Screen name="privacy" />
                <Stack.Screen name="terms" />
            </Stack.Protected>
        </Stack>
    );
}
