// User-controlled notification preferences (persisted in localStorage)

const STORAGE_KEY = 'notification-prefs-v1';

export interface NotificationPrefs {
  remindersEnabled: boolean;
  soundEnabled: boolean;
  voiceEnabled: boolean;
}

const DEFAULTS: NotificationPrefs = {
  remindersEnabled: true,
  soundEnabled: false, // off by default — opt-in to avoid surprise audio
  voiceEnabled: false, // off by default — opt-in to ElevenLabs voice
};

export const getNotificationPrefs = (): NotificationPrefs => {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
};

export const setNotificationPrefs = (prefs: Partial<NotificationPrefs>) => {
  const next = { ...getNotificationPrefs(), ...prefs };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('notification-prefs-changed', { detail: next }));
  return next;
};

export const subscribeNotificationPrefs = (cb: (p: NotificationPrefs) => void) => {
  const handler = (e: Event) => cb((e as CustomEvent).detail as NotificationPrefs);
  window.addEventListener('notification-prefs-changed', handler);
  return () => window.removeEventListener('notification-prefs-changed', handler);
};

export const playNotificationSound = (src = '/soundreality-notification-9-158194.mp3') => {
  const prefs = getNotificationPrefs();
  if (!prefs.soundEnabled) return;
  try {
    const audio = new Audio(src);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {
    // ignore
  }
};
