const STORAGE_KEY = "daybook:sound-enabled";

export function isSoundEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== "off";
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
}

export function playCompletionChime() {
  if (!isSoundEnabled()) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [660, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.07;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });
    setTimeout(() => ctx.close(), 400);
  } catch {
    // Web Audio unavailable — fail silently.
  }
}