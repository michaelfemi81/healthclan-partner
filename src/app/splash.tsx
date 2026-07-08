import Entypo from '@expo/vector-icons/Entypo';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
//import { store, persistor } from './src/store/index';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSession } from '../constants/ctx';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
    // The splash screen can only be prevented from auto-hiding once.
});

// Set the animation options (optional)
/** 
SplashScreen.setOptions({
    duration: 1000,
    fade: true,
});**/

export default function SplashScreenController() {
    const [appIsReady, setAppIsReady] = useState(false);
    const { isLoading } = useSession();

    useEffect(() => {
        async function prepare() {
            try {
                // Preload fonts or make necessary API calls
                await Font.loadAsync(Entypo.font);
                // Give startup state a brief moment to resolve before routing.
                await new Promise(resolve => setTimeout(resolve, 2000));
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
            } catch (e) {
                console.warn(e);
            } finally {
                setAppIsReady(true);
            }
        }

        prepare();
    }, []);

    useEffect(() => {
        if (appIsReady && !isLoading) {
            SplashScreen.hideAsync();
        }
    }, [appIsReady, isLoading]);

    return null;
}
