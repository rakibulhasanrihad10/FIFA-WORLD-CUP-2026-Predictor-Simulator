'use client';

import React from 'react';
import { TeamStanding } from '../types/tournament';
import { TEAMS, getFlagUrl } from '../data/initialData';

interface StandingsTableProps {
  groupId: string;
  standings: TeamStanding[];
}

export default function StandingsTable({ groupId, standings }: StandingsTableProps) {
  return (
    <div className="glass-panel rounded-xl overflow-hidden border-[#22c55e]/10 shadow-[0_4px_24px_rgba(0,0,0,0.25)] flex flex-col h-full">
      {/* Table Title */}
      <div className="bg-emerald-950/20 px-4 py-2.5 border-b border-[#22c55e]/10 flex items-center justify-between">
        <h3 className="text-sm font-extrabold tracking-wider text-emerald-400 uppercase">
          Group {groupId} Standings
        </h3>
        <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-400 font-bold">
          LIVE
        </span>
      </div>

      {/* Table Headers */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[260px]">
          <thead>
            <tr className="border-b border-slate-900/60 bg-slate-950/35 text-[10px] uppercase font-bold tracking-wider text-slate-500">
              <th className="py-2.5 pl-3.5 pr-2 text-center w-8">#</th>
              <th className="py-2.5 px-2">Team</th>
              <th className="py-2.5 px-2 text-center w-10">P</th>
              <th className="py-2.5 px-2 text-center w-10">W</th>
              <th className="py-2.5 px-2 text-center w-10">L</th>
              <th className="py-2.5 pr-3.5 pl-2 text-center w-12 text-emerald-400">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-950/20 text-xs">
            {standings.map((row, index) => {
              const team = TEAMS.find((t) => t.id === row.teamId);
              if (!team) return null;

              const position = index + 1;
              
              // Position highlighting classes
              let rowClass = 'text-slate-300';
              let badgeClass = 'bg-slate-900 text-slate-400 border border-slate-800';

              if (position <= 2) {
                // Top 2: Auto qualify
                rowClass = 'text-emerald-100 bg-emerald-500/[0.01]';
                badgeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
              } else if (position === 3) {
                // 3rd: Possible qualify
                rowClass = 'text-amber-100 bg-amber-500/[0.005]';
                badgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
              } else {
                // Eliminated
                rowClass = 'text-slate-500 opacity-60';
                badgeClass = 'bg-slate-950/50 text-slate-600 border border-slate-950';
              }

              return (
                <tr 
                  key={row.teamId} 
                  className={`hover:bg-slate-900/20 transition-colors ${rowClass}`}
                >
                  <td className="py-2 pl-3.5 pr-2 text-center">
                    <span className={`inline-flex items-center justify-center h-5 w-5 rounded-md text-[10px] font-extrabold ${badgeClass}`}>
                      {position}
                    </span>
                  </td>
                  <td className="py-2 px-2 font-semibold">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={getFlagUrl(team.id)} 
                        alt={`${team.name} Flag`} 
                        className="w-5.5 h-3.5 object-cover rounded-sm shadow border border-slate-900 flex-shrink-0 select-none"
                      />
                      <span className="truncate">{team.name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center text-slate-400">{row.played}</td>
                  <td className="py-2 px-2 text-center text-slate-400">{row.won}</td>
                  <td className="py-2 px-2 text-center text-slate-400">{row.lost}</td>
                  <td className="py-2 pr-3.5 pl-2 text-center font-extrabold text-sm text-emerald-400 bg-emerald-500/[0.01]">
                    {row.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Legend footer */}
      <div className="mt-auto px-3.5 py-2 bg-slate-950/25 border-t border-slate-950/40 text-[9px] text-slate-500 flex gap-3 select-none">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
          <span>Top 2 Advance</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70" />
          <span>Best 8 3rd-Places Advance</span>
        </div>
      </div>
    </div>
  );
}
