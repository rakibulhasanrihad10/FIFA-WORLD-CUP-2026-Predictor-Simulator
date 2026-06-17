'use client';

// Shared singleton AudioContext to prevent resource leaks, warnings, and browser limitations
let sharedCtx: AudioContext | null = null;

const getSharedContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!sharedCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      try {
        sharedCtx = new AudioContextClass();
      } catch (e) {
        // Fail silently if context cannot be created
      }
    }
  }
  return sharedCtx;
};

// Helper to trigger haptic feedback (Vibration + Web Audio Synth Click)
export const triggerHaptic = (type: 'click' | 'winner' = 'click') => {
  // 1. Mobile Physical Vibration
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      if (type === 'winner') {
        // Double pulse vibration for winner selection confirmation
        navigator.vibrate([10, 40, 10]);
      } else {
        // Single light vibration for standard clicks
        navigator.vibrate(10);
      }
    } catch (e) {
      // Ignore vibration blocks/failures
    }
  }

  // 2. Desktop/Mobile Audio click feedback (tactile tick)
  try {
    const ctx = getSharedContext();
    if (ctx) {
      // Resume context if suspended by browser autoplay security policies
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const playTick = (timeOffset: number, freq: number, duration: number, vol: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + timeOffset);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + timeOffset + duration);
        
        gain.gain.setValueAtTime(vol, ctx.currentTime + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + duration);
      };

      if (type === 'winner') {
        // Double tick sound for success selection
        playTick(0, 1400, 0.035, 0.04);
        playTick(0.06, 1700, 0.03, 0.03); // higher success pitch
      } else {
        // Single light tick sound for standard click
        playTick(0, 1200, 0.035, 0.03);
      }
    }
  } catch (e) {
    // Fail silently if AudioContext is blocked by autoplay policies
  }
};

