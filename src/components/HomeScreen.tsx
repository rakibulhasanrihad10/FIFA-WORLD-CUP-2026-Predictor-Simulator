'use client';

import React from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { Trophy, HelpCircle, Users, Sparkles, MapPin } from 'lucide-react';
import { GROUPS, TEAMS, getFlagUrl } from '../data/initialData';

export default function HomeScreen() {
  const { setStep } = useTournamentStore();

  return (
    <div className="w-full flex flex-col gap-12 max-w-7xl mx-auto px-4 py-10 sm:py-16 animate-fade-in relative">
      {/* Background glow effects */}
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-500/10 to-amber-500/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* HERO BANNER SECTION */}
      <div className="text-center flex flex-col items-center gap-6 max-w-3xl mx-auto select-none">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xs font-black uppercase tracking-widest animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.1)]">
          <Sparkles className="h-3.5 w-3.5 text-[#fbbf24] animate-pulse" />
          Interactive Football Simulator
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-none">
          FIFA WORLD CUP <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-emerald-300 to-[#fbbf24] drop-shadow-[0_2px_12px_rgba(16,185,129,0.25)]">2026</span>
          <span className="block text-2xl sm:text-4xl mt-3 text-slate-100 font-extrabold tracking-normal">Predictor Simulator</span>
        </h1>

        <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
          The World Cup expands to <strong>48 teams</strong> and <strong>104 matches</strong>. Make your predictions, calculate the best third-place qualifiers, simulate the knockout rounds, and crown your 2026 World Champion!
        </p>

        <button
          onClick={() => setStep('group')}
          className="mt-4 px-10 py-4 bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-500 hover:from-emerald-450 hover:via-amber-450 hover:to-emerald-450 text-slate-950 font-black text-sm uppercase rounded-xl tracking-wider hover:shadow-[0_0_30px_rgba(251,191,36,0.35)] transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98] cursor-pointer shadow-lg border border-[#fbbf24]/30"
        >
          Start Simulation
        </button>
      </div>

      {/* FORMAT HIGHLIGHTS CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto w-full select-none">
        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3 border-emerald-500/10 hover:border-emerald-500/25 hover:shadow-[0_4px_24px_rgba(16,185,129,0.06)] transition-all duration-300">
          <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 w-fit">
            <Users className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm">48 Participating Nations</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Divided into 12 groups of 4. Predict matches or rank teams directly in order.
            </p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3 border-emerald-500/10 hover:border-[#fbbf24]/25 hover:shadow-[0_4px_24px_rgba(251,191,36,0.06)] transition-all duration-300">
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

        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3 border-emerald-500/10 hover:border-sky-500/25 hover:shadow-[0_4px_24px_rgba(14,165,233,0.06)] transition-all duration-300">
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

      {/* TOURNAMENT GROUPS GRID (NEW WORLD CUP VIBE) */}
      <div className="flex flex-col gap-6 animate-fade-in mt-4">
        <div className="flex flex-col items-center text-center gap-1.5 max-w-xl mx-auto select-none">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
            Nations & Groups
          </h2>
          <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full" />
          <p className="text-xs text-slate-400 mt-1">
            Explore the 48 qualified countries divided into 12 groups of 4.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {GROUPS.map((group) => {
            const groupTeams = TEAMS.filter((t) => t.group === group);

            return (
              <div
                key={`home-group-${group}`}
                className="flex flex-col p-4 rounded-2xl border border-[#1F2937]/80 bg-[#111827]/40 text-left transition-all duration-300 hover:scale-[1.03] hover:border-emerald-500/35 hover:bg-[#111827]/80 group shadow-md"
              >
                {/* Header row: Letter */}
                <div className="flex items-center justify-between w-full mb-3.5 pb-1.5 border-b border-slate-800/80 select-none">
                  <span className="text-base font-black text-[#fbbf24] group-hover:text-emerald-400 transition-colors uppercase">
                    Group {group}
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    4 Teams
                  </span>
                </div>

                {/* 4 Teams List */}
                <div className="flex flex-col gap-2.5 w-full">
                  {groupTeams.map((team) => (
                    <div 
                      key={team.id} 
                      className="flex items-center gap-2 text-xs font-semibold text-[#f2f7f5] hover:text-white transition-colors"
                      title={`${team.name} (FIFA Rank #${team.rank})`}
                    >
                      <img
                        src={getFlagUrl(team.id)}
                        alt={`${team.name} Flag`}
                        className="w-5.5 h-3.5 object-cover rounded shadow-sm border border-slate-950 flex-shrink-0 select-none"
                      />
                      <span className="font-bold truncate max-w-[75px] sm:max-w-[85px]">{team.name}</span>
                      <span className="text-[9px] text-slate-500 font-bold ml-auto select-none">
                        #{team.rank}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* QUICK INSTRUCTIONS */}
      <div className="glass-panel rounded-2xl p-6 border-slate-850 bg-slate-900/10 flex flex-col gap-4 mt-4 select-none max-w-5xl mx-auto w-full">
        <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-emerald-500 animate-pulse" />
          How it Works
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="flex gap-2">
            <span className="font-black text-emerald-400">01.</span>
            <p className="text-slate-400 leading-normal">
              <strong>Group Predictions:</strong> Predict match-by-match or use Direct Group Ranking to rank teams directly in order. Watch live standings update instantly.
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
