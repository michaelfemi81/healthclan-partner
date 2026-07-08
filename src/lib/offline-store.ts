import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const memoryStore = new Map<string, string>();
const secureStoreKeyFor = (key: string) =>
  key.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);

async function readRaw(key: string) {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  return SecureStore.getItemAsync(secureStoreKeyFor(key));
}

async function writeRaw(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    try {
      if (value === null) {
        globalThis.localStorage?.removeItem(key);
      } else {
        globalThis.localStorage?.setItem(key, value);
      }
    } catch {
      return;
    }
    return;
  }

  if (value === null) {
    await SecureStore.deleteItemAsync(secureStoreKeyFor(key));
  } else {
    await SecureStore.setItemAsync(secureStoreKeyFor(key), value);
  }
}

export async function readOfflineValue<T>(key: string): Promise<T | null> {
  const raw = await readRaw(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeOfflineValue(key: string, value: unknown) {
  await writeRaw(key, JSON.stringify(value));
}

export async function removeOfflineValue(key: string) {
  await writeRaw(key, null);
}

export type OfflineMutation = {
  id: string;
  path: string;
  method: string;
  body?: unknown;
  createdAt: string;
};

const QUEUE_KEY = 'healthclan.partner.offlineQueue';

export async function readOfflineQueue() {
  return (await readOfflineValue<OfflineMutation[]>(QUEUE_KEY)) || [];
}

export async function enqueueOfflineMutation(mutation: Omit<OfflineMutation, 'id' | 'createdAt'>) {
  const queue = await readOfflineQueue();
  const queued = {
    ...mutation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  };

  await writeOfflineValue(QUEUE_KEY, [...queue, queued]);
  return queued;
}

export async function replaceOfflineQueue(queue: OfflineMutation[]) {
  await writeOfflineValue(QUEUE_KEY, queue);
}
