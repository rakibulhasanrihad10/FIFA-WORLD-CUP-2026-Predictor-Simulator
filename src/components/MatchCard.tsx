'use client';

import React from 'react';
import { Match, Team } from '../types/tournament';
import { TEAMS, getFlagUrl, getOfficialMatchNumber, formatPlaceholder } from '../data/initialData';
import { Check } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  onSelectWinner: (matchId: string, winnerId: string) => void;
  lightTheme?: boolean;
  compact?: boolean;
  id?: string;
}

export default function MatchCard({ match, onSelectWinner, lightTheme = false, compact = false, id }: MatchCardProps) {
  // Look up teams
  const homeTeam = match.homeTeamId ? TEAMS.find((t) => t.id === match.homeTeamId) : undefined;
  const awayTeam = match.awayTeamId ? TEAMS.find((t) => t.id === match.awayTeamId) : undefined;

  const isPredictable = homeTeam !== undefined && awayTeam !== undefined;

  const handleSelect = (teamId: string) => {
    if (!isPredictable) return;
    onSelectWinner(match.id, teamId);
  };

  const renderTeamRow = (team: Team | undefined, placeholder: string | undefined, isHome: boolean) => {
    const isSelected = match.winnerId && team && match.winnerId === team.id;
    const isLoser = match.winnerId && team && match.winnerId !== team.id;

    if (!team) {
      return (
        <div className={`flex items-center justify-between rounded-lg border border-dashed italic ${
          compact ? 'p-1.5 text-[10px]' : 'p-2.5 text-xs'
        } ${
          lightTheme
            ? 'border-slate-300 bg-slate-100/40 text-slate-400'
            : 'border-slate-800 bg-slate-950/20 text-slate-500'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
              compact ? 'text-[9px]' : 'text-[10px]'
            } ${
              lightTheme
                ? 'bg-slate-200/60 text-slate-500 border-slate-300/40'
                : 'bg-slate-900/60 text-slate-500 border-slate-800/40'
            }`}>{formatPlaceholder(placeholder)}</span>
          </div>
        </div>
      );
    }

    return (
      <button
        disabled={!isPredictable}
        onClick={() => handleSelect(team.id)}
        className={`w-full flex items-center justify-between rounded-lg text-left transition-all duration-200 cursor-pointer ${
          compact ? 'p-1.5' : 'p-3'
        } ${
          isSelected
            ? lightTheme
              ? 'bg-emerald-600 text-white border border-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.15)] font-bold'
              : 'bg-emerald-950/45 text-emerald-100 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.12)]'
            : isLoser
            ? lightTheme
              ? 'bg-slate-200/40 text-slate-400 border border-slate-200/30 opacity-40 hover:opacity-60'
              : 'bg-slate-950/10 text-slate-500 border border-slate-950/10 opacity-40 hover:opacity-60'
            : lightTheme
            ? 'bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-950 shadow-[0_2px_6px_rgba(0,0,0,0.02)]'
            : 'bg-slate-900/40 text-slate-300 border border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700/60 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <img 
            src={getFlagUrl(team.id)} 
            alt={`${team.name} Flag`} 
            crossOrigin="anonymous"
            className={`object-cover rounded-sm shadow flex-shrink-0 select-none ${
              compact ? 'w-4.5 h-3' : 'w-5.5 h-3.5'
            } ${
              lightTheme ? 'border border-black/10' : 'border border-slate-950/50'
            }`}
          />
          <span className={`font-semibold truncate ${compact ? 'text-xs' : 'text-sm'}`}>{team.name}</span>
          {!compact && isLoser && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20 select-none flex-shrink-0 animate-fade-in">
              Eliminated
            </span>
          )}
        </div>
        {isSelected && (
          <span className={`flex items-center justify-center rounded-full flex-shrink-0 ${
            compact ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5'
          } ${
            lightTheme ? 'bg-white text-emerald-600 shadow-sm' : 'bg-emerald-500 text-slate-950'
          }`}>
            <Check className={`${compact ? 'h-2 w-2' : 'h-3 w-3'} stroke-[3]`} />
          </span>
        )}
      </button>
    );
  };

  return (
    <div id={id} className={`rounded-xl flex flex-col justify-between h-auto transition-all duration-300 border ${
      compact ? 'py-1.5 px-2 gap-1' : 'py-3 px-4 gap-2.5'
    } ${
      lightTheme
        ? isPredictable
          ? 'bg-slate-100/70 border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-slate-300/80'
          : 'border-slate-200/40 opacity-75 bg-slate-100/20'
        : isPredictable 
          ? 'glass-panel glass-panel-hover border-[#22c55e]/10 shadow-[0_4px_16px_rgba(0,0,0,0.2)]' 
          : 'border-slate-900/60 opacity-75 bg-slate-950/20'
    }`}>
      {/* Match Meta */}
      <div className={`flex items-center justify-between px-1 text-[9px] uppercase font-bold tracking-wider ${
        lightTheme ? 'text-slate-500' : 'text-slate-500'
      }`}>
        <span className={compact ? 'text-[8.5px]' : ''}>Match {getOfficialMatchNumber(match.id)}</span>
        {match.groupId && !compact && (
          <span className={lightTheme ? 'text-emerald-700' : 'text-emerald-500/80'}>
            Group {match.groupId}
          </span>
        )}
        {!isPredictable && <span className="text-amber-500 animate-pulse">Waiting</span>}
        {isPredictable && !match.winnerId && <span className="text-slate-400">Pick Winner</span>}
        {match.winnerId && <span className={lightTheme ? 'text-emerald-700 font-extrabold' : 'text-emerald-400 font-extrabold'}>Completed</span>}
      </div>

      {/* Teams grid */}
      <div className="flex flex-col gap-0.5">
        {renderTeamRow(homeTeam, match.placeholderHome, true)}
        <div className={`flex items-center justify-center font-extrabold rounded w-8 mx-auto z-10 select-none border ${
          compact ? 'my-0.5 text-[8.5px]' : 'my-1 text-[10px]'
        } ${
          lightTheme
            ? 'text-slate-500 bg-slate-200/80 border-slate-300/40'
            : 'text-slate-600 bg-slate-950/40 border-slate-900/40'
        }`}>
          VS
        </div>
        {renderTeamRow(awayTeam, match.placeholderAway, false)}
      </div>
    </div>
  );
}
