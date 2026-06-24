'use client';

import React from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { Trophy, RotateCcw } from 'lucide-react';
import { TournamentStep } from '../types/tournament';

export default function Header() {
  const { step, setStep, matches, reset } = useTournamentStore();
  const navRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (navRef.current) {
      const activeElement = navRef.current.querySelector('[data-active="true"]');
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [step]);

  const totalMatches = matches.length;
  const completedPredictions = matches.filter((m) => m.winnerId !== undefined).length;
  const percentage = Math.round((completedPredictions / totalMatches) * 100);

  // Group stage matches progress
  const groupMatches = matches.filter((m) => m.type === 'group');
  const completedGroup = groupMatches.filter((m) => m.winnerId !== undefined).length;
  const groupPercentage = Math.round((completedGroup / groupMatches.length) * 100);

  const stepsList: { key: TournamentStep; label: string }[] = [
    { key: 'home', label: 'Start' },
    { key: 'group', label: 'Group Stage' },
    { key: 'qualification', label: 'Qualified' },
    { key: 'R32', label: 'R32' },
    { key: 'R16', label: 'R16' },
    { key: 'QF', label: 'Quarters' },
    { key: 'SF', label: 'Semis' },
    { key: 'final', label: 'Final' },
  ];

  // Helper to determine if a step is accessible
  const isStepAccessible = (targetStep: TournamentStep): boolean => {
    if (targetStep === 'home') return true;
    if (targetStep === 'group') return true;
    
    // Group stage must be fully completed to access anything past group stage
    if (completedGroup < groupMatches.length) return false;
    
    if (targetStep === 'qualification') return true;

    // To access R32, we must have advanced (qualification is a preview step)
    const R32Matches = matches.filter((m) => m.stage === 'R32');
    const isR32Generated = R32Matches.every((m) => m.homeTeamId && m.awayTeamId);
    if (!isR32Generated) return false;

    if (targetStep === 'R32') return true;

    // For later stages, we check if preceding rounds have winners selected
    if (targetStep === 'R16') {
      return R32Matches.every((m) => m.winnerId !== undefined);
    }
    if (targetStep === 'QF') {
      const R16Matches = matches.filter((m) => m.stage === 'R16');
      return R16Matches.every((m) => m.winnerId !== undefined) && R32Matches.every((m) => m.winnerId !== undefined);
    }
    if (targetStep === 'SF') {
      const QFMatches = matches.filter((m) => m.stage === 'QF');
      return QFMatches.every((m) => m.winnerId !== undefined);
    }
    if (targetStep === 'final') {
      const SFMatches = matches.filter((m) => m.stage === 'SF');
      return SFMatches.every((m) => m.winnerId !== undefined);
    }
    return false;
  };

  const getStepIndex = (s: TournamentStep) => {
    const indices: Record<TournamentStep, number> = {
      home: 0,
      group: 1,
      qualification: 2,
      R32: 3,
      R16: 4,
      QF: 5,
      SF: 6,
      final: 7,
      champion: 8,
    };
    return indices[s];
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#22c55e]/15 bg-[#060a08]/85 backdrop-blur-md px-4 py-3 sm:px-6">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand/Logo */}
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setStep('home')}
          >
            <div className="bg-[#fbbf24]/10 p-2 rounded-lg border border-[#fbbf24]/30 group-hover:border-[#fbbf24]/60 transition-colors flex items-center justify-center">
              <img
                src="/world_cup_trophy.png"
                alt="World Cup Trophy Logo"
                className="h-6 w-6 object-contain animate-pulse select-none filter drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wider uppercase text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-emerald-100 to-emerald-400">
                WC 2026 Predictor
              </h1>
              <p className="text-xs text-slate-400 font-medium">Simulator Edition</p>
            </div>
          </div>

          {step === 'home' ? (
            <button
              onClick={() => {
                alert("World Cup History page is coming soon!");
              }}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#fbbf24]/10 hover:bg-[#fbbf24]/20 text-[#fbbf24] border border-[#fbbf24]/35 hover:border-[#fbbf24]/60 transition-all duration-300 cursor-pointer shadow-[0_2px_10px_rgba(251,191,36,0.05)] active:scale-[0.97]"
            >
              <Trophy className="h-3.5 w-3.5 text-[#fbbf24] animate-pulse" />
              <span>WC History</span>
            </button>
          ) : (
            <button
              onClick={reset}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900/40 hover:text-red-300 transition-all"
              title="Reset predictions"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>

        {/* Steps Navigation */}
        {step !== 'home' && step !== 'champion' && (
          <nav ref={navRef} className="flex items-center overflow-x-auto py-1 gap-1.5 max-w-full no-scrollbar">
            {stepsList.map(({ key, label }) => {
              const active = step === key;
              const accessible = isStepAccessible(key);
              const completed = getStepIndex(step) > getStepIndex(key);

              return (
                <button
                  key={key}
                  disabled={!accessible}
                  onClick={() => setStep(key)}
                  data-active={active ? 'true' : 'false'}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-emerald-600/90 text-white shadow-md shadow-emerald-900/20 border border-emerald-500/30'
                      : completed
                      ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 hover:bg-emerald-950/45'
                      : accessible
                      ? 'bg-slate-900/60 text-slate-300 border border-slate-800 hover:bg-slate-800/60'
                      : 'bg-slate-950/40 text-slate-600 border border-slate-900/50 cursor-not-allowed'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        )}

        {/* Progress & Reset Desktop */}
        {step !== 'home' && (
          <div className="hidden md:flex items-center gap-6">
            {step === 'group' ? (
              <div className="flex items-center gap-3 bg-slate-950/65 px-4 py-2 rounded-lg border border-[#22c55e]/15 flex-shrink-0 select-none">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Group Matches Done</div>
                  <div className="text-sm font-black text-white leading-none mt-1">
                    {completedGroup} <span className="text-slate-600">/</span> {groupMatches.length}
                  </div>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div className="text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Overall</div>
                  <div className="text-xs font-black text-emerald-400 leading-none mt-1">
                    {groupPercentage}%
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-end w-40 select-none">
                <div className="flex justify-between w-full text-xs font-medium text-slate-400 mb-1">
                  <span>Predictions</span>
                  <span className="text-emerald-400">{percentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-550 ease-out shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-red-950/30 text-red-400 border border-red-900/30 hover:bg-red-950/70 hover:border-red-900/60 transition-all duration-200 shadow-sm"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        )}

        {step === 'home' && (
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => {
                alert("World Cup History page is coming soon!");
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#fbbf24]/10 hover:bg-[#fbbf24]/20 text-[#fbbf24] border border-[#fbbf24]/30 hover:border-[#fbbf24]/65 transition-all duration-300 cursor-pointer shadow-[0_2px_10px_rgba(251,191,36,0.05)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <Trophy className="h-4 w-4 text-[#fbbf24] animate-pulse" />
              <span>World Cup History</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile progress bar */}
      {step !== 'home' && (
        <div className="md:hidden mt-2.5 w-full">
          {step === 'group' ? (
            <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1 select-none">
              <span>Group Matches Progress</span>
              <span className="text-emerald-400 font-extrabold">{completedGroup} / {groupMatches.length} ({groupPercentage}%)</span>
            </div>
          ) : (
            <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1 select-none">
              <span>Overall Simulation Progress</span>
              <span className="text-emerald-400">{percentage}% ({completedPredictions}/{totalMatches})</span>
            </div>
          )}
          <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500" 
              style={{ width: `${step === 'group' ? groupPercentage : percentage}%` }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
