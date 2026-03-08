import { Lipsync } from "wawa-lipsync";

let instance: Lipsync | null = null;
let connectedAudio: HTMLMediaElement | null = null;

export function getLipsyncManager(): Lipsync {
  if (!instance) {
    instance = new Lipsync({ fftSize: 2048, historySize: 10 });
  }
  return instance;
}

/** Connect an audio element to the lipsync analyser (only once per element) */
export function connectAudioToLipsync(audio: HTMLMediaElement): void {
  const mgr = getLipsyncManager();
  if (connectedAudio === audio) return;
  connectedAudio = audio;
  mgr.connectAudio(audio);
}
