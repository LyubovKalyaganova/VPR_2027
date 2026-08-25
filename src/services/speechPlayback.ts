export type SpeechPlaybackResult = 'played' | 'unavailable';

function speechSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (!speechSupported()) {
    return undefined;
  }
  const voices = window.speechSynthesis.getVoices();
  const wanted = lang.toLowerCase();
  const prefix = wanted.slice(0, 2);
  return (
    voices.find((voice) => voice.lang.toLowerCase() === wanted) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix))
  );
}

export function waitForVoices(timeoutMs = 1500): Promise<void> {
  if (!speechSupported()) {
    return Promise.resolve();
  }
  if (window.speechSynthesis.getVoices().length > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      window.speechSynthesis.removeEventListener('voiceschanged', finish);
      resolve();
    };
    window.speechSynthesis.addEventListener('voiceschanged', finish);
    window.setTimeout(finish, timeoutMs);
  });
}

export function cancelSpeech(): void {
  if (!speechSupported()) {
    return;
  }
  window.speechSynthesis.cancel();
}

export async function speakText(text: string, lang: string): Promise<SpeechPlaybackResult> {
  const spoken = text.trim();
  if (!speechSupported() || spoken.length === 0) {
    return 'unavailable';
  }
  await waitForVoices();
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(spoken);
  utterance.lang = lang;
  utterance.rate = lang.toLowerCase().startsWith('en') ? 0.9 : 0.85;
  const voice = pickVoice(lang);
  if (voice) {
    utterance.voice = voice;
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: SpeechPlaybackResult) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };
    utterance.onerror = () => finish('unavailable');
    utterance.onstart = () => finish('played');
    try {
      synth.speak(utterance);
    } catch {
      finish('unavailable');
      return;
    }
    window.setTimeout(() => {
      finish(synth.speaking || synth.pending ? 'played' : 'unavailable');
    }, 900);
  });
}

export function playAudioUrl(url: string): Promise<SpeechPlaybackResult> {
  if (typeof Audio === 'undefined') {
    return Promise.resolve('unavailable');
  }
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.onerror = () => resolve('unavailable');
    audio.onplaying = () => resolve('played');
    audio.play().catch(() => resolve('unavailable'));
  });
}
