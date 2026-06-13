'use client';

import React from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { Trophy, HelpCircle, Users, Sparkles, MapPin } from 'lucide-react';

export default function HomeScreen() {
  const { setStep } = useTournamentStore();

  return (
    <div className="w-full flex flex-col gap-10 max-w-5xl mx-auto px-4 py-10 sm:py-16 animate-fade-in">
      
      {/* HERO BANNER SECTION */}
      <div className="text-center flex flex-col items-center gap-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xs font-black uppercase tracking-widest animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.1)]">
          <Sparkles className="h-3.5 w-3.5" />
          Interactive Football Simulator
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-none">
          FIFA WORLD CUP <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-emerald-300 to-[#fbbf24] drop-shadow-[0_2px_10px_rgba(16,185,129,0.15)]">2026</span>
          <span className="block text-2xl sm:text-4xl mt-3 text-slate-100 font-extrabold tracking-normal">Predictor Simulator</span>
        </h1>

        <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
          The World Cup expands to <strong>48 teams</strong> and <strong>104 matches</strong>. Make your predictions, calculate the best third-place qualifiers, simulate the knockout rounds, and crown your 2026 World Champion!
        </p>

        <button
          onClick={() => setStep('group')}
          className="mt-4 px-8 py-4 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 text-slate-950 font-black text-sm uppercase rounded-xl tracking-wider hover:shadow-[0_0_24px_rgba(52,211,153,0.3)] transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98]"
        >
          Start Simulation
        </button>
      </div>

      {/* FORMAT HIGHLIGHTS CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4">
        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3 border-emerald-500/10">
          <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 w-fit">
            <Users className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm">48 Participating Nations</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Divided into 12 groups of 4. Play every team once to lock in live standings.
            </p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3 border-emerald-500/10">
          <div className="bg-[#fbbf24]/10 p-2.5 rounded-xl border border-[#fbbf24]/20 w-fit">
            <Trophy className="h-5 w-5 text-[#fbbf24]" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm">New 32-Team Bracket</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Top 2 from each group plus the 8 best 3rd-placed teams advance to a single-elimination tournament tree.
            </p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3 border-emerald-500/10">
          <div className="bg-sky-500/10 p-2.5 rounded-xl border border-sky-500/20 w-fit">
            <MapPin className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm">Host Nations</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              A historical tournament co-hosted across Canada, Mexico, and the United States.
            </p>
          </div>
        </div>
      </div>

      {/* QUICK INSTRUCTIONS */}
      <div className="glass-panel rounded-2xl p-6 border-slate-800/80 bg-slate-900/15 flex flex-col gap-4 mt-2">
        <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-emerald-500" />
          How it Works
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="flex gap-2">
            <span className="font-black text-emerald-400">01.</span>
            <p className="text-slate-400 leading-normal">
              <strong>Group Predictions:</strong> Choose the winner for each group match. Watch the live tables update instantly.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="font-black text-emerald-400">02.</span>
            <p className="text-slate-400 leading-normal">
              <strong>Calculation:</strong> The simulator automatically ranks 3rd-place teams and builds the qualified pool of 32.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="font-black text-emerald-400">03.</span>
            <p className="text-slate-400 leading-normal">
              <strong>Elimination Rounds:</strong> Predict winners from the Round of 32 down to the Semifinals directly on the bracket tree.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="font-black text-emerald-400">04.</span>
            <p className="text-slate-400 leading-normal">
              <strong>Crown Champ:</strong> Select the final champion on the podium screen and review your overall simulation stats.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
