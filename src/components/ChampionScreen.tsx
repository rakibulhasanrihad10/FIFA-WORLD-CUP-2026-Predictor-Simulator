'use client';

import React, { useEffect, useState } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { TEAMS, getFlagUrl } from '../data/initialData';
import KnockoutBracket from './KnockoutBracket';
import { Trophy, Award, Medal, RotateCcw, Share2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import ShareModal from './ShareModal';

export default function ChampionScreen() {
  const { championId, runnerUpId, reset } = useTournamentStore();

  const champion = championId ? TEAMS.find((t) => t.id === championId) : undefined;
  const runnerUp = runnerUpId ? TEAMS.find((t) => t.id === runnerUpId) : undefined;

  // Sharing state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Trigger rich confetti animation when Champion screen is loaded
  useEffect(() => {
    const duration = 3.5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 45 * (timeLeft / duration);
      
      confetti({ 
        ...defaults, 
        particleCount, 
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } 
      });
      confetti({ 
        ...defaults, 
        particleCount, 
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } 
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Play champion celebration song if available
  useEffect(() => {
    if (championId) {
      const audio = new Audio(`/audio/${championId.toLowerCase()}_winner.mp3`);
      audio.volume = 0.5;
      audio.loop = true;
      
      // Silence error reporting if the audio file does not exist
      audio.onerror = () => {
        // File not found or failed to load: do nothing
      };

      audio.play().catch(() => {
        // Autoplay blocked or load failed: do nothing
      });

      return () => {
        audio.pause();
        audio.currentTime = 0;
      };
    }
  }, [championId]);

  return (
    <>
      <div className="w-full flex flex-col gap-10 py-10 animate-fade-in max-w-full overflow-hidden">
      
      {/* CROWNING SECTION */}
      <div className="text-center flex flex-col items-center gap-4 max-w-3xl mx-auto px-4">
        <div className="bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/30 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.15)]">
          <Trophy className="h-4 w-4" />
          Prediction Finished
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-amber-200 to-amber-400">
          Your 2026 World Cup Champion
        </h2>
        <p className="text-xs md:text-sm text-slate-400">
          You have successfully simulated the tournament.
        </p>
      </div>

      {/* PODIUM DISPLAY */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 max-w-4xl mx-auto px-4 w-full">
        {/* Runner Up Card */}
        <div className="w-full sm:w-64 order-2 sm:order-1 glass-panel rounded-2xl p-5 border-slate-700/35 bg-gradient-to-b from-slate-900/10 to-slate-950/40 flex flex-col items-center text-center gap-3">
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner select-none">
              <Medal className="h-8 w-8 text-slate-400" />
            </div>
            <span className="absolute -bottom-1 -right-1 bg-slate-700 text-slate-200 font-extrabold text-[10px] px-1.5 py-0.5 rounded border border-slate-600">
              2nd
            </span>
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-400 uppercase tracking-wider">Runner-up</h3>
            <div className="font-black text-lg text-white mt-1 flex items-center justify-center gap-1.5">
              {runnerUp && (
                <img 
                  src={getFlagUrl(runnerUp.id)} 
                  alt="" 
                  crossOrigin="anonymous"
                  className="w-5.5 h-3.5 object-cover rounded shadow-sm border border-slate-900 select-none"
                />
              )}
              {runnerUp?.name || 'TBD'}
            </div>
          </div>
        </div>

        {/* Champion Card */}
        <div className="w-full sm:w-80 order-1 sm:order-2 glass-panel rounded-3xl p-6 border-[#fbbf24]/30 bg-gradient-to-b from-[#fbbf24]/5 to-slate-950/50 flex flex-col items-center text-center gap-4 shadow-[0_8px_32px_rgba(251,191,36,0.12)]">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-amber-500/10 to-amber-500/30 border-2 border-[#fbbf24] flex items-center justify-center shadow-[0_0_24px_rgba(251,191,36,0.25)] select-none">
              <Trophy className="h-12 w-12 text-[#fbbf24] drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
            </div>
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#fbbf24] text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider border border-[#fbbf24] animate-bounce shadow-md">
              Champion
            </span>
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-[#fbbf24] uppercase tracking-widest flex items-center gap-1 justify-center">
              <Award className="h-4.5 w-4.5" />
              Predicted Winner
            </h3>
            <div className="font-black text-2xl text-white mt-1 flex items-center justify-center gap-2">
              {champion && (
                <img 
                  src={getFlagUrl(champion.id)} 
                  alt="" 
                  crossOrigin="anonymous"
                  className="w-7 h-4.5 object-cover rounded shadow-sm border border-[#fbbf24]/30 select-none"
                />
              )}
              {champion?.name || 'TBD'}
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS BAR */}
      <div className="flex items-center justify-center gap-4 max-w-md mx-auto px-4 flex-shrink-0">
        <button
          onClick={reset}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-xs uppercase hover:bg-slate-800 hover:text-emerald-400 hover:border-emerald-900/60 transition-all shadow-sm cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Simulate Again
        </button>
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all shadow-sm cursor-pointer"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share Prediction
        </button>
      </div>

      {/* BRACKET PREVIEW TITLE */}
      <div className="mt-8 border-t border-slate-900 pt-10 px-4">
        <div className="text-center max-w-2xl mx-auto flex flex-col items-center gap-1">
          <h3 className="text-lg font-black text-white uppercase tracking-wider">Your Knockout Bracket Review</h3>
          <p className="text-xs text-slate-500">
            Scroll horizontally to inspect the exact route your champion took.
          </p>
        </div>
        
        {/* Full Bracket Review */}
        <div className="max-w-full">
          <KnockoutBracket />
        </div>
      </div>

    </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        championId={championId}
        runnerUpId={runnerUpId}
        bracketElementId="bracket-board"
      />
    </>
  );
}
