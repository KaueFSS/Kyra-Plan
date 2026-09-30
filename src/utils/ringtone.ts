/**
 * Alarm/timer sound synthesised with the Web Audio API, so there's no audio
 * file to bundle and it plays offline. A soft two-tone chime that repeats
 * until `stop()` is called.
 */
export interface Ringtone {
  stop: () => void;
}

export function playRingtone(loop: boolean): Ringtone {
  const ctx = new AudioContext();
  let stopped = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const chime = () => {
    if (stopped) return;
    const now = ctx.currentTime;
    [880, 1318.5, 880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.22;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.21);
    });
    if (loop) timeout = setTimeout(chime, 1600);
  };

  void ctx.resume().then(chime);

  return {
    stop: () => {
      stopped = true;
      if (timeout) clearTimeout(timeout);
      void ctx.close();
    },
  };
}
