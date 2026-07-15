import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import {
  enqueueOfflineMutation,
  readOfflineQueue,
  readOfflineValue,
  replaceOfflineQueue,
  writeOfflineValue,
} from './offline-store';

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'http://localhost:3000/api/v1'
).replace(/\/+$/, '');
const REALTIME_URL = (
  process.env.EXPO_PUBLIC_REALTIME_URL ||
  `${API_BASE_URL}/users/events`
).replace(/\/+$/, '');

const TOKEN_KEY = 'healthclan.partner.apiToken';

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  token?: string | null;
  cacheKey?: string | false;
  offlineQueue?: boolean;
};

type ApiError = Error & { fromServer?: boolean };
type PartnerAccountType = 'doctor';

export type VerificationDocumentType =
  | 'medical_license'
  | 'company_registration'
  | 'insurance'
  | 'identity_document'
  | 'cqc_registration';

export type UploadableFile = {
  uri?: string;
  name: string;
  type: string;
  size?: number;
  file?: unknown;
};

export type AppointmentDocumentType = 'prescription' | 'sick_note' | 'attendance_note' | 'referral_note';

export async function getApiToken() {
  if (Platform.OS !== 'web') {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }

  try {
    return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export async function getRealtimeUrl() {
  const token = await getApiToken();
  const separator = REALTIME_URL.includes('?') ? '&' : '?';
  return token ? `${REALTIME_URL}${separator}token=${encodeURIComponent(token)}` : REALTIME_URL;
}

async function readToken() {
  return getApiToken();
}

export function setApiToken(token: string | null) {
  if (Platform.OS !== 'web') {
    if (token) {
      SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    return;
  }

  try {
    if (token) {
      globalThis.localStorage?.setItem(TOKEN_KEY, token);
    } else {
      globalThis.localStorage?.removeItem(TOKEN_KEY);
    }
  } catch {
    return;
  }
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = options.token ?? await readToken();
  const method = (options.method || 'GET').toUpperCase();
  const cacheKey = options.cacheKey === false ? undefined : options.cacheKey || (method === 'GET' ? `api-cache:${path}` : undefined);

  headers.set('Accept', 'application/json');
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload?.success === false) {
      const error = new Error(payload?.message || 'HealthClan API request failed') as ApiError;
      error.fromServer = true;
      throw error;
    }

    if (cacheKey) await writeOfflineValue(cacheKey, payload?.data);
    return payload?.data as T;
  } catch (error) {
    if ((error as ApiError).fromServer) throw error;

    const cached = cacheKey ? await readOfflineValue<T>(cacheKey) : null;
    if (cached !== null) return cached;

    if (method !== 'GET' && options.offlineQueue !== false) {
      const queued = await enqueueOfflineMutation({ path, method, body: options.body });
      return { offlineQueued: true, queued } as T;
    }

    throw error;
  }
}

function toQuery(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return '';
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });

  const text = query.toString();
  return text ? `?${text}` : '';
}

export async function flushOfflineQueue() {
  const queue = await readOfflineQueue();
  const failed = [];

  for (const mutation of queue) {
    try {
      await apiRequest(mutation.path, {
        method: mutation.method,
        body: mutation.body,
        offlineQueue: false,
      });
    } catch {
      failed.push(mutation);
    }
  }

  await replaceOfflineQueue(failed);
  return { attempted: queue.length, remaining: failed.length };
}

export async function uploadVerificationDocument(
  documentType: VerificationDocumentType,
  file: UploadableFile,
) {
  const token = await readToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  if (Platform.OS !== 'web' && file.uri) {
    const result = await FileSystem.uploadAsync(
      `${API_BASE_URL}/users/verification-documents`,
      file.uri,
      {
        fieldName: 'document',
        httpMethod: 'POST',
        mimeType: file.type,
        parameters: { documentType },
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        headers,
      },
    );
    const payload = JSON.parse(result.body || '{}');

    if (result.status < 200 || result.status >= 300 || payload?.success === false) {
      throw new Error(payload?.message || 'Unable to upload verification document.');
    }

    return payload?.data;
  }

  const form = new FormData();
  form.append('documentType', documentType);
  form.append('document', file.file as Blob, file.name);

  const response = await fetch(`${API_BASE_URL}/users/verification-documents`, {
    method: 'POST',
    headers,
    body: form,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || 'Unable to upload verification document.');
  }

  return payload?.data;
}

export async function uploadAppointmentDocument(
  appointmentId: string,
  documentType: AppointmentDocumentType,
  file: UploadableFile,
) {
  const token = await readToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const url = `${API_BASE_URL}/doctors/appointments/${encodeURIComponent(appointmentId)}/documents`;

  if (Platform.OS !== 'web' && file.uri) {
    const result = await FileSystem.uploadAsync(url, file.uri, {
      fieldName: 'document',
      httpMethod: 'POST',
      mimeType: file.type,
      parameters: { documentType },
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      headers,
    });
    const payload = JSON.parse(result.body || '{}');
    if (result.status < 200 || result.status >= 300 || payload?.success === false) {
      throw new Error(payload?.message || 'Unable to upload appointment document.');
    }
    return payload?.data;
  }

  const form = new FormData();
  form.append('documentType', documentType);
  form.append('document', file.file as Blob, file.name);
  const response = await fetch(url, { method: 'POST', headers, body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || 'Unable to upload appointment document.');
  }
  return payload?.data;
}

export const partnerApi = {
  auth: {
    register: (body: {
      firstName: string;
      lastName: string;
      email?: string;
      countryCode?: string;
      phone?: string;
      dateOfBirth?: string;
      maritalStatus?: string;
      address?: { line1?: string; country?: string };
      country?: string;
      password: string;
      type: PartnerAccountType;
    }) =>
      apiRequest<{ token: string; user: unknown; verificationEmailSent?: boolean }>('/auth/register', {
        method: 'POST',
        body,
        offlineQueue: false,
      }),
    login: (body: { email?: string; phone?: string; password: string; type: PartnerAccountType }) =>
      apiRequest<{ token: string; user: unknown }>('/auth/login', {
        method: 'POST',
        body,
        offlineQueue: false,
      }),
    verifyEmail: (token: string, type: PartnerAccountType = 'doctor') =>
      apiRequest<any>(`/auth/verify-email/${encodeURIComponent(token)}?type=${encodeURIComponent(type)}`, {
        method: 'GET',
        cacheKey: false,
        offlineQueue: false,
      }),
    resendVerificationEmail: (token?: string | null) =>
      apiRequest('/auth/resend-verification-email', {
        method: 'POST',
        token,
        offlineQueue: false,
      }),
    forgotPassword: (body: { email: string; type: PartnerAccountType }) =>
      apiRequest('/auth/forgot-password', {
        method: 'POST',
        body,
        offlineQueue: false,
      }),
    resetPassword: (body: { token: string; password: string; type: PartnerAccountType }) =>
      apiRequest('/auth/reset-password', {
        method: 'POST',
        body,
        offlineQueue: false,
      }),
  },
  profile: () => apiRequest<any>('/users/me'),
  updateUser: (body: Record<string, unknown>, token?: string | null) =>
    apiRequest<any>('/users/me', { method: 'PATCH', body, token }),
  doctorProfile: (body: Record<string, unknown>, token?: string | null) =>
    apiRequest<any>('/users/doctor-profile', { method: 'PUT', body, token }),
  uploadVerificationDocument,
  uploadAppointmentDocument,
  preferences: () => apiRequest<any>('/users/preferences'),
  savePreferences: (body: Record<string, unknown>, token?: string | null) =>
    apiRequest<any>('/users/preferences', { method: 'PUT', body, token }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiRequest<any>('/users/password', { method: 'PATCH', body }),
  trustedDevices: () => apiRequest<any[]>('/users/trusted-devices'),
  removeTrustedDevice: (id: string) =>
    apiRequest(`/users/trusted-devices/${id}`, { method: 'DELETE' }),
  supportTickets: () => apiRequest<any[]>('/users/support-tickets'),
  createSupportTicket: (body: { subject: string; message: string; category?: string }) =>
    apiRequest<any>('/users/support-tickets', { method: 'POST', body }),
  favoriteDoctors: () => apiRequest<any[]>('/users/favorites/doctors'),
  addFavoriteDoctor: (doctorId: string) =>
    apiRequest<any>(`/users/favorites/doctors/${doctorId}`, { method: 'POST' }),
  removeFavoriteDoctor: (doctorId: string) =>
    apiRequest(`/users/favorites/doctors/${doctorId}`, { method: 'DELETE' }),
  dashboard: () => apiRequest<any>('/doctors/dashboard'),
  specialties: () => apiRequest<any[]>('/doctors/specialties'),
  doctor: (id: string) => apiRequest<any>(`/doctors/${id}`),
  doctorAvailability: (id: string) => apiRequest<any>(`/doctors/${id}/availability`),
  availability: () => apiRequest<any>('/doctors/availability/me'),
  saveAvailability: (body: Record<string, unknown>) =>
    apiRequest('/doctors/availability', { method: 'PUT', body }),
  createService: (body: Record<string, unknown>) =>
    apiRequest('/doctors/services', { method: 'POST', body }),
  bookAppointment: (body: Record<string, unknown>) =>
    apiRequest<any>('/doctors/appointments', { method: 'POST', body }),
  appointments: (params?: { date?: string; startDate?: string; endDate?: string }) =>
    apiRequest<any[]>(`/doctors/appointments/me${toQuery(params)}`),
  appointment: (id: string) => apiRequest<any>(`/doctors/appointments/${id}`),
  acceptAppointment: (id: string) =>
    apiRequest<any>(`/doctors/appointments/${id}/accept`, { method: 'PATCH' }),
  rejectAppointment: (id: string, reason?: string) =>
    apiRequest<any>(`/doctors/appointments/${id}/reject`, { method: 'PATCH', body: reason ? { reason } : {} }),
  joinAppointment: (id: string) =>
    apiRequest<any>(`/doctors/appointments/${id}/join`, { method: 'POST' }),
  endVideo: (id: string) =>
    apiRequest(`/doctors/appointments/${id}/end-video`, { method: 'POST' }),
  completeAppointment: (id: string) =>
    apiRequest(`/doctors/appointments/${id}/complete`, { method: 'PATCH' }),
  saveNotes: (id: string, consultationNotes: string, options?: { markCompleted?: boolean }) =>
    apiRequest<any>(`/doctors/appointments/${id}/notes`, {
      method: 'PATCH',
      body: {
        consultationNotes,
        notes: consultationNotes,
        ...(options?.markCompleted ? { markCompleted: true } : {}),
      },
    }),
  careRequests: () => apiRequest<any[]>('/care/requests'),
  careRequest: (id: string) => apiRequest<any>(`/care/requests/${id}`),
  unlockCareRequest: (id: string, paymentId: string) =>
    apiRequest(`/care/requests/${id}/unlock`, {
      method: 'POST',
      body: { paymentId },
    }),
  createCardSetupIntent: () =>
    apiRequest<{ setupIntentId?: string; clientSecret: string }>('/payments/cards/setup-intent', {
      method: 'POST',
      offlineQueue: false,
    }),
  saveCard: (body: Record<string, unknown>) =>
    apiRequest<any>('/payments/cards', { method: 'POST', body, offlineQueue: false }),
  chargeSavedCard: (body: Record<string, unknown>) =>
    apiRequest<any>('/payments/cards/charge', { method: 'POST', body, offlineQueue: false }),
  cards: () => apiRequest<any[]>('/payments/cards'),
  bankAccounts: () => apiRequest<any[]>('/payments/bank-accounts'),
  saveBankAccount: (body: Record<string, unknown>) =>
    apiRequest('/payments/bank-accounts', { method: 'POST', body }),
  payouts: () => apiRequest<any[]>('/payments/payouts'),
  requestPayout: (body: Record<string, unknown>) =>
    apiRequest('/payments/payouts', { method: 'POST', body }),
  earnings: (params?: { currency?: string }) =>
    apiRequest<any>(`/payments/earnings${toQuery(params)}`),
  convertCurrency: (params: { amount: number | string; from: string; to: string }, token?: string | null) =>
    apiRequest<{ amount: number; from: string; to: string; rate: number; convertedAmount: number }>(
      `/currency/convert${toQuery(params)}`,
      { token, cacheKey: false, offlineQueue: false },
    ),
  notifications: () => apiRequest<any[]>('/notifications'),
  markNotificationRead: (id: string) =>
    apiRequest<any>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    apiRequest('/notifications/read-all', { method: 'PATCH' }),
  deleteNotification: (id: string) =>
    apiRequest(`/notifications/${id}`, { method: 'DELETE' }),
};
