'use client';

import React, { useEffect } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { TEAMS, getFlagUrl, GROUPS } from '../data/initialData';
import { Award, ShieldAlert, ArrowRight, Check, Sparkles } from 'lucide-react';

export default function Qualification() {
  const { qualifiedTeams, setStep, standings, toggleThirdPlaceQualifier, autoSelectThirdPlacesByRank } = useTournamentStore();

  // Scroll to the Best 3rd Places interactive section when the screen loads
  useEffect(() => {
    const timer = setTimeout(() => {
      const element = document.getElementById('best-3rd-places-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const getTeamInfo = (id: string) => {
    return TEAMS.find((t) => t.id === id);
  };

  const renderTeamBadge = (teamId: string, badgeStyle: string) => {
    const team = getTeamInfo(teamId);
    if (!team) return null;

    return (
      <div 
        key={teamId}
        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-semibold ${badgeStyle}`}
      >
        <img 
          src={getFlagUrl(team.id)} 
          alt={`${team.name} Flag`} 
          className="w-5.5 h-3.5 object-cover rounded-sm shadow border border-slate-900 flex-shrink-0 select-none"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-white text-xs font-bold leading-tight">{team.name}</div>
          <div className="text-[9px] text-slate-400 font-bold uppercase">Group {team.group} • #{team.rank}</div>
        </div>
      </div>
    );
  };

  const renderInteractiveThirdPlaceBadge = (teamId: string, points: number) => {
    const team = getTeamInfo(teamId);
    if (!team) return null;

    const isSelected = qualifiedTeams.thirdPlaces.includes(teamId);
    
    return (
      <button
        key={teamId}
        onClick={() => toggleThirdPlaceQualifier(teamId)}
        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all duration-200 cursor-pointer ${
          isSelected
            ? 'bg-amber-500/10 text-amber-200 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.06)]'
            : 'bg-slate-950/15 border-slate-800/40 text-slate-400 hover:border-slate-700/60 opacity-60 hover:opacity-90'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img 
            src={getFlagUrl(team.id)} 
            alt={`${team.name} Flag`} 
            className="w-5.5 h-3.5 object-cover rounded-sm shadow border border-slate-900 flex-shrink-0 select-none"
          />
          <div className="min-w-0 flex-1">
            <div className={`truncate text-xs font-bold leading-tight ${isSelected ? 'text-amber-100' : 'text-slate-300'}`}>
              {team.name}
            </div>
            <div className="text-[9px] text-slate-500 font-bold uppercase">
              Group {team.group} • {points} pts • #{team.rank}
            </div>
          </div>
        </div>
        {isSelected && (
          <span className="flex items-center justify-center h-4.5 w-4.5 rounded-full bg-amber-500 text-slate-950 flex-shrink-0 ml-1.5">
            <Check className="h-3 w-3 stroke-[3.5]" />
          </span>
        )}
      </button>
    );
  };

  // Extract third place teams from the standings of each group
  const thirdPlaceCandidates = GROUPS.map((group) => {
    const groupStandings = standings[group];
    const standing = groupStandings && groupStandings.length >= 3 ? groupStandings[2] : null;
    return standing ? { teamId: standing.teamId, points: standing.points } : null;
  }).filter((x): x is { teamId: string; points: number } => x !== null);

  const isAdvanceEnabled = qualifiedTeams.thirdPlaces.length === 8;

  return (
    <div className="w-full flex flex-col gap-8 max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      {/* Page Title */}
      <div className="text-center max-w-2xl mx-auto flex flex-col items-center gap-2.5">
        <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest">
          Group Stage Concluded
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white">
          Qualified Teams <span className="block md:inline text-slate-400 text-lg md:text-2xl font-medium mt-1 md:mt-0 md:ml-1.5">(Round of 32)</span>
        </h2>
        <p className="text-xs md:text-sm text-slate-400">
          Verify qualifiers below. You can toggle which 8 of the 12 third-place teams survive to complete your knockout bracket.
        </p>
      </div>

      {/* Grid segments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Group Winners */}
        <div className="glass-panel rounded-2xl p-5 border-[#fbbf24]/15 bg-gradient-to-b from-[#fbbf24]/[0.02] to-slate-900/30 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-[#fbbf24]/10 pb-3">
            <div className="bg-[#fbbf24]/10 p-1.5 rounded-md border border-[#fbbf24]/30">
              <Award className="h-5 w-5 text-[#fbbf24]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#fbbf24] uppercase tracking-wider">Group Winners</h3>
              <p className="text-[10px] text-slate-500 font-semibold">12 automatic qualifiers</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {qualifiedTeams.winners.map((id) =>
              renderTeamBadge(id, 'bg-slate-900/40 border-slate-800/80 hover:border-[#fbbf24]/40 transition-colors')
            )}
          </div>
        </div>

        {/* Group Runners-Up */}
        <div className="glass-panel rounded-2xl p-5 border-emerald-500/15 bg-gradient-to-b from-emerald-500/[0.01] to-slate-900/30 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-emerald-500/10 pb-3">
            <div className="bg-emerald-500/10 p-1.5 rounded-md border border-emerald-500/30">
              <Award className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider">Group Runners-up</h3>
              <p className="text-[10px] text-slate-500 font-semibold">12 automatic qualifiers</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {qualifiedTeams.runnersUp.map((id) =>
              renderTeamBadge(id, 'bg-slate-900/40 border-slate-800/80 hover:border-emerald-500/35 transition-colors')
            )}
          </div>
        </div>

        {/* Best 3rd-Places (Interactive Toggles) */}
        <div id="best-3rd-places-section" className="glass-panel rounded-2xl p-5 border-[#00ffff]/15 bg-gradient-to-b from-[#00ffff]/[0.01] to-slate-900/30 flex flex-col gap-4">
          <div className="flex items-start justify-between border-b border-[#00ffff]/10 pb-3 gap-2 select-none">
            <div className="flex items-center gap-2">
              <div className="bg-[#00ffff]/10 p-1.5 rounded-md border border-[#00ffff]/30 text-[#00ffff] drop-shadow-[0_0_6px_rgba(0,255,255,0.15)]">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#00ffff] uppercase tracking-wider drop-shadow-[0_0_8px_rgba(0,255,255,0.25)]">
                  Best 3rd Places
                </h3>
                <p className="text-[10px] font-black uppercase tracking-wide text-[#BDC3C7]">
                  Select exactly 8 (
                  <span className={`transition-all duration-300 ${
                    qualifiedTeams.thirdPlaces.length === 8
                      ? 'text-emerald-400 font-extrabold'
                      : 'text-[#00ffff] font-extrabold animate-pulse'
                  }`}>
                    {qualifiedTeams.thirdPlaces.length} selected
                  </span>
                  )
                </p>
              </div>
            </div>
            
            <button
              onClick={autoSelectThirdPlacesByRank}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00ffff]/10 border border-[#00ffff]/30 text-[#00ffff] hover:bg-[#00ffff]/20 hover:text-white font-extrabold text-[10px] uppercase tracking-wider transition-all duration-200 shadow-sm hover:scale-[1.03] cursor-pointer flex-shrink-0"
              title="Auto-select top 8 teams based on FIFA ranks"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Auto
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[500px] pr-1.5">
            {thirdPlaceCandidates.map((cand) =>
              renderInteractiveThirdPlaceBadge(cand.teamId, cand.points)
            )}
          </div>
        </div>
      </div>

      {/* Advance button */}
      <div className="flex flex-col items-center gap-2 mt-4">
        {/* Helper Alert Text */}
        <p className={`text-xs font-extrabold text-center select-none px-4 py-2 rounded-lg border transition-all duration-300 max-w-2xl ${
          !isAdvanceEnabled
            ? 'text-[#ff6b6b] bg-[#ff6b6b]/5 border-[#ff6b6b]/20 animate-pulse'
            : 'text-[#2ecc71] bg-[#2ecc71]/5 border-[#2ecc71]/20 shadow-[0_0_12px_rgba(46,204,113,0.06)]'
        }`}>
          {!isAdvanceEnabled ? (
            <span>
              ⚠️ 24 teams have automatically qualified from the 12 groups. Please select exactly 8 of the 12 third-place teams (currently {qualifiedTeams.thirdPlaces.length}/8 chosen). You cannot proceed yet.
            </span>
          ) : (
            <span>
              ✓ Success! 32 teams have qualified. The Round of 32 knockout stage is now unlocked.
            </span>
          )}
        </p>

        <button
          disabled={!isAdvanceEnabled}
          onClick={() => setStep('R32')}
          className={`flex items-center gap-2 px-8 py-3.5 font-black text-sm uppercase rounded-xl tracking-wider transition-all transform duration-200 shadow-md ${
            isAdvanceEnabled
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-slate-950 hover:from-emerald-500 hover:to-emerald-400 cursor-pointer hover:scale-[1.02]'
              : 'bg-slate-800 text-slate-500 border border-slate-700/60 opacity-50 cursor-not-allowed'
          }`}
        >
          Proceed to Knockout
          <ArrowRight className="h-4 w-4 stroke-[3]" />
        </button>
      </div>
    </div>
  );
}
