import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { ApiStateCard } from '../../components/api-state';
import { useDoctorVerification } from '../../contexts/doctor-verification';
import { emitPartnerRefresh, subscribePartnerRefresh } from '../../lib/app-events';
import { AppointmentDocumentType, partnerApi } from '../../lib/api';

const grad1 = '#085161';
const grad2 = '#11a2c1';
const VIDEO_SDK_URL = 'https://sdk.twilio.com/js/video/releases/2.30.0/twilio-video.min.js';
const PREVIEW_MEDIA_ID = 'healthclan-partner-camera-preview';
const LOCAL_MEDIA_ID = 'healthclan-partner-local-video';
const REMOTE_MEDIA_ID = 'healthclan-partner-remote-video';
const appointmentDocumentTypes: { value: AppointmentDocumentType; label: string }[] = [
  { value: 'prescription', label: "Doctor's Prescription" },
  { value: 'sick_note', label: 'Sick note' },
  { value: 'attendance_note', label: 'Attendance note' },
  { value: 'referral_note', label: 'Referral note' },
];

type VideoSession = {
  roomId: string;
  token: string;
  expiresAt?: string;
};

declare global {
  interface Window {
    Twilio?: { Video?: { connect: (token: string, options: Record<string, unknown>) => Promise<any> } };
  }
}

function formatTime(value?: string) {
  if (!value) return 'Scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Scheduled';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatStatus(value?: string) {
  return String(value || 'scheduled').replace(/_/g, ' ');
}

function appointmentStartTime(appointment: any) {
  const raw = appointment?.startTime || appointment?.scheduledAt || appointment?.appointmentDate || appointment?.date;
  const date = new Date(raw || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function appointmentEndTime(appointment: any) {
  const explicitEnd = new Date(appointment?.endTime || appointment?.endsAt || 0).getTime();
  if (explicitEnd && !Number.isNaN(explicitEnd)) return explicitEnd;

  const start = appointmentStartTime(appointment);
  const duration = Number(appointment?.durationMinutes || appointment?.service?.durationMinutes || appointment?.duration || 60);
  return start ? start + Math.max(duration, 30) * 60 * 1000 : 0;
}

function isAppointmentJoinable(appointment: any) {
  if (!appointment) return false;
  const status = String(appointment?.status || '').toLowerCase();
  const videoStatus = String(appointment?.videoStatus || '').toLowerCase();
  if (['in_progress', 'in-progress', 'active', 'joined', 'ongoing', 'started'].includes(videoStatus)) return true;
  if (!['confirmed', 'accepted', 'scheduled'].includes(status)) return false;

  const start = appointmentStartTime(appointment);
  const end = appointmentEndTime(appointment);
  if (!start || !end) return false;

  const now = Date.now();
  const opensAt = start - 15 * 60 * 1000;
  const closesAt = end + 15 * 60 * 1000;
  return now >= opensAt && now <= closesAt;
}

function appointmentAvailabilityMessage(appointment: any, approved: boolean) {
  if (!appointment) return 'Appointment details could not be found.';
  if (!approved) return 'Admin verification is required before joining video consultations.';

  const status = String(appointment?.status || '').toLowerCase();
  if (!['confirmed', 'accepted', 'scheduled'].includes(status)) {
    return `This appointment is ${formatStatus(status)}. Camera access is only available for active confirmed consultations.`;
  }

  const start = appointmentStartTime(appointment);
  if (!start) return 'This appointment does not have a valid scheduled time yet.';

  const now = Date.now();
  if (now < start - 15 * 60 * 1000) {
    return `Camera access opens 15 minutes before this consultation at ${formatTime(new Date(start).toISOString())}.`;
  }

  return 'This consultation is no longer active. You can review the details and consultation notes below.';
}

function appointmentTimestamp(appointment: any) {
  const raw = appointment?.startTime || appointment?.scheduledAt || appointment?.appointmentDate || appointment?.date || appointment?.createdAt;
  const date = new Date(raw || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function mergeAppointments(primary: any[], fallback: any[]) {
  const byId = new Map<string, any>();

  [...fallback, ...primary].forEach(item => {
    if (!item?._id) return;
    byId.set(item._id, { ...(byId.get(item._id) || {}), ...item });
  });

  return Array.from(byId.values()).sort((first, second) => appointmentTimestamp(second) - appointmentTimestamp(first));
}

function normalizeVideoSession(response: any): VideoSession | null {
  const payload = response?.videoSession || response?.session || response?.data || response;
  const roomId = String(payload?.roomId || payload?.roomName || '').trim();
  const token = String(payload?.token || payload?.accessToken || '').trim();
  if (!roomId || !token) return null;
  return { roomId, token, expiresAt: payload?.expiresAt };
}

function videoRoomErrorMessage(message?: string) {
  const value = String(message || '').trim();
  if (/authorization|token|jwt/i.test(value)) {
    return 'Video authorization failed. Ask HealthClan admin to check the video API key and secret on the backend.';
  }
  return value || 'Unable to open secure video room.';
}

function videoRoomHtml(session: VideoSession) {
  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
  <style>
    html, body, #room { margin: 0; width: 100%; height: 100%; background: #0b2026; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    #room { position: relative; display: flex; align-items: center; justify-content: center; color: white; }
    #remote { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: #0b2026; }
    #local { display: none; }
    video { width: 100%; height: 100%; object-fit: cover; }
    #status { position: absolute; top: 14px; left: 14px; right: 14px; z-index: 3; color: rgba(255,255,255,.9); font-size: 13px; font-weight: 800; text-align: center; }
  </style>
  <script src="${VIDEO_SDK_URL}"></script>
</head>
<body>
  <div id="room">
    <div id="remote"></div>
    <div id="local"></div>
    <div id="status">Opening secure video room...</div>
  </div>
  <script>
    const token = ${JSON.stringify(session.token)};
    const roomName = ${JSON.stringify(session.roomId)};
    const status = document.getElementById('status');
    const local = document.getElementById('local');
    const remote = document.getElementById('remote');
    let activeRoom;
    let localStream;

    function send(type, payload) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
    }

    function attachTrack(track, container) {
      if (!track || !track.attach) return;
      const element = track.attach();
      element.setAttribute('playsinline', 'true');
      container.appendChild(element);
    }

    function detachTrack(track) {
      if (!track || !track.detach) return;
      track.detach().forEach(element => element.remove());
    }

    function attachParticipant(participant) {
      participant.tracks.forEach(publication => publication.track && attachTrack(publication.track, remote));
      participant.on('trackSubscribed', track => attachTrack(track, remote));
      participant.on('trackUnsubscribed', detachTrack);
    }

    function setLocalTracks(kind, enabled) {
      localStream && localStream.getTracks().forEach(track => {
        if (track.kind === kind) track.enabled = enabled;
      });
      activeRoom && activeRoom.localParticipant && activeRoom.localParticipant.tracks.forEach(publication => {
        const track = publication.track;
        if (!track || track.kind !== kind) return;
        enabled ? track.enable && track.enable() : track.disable && track.disable();
      });
    }

    function handleNativeMessage(event) {
      try {
        const data = JSON.parse(event.data || '{}');
        if (data.type === 'media-control') setLocalTracks(data.kind, data.enabled);
      } catch (error) {}
    }

    window.healthclanSetTracks = setLocalTracks;
    window.addEventListener('message', handleNativeMessage);
    document.addEventListener('message', handleNativeMessage);

    async function getStableLocalMedia() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera tools are not available in this app view.');
      }

      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 20, max: 24 },
            facingMode: 'user'
          }
        });
      } catch (error) {
        send('preview-waiting');
      }

      try {
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } catch (error) {
        send('preview-waiting');
      }

      return navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
    }

    async function start() {
      try {
        if (!window.Twilio || !window.Twilio.Video) throw new Error('Video tools could not load.');
        localStream = await getStableLocalMedia();
        local.innerHTML = '';
        const preview = document.createElement('video');
        preview.autoplay = true;
        preview.muted = true;
        preview.playsInline = true;
        preview.srcObject = localStream;
        local.appendChild(preview);
        send('preview');
        if (!localStream.getAudioTracks().length) send('audio-unavailable');
        if (!localStream.getVideoTracks().length) throw new Error('Camera did not start. Please allow camera access and try again.');

        activeRoom = await window.Twilio.Video.connect(token, {
          name: roomName,
          tracks: localStream.getTracks()
        });
        local.innerHTML = '';
        activeRoom.localParticipant.tracks.forEach(publication => publication.track && attachTrack(publication.track, local));
        activeRoom.participants.forEach(attachParticipant);
        activeRoom.on('participantConnected', attachParticipant);
        activeRoom.on('participantDisconnected', participant => {
          participant.tracks.forEach(publication => publication.track && detachTrack(publication.track));
        });
        activeRoom.on('disconnected', () => send('disconnected'));
        status.textContent = 'Connected';
        setTimeout(() => { status.style.display = 'none'; }, 1400);
        send('connected');
      } catch (error) {
        status.textContent = error.message || 'Unable to open secure video room.';
        send('error', status.textContent);
      }
    }

    window.addEventListener('beforeunload', () => {
      activeRoom && activeRoom.disconnect();
      localStream && localStream.getTracks().forEach(track => track.stop());
    });
    start();
  </script>
</body>
</html>`;
}

function clearMediaContainer(id: string) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const container = document.getElementById(id);
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);
}

function stopMediaStream(stream: any) {
  stream?.getTracks?.().forEach((track: any) => track.stop?.());
}

function attachPreviewStream(stream: any) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const container = document.getElementById(PREVIEW_MEDIA_ID);
  if (!container) return;
  clearMediaContainer(PREVIEW_MEDIA_ID);

  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.objectFit = 'cover';
  video.style.borderRadius = '14px';
  container.appendChild(video);
}

function attachTrack(track: any, containerId: string) {
  if (!track?.attach || Platform.OS !== 'web' || typeof document === 'undefined') return;
  const container = document.getElementById(containerId);
  if (!container) return;
  const element = track.attach();
  element.setAttribute('playsinline', 'true');
  element.style.width = '100%';
  element.style.height = '100%';
  element.style.objectFit = 'cover';
  element.style.borderRadius = '14px';
  container.appendChild(element);
}

function detachTrack(track: any) {
  if (!track?.detach) return;
  track.detach().forEach((element: HTMLElement) => element.remove());
}

function attachParticipant(participant: any, containerId: string) {
  participant.tracks?.forEach((publication: any) => {
    if (publication.track) attachTrack(publication.track, containerId);
  });
  participant.on?.('trackSubscribed', (track: any) => attachTrack(track, containerId));
  participant.on?.('trackUnsubscribed', detachTrack);
}

function attachParticipantTracks(participant: any, containerId: string) {
  participant.tracks?.forEach((publication: any) => {
    if (publication.track) attachTrack(publication.track, containerId);
  });
}

async function loadBrowserVideoSdk() {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || typeof window === 'undefined') return null;
  if (window.Twilio?.Video?.connect) return window.Twilio.Video;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${VIDEO_SDK_URL}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Unable to load secure video tools.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = VIDEO_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load secure video tools.'));
    document.head.appendChild(script);
  });

  return window.Twilio?.Video || null;
}

export default function VideoRoom() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ appointmentId?: string }>();
  const insets = useSafeAreaInsets();
  const { approved } = useDoctorVerification();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [videoVisits, setVideoVisits] = useState<any[]>([]);
  const [activeId, setActiveId] = useState('');
  const [inCall, setInCall] = useState(false);
  const [joining, setJoining] = useState(false);
  const [videoSession, setVideoSession] = useState<VideoSession | null>(null);
  const [mobileRoomLoading, setMobileRoomLoading] = useState(false);
  const [mobileRoomConnected, setMobileRoomConnected] = useState(false);
  const [mobileRoomError, setMobileRoomError] = useState('');
  const [mobileRoomPreviewReady, setMobileRoomPreviewReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [savedNoteId, setSavedNoteId] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [notice, setNotice] = useState('');
  const [notesByVisit, setNotesByVisit] = useState<Record<string, string>>({});
  const [uploadingType, setUploadingType] = useState<AppointmentDocumentType | ''>('');
  const [selectedDocuments, setSelectedDocuments] = useState<Partial<Record<AppointmentDocumentType, { uri: string; name: string; type: string; size?: number; file?: unknown }>>>({});
  const roomRef = useRef<any>(null);
  const roomWebViewRef = useRef<any>(null);
  const previewStreamRef = useRef<any>(null);
  const previousVisitIdRef = useRef('');
  const requestedAppointmentId = Array.isArray(params.appointmentId) ? params.appointmentId[0] : params.appointmentId;
  const activeVisit = videoVisits.find(item => item._id === activeId) ?? (!activeId ? videoVisits[0] : undefined);
  const activeVisitId = activeVisit?._id || '';
  const patientName = activeVisit?.patient?.fullName || 'Patient';
  const notes = notesByVisit[activeVisitId] ?? activeVisit?.consultationNotes ?? '';
  const canUseCamera = approved && isAppointmentJoinable(activeVisit);
  const canEditNotes = approved && Boolean(activeVisitId) && ['confirmed', 'accepted', 'scheduled', 'completed'].includes(String(activeVisit?.status || '').toLowerCase());
  const unavailableMessage = appointmentAvailabilityMessage(activeVisit, approved);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (canUseCamera) return;
    roomRef.current?.disconnect?.();
    roomRef.current = null;
    roomWebViewRef.current = null;
    stopMediaStream(previewStreamRef.current);
    previewStreamRef.current = null;
    clearMediaContainer(PREVIEW_MEDIA_ID);
    clearMediaContainer(LOCAL_MEDIA_ID);
    clearMediaContainer(REMOTE_MEDIA_ID);
    setInCall(false);
    setVideoSession(null);
    setFullscreen(false);
    setMobileRoomLoading(false);
    setMobileRoomConnected(false);
    setMobileRoomError('');
    setMobileRoomPreviewReady(false);
  }, [canUseCamera]);

  useEffect(() => {
    loadVisits();
  }, []);

  const loadVisits = () => {
    partnerApi.appointments()
      .then(items => {
        const sortedItems = Array.isArray(items)
          ? [...items].sort((first, second) => appointmentTimestamp(second) - appointmentTimestamp(first))
          : [];
        const requestedId = requestedAppointmentId || '';
        setVideoVisits(current => mergeAppointments(sortedItems, current));
        setActiveId(current => {
          if (requestedId) return requestedId;
          if (current) return current;
          return sortedItems[0]?._id || '';
        });
        setNotice('');
      })
      .catch(() => {
        setVideoVisits([]);
        setNotice('Unable to load consultations from HealthClan.');
      })
      .finally(() => setLoadingVisits(false));
  };

  useEffect(() => subscribePartnerRefresh(['appointments', 'notifications'], loadVisits), []);

  useEffect(() => {
    if (!requestedAppointmentId) return;
    setActiveId(requestedAppointmentId);
    setLoadingVisits(true);
    partnerApi.appointment(requestedAppointmentId)
      .then(appointment => {
        if (!appointment?._id) return;
        setActiveId(appointment._id);
        setVideoVisits(current => {
          const withoutSelected = current.filter(item => item._id !== appointment._id);
          return [appointment, ...withoutSelected].sort((first, second) => appointmentTimestamp(second) - appointmentTimestamp(first));
        });
        setNotesByVisit(current => ({
          ...current,
          [appointment._id]: current[appointment._id] ?? appointment.consultationNotes ?? '',
        }));
      })
      .catch(() => setNotice('Unable to load this appointment.'))
      .finally(() => setLoadingVisits(false));
  }, [requestedAppointmentId]);

  useEffect(() => {
    if (!activeVisitId || previousVisitIdRef.current === activeVisitId) return;
    previousVisitIdRef.current = activeVisitId;
    roomRef.current?.disconnect?.();
    roomRef.current = null;
    roomWebViewRef.current = null;
    stopMediaStream(previewStreamRef.current);
    previewStreamRef.current = null;
    clearMediaContainer(PREVIEW_MEDIA_ID);
    clearMediaContainer(LOCAL_MEDIA_ID);
    clearMediaContainer(REMOTE_MEDIA_ID);
    setInCall(false);
    setVideoSession(null);
    setFullscreen(false);
    setMobileRoomLoading(false);
    setMobileRoomConnected(false);
    setMobileRoomError('');
    setMobileRoomPreviewReady(false);
    setMuted(false);
    setCameraOff(false);
  }, [activeVisitId]);

  useEffect(() => {
    if (Platform.OS === 'web' || !canUseCamera || !activeVisitId || cameraOff || cameraPermission?.granted) return;
    requestCameraPermission().catch(() => setNotice('Camera preview is unavailable. Check camera permissions.'));
  }, [activeVisitId, cameraOff, cameraPermission?.granted, canUseCamera, requestCameraPermission]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    if (!canUseCamera || !activeVisitId || inCall || cameraOff || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      stopMediaStream(previewStreamRef.current);
      previewStreamRef.current = null;
      clearMediaContainer(PREVIEW_MEDIA_ID);
      return;
    }

    let cancelled = false;

    async function startCameraPreview() {
      try {
        stopMediaStream(previewStreamRef.current);
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

        if (cancelled) {
          stopMediaStream(stream);
          return;
        }

        previewStreamRef.current = stream;
        attachPreviewStream(stream);
      } catch {
        clearMediaContainer(PREVIEW_MEDIA_ID);
        setNotice('Camera preview is unavailable. Check browser camera permissions.');
      }
    }

    startCameraPreview();

    return () => {
      cancelled = true;
      stopMediaStream(previewStreamRef.current);
      previewStreamRef.current = null;
      clearMediaContainer(PREVIEW_MEDIA_ID);
    };
  }, [activeVisitId, cameraOff, canUseCamera, fullscreen, inCall]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !inCall || !videoSession) return;

    let cancelled = false;
    const session = videoSession;

    async function connectRoom() {
      try {
        clearMediaContainer(LOCAL_MEDIA_ID);
        clearMediaContainer(REMOTE_MEDIA_ID);
        const video = await loadBrowserVideoSdk();
        if (!video?.connect) throw new Error('Secure video tools are unavailable in this browser.');

        const room = await video.connect(session.token, {
          name: session.roomId,
          audio: true,
          video: true,
        });

        if (cancelled) {
          room.disconnect();
          return;
        }

        roomRef.current = room;
        room.localParticipant?.tracks?.forEach((publication: any) => {
          if (publication.track) attachTrack(publication.track, LOCAL_MEDIA_ID);
        });
        room.participants?.forEach((participant: any) => attachParticipant(participant, REMOTE_MEDIA_ID));
        room.on?.('participantConnected', (participant: any) => attachParticipant(participant, REMOTE_MEDIA_ID));
        room.on?.('participantDisconnected', (participant: any) => {
          participant.tracks?.forEach((publication: any) => publication.track && detachTrack(publication.track));
        });
        room.on?.('disconnected', () => {
          clearMediaContainer(LOCAL_MEDIA_ID);
          clearMediaContainer(REMOTE_MEDIA_ID);
        });
        setNotice('Secure video room connected.');
      } catch (error) {
        setInCall(false);
        setVideoSession(null);
        setNotice(videoRoomErrorMessage(error instanceof Error ? error.message : undefined));
      }
    }

    connectRoom();

    return () => {
      cancelled = true;
      roomRef.current?.disconnect?.();
      roomRef.current = null;
      roomWebViewRef.current = null;
      clearMediaContainer(LOCAL_MEDIA_ID);
      clearMediaContainer(REMOTE_MEDIA_ID);
    };
  }, [inCall, videoSession]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !inCall || !roomRef.current) return;
    clearMediaContainer(LOCAL_MEDIA_ID);
    clearMediaContainer(REMOTE_MEDIA_ID);
    roomRef.current.localParticipant?.tracks?.forEach((publication: any) => {
      if (publication.track) attachTrack(publication.track, LOCAL_MEDIA_ID);
    });
    roomRef.current.participants?.forEach((participant: any) => attachParticipantTracks(participant, REMOTE_MEDIA_ID));
  }, [fullscreen, inCall]);

  async function joinVisit() {
    if (joining || !activeVisitId) return;

    if (!approved) {
      setNotice('Admin verification is required before joining consultations.');
      return;
    }

    if (!canUseCamera) {
      setNotice(unavailableMessage);
      return;
    }

    if (Platform.OS !== 'web') {
      const cameraStatus = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
      const microphoneStatus = microphonePermission?.granted ? microphonePermission : await requestMicrophonePermission();

      if (!cameraStatus.granted || !microphoneStatus.granted) {
        setNotice('Camera and microphone access are required before joining the conversation.');
        return;
      }
    }

    setJoining(true);
    setNotice('');

    try {
      stopMediaStream(previewStreamRef.current);
      previewStreamRef.current = null;
      clearMediaContainer(PREVIEW_MEDIA_ID);
      const response = await partnerApi.joinAppointment(activeVisitId);
      const session = normalizeVideoSession(response);
      if (!session) throw new Error('HealthClan did not return a valid video session.');

      setVideoSession(session);
      setInCall(true);
      setMobileRoomLoading(Platform.OS !== 'web');
      setMobileRoomConnected(false);
      setMobileRoomError('');
      setMobileRoomPreviewReady(false);
      setNotice(Platform.OS === 'web' ? 'Opening secure video room...' : 'Secure video room is ready on the server.');
      emitPartnerRefresh('appointments', 'appointment-joined', response);
      emitPartnerRefresh('dashboard', 'appointment-joined', response);
      emitPartnerRefresh('notifications', 'appointment-joined', response);
    } catch (error) {
      setInCall(false);
      setVideoSession(null);
      setFullscreen(false);
      setMobileRoomLoading(false);
      setMobileRoomConnected(false);
      setMobileRoomError('');
      setMobileRoomPreviewReady(false);
      setNotice(error instanceof Error ? error.message : 'Unable to join video consultation yet.');
    } finally {
      setJoining(false);
    }
  }

  async function leaveVisit() {
    if (joining || !activeVisitId) return;

    setJoining(true);
    setNotice('');

    try {
      roomRef.current?.disconnect?.();
      roomRef.current = null;
      roomWebViewRef.current = null;
      stopMediaStream(previewStreamRef.current);
      previewStreamRef.current = null;
      clearMediaContainer(PREVIEW_MEDIA_ID);
      clearMediaContainer(LOCAL_MEDIA_ID);
      clearMediaContainer(REMOTE_MEDIA_ID);
      const response = await partnerApi.endVideo(activeVisitId);
      setInCall(false);
      setVideoSession(null);
      setFullscreen(false);
      setMobileRoomLoading(false);
      setMobileRoomConnected(false);
      setMobileRoomError('');
      setMobileRoomPreviewReady(false);
      setNotice('Video consultation ended and appointment updated.');
      loadVisits();
      emitPartnerRefresh('appointments', 'appointment-video-ended', response);
      emitPartnerRefresh('dashboard', 'appointment-video-ended', response);
      emitPartnerRefresh('notifications', 'appointment-video-ended', response);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to end video consultation.');
    } finally {
      setJoining(false);
    }
  }

  function setLocalTracksEnabled(kind: 'audio' | 'video', enabled: boolean) {
    roomRef.current?.localParticipant?.tracks?.forEach((publication: any) => {
      const track = publication.track;
      if (track?.kind !== kind) return;
      if (enabled) {
        track.enable?.();
      } else {
        track.disable?.();
      }
    });
    if (Platform.OS !== 'web') {
      roomWebViewRef.current?.injectJavaScript?.(
        `window.healthclanSetTracks && window.healthclanSetTracks(${JSON.stringify(kind)}, ${JSON.stringify(enabled)}); true;`,
      );
    }
  }

  function toggleMuted() {
    setMuted(current => {
      const next = !current;
      setLocalTracksEnabled('audio', !next);
      return next;
    });
  }

  function toggleCameraOff() {
    setCameraOff(current => {
      const next = !current;
      setLocalTracksEnabled('video', !next);
      return next;
    });
  }

  async function selectVisit(visit: any) {
    if (!visit?._id || joining) return;
    if (visit._id === activeId) return;

    if (inCall && activeVisitId) {
      await leaveVisit();
    }

    setActiveId(visit._id);
    setInCall(false);
    setVideoSession(null);
    setFullscreen(false);
    setMobileRoomLoading(false);
    setMobileRoomConnected(false);
    setMobileRoomError('');
    setMobileRoomPreviewReady(false);
    setSavedNoteId('');
    setMuted(false);
    setCameraOff(false);
  }

  function renderCallSurface(expanded = false) {
    const canShowNativeCamera = Platform.OS !== 'web' && !cameraOff && cameraPermission?.granted;
    const shellStyle = expanded ? styles.fullscreenRoomShell : styles.mobileRoomShell;
    const roomStyle = expanded ? styles.fullscreenRoom : styles.mobileRoom;
    const containerStyle = expanded ? styles.fullscreenRoomContainer : styles.mobileRoomContainer;

    if (Platform.OS === 'web' && inCall) {
      return (
        <View style={[styles.mediaGrid, expanded && styles.fullscreenMediaGrid]}>
          <View nativeID={REMOTE_MEDIA_ID} style={[styles.remoteMedia, expanded && styles.fullscreenRemoteMedia]} />
          <View nativeID={LOCAL_MEDIA_ID} style={[styles.localMedia, expanded && styles.fullscreenLocalMedia]} />
        </View>
      );
    }

    if (Platform.OS !== 'web' && inCall && videoSession) {
      return (
        <View style={shellStyle}>
          <WebView
            ref={roomWebViewRef}
            source={{ html: videoRoomHtml(videoSession), baseUrl: 'https://partner.healthclan.local' }}
            style={roomStyle}
            containerStyle={containerStyle}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            mediaCapturePermissionGrantType="grant"
            allowsFullscreenVideo
            onLoadStart={() => {
              setMobileRoomLoading(true);
              setMobileRoomConnected(false);
              setMobileRoomError('');
              setMobileRoomPreviewReady(false);
            }}
            onLoadEnd={() => setMobileRoomLoading(false)}
            onError={event => {
              const message = event.nativeEvent.description || 'Unable to load the in-app video room.';
              setMobileRoomLoading(false);
              setMobileRoomConnected(false);
              setMobileRoomPreviewReady(false);
              setMobileRoomError(message);
              setNotice(message);
            }}
            onHttpError={event => {
              const message = `Video room failed to load (${event.nativeEvent.statusCode}).`;
              setMobileRoomLoading(false);
              setMobileRoomConnected(false);
              setMobileRoomPreviewReady(false);
              setMobileRoomError(message);
              setNotice(message);
            }}
            onMessage={event => {
              try {
                const payload = JSON.parse(event.nativeEvent.data || '{}');
                if (payload.type === 'connected') {
                  setMobileRoomLoading(false);
                  setMobileRoomConnected(true);
                  setMobileRoomError('');
                  setMobileRoomPreviewReady(true);
                  setNotice('Secure video room connected.');
                  setLocalTracksEnabled('audio', !muted);
                  setLocalTracksEnabled('video', !cameraOff);
                }
                if (payload.type === 'preview') {
                  setMobileRoomLoading(false);
                  setMobileRoomPreviewReady(true);
                  setNotice('Camera ready. Connecting secure video room...');
                }
                if (payload.type === 'preview-waiting') {
                  setMobileRoomLoading(false);
                  setNotice('Camera is starting with fallback settings...');
                }
                if (payload.type === 'audio-unavailable') {
                  setNotice('Camera started. Microphone is unavailable, so this visit opened with video only.');
                }
                if (payload.type === 'error') {
                  const message = videoRoomErrorMessage(payload.payload);
                  setMobileRoomLoading(false);
                  setMobileRoomConnected(false);
                  setMobileRoomPreviewReady(false);
                  setMobileRoomError(message);
                  setNotice(message);
                }
              } catch {
                return;
              }
            }}
          />
          {canShowNativeCamera && (
            <View style={[styles.nativeLocalPreview, expanded && styles.fullscreenNativeLocalPreview]}>
              <CameraView
                active
                facing="front"
                mirror
                mode="video"
                mute
                style={styles.nativeLocalCamera}
              />
            </View>
          )}
          {((mobileRoomLoading && !mobileRoomPreviewReady) || mobileRoomError) && (
            <View pointerEvents="none" style={styles.mobileRoomOverlay}>
              {mobileRoomLoading ? <ActivityIndicator color="#fff" /> : <Ionicons name={mobileRoomError ? 'alert-circle-outline' : 'videocam-outline'} size={34} color="#fff" />}
              <Text style={styles.mobileRoomOverlayText}>
                {mobileRoomLoading ? 'Opening video room...' : mobileRoomError || 'Connecting secure video room...'}
              </Text>
            </View>
          )}
        </View>
      );
    }

    if (Platform.OS === 'web' && !cameraOff) {
      return <View nativeID={PREVIEW_MEDIA_ID} style={[styles.cameraPreview, expanded && styles.fullscreenCameraPreview]} />;
    }

    if (canShowNativeCamera) {
      return (
        <CameraView
          active
          facing="front"
          mirror
          mode="video"
          mute={muted}
          style={[styles.cameraPreview, expanded && styles.fullscreenCameraPreview]}
        />
      );
    }

    if (Platform.OS !== 'web' && !cameraOff) {
      return (
        <View style={[styles.cameraPermissionPanel, expanded && styles.fullscreenCameraPreview]}>
          <Ionicons name="videocam-outline" size={40} color="#fff" />
          <Text style={styles.previewText}>Camera access is needed for video consultations.</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
            <Text style={styles.permissionText}>Allow camera</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.cameraPermissionPanel, expanded && styles.fullscreenCameraPreview]}>
        <Ionicons name="videocam-off-outline" size={42} color="#fff" />
        <Text style={styles.previewText}>{inCall ? 'Camera is off' : 'Tap Join to open the secure video room'}</Text>
      </View>
    );
  }

  async function saveNotes() {
            if (savingNote) return;
            if (!canEditNotes) {
              setNotice('Consultation notes can be added after the appointment is confirmed or completed.');
              return;
            }
            if (!approved) {
              setNotice('Admin verification is required before saving consultation notes.');
              return;
            }
            if (!activeVisitId) return;

            const savedNotes = notes.trim() || 'No notes added yet.';
            setSavingNote(true);
            setNotesByVisit(current => ({ ...current, [activeVisitId]: savedNotes }));
            try {
              const shouldMarkCompleted = ['confirmed', 'accepted', 'scheduled'].includes(String(activeVisit?.status || '').toLowerCase());
              const savedAppointment = await partnerApi.saveNotes(activeVisitId, savedNotes, { markCompleted: shouldMarkCompleted });
              const persistedNotes = String(savedAppointment?.consultationNotes || '').trim();

              if (persistedNotes !== savedNotes) {
                throw new Error('HealthClan did not confirm the saved consultation notes.');
              }

              setVideoVisits(current => current.map(visit => visit._id === activeVisitId ? {
                ...visit,
                ...savedAppointment,
                consultationNotes: persistedNotes,
              } : visit));
              setNotesByVisit(current => ({ ...current, [activeVisitId]: persistedNotes }));
              setSavedNoteId(activeVisitId);
              setNotice('Consultation notes saved to HealthClan and shared with the patient.');
              emitPartnerRefresh('appointments', 'consultation-notes-saved', savedAppointment);
              emitPartnerRefresh('notifications', 'consultation-notes-saved', savedAppointment);
              emitPartnerRefresh('dashboard', 'consultation-notes-saved', savedAppointment);
            } catch (error) {
              setSavedNoteId('');
              setNotice(error instanceof Error ? error.message : 'Unable to save consultation notes to HealthClan.');
            } finally {
              setSavingNote(false);
            }
  }

  async function chooseDocument(documentType: AppointmentDocumentType) {
    if (!activeVisitId || uploadingType) return;
    if (!canEditNotes) {
      setNotice('Documents can be uploaded after the appointment is confirmed, including after consultation.');
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const type = asset.mimeType || (asset.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(type)) {
        setNotice('Only JPG, PNG, WEBP images and PDF documents can be uploaded.');
        return;
      }
      if (asset.size && asset.size > 5 * 1024 * 1024) {
        setNotice('Appointment documents must be 5MB or smaller.');
        return;
      }
      setSelectedDocuments(current => ({ ...current, [documentType]: { uri: asset.uri, name: asset.name, type, size: asset.size, file: asset.file } }));
      setNotice(`${appointmentDocumentTypes.find(item => item.value === documentType)?.label} selected. Preview it, then tap Upload.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to choose appointment document.');
    }
  }

  async function uploadDocument(documentType: AppointmentDocumentType) {
    const selected = selectedDocuments[documentType];
    if (!selected || !activeVisitId || uploadingType) return;
    try {
      setUploadingType(documentType);
      const savedAppointment = await partnerApi.uploadAppointmentDocument(activeVisitId, documentType, selected);
      setVideoVisits(current => current.map(visit => visit._id === activeVisitId ? { ...visit, ...savedAppointment } : visit));
      setSelectedDocuments(current => ({ ...current, [documentType]: undefined }));
      setNotice(`${appointmentDocumentTypes.find(item => item.value === documentType)?.label} uploaded.`);
      emitPartnerRefresh('appointments', 'appointment-document-uploaded', savedAppointment);
      emitPartnerRefresh('notifications', 'appointment-document-uploaded', savedAppointment);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to upload appointment document.');
    } finally {
      setUploadingType('');
    }
  }

  return (
    <View style={[styles.root, fullscreen && styles.roomRootFullscreen]}>
      <ScrollView
        scrollEnabled={!fullscreen}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          fullscreen && styles.contentFullscreen,
          { paddingTop: insets.top + (fullscreen ? 0 : 16), paddingBottom: insets.bottom + (fullscreen ? 0 : 88) },
        ]}
      >
        {!fullscreen && (
          <LinearGradient colors={[grad1, grad2]} style={styles.header}>
            <View style={styles.roomHeaderTop}>
              <TouchableOpacity activeOpacity={0.76} style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={styles.liveBadge}>
                <View style={[styles.liveDot, inCall && styles.liveDotActive]} />
                <Text style={styles.liveText}>{inCall ? 'In session' : 'Ready'}</Text>
              </View>
            </View>
            <Text style={styles.kicker}>Video room</Text>
            <Text style={styles.title}>{patientName}</Text>
            <Text style={styles.headerMeta}>{formatTime(activeVisit?.startTime)} | {activeVisit?.service?.name || 'Consultation'} | {formatStatus(activeVisit?.status)}</Text>
          </LinearGradient>
        )}

        {loadingVisits ? (
          <ApiStateCard loading title="Loading video room" message="Fetching appointment details from HealthClan." />
        ) : !activeVisit ? (
          <ApiStateCard icon="videocam-outline" title="Video room unavailable" message="This appointment could not be found." />
        ) : !canUseCamera ? (
          <View style={styles.detailPanel}>
            <View style={styles.detailTop}>
              <View style={styles.detailIcon}>
                <Ionicons name="document-text-outline" size={24} color={grad1} />
              </View>
              <View style={styles.detailTitleWrap}>
                <Text style={styles.detailTitle}>Appointment details</Text>
                <Text style={styles.detailSubtitle}>{unavailableMessage}</Text>
              </View>
            </View>
            <View style={styles.detailList}>
              <View style={styles.detailLine}>
                <Text style={styles.detailLabel}>Patient</Text>
                <Text style={styles.detailValue}>{patientName}</Text>
              </View>
              <View style={styles.detailLine}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={styles.detailValue}>{formatStatus(activeVisit?.status)}</Text>
              </View>
              <View style={styles.detailLine}>
                <Text style={styles.detailLabel}>Scheduled time</Text>
                <Text style={styles.detailValue}>{activeVisit?.startTime ? `${formatTime(activeVisit.startTime)} on ${new Date(activeVisit.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}` : 'Date to be confirmed'}</Text>
              </View>
              <View style={styles.detailLine}>
                <Text style={styles.detailLabel}>Service</Text>
                <Text style={styles.detailValue}>{activeVisit?.service?.name || 'Video consultation'}</Text>
              </View>
            </View>
            <View style={styles.reasonPanel}>
              <Text style={styles.detailLabel}>Reason for visit</Text>
              <Text style={styles.reasonText}>{activeVisit?.reasonForVisit || 'No visit reason added yet.'}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.videoPanel, fullscreen && styles.videoPanelFullscreen]}>
            {!fullscreen && (
              <View style={styles.videoTop}>
                <View style={styles.patientAvatar}><Text style={styles.patientInitial}>{patientName.charAt(0)}</Text></View>
                <View style={styles.videoText}>
                  <Text style={styles.patientName}>{patientName}</Text>
                  <Text style={styles.patientMeta}>{activeVisit?.reasonForVisit || 'Video consultation'}</Text>
                </View>
              </View>
            )}
            {fullscreen && (
              <View style={[styles.fullscreenHeader, { paddingTop: insets.top + 12 }]}>
                <View style={styles.fullscreenTitleWrap}>
                  <Text style={styles.fullscreenName} numberOfLines={1}>{patientName}</Text>
                  <Text style={styles.fullscreenMeta}>{inCall ? 'Live conversation' : 'Camera preview'}</Text>
                </View>
                <TouchableOpacity activeOpacity={0.78} style={styles.fullscreenClose} onPress={() => setFullscreen(false)}>
                  <Ionicons name="contract-outline" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            <View style={[styles.callSurface, fullscreen && styles.callSurfaceFullscreen]}>
              {renderCallSurface(fullscreen)}
              {!fullscreen && (
                <TouchableOpacity activeOpacity={0.78} style={styles.fullscreenButton} onPress={() => setFullscreen(true)}>
                  <Ionicons name="expand-outline" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.controls, fullscreen && styles.fullscreenControls, fullscreen && { paddingBottom: insets.bottom + 18 }]}>
              <TouchableOpacity style={[fullscreen ? styles.fullscreenControl : styles.control, muted && (fullscreen ? styles.fullscreenControlActive : styles.controlActive)]} onPress={toggleMuted}>
                <Ionicons name={muted ? 'mic-off' : 'mic'} size={fullscreen ? 22 : 21} color={fullscreen || muted ? '#fff' : grad1} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[fullscreen ? styles.fullscreenJoinButton : styles.joinButton, inCall && styles.endButton, (joining || !activeVisitId) && styles.buttonDisabled]}
                onPress={inCall ? leaveVisit : joinVisit}
                disabled={joining || !activeVisitId}
              >
                {joining ? <ActivityIndicator color="#fff" /> : <Ionicons name={inCall ? 'call' : 'videocam'} size={fullscreen ? 21 : 20} color="#fff" />}
                <Text style={styles.joinText}>{joining ? (inCall ? 'Ending...' : 'Joining...') : inCall ? 'End call' : 'Join conversation'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[fullscreen ? styles.fullscreenControl : styles.control, cameraOff && (fullscreen ? styles.fullscreenControlActive : styles.controlActive)]} onPress={toggleCameraOff}>
                <Ionicons name={cameraOff ? 'videocam-off' : 'videocam'} size={fullscreen ? 22 : 21} color={fullscreen || cameraOff ? '#fff' : grad1} />
              </TouchableOpacity>
              {fullscreen && (
                <TouchableOpacity style={styles.fullscreenControl} onPress={() => setFullscreen(false)}>
                  <Ionicons name="contract-outline" size={22} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
            {!!notice && !fullscreen && <Text style={styles.panelNotice}>{notice}</Text>}
          </View>
        )}

        {!fullscreen && (
          <>
            {activeVisit && (
              <View style={styles.documentsSection}>
                <View style={styles.sectionHeadingRow}><View><Text style={styles.sectionTitle}>Appointment documents</Text><Text style={styles.documentHelp}>Choose, preview and upload an image or PDF.</Text></View><View style={styles.secureBadge}><Ionicons name="shield-checkmark-outline" size={15} color={grad1} /><Text style={styles.secureText}>Secure</Text></View></View>
                <View style={styles.documentGrid}>{appointmentDocumentTypes.map(item => {
                  const selected = selectedDocuments[item.value];
                  return (
                    <View key={item.value} style={styles.documentCard}>
                      <View style={styles.documentCardTop}><View style={styles.documentIcon}><Ionicons name="document-attach-outline" size={20} color={grad1} /></View><Text style={styles.documentCardTitle}>{item.label}</Text></View>
                      {selected ? (
                        <View style={styles.previewBox}>
                          {selected.type.startsWith('image/') ? <Image source={{ uri: selected.uri }} style={styles.previewImage} resizeMode="cover" /> : <Ionicons name="document-text-outline" size={42} color={grad1} />}
                          <Text style={styles.previewName} numberOfLines={1}>{selected.name}</Text>
                        </View>
                      ) : <Text style={styles.emptyPreview}>JPG, PNG, WEBP or PDF · Max 5 MB</Text>}
                      <View style={styles.documentActions}>
                        <TouchableOpacity style={styles.chooseButton} onPress={() => chooseDocument(item.value)} disabled={!!uploadingType}><Ionicons name="folder-open-outline" size={17} color={grad1} /><Text style={styles.chooseText}>{selected ? 'Change' : 'Choose file'}</Text></TouchableOpacity>
                        {selected && <TouchableOpacity style={styles.uploadButton} onPress={() => uploadDocument(item.value)} disabled={!!uploadingType}>{uploadingType === item.value ? <ActivityIndicator color="#fff" /> : <Ionicons name="cloud-upload-outline" size={17} color="#fff" />}<Text style={styles.uploadText}>Upload</Text></TouchableOpacity>}
                      </View>
                    </View>
                  );
                })}</View>
                {(activeVisit.clinicalDocuments || []).map((document: any) => (
                  <TouchableOpacity key={document._id || document.fileUrl} style={styles.uploadedDocument} onPress={() => Linking.openURL(document.fileUrl)}>
                    <Ionicons name={document.mimeType === 'application/pdf' ? 'document-text-outline' : 'image-outline'} size={19} color={grad1} />
                    <View style={styles.uploadedDocumentText}>
                      <Text style={styles.documentButtonText}>{appointmentDocumentTypes.find(item => item.value === document.documentType)?.label || String(document.documentType).replace(/_/g, ' ')}</Text>
                      <Text style={styles.documentHelp}>{document.fileName || 'Open document'}</Text>
                    </View>
                    <Ionicons name="open-outline" size={17} color={grad1} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.notesSection}>
              <View style={styles.notesHeader}><Text style={styles.sectionTitle}>{canEditNotes ? 'Consultation notes' : 'Consultation note history'}</Text>{savedNoteId === activeVisitId && <Text style={styles.savedText}>Saved</Text>}</View>
              {!activeVisit ? <ApiStateCard icon="document-text-outline" title="No appointment selected" message="Open a consultation before writing notes." /> : <TextInput style={[styles.notes, !canEditNotes && styles.notesReadonly]} value={notes || (!canEditNotes ? 'No consultation notes saved for this appointment yet.' : '')} onChangeText={value => { setSavedNoteId(''); setNotesByVisit(current => ({ ...current, [activeVisitId]: value })); }} multiline editable={canEditNotes} textAlignVertical="top" placeholder="Write diagnosis, medication plan, next steps, and follow-up instructions" />}
              {canEditNotes && <TouchableOpacity style={[styles.saveButton, (!approved || !activeVisitId) && styles.buttonDisabled]} onPress={saveNotes} disabled={savingNote || !activeVisitId}>{savingNote ? <ActivityIndicator color="#fff" /> : <Ionicons name={savedNoteId === activeVisitId ? 'checkmark-circle' : 'save-outline'} size={18} color="#fff" />}<Text style={styles.saveText}>{savingNote ? 'Saving notes' : !approved ? 'Verification required' : savedNoteId === activeVisitId ? 'Notes saved' : 'Save consultation notes'}</Text></TouchableOpacity>}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E9F6FE' },
  roomRootFullscreen: { backgroundColor: '#06191E' },
  content: { paddingHorizontal: 18 },
  contentFullscreen: { flexGrow: 1, paddingHorizontal: 0 },
  header: { minHeight: 170, borderRadius: 24, padding: 22, justifyContent: 'space-between' },
  roomHeaderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  kicker: { color: 'rgba(255,255,255,0.84)', fontSize: 13, fontWeight: '900' },
  title: { color: '#fff', fontSize: 31, lineHeight: 37, fontWeight: '900', marginTop: 8 },
  headerMeta: { color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 17, fontWeight: '800', marginTop: 6 },
  liveBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 12, paddingVertical: 8 },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#FFCF5A' },
  liveDotActive: { backgroundColor: '#65F2A6' },
  liveText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  videoPanel: { marginTop: 16, borderRadius: 20, backgroundColor: '#fff', padding: 16 },
  videoPanelFullscreen: { flex: 1, minHeight: '100%', marginTop: 0, borderRadius: 0, backgroundColor: '#06191E', padding: 0 },
  videoTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailPanel: { marginTop: 16, borderRadius: 20, backgroundColor: '#fff', padding: 16, borderWidth: 1, borderColor: 'rgba(8,81,97,0.08)' },
  detailTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(19, 202, 214, 0.12)' },
  detailTitleWrap: { flex: 1, minWidth: 0 },
  detailTitle: { color: '#252525', fontSize: 18, fontWeight: '900' },
  detailSubtitle: { color: '#58727A', fontSize: 12, lineHeight: 18, fontWeight: '800', marginTop: 4 },
  detailList: { gap: 10, marginTop: 16 },
  detailItem: { flexGrow: 1, flexBasis: 150, minHeight: 72, borderRadius: 14, backgroundColor: '#E9F6FE', padding: 12 },
  detailLine: { minHeight: 62, borderRadius: 14, backgroundColor: '#E9F6FE', padding: 12, justifyContent: 'center' },
  detailLabel: { color: grad1, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  detailValue: { color: '#252525', fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 6 },
  reasonPanel: { borderRadius: 14, backgroundColor: '#F7FBFE', borderWidth: 1, borderColor: 'rgba(8,81,97,0.08)', padding: 12, marginTop: 10 },
  reasonText: { color: '#252525', fontSize: 13, lineHeight: 20, fontWeight: '700', marginTop: 6 },
  patientAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2EAFF' },
  patientInitial: { color: grad1, fontSize: 18, fontWeight: '900' },
  videoText: { flex: 1, minWidth: 0 },
  patientName: { color: '#252525', fontSize: 17, fontWeight: '900' },
  patientMeta: { color: '#58727A', fontSize: 12, fontWeight: '700', marginTop: 4 },
  callSurface: { minHeight: 260, borderRadius: 18, backgroundColor: '#0B2026', overflow: 'hidden', marginTop: 16, position: 'relative' },
  callSurfaceFullscreen: { flex: 1, minHeight: 0, marginTop: 0, borderRadius: 0 },
  cameraPreview: { width: '100%', minHeight: 260, borderRadius: 14, backgroundColor: '#0B2026', overflow: 'hidden' },
  mobileRoomShell: { width: '100%', height: 260, borderRadius: 14, backgroundColor: '#0B2026', overflow: 'hidden', position: 'relative' },
  mobileRoomContainer: { width: '100%', height: 260, backgroundColor: '#0B2026' },
  mobileRoom: { width: '100%', height: 260, backgroundColor: '#0B2026' },
  nativeLocalPreview: { position: 'absolute', right: 12, bottom: 12, width: 132, height: 94, borderRadius: 14, backgroundColor: '#173A42', overflow: 'hidden', borderWidth: 2, borderColor: '#fff', zIndex: 12, elevation: 12 },
  nativeLocalCamera: { width: '100%', height: '100%' },
  mobileRoomOverlay: { position: 'absolute', inset: 0, zIndex: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11,32,38,0.62)', padding: 18 },
  mobileRoomOverlayText: { color: '#fff', fontSize: 14, lineHeight: 20, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  cameraPermissionPanel: { width: '100%', minHeight: 260, borderRadius: 14, backgroundColor: '#0B2026', alignItems: 'center', justifyContent: 'center', padding: 18 },
  permissionButton: { minHeight: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 14 },
  permissionText: { color: grad1, fontSize: 13, fontWeight: '900' },
  mediaGrid: { width: '100%', minHeight: 260, position: 'relative' },
  remoteMedia: { width: '100%', minHeight: 260, borderRadius: 14, backgroundColor: '#0B2026', overflow: 'hidden' },
  localMedia: { position: 'absolute', right: 12, bottom: 12, width: 132, height: 94, borderRadius: 14, backgroundColor: '#173A42', overflow: 'hidden', borderWidth: 2, borderColor: '#fff' },
  fullscreenButton: { position: 'absolute', top: 12, right: 12, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.42)', zIndex: 8 },
  fullscreenPlaceholder: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0B2026', padding: 18 },
  fullscreenPlaceholderText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  fullscreenRoot: { flex: 1, backgroundColor: '#06191E' },
  fullscreenHeader: { minHeight: 76, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#06191E' },
  fullscreenTitleWrap: { flex: 1, minWidth: 0, paddingRight: 14 },
  fullscreenName: { color: '#fff', fontSize: 17, fontWeight: '900' },
  fullscreenMeta: { color: 'rgba(255,255,255,0.68)', fontSize: 12, fontWeight: '800', marginTop: 4 },
  fullscreenClose: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  fullscreenBody: { flex: 1, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: '#06191E' },
  fullscreenControls: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, minHeight: 104, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 14, paddingTop: 12, backgroundColor: 'rgba(6,25,30,0.82)' },
  fullscreenControl: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  fullscreenControlActive: { backgroundColor: '#E94D5F' },
  fullscreenJoinButton: { minHeight: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: grad1, paddingHorizontal: 24 },
  fullscreenRoomShell: { flex: 1, minHeight: 420, borderRadius: 18, backgroundColor: '#0B2026', overflow: 'hidden', position: 'relative' },
  fullscreenRoomContainer: { flex: 1, backgroundColor: '#0B2026' },
  fullscreenRoom: { flex: 1, backgroundColor: '#0B2026' },
  fullscreenMediaGrid: { flex: 1, minHeight: 420 },
  fullscreenRemoteMedia: { flex: 1, minHeight: 420 },
  fullscreenLocalMedia: { right: 18, bottom: 18, width: 170, height: 122, borderRadius: 16 },
  fullscreenNativeLocalPreview: { right: 18, bottom: 130, width: 170, height: 122, borderRadius: 16 },
  fullscreenCameraPreview: { flex: 1, width: '100%', minHeight: 420, borderRadius: 18 },
  previewText: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  panelNotice: { color: grad1, fontSize: 12, lineHeight: 17, fontWeight: '900', textAlign: 'center', marginTop: 10 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 },
  control: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(19, 202, 214, 0.14)' },
  controlActive: { backgroundColor: grad1 },
  joinButton: { minHeight: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: grad1, paddingHorizontal: 18 },
  endButton: { backgroundColor: '#E94D5F' },
  joinText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  sectionTitle: { color: '#252525', fontSize: 19, fontWeight: '900', marginTop: 22, marginBottom: 12 },
  notesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  savedText: { color: '#11a26f', fontSize: 12, fontWeight: '900', marginTop: 22, marginBottom: 12 },
  queueList: { gap: 10 },
  queueCard: { minHeight: 76, borderRadius: 16, backgroundColor: '#fff', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: 'transparent' },
  queueCardActive: { borderColor: 'rgba(8,81,97,0.22)' },
  queueIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(19, 202, 214, 0.12)' },
  queueText: { flex: 1, minWidth: 0 },
  queueName: { color: '#252525', fontSize: 14, fontWeight: '900' },
  queueDetail: { color: '#58727A', fontSize: 12, fontWeight: '700', marginTop: 4 },
  queueStatus: { color: grad1, fontSize: 11, fontWeight: '900' },
  notes: { minHeight: 128, borderRadius: 16, backgroundColor: '#fff', padding: 14, color: '#252525', fontSize: 14, fontWeight: '600' },
  notesReadonly: { backgroundColor: '#F7FBFE', color: '#58727A' },
  saveButton: { minHeight: 50, borderRadius: 16, backgroundColor: grad1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  buttonDisabled: { opacity: 0.58 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  documentsSection: { marginTop: 20, gap: 14, borderRadius: 22, backgroundColor: '#fff', padding: 18, borderWidth: 1, borderColor: 'rgba(8,81,97,0.1)' },
  sectionHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, backgroundColor: 'rgba(19,162,193,0.1)', paddingHorizontal: 10, paddingVertical: 7 },
  secureText: { color: grad1, fontSize: 11, fontWeight: '900' },
  documentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  documentCard: { flexGrow: 1, flexBasis: 280, borderRadius: 18, backgroundColor: '#F7FBFE', padding: 14, borderWidth: 1, borderColor: 'rgba(8,81,97,0.1)', gap: 12 },
  documentCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  documentIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(19,162,193,0.11)' },
  documentCardTitle: { flex: 1, color: '#253D43', fontSize: 14, fontWeight: '900' },
  previewBox: { minHeight: 126, borderRadius: 14, overflow: 'hidden', backgroundColor: '#E9F6FE', alignItems: 'center', justifyContent: 'center', padding: 10, gap: 8 },
  previewImage: { width: '100%', height: 104, borderRadius: 10 },
  previewName: { width: '100%', color: '#253D43', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  emptyPreview: { minHeight: 70, color: '#6B858C', fontSize: 11, lineHeight: 17, fontWeight: '700', textAlign: 'center', textAlignVertical: 'center' },
  documentActions: { flexDirection: 'row', gap: 8 },
  chooseButton: { flex: 1, minHeight: 42, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(8,81,97,0.18)' },
  chooseText: { color: grad1, fontSize: 12, fontWeight: '900' },
  uploadButton: { flex: 1, minHeight: 42, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: grad1 },
  uploadText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  notesSection: { marginTop: 20, marginBottom: 12, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.45)', padding: 2 },
  documentHelp: { color: '#58727A', fontSize: 12, lineHeight: 17, fontWeight: '700', marginBottom: 3 },
  documentButton: { minHeight: 48, borderRadius: 14, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(8,81,97,0.14)' },
  documentButtonText: { flex: 1, color: '#253D43', fontSize: 13, fontWeight: '900' },
  uploadedDocument: { minHeight: 52, borderRadius: 14, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(19,162,193,0.08)' },
  uploadedDocumentText: { flex: 1, minWidth: 0 },
  notice: { color: grad1, fontSize: 13, fontWeight: '900', textAlign: 'center', marginTop: 12 },
});
