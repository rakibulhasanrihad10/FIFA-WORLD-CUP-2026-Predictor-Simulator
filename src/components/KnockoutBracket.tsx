'use client';

import React from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import MatchCard from './MatchCard';
import { Trophy } from 'lucide-react';

export default function KnockoutBracket() {
  const { matches, selectWinner, step, setStep } = useTournamentStore();

  // Filter matches for left and right columns
  const getMatch = (id: string) => matches.find((m) => m.id === id)!;

  // Left bracket matches
  const leftR32 = ['R32_1', 'R32_2', 'R32_3', 'R32_4', 'R32_5', 'R32_6', 'R32_7', 'R32_8'].map(getMatch);
  const leftR16 = ['R16_1', 'R16_2', 'R16_3', 'R16_4'].map(getMatch);
  const leftQF = ['QF_1', 'QF_2'].map(getMatch);
  const leftSF = ['SF_1'].map(getMatch);

  // Center Final match
  const finalMatch = getMatch('F');

  // Right bracket matches
  const rightSF = ['SF_2'].map(getMatch);
  const rightQF = ['QF_3', 'QF_4'].map(getMatch);
  const rightR16 = ['R16_5', 'R16_6', 'R16_7', 'R16_8'].map(getMatch);
  const rightR32 = ['R32_9', 'R32_10', 'R32_11', 'R32_12', 'R32_13', 'R32_14', 'R32_15', 'R32_16'].map(getMatch);

  // Compute knockout predictions completion
  const knockoutMatches = matches.filter((m) => m.type === 'knockout');
  const completedKnockouts = knockoutMatches.filter((m) => m.winnerId !== undefined).length;

  return (
    <div className="w-full flex flex-col gap-6 max-w-full mx-auto py-6 animate-fade-in px-4">
      {/* Header Info */}
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/60 flex-shrink-0">
        <div>
          <h2 className="text-xl font-black text-white">Knockout Stage Predictions</h2>
          <p className="text-xs text-slate-400 mt-1">
            Pick winners by clicking on teams. Predictions propagate automatically to the next round.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-[#060a08] px-4 py-2.5 rounded-lg border border-[#22c55e]/15 flex-shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500">Knockout Progress</div>
            <div className="text-sm font-black text-white">
              {completedKnockouts} <span className="text-slate-700">/</span> {knockoutMatches.length} Matches
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="text-xs text-emerald-400 font-extrabold flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-[#fbbf24] animate-bounce" />
            Find your Champion!
          </div>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-500 italic block lg:hidden">
        Swipe horizontally to navigate the bracket tree ↔️
      </div>

      {/* Symmetric Bracket Board Scroll Wrapper */}
      <div className="w-full overflow-x-auto pb-4 no-scrollbar">
        <div className="min-w-[1450px] flex flex-row items-center justify-between gap-4 py-6 px-2 h-[1000px]">
          
          {/* COLUMN 1: LEFT R32 */}
          <div className="flex-1 h-full flex flex-col justify-around">
            <div className="text-center text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest border-b border-slate-900 pb-1.5">R32 - Left</div>
            {leftR32.map((match) => (
              <div key={match.id} className="w-56">
                <MatchCard match={match} onSelectWinner={selectWinner} />
              </div>
            ))}
          </div>

          {/* COLUMN 2: LEFT R16 */}
          <div className="flex-1 h-full flex flex-col justify-around">
            <div className="text-center text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest border-b border-slate-900 pb-1.5">R16 - Left</div>
            {leftR16.map((match) => (
              <div key={match.id} className="w-56">
                <MatchCard match={match} onSelectWinner={selectWinner} />
              </div>
            ))}
          </div>

          {/* COLUMN 3: LEFT QF */}
          <div className="flex-1 h-full flex flex-col justify-around">
            <div className="text-center text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest border-b border-slate-900 pb-1.5">Quarters - Left</div>
            {leftQF.map((match) => (
              <div key={match.id} className="w-56">
                <MatchCard match={match} onSelectWinner={selectWinner} />
              </div>
            ))}
          </div>

          {/* COLUMN 4: LEFT SF */}
          <div className="flex-1 h-full flex flex-col justify-around">
            <div className="text-center text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest border-b border-slate-900 pb-1.5">Semis - Left</div>
            {leftSF.map((match) => (
              <div key={match.id} className="w-56">
                <MatchCard match={match} onSelectWinner={selectWinner} />
              </div>
            ))}
          </div>

          {/* COLUMN 5: CENTER FINAL */}
          <div className="flex-1 h-full flex flex-col justify-center items-center gap-12 px-2">
            <div className="text-center">
              <div className="bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/30 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5 justify-center mb-3">
                <Trophy className="h-3.5 w-3.5" />
                The Final
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-4">Crowning the Champion</p>
            </div>
            
            <div className="w-60 shadow-[0_0_50px_rgba(251,191,36,0.08)] rounded-2xl p-1 bg-gradient-to-b from-[#fbbf24]/20 to-transparent">
              <MatchCard match={finalMatch} onSelectWinner={selectWinner} />
            </div>

            <div className="text-center max-w-[200px] text-[10px] text-slate-500 font-medium leading-relaxed select-none">
              Click the winning team of the final match above to lock in your champion!
            </div>
          </div>

          {/* COLUMN 6: RIGHT SF */}
          <div className="flex-1 h-full flex flex-col justify-around">
            <div className="text-center text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest border-b border-slate-900 pb-1.5">Semis - Right</div>
            {rightSF.map((match) => (
              <div key={match.id} className="w-56">
                <MatchCard match={match} onSelectWinner={selectWinner} />
              </div>
            ))}
          </div>

          {/* COLUMN 7: RIGHT QF */}
          <div className="flex-1 h-full flex flex-col justify-around">
            <div className="text-center text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest border-b border-slate-900 pb-1.5">Quarters - Right</div>
            {rightQF.map((match) => (
              <div key={match.id} className="w-56">
                <MatchCard match={match} onSelectWinner={selectWinner} />
              </div>
            ))}
          </div>

          {/* COLUMN 8: RIGHT R16 */}
          <div className="flex-1 h-full flex flex-col justify-around">
            <div className="text-center text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest border-b border-slate-900 pb-1.5">R16 - Right</div>
            {rightR16.map((match) => (
              <div key={match.id} className="w-56">
                <MatchCard match={match} onSelectWinner={selectWinner} />
              </div>
            ))}
          </div>

          {/* COLUMN 9: RIGHT R32 */}
          <div className="flex-1 h-full flex flex-col justify-around">
            <div className="text-center text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest border-b border-slate-900 pb-1.5">R32 - Right</div>
            {rightR32.map((match) => (
              <div key={match.id} className="w-56">
                <MatchCard match={match} onSelectWinner={selectWinner} />
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
