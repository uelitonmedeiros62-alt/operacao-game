/**
 * Ditado por voz usando o reconhecimento de fala do próprio navegador.
 * - Só começa depois que a pessoa toca no microfone (o navegador pede permissão).
 * - Não grava áudio: apenas recebe o texto reconhecido.
 * - Em navegadores como o Chrome, o áudio é enviado ao serviço do fabricante do
 *   navegador para virar texto, por isso normalmente exige internet.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type RecognitionCtor = new () => any;

export function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isVoiceSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export interface VoiceSession {
  stop(): void;
  cancel(): void;
}

export interface VoiceHandlers {
  onText(text: string, isFinal: boolean): void;
  onEnd(): void;
  onError(message: string): void;
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'O acesso ao microfone foi negado. Você pode liberar nas configurações do navegador ou digitar o texto.',
  'service-not-allowed': 'O navegador não permitiu o reconhecimento de voz. Digite o texto, por favor.',
  'no-speech': 'Não ouvi nada. Tente de novo, falando perto do aparelho.',
  'audio-capture': 'Não encontrei um microfone funcionando.',
  network: 'O reconhecimento de voz precisa de internet neste navegador. Digite o texto ou tente de novo.',
  aborted: '',
};

export function startDictation(handlers: VoiceHandlers): VoiceSession | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = 'pt-BR';
  rec.interimResults = true;
  rec.continuous = true;
  rec.maxAlternatives = 1;
  let finalText = '';
  let cancelled = false;

  rec.onresult = (event: any) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i];
      if (r.isFinal) finalText += `${r[0].transcript} `;
      else interim += r[0].transcript;
    }
    if (!cancelled) handlers.onText((finalText + interim).trim(), !interim);
  };
  rec.onerror = (event: any) => {
    const msg = ERRORS[event.error] ?? 'Não foi possível usar o reconhecimento de voz agora. Digite o texto.';
    if (msg && !cancelled) handlers.onError(msg);
  };
  rec.onend = () => handlers.onEnd();
  try {
    rec.start();
  } catch {
    handlers.onError('Não foi possível iniciar o microfone. Digite o texto.');
    return null;
  }
  return {
    stop: () => rec.stop(),
    cancel: () => {
      cancelled = true;
      rec.abort();
    },
  };
}
