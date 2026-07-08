import { router } from 'expo-router';
import { createContext, use, type PropsWithChildren } from 'react';
import { setApiToken } from '../lib/api';
import { useStorageState } from './useStorageState';

const AuthContext = createContext<{
    signIn: (token?: string) => void;
    signOut: () => void;
    onBoard: () => void;
    //session?: string | null;
    isLoading: boolean;
    onLoading: boolean;
    isAuthenticated?: string | null;
    isOnboard?: string | null;
}>({
    signIn: () => null,
    signOut: () => null,
    onBoard: () => null,
    // session: null,
    isLoading: false,
    onLoading: false,
    isAuthenticated: null,
    isOnboard: null,
});

// This hook can be used to access the user info.
export function useSession() {
    const value = use(AuthContext);
    if (!value) {
        throw new Error('useSession must be wrapped in a <SessionProvider />');
    }

    return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
    // const [[isLoading, session], setSession] = useStorageState('session');
    const [[isLoading, isAuthenticated], setIsAuthenticated] = useStorageState('auth');
    const [[onLoading, isOnboard], setIsOnboard] = useStorageState('onboard');
    return (
        <AuthContext
            value={{
                signIn: (token?: string) => {
                    setIsAuthenticated(token || 'xxx');
                    if (token) setApiToken(token);
                },
                signOut: () => {
                    setIsAuthenticated(null);
                    setApiToken(null);
                    router.push('/sign-in');
                },
                onBoard: () => {
                    setIsOnboard('true');
                },
                //  session,
                isLoading,
                onLoading,
                isAuthenticated,
                isOnboard
            }}>
            {children}
        </AuthContext>
    );
}
