'use client';

import React from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { TEAMS, getFlagUrl } from '../data/initialData';
import { Award, ShieldAlert, ArrowRight } from 'lucide-react';

export default function Qualification() {
  const { qualifiedTeams, setStep } = useTournamentStore();

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
          <div className="text-[9px] text-slate-400 font-bold uppercase">Group {team.group}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-8 max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      {/* Page Title */}
      <div className="text-center max-w-2xl mx-auto flex flex-col items-center gap-2.5">
        <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest">
          Group Stage Concluded
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white">Qualified Teams (Round of 32)</h2>
        <p className="text-xs md:text-sm text-slate-400">
          The following 32 teams have secured qualification to the knockout stages. Review the qualifiers and then enter the bracket prediction stage.
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

        {/* Best 3rd-Places */}
        <div className="glass-panel rounded-2xl p-5 border-amber-500/15 bg-gradient-to-b from-amber-500/[0.01] to-slate-900/30 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-amber-500/10 pb-3">
            <div className="bg-amber-500/10 p-1.5 rounded-md border border-amber-500/30">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">Best 3rd Places</h3>
              <p className="text-[10px] text-slate-500 font-semibold">Top 8 performers across groups</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {qualifiedTeams.thirdPlaces.map((id) =>
              renderTeamBadge(id, 'bg-slate-900/40 border-slate-800/80 hover:border-amber-500/30 transition-colors')
            )}
          </div>
        </div>
      </div>

      {/* Advance button */}
      <div className="flex justify-center mt-4">
        <button
          onClick={() => setStep('R32')}
          className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-slate-950 font-black text-sm uppercase rounded-xl tracking-wider hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-md transform hover:scale-[1.02]"
        >
          Enter Knockout Bracket
          <ArrowRight className="h-4 w-4 stroke-[3]" />
        </button>
      </div>
    </div>
  );
}
