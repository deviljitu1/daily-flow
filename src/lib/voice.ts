// Text-to-Speech with ElevenLabs (via Supabase Edge Function) + browser fallback.
// All speech is gated by the user's notification preferences (voiceEnabled).

import { supabase } from '@/integrations/supabase/client';
import { getNotificationPrefs } from '@/lib/notifications';

let currentAudio: HTMLAudioElement | null = null;

const stripMarkdown = (s: string) => s.replace(/[*_#`>]/g, '');

const playBrowserTTS = (text: string) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => v.name.includes('Google UK English Male') || v.name.includes('Daniel')) || voices[0];
  if (preferred) utterance.voice = preferred;
  utterance.rate = 1.05;
  utterance.pitch = 0.9;
  window.speechSynthesis.speak(utterance);
};

export const speakText = async (text: string) => {
  const prefs = getNotificationPrefs();
  if (!prefs.voiceEnabled) return;

  const cleanText = stripMarkdown(text).trim();
  if (!cleanText) return;

  stopSpeaking();

  try {
    const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
      body: { text: cleanText.slice(0, 2000) },
    });
    if (error) throw error;
    if (data?.audioContent) {
      const url = `data:${data.mimeType || 'audio/mpeg'};base64,${data.audioContent}`;
      const audio = new Audio(url);
      currentAudio = audio;
      audio.onended = () => {
        if (currentAudio === audio) currentAudio = null;
      };
      await audio.play();
      return;
    }
    throw new Error('No audio returned');
  } catch (err) {
    console.warn('ElevenLabs TTS failed, falling back to browser TTS:', err);
    playBrowserTTS(cleanText);
  }
};

export const stopSpeaking = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      // ignore
    }
    currentAudio = null;
  }
};
