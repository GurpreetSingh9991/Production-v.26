// components/LoadingBar.tsx
// Smooth, realistic loading bar — no jitter, no crazy speed
import React, { useEffect, useState } from 'react';

interface LoadingBarProps {
  message?: string;
}

export const LoadingBar: React.FC<LoadingBarProps> = ({ message = 'Loading...' }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Realistic progress curve: fast at start, slows down, never quite hits 100%
    // until the component is unmounted (auth finished)
    let current = 0;
    let animFrameId: number;
    let startTime: number | null = null;
    let phaseIndex = 0;

    // Each phase: { target %, duration ms }
    const PHASES = [
      { target: 30, duration: 400 },   // quick initial burst
      { target: 55, duration: 700 },   // slows
      { target: 70, duration: 900 },   // slows more
      { target: 82, duration: 1400 },  // waiting on server
      { target: 91, duration: 2200 },  // almost there — hold
    ];

    const tick = (timestamp: number) => {
      if (!startTime) startTime = timestamp;

      if (phaseIndex < PHASES.length) {
        const phase = PHASES[phaseIndex];
        const elapsed = timestamp - startTime;
        const t = Math.min(elapsed / phase.duration, 1);
        // Ease out cubic — decelerates naturally
        const eased = 1 - Math.pow(1 - t, 3);
        const prev = phaseIndex === 0 ? 0 : PHASES[phaseIndex - 1].target;
        current = prev + (phase.target - prev) * eased;
        setProgress(current);

        if (t >= 1) {
          phaseIndex++;
          startTime = timestamp;
        }
      }

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameId);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-white via-slate-50 to-slate-100">
      <div className="flex flex-col items-center gap-6 px-6 w-full max-w-xs">
        {/* Logo */}
        <div className="w-14 h-14 bg-[#111] rounded-[1.4rem] flex items-center justify-center shadow-2xl mb-2">
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </div>

        {/* Loading Bar Container */}
        <div className="w-full h-[3px] bg-black/8 rounded-full overflow-hidden">
          <div
            className="h-full bg-black rounded-full"
            style={{
              width: `${progress}%`,
              transition: 'width 80ms linear',
            }}
          />
        </div>

        {/* Message */}
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/30">
          {message}
        </p>
      </div>
    </div>
  );
};

// Inline loading bar for smaller sections
export const InlineLoadingBar: React.FC<{ message?: string }> = ({ message }) => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let animFrameId: number;
    let startTime: number | null = null;

    const tick = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      // Smooth 0→150→0 shuttle every 1600ms
      const cycle = 1600;
      const t = (elapsed % cycle) / cycle;
      const pos = t < 0.5 ? t * 2 * 150 : (1 - t) * 2 * 150;
      setOffset(pos);
      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameId);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="w-48 h-[3px] bg-black/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-black/40 rounded-full"
          style={{
            width: '40%',
            transform: `translateX(${offset}%)`,
          }}
        />
      </div>
      {message && (
        <p className="text-[10px] font-black uppercase tracking-widest text-black/30">
          {message}
        </p>
      )}
    </div>
  );
};

// Data syncing indicator (subtle, non-blocking)
export const SyncIndicator: React.FC = () => {
  return (
    <div className="fixed bottom-20 right-4 z-50 px-3 py-2 bg-black/90 text-white rounded-full shadow-xl animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-[10px] font-bold">Syncing...</span>
      </div>
    </div>
  );
};

export default LoadingBar;
