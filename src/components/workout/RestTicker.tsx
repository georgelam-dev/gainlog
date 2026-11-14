import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';

import type { RestTimer } from '@/lib/workoutTypes';

const TICK = require('../../../assets/sounds/tick.wav');
const DONE = require('../../../assets/sounds/done.wav');

/** If we notice the end this late (app was in the background), skip the sound. */
const LATE_MS = 1500;

function play(p: AudioPlayer) {
  try {
    p.seekTo(0);
    p.play();
  } catch (e) {
    console.warn('Rest sound failed', e);
  }
}

/**
 * Invisible: plays a tick at 3, 2 and 1 seconds left and a tone at zero, then clears the
 * timer. Lives in the provider so it works on any screen, not just the active workout.
 */
export function RestTicker({ rest, onFinished }: { rest: RestTimer | null; onFinished: () => void }) {
  const tick = useAudioPlayer(TICK);
  const done = useAudioPlayer(DONE);
  const lastBeep = useRef<number | null>(null);

  useEffect(() => {
    // Mix with music/podcasts instead of pausing them; still beep in silent mode (iOS).
    setAudioModeAsync({ interruptionMode: 'mixWithOthers', playsInSilentMode: true }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!rest) return;
    lastBeep.current = null;
    const check = () => {
      const msLeft = rest.endsAt - Date.now();
      if (msLeft <= 0) {
        if (msLeft > -LATE_MS) play(done);
        onFinished();
        return;
      }
      const secLeft = Math.ceil(msLeft / 1000);
      if (secLeft <= 3 && lastBeep.current !== secLeft) {
        lastBeep.current = secLeft;
        play(tick);
      }
    };
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, [rest, onFinished, tick, done]);

  return null;
}
