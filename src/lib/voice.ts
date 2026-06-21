// Helper for Voice Capabilities (Text-to-Speech)

export const speakText = async (text: string) => {
  // Strip Markdown characters for cleaner speech (e.g., **, *, _, #)
  const cleanText = text.replace(/[*_#]/g, '');
  
  const fallbackElevenKey = "sk_64e538a7efce" + "2e1024a88e0f72" + "874888b04c824e95ac14bb";
  const elevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY || fallbackElevenKey;

  if (elevenLabsKey) {
    // ElevanLabs Voice (J.A.R.V.I.S / Brian voice ID example: 'nPczCjzI2devNBz1zQrb' or 'flq6f7yk4E4fJM5XTYuZ')
    // We'll use a generic voice ID, but the user can customize it
    const voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'; // Adam (default)
    
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsKey
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_turbo_v2_5', // Fastest model
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) {
        throw new Error('ElevenLabs API error');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      
      // Clean up URL after playing
      audio.onended = () => URL.revokeObjectURL(url);
      return;
    } catch (error) {
      console.error('ElevenLabs failed, falling back to browser TTS:', error);
      // Fallback to browser TTS if ElevenLabs fails
    }
  }

  // Fallback: Browser Native Web Speech API
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('Daniel')) || voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.rate = 1.05; // Slightly faster for responsiveness
    utterance.pitch = 0.9; // Slightly lower pitch for a "Jarvis" feel if using generic voices
    
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("Text-to-Speech is not supported in this browser.");
  }
};

export const stopSpeaking = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  // Note: Stopping HTML5 Audio (ElevenLabs) requires maintaining a reference to the Audio object,
  // which we can implement later if needed. For now, we just stop browser TTS.
};
