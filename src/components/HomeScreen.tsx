'use client';

import React, { useRef } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { Trophy, HelpCircle, Users, MapPin } from 'lucide-react';
import { GROUPS, TEAMS, getFlagUrl } from '../data/initialData';
import PathToFinal from './PathToFinal';

export default function HomeScreen() {
  const { setStep } = useTournamentStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleTrophyHover = () => {
    if (typeof window !== 'undefined') {
      if (!audioRef.current) {
        audioRef.current = new Audio('/audio/messi.mp3');
        audioRef.current.volume = 0.6;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.warn('Audio playback blocked until user interaction:', err);
      });
    }
  };

  return (
    <div className="w-full flex flex-col gap-8 sm:gap-10 max-w-7xl mx-auto px-4 py-6 sm:py-10 animate-fade-in relative">
      {/* Hero Wrapper with Pitch lines background */}
      <div className="relative w-full flex flex-col gap-6 items-center py-2 sm:py-4">
        {/* Background glow effects */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-gradient-to-tr from-[#FFD700]/5 to-transparent blur-[100px] rounded-full pointer-events-none -z-10" />

        {/* Pitch Lines background SVG - Vertical for Mobile */}
        <svg 
          viewBox="0 0 400 350" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          preserveAspectRatio="none"
          className="block sm:hidden absolute inset-0 w-full h-full text-emerald-500/[0.02] pointer-events-none -z-20 select-none"
        >
          {/* Outer boundary */}
          <rect x="0" y="0" width="400" height="350" />
          {/* Center line */}
          <line x1="0" y1="175" x2="400" y2="175" />
          {/* Center circle */}
          <circle cx="200" cy="175" r="45" />
          <circle cx="200" cy="175" r="2" fill="currentColor" />
        </svg>

        {/* Pitch Lines background SVG - Horizontal for Tablet/Desktop */}
        <svg 
          viewBox="0 0 600 250" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          preserveAspectRatio="none"
          className="hidden sm:block absolute inset-0 w-full h-full text-emerald-500/[0.03] pointer-events-none -z-20 select-none"
        >
          {/* Outer boundary */}
          <rect x="0" y="0" width="600" height="250" />
          {/* Center line */}
          <line x1="300" y1="0" x2="300" y2="250" />
          {/* Center circle */}
          <circle cx="300" cy="125" r="45" />
          <circle cx="300" cy="125" r="2" fill="currentColor" />
        </svg>

        {/* HERO BANNER SECTION */}
        <div className="text-center flex flex-col items-center gap-4 max-w-4xl mx-auto select-none">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/25 text-[10px] sm:text-xs font-bold uppercase tracking-widest animate-pulse shadow-[0_0_10px_rgba(255,215,0,0.08)] font-sports-header">
            Interactive Football Simulator
          </div>

          <div className="flex flex-col items-center gap-2">
            {/* Title with left & right World Cup trophies */}
            <div className="flex items-center justify-center gap-3 sm:gap-5 md:gap-6">
              <img
                src="/world_cup_trophy.png"
                alt="FIFA World Cup Trophy Left"
                className="h-9 sm:h-14 md:h-16 object-contain drop-shadow-[0_4px_8px_rgba(255,215,0,0.2)]"
              />
              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-none font-sports-title uppercase">
                FIFA WORLD CUP <span className="text-[#FFD700] font-sports-title drop-shadow-[0_0_16px_rgba(255,215,0,0.35)]">2026</span>
              </h1>
              <img
                src="/world_cup_trophy.png"
                alt="FIFA World Cup Trophy Right"
                className="h-9 sm:h-14 md:h-16 object-contain drop-shadow-[0_4px_8px_rgba(255,215,0,0.2)]"
              />
            </div>

            <h2 className="text-lg sm:text-2xl md:text-3xl text-slate-100 font-bold tracking-wide uppercase font-sports-header">
              Predictor Simulator
            </h2>
          </div>

          <p className="text-[11px] sm:text-xs text-slate-400 max-w-2xl leading-normal mt-0.5 px-2">
            Make predictions, rank groups, calculate the best third-place qualifiers and simulate the 32-team knockout bracket to crown the 2026 World Champion!
          </p>

          <div className="relative mt-2 select-none">
            <button
              onClick={() => setStep('group')}
              className="relative overflow-hidden rounded-full p-[2px] active:scale-95 cursor-pointer shadow-[0_3px_15px_rgba(0,0,0,0.25)] text-prominent animate-pulse"
            >
              <div className="absolute inset-[-1000%] bg-[conic-gradient(from_0deg,#FFD700,#78350f,#FFD700)] animate-[spin_3.5s_linear_infinite]" />
              <span className="relative flex items-center justify-center px-10 py-3 rounded-full bg-grass-pitch-realistic text-white font-sports-title font-black text-sm sm:text-base uppercase tracking-widest border border-[#FFD700]/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                Start Simulation
              </span>
            </button>
          </div>
        </div>
      </div>


      {/* PATH TO THE FINAL SIMULATOR */}
      <PathToFinal />

      {/* FORMAT HIGHLIGHTS CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto w-full select-none">
        <div className="glass-panel-clear p-5 rounded-2xl flex flex-col items-center text-center gap-3 border-emerald-500/10 hover:border-[#FFD700]/30 hover:shadow-[0_4px_24px_rgba(255,215,0,0.06)] transition-all duration-300">
          <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
            <Users className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wide font-sports-header">48 Participating Nations</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Divided into 12 groups of 4. Predict matches or rank teams directly in order.
            </p>
          </div>
        </div>

        <div className="glass-panel-clear p-5 rounded-2xl flex flex-col items-center text-center gap-3 border-emerald-500/10 hover:border-[#FFD700]/30 hover:shadow-[0_4px_24px_rgba(255,215,0,0.06)] transition-all duration-300">
          <div className="bg-[#fbbf24]/10 p-2.5 rounded-xl border border-[#fbbf24]/20">
            <Trophy className="h-5 w-5 text-[#fbbf24]" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wide font-sports-header">New 32-Team Bracket</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Top 2 from each group plus the 8 best 3rd-placed teams advance to a single-elimination tournament tree.
            </p>
          </div>
        </div>

        <div className="glass-panel-clear p-5 rounded-2xl flex flex-col items-center text-center gap-3 border-emerald-500/10 hover:border-[#FFD700]/30 hover:shadow-[0_4px_24px_rgba(255,215,0,0.06)] transition-all duration-300">
          <div className="bg-sky-500/10 p-2.5 rounded-xl border border-sky-500/20">
            <MapPin className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wide font-sports-header">Host Nations</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              A historical tournament co-hosted across Canada, Mexico, and the United States.
            </p>
          </div>
        </div>
      </div>

      {/* TOURNAMENT GROUPS GRID (NEW WORLD CUP VIBE) */}
      <div className="flex flex-col gap-6 animate-fade-in mt-4">
        <div className="flex flex-col items-center text-center gap-1.5 max-w-xl mx-auto select-none">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wider uppercase font-sports-header">
            Nations & Groups
          </h2>
          <div className="h-1 w-12 bg-[#FFD700] rounded-full" />
          <p className="text-xs text-slate-400 mt-1">
            Explore the 48 qualified countries divided into 12 groups of 4.
          </p>
        </div>

        {/* Responsive Layout: Stacks on mobile, 5-column grid on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
          {/* Left Column: Groups A-F */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 sm:gap-4 order-1">
            {GROUPS.slice(0, 6).map((group) => {
              const groupTeams = TEAMS.filter((t) => t.group === group);

              return (
                <div
                  key={`home-group-${group}`}
                  className="flex flex-col p-3 sm:p-4 rounded-2xl border border-[#1F2937]/80 bg-[#111827]/40 text-left transition-all duration-300 hover:scale-[1.03] hover:border-[#FFD700]/35 hover:bg-[#111827]/80 group shadow-md"
                >
                  {/* Header row: Letter */}
                  <div className="flex items-center justify-between w-full mb-3 pb-1.5 border-b border-slate-800/80 select-none">
                    <span className="text-base font-bold text-[#FFD700] group-hover:text-emerald-400 transition-colors uppercase font-sports-header">
                      Group {group}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-sports-header">
                      4 Teams
                    </span>
                  </div>

                  {/* 4 Teams List */}
                  <div className="flex flex-col gap-2 sm:gap-2.5 w-full">
                    {groupTeams.map((team) => (
                      <div
                        key={team.id}
                        className="flex items-center gap-1.5 sm:gap-2 text-[13px] sm:text-[15px] font-semibold text-[#f2f7f5] hover:text-white transition-colors w-full"
                        title={`${team.name} (FIFA Rank #${team.rank})`}
                      >
                        <img
                          src={getFlagUrl(team.id)}
                          alt={`${team.name} Flag`}
                          className="w-5.5 h-3.5 sm:w-6 sm:h-4 object-cover rounded shadow-sm border border-slate-950 flex-shrink-0 select-none"
                        />
                        <span className="font-bold truncate flex-1">{team.name}</span>
                        <span className="text-[10px] sm:text-xs text-slate-500 font-bold ml-auto select-none font-sports-header flex-shrink-0">
                          #{team.rank}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center Column: World Cup Trophy */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center py-6 select-none relative group order-2">
            {/* Background Glow */}
            <div className="absolute w-48 h-48 bg-[#FFD700]/10 blur-3xl pointer-events-none rounded-full group-hover:bg-[#FFD700]/20 transition-all duration-500" />
            
            {/* Visual connector lines for large screens */}
            <div className="hidden lg:block absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#FFD700]/10 to-transparent pointer-events-none" />

            <div 
              onMouseEnter={handleTrophyHover}
              className="relative flex flex-col items-center transition-transform duration-500 group-hover:scale-105 cursor-pointer"
            >
              <img
                src="/world_cup_trophy.png"
                alt="FIFA World Cup Trophy"
                className="w-24 sm:w-32 lg:w-full max-w-[150px] object-contain drop-shadow-[0_10px_20px_rgba(255,215,0,0.15)] group-hover:drop-shadow-[0_15px_30px_rgba(255,215,0,0.3)] transition-all duration-500"
              />
            </div>
          </div>

          {/* Right Column: Groups G-L */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 sm:gap-4 order-3">
            {GROUPS.slice(6).map((group) => {
              const groupTeams = TEAMS.filter((t) => t.group === group);

              return (
                <div
                  key={`home-group-${group}`}
                  className="flex flex-col p-3 sm:p-4 rounded-2xl border border-[#1F2937]/80 bg-[#111827]/40 text-left transition-all duration-300 hover:scale-[1.03] hover:border-[#FFD700]/35 hover:bg-[#111827]/80 group shadow-md"
                >
                  {/* Header row: Letter */}
                  <div className="flex items-center justify-between w-full mb-3 pb-1.5 border-b border-slate-800/80 select-none">
                    <span className="text-base font-bold text-[#FFD700] group-hover:text-emerald-400 transition-colors uppercase font-sports-header">
                      Group {group}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-sports-header">
                      4 Teams
                    </span>
                  </div>

                  {/* 4 Teams List */}
                  <div className="flex flex-col gap-2 sm:gap-2.5 w-full">
                    {groupTeams.map((team) => (
                      <div
                        key={team.id}
                        className="flex items-center gap-1.5 sm:gap-2 text-[13px] sm:text-[15px] font-semibold text-[#f2f7f5] hover:text-white transition-colors w-full"
                        title={`${team.name} (FIFA Rank #${team.rank})`}
                      >
                        <img
                          src={getFlagUrl(team.id)}
                          alt={`${team.name} Flag`}
                          className="w-5.5 h-3.5 sm:w-6 sm:h-4 object-cover rounded shadow-sm border border-slate-950 flex-shrink-0 select-none"
                        />
                        <span className="font-bold truncate flex-1">{team.name}</span>
                        <span className="text-[10px] sm:text-xs text-slate-500 font-bold ml-auto select-none font-sports-header flex-shrink-0">
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
      </div>

      {/* QUICK INSTRUCTIONS */}
      <div className="glass-panel rounded-2xl p-6 border-slate-850 bg-slate-900/10 flex flex-col gap-4 mt-4 select-none max-w-5xl mx-auto w-full">
        <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 font-sports-header">
          <HelpCircle className="h-4 w-4 text-emerald-500 animate-pulse" />
          How it Works
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="flex gap-2">
            <span className="font-bold text-[#FFD700] font-sports-header">01.</span>
            <p className="text-slate-400 leading-normal">
              <strong>Group Predictions:</strong> Predict match-by-match or use Direct Group Ranking to rank teams directly in order. Watch live standings update instantly.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-[#FFD700] font-sports-header">02.</span>
            <p className="text-slate-400 leading-normal">
              <strong>Calculation:</strong> The simulator automatically ranks 3rd-place teams and builds the qualified pool of 32.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-[#FFD700] font-sports-header">03.</span>
            <p className="text-slate-400 leading-normal">
              <strong>Elimination Rounds:</strong> Predict winners from the Round of 32 down to the Semifinals directly on the bracket tree.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-[#FFD700] font-sports-header">04.</span>
            <p className="text-slate-400 leading-normal">
              <strong>Crown Champ:</strong> Select the final champion on the podium screen and review your overall simulation stats.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
