import { useEffect } from 'react';
import { Platform } from 'react-native';
import { flushOfflineQueue } from '../lib/api';

export function useOfflineSync() {
  useEffect(() => {
    flushOfflineQueue().catch(() => null);

    if (Platform.OS !== 'web') return;

    const sync = () => {
      flushOfflineQueue().catch(() => null);
    };

    globalThis.addEventListener?.('online', sync);
    globalThis.addEventListener?.('focus', sync);

    return () => {
      globalThis.removeEventListener?.('online', sync);
      globalThis.removeEventListener?.('focus', sync);
    };
  }, []);
}

