'use client';

import React, { useState, useEffect } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { Team } from '../types/tournament';
import MatchCard from './MatchCard';
import StandingsTable from './StandingsTable';
import { GROUPS, TEAMS, getFlagUrl } from '../data/initialData';
import { CheckCircle2, ChevronRight, Play, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../utils/haptic';

export default function GroupStage() {
  const { matches, standings, selectWinner, quickRankGroup, clearGroupPredictions, advanceToKnockouts, autoPredictAllGroupsByRank, reset } = useTournamentStore();
  const [activeGroup, setActiveGroup] = useState<string>('A');
  const [predictionMode, setPredictionMode] = useState<'match' | 'rank'>('rank');

  // Local state for the 4 ranking slots
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null]);

  // Sync slots when activeGroup, matches, or standings change
  useEffect(() => {
    const groupMatches = matches.filter((m) => m.groupId === activeGroup);
    const completed = groupMatches.filter((m) => m.winnerId !== undefined).length;
    const isCompleted = completed === groupMatches.length;

    if (isCompleted) {
      const standingOrder = (standings[activeGroup] || []).map((s) => s.teamId);
      setSlots(standingOrder);
    } else {
      setSlots([null, null, null, null]);
    }
  }, [activeGroup, matches, standings]);

  // Filter matches for the active group
  const groupMatches = matches.filter((m) => m.groupId === activeGroup);
  
  // Overall group matches completion
  const allGroupMatches = matches.filter((m) => m.type === 'group');
  const completedCount = allGroupMatches.filter((m) => m.winnerId !== undefined).length;
  const isAllGroupsCompleted = completedCount === allGroupMatches.length;

  const groupTeams = TEAMS.filter((t) => t.group === activeGroup);

  // Helper to count completed matches in a specific group
  const getGroupProgress = (groupId: string) => {
    const matchesInGroup = matches.filter((m) => m.groupId === groupId);
    const completed = matchesInGroup.filter((m) => m.winnerId !== undefined).length;
    return { completed, total: matchesInGroup.length };
  };

  // Auto-heal outdated store standings data (from old local storage sessions)
  useEffect(() => {
    const hasOutdatedData = Object.values(standings).some((groupStandings) =>
      groupStandings.some((s) => !TEAMS.some((t) => t.id === s.teamId))
    );
    if (hasOutdatedData) {
      console.warn('Outdated team IDs detected in local storage standings. Performing auto-heal reset...');
      reset();
    }
  }, [standings, reset]);

  const getGroupDisplayTeams = (groupId: string) => {
    const groupTeams = TEAMS.filter((t) => t.group === groupId);
    if (groupId === activeGroup && predictionMode === 'rank') {
      const placedIds = slots.filter((id): id is string => id !== null);
      const unplaced = groupTeams
        .filter((t) => !placedIds.includes(t.id))
        .sort((a, b) => a.rank - b.rank);
      const combinedIds = [...placedIds, ...unplaced.map((t) => t.id)];
      return combinedIds
        .map((id) => TEAMS.find((t) => t.id === id))
        .filter((t): t is Team => t !== undefined);
    } else {
      const groupStandings = standings[groupId] || [];
      if (groupStandings.length === 4) {
        return groupStandings
          .map((s) => TEAMS.find((t) => t.id === s.teamId))
          .filter((t): t is Team => t !== undefined);
      }
      return groupTeams.sort((a, b) => a.rank - b.rank);
    }
  };

  const handlePlace = (teamId: string) => {
    if (slots.includes(teamId)) return;

    const nextIdx = slots.indexOf(null);
    if (nextIdx !== -1) {
      const newSlots = [...slots];
      newSlots[nextIdx] = teamId;
      setSlots(newSlots);

      // Lock in standings once all 4 slots are filled
      if (!newSlots.includes(null)) {
        quickRankGroup(activeGroup, newSlots as string[]);
        triggerHaptic('winner');
      }
    }
  };

  const handleRemove = (index: number) => {
    const newSlots = [...slots];
    newSlots[index] = null;
    setSlots(newSlots);

    // Reset predictions since it's incomplete
    clearGroupPredictions(activeGroup);
  };

  const handleNextGroup = () => {
    const currentIndex = GROUPS.indexOf(activeGroup);
    if (currentIndex < GROUPS.length - 1) {
      setActiveGroup(GROUPS[currentIndex + 1]);
    }
  };

  const activeProgress = getGroupProgress(activeGroup);
  const isActiveGroupCompleted = activeProgress.completed === activeProgress.total;

  return (
    <div className="w-full flex flex-col gap-6 max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      {/* Active Group Details */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Matches Section: Dark Mode Surface Container */}
        <div className={`${predictionMode === 'match' ? 'lg:col-span-3' : 'lg:col-span-5'} bg-[#111827] text-white rounded-2xl p-5 border border-[#1F2937] shadow-lg flex flex-col gap-4 animate-fade-in`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800 gap-3 select-none">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5">
              <h2 className="text-xl font-black text-white tracking-tight">
                Group {activeGroup}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                — Choose winner for each match individually, or rank teams in order.
              </p>
            </div>
            
            <button
              onClick={autoPredictAllGroupsByRank}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00ffff]/10 border border-[#00ffff]/30 text-[#00ffff] hover:bg-[#00ffff]/20 hover:text-white font-extrabold text-[10px] uppercase tracking-wider transition-all duration-200 shadow-md hover:scale-[1.02] cursor-pointer flex-shrink-0"
              title="Auto-predict all 12 groups by FIFA rank"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Auto-Predict by FIFA Rank
            </button>
          </div>

          {/* Mode Toggle Bar */}
          <div className="flex items-center justify-between bg-slate-950/40 p-1 rounded-xl border border-slate-800 select-none">
            <button
              onClick={() => setPredictionMode('rank')}
              className={`flex-1 flex items-center justify-center py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                predictionMode === 'rank'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Direct Group Ranking
            </button>
            <button
              onClick={() => setPredictionMode('match')}
              className={`flex-1 flex items-center justify-center py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                predictionMode === 'match'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Match-by-Match
            </button>
          </div>

          {predictionMode === 'match' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groupMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onSelectWinner={selectWinner}
                  lightTheme={false}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-5 bg-transparent">
              {/* TOP HALF: TARGET SLOTS */}
              <div className="flex flex-col gap-2">
                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">
                  Target Slots (Click placed team to remove)
                </div>
                
                <div className="grid grid-cols-4 gap-2.5">
                  {slots.map((teamId, index) => {
                    const team = teamId ? TEAMS.find((t) => t.id === teamId) : undefined;
                    const isNext = index === slots.indexOf(null);
                    
                    const labels = ['1ST', '2ND', '3RD', '4TH'];

                    if (team) {
                      return (
                        <button
                          key={`slot-${index}`}
                          onClick={() => handleRemove(index)}
                          className="flex flex-col items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-[#1F2937] text-center transition-all cursor-pointer transform hover:scale-[1.02] shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:border-red-500/50 hover:bg-red-950/10 min-h-[96px] w-full"
                        >
                          <span className="text-[10px] font-bold text-slate-400 self-start">
                            {labels[index]}
                          </span>
                          <div className="flex items-center gap-1.5 justify-center py-1">
                            <img 
                              src={getFlagUrl(team.id)} 
                              alt={`${team.name} Flag`} 
                              className="w-5.5 h-3.5 object-cover rounded-sm shadow-sm border border-black/20 select-none flex-shrink-0"
                            />
                            <span className="text-sm font-extrabold text-white tracking-wide">{team.id}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 self-start">
                            #{team.rank}
                          </span>
                        </button>
                      );
                    }

                    return (
                      <div
                        key={`slot-${index}`}
                        className={`flex flex-col items-center justify-between p-2.5 rounded-xl border border-dashed text-center min-h-[96px] w-full transition-all ${
                          isNext
                            ? 'border-[#10B981] bg-emerald-950/20 shadow-[0_0_12px_rgba(16,185,129,0.15)] border-solid'
                            : 'border-slate-800 bg-slate-950/45 text-slate-600'
                        }`}
                      >
                        <span className="text-[10px] font-bold text-slate-500 self-start">{labels[index]}</span>
                        {isNext ? (
                          <span className="text-[11px] text-[#10B981] font-extrabold uppercase animate-pulse mb-3">
                            Next
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-600 font-bold uppercase select-none mb-3">
                            —
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-transparent select-none self-start">#00</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BOTTOM HALF: THE POOL OF TEAMS */}
              <div className="flex flex-col gap-2 border-t border-slate-800 pt-4">
                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">
                  TAP TO PLACE
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {groupTeams.map((team) => {
                    const isPlaced = slots.includes(team.id);

                    return (
                      <button
                        key={team.id}
                        disabled={isPlaced}
                        onClick={() => handlePlace(team.id)}
                        className={`flex flex-col items-center justify-between p-2.5 rounded-xl border transition-all text-center min-h-[96px] ${
                          isPlaced
                            ? 'bg-slate-950/40 border-transparent text-slate-600 opacity-15 cursor-not-allowed'
                            : 'bg-slate-900/80 border-[#1F2937] text-white hover:border-[#10B981] hover:bg-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.15)] cursor-pointer transform hover:scale-[1.02]'
                        }`}
                      >
                        <span className="text-[9px] text-slate-400 font-bold self-start">
                          #{team.rank}
                        </span>
                        <img 
                          src={getFlagUrl(team.id)} 
                          alt={`${team.name} Flag`} 
                          className="w-10 h-6.5 object-cover rounded-sm shadow-sm border border-black/20 select-none my-1"
                        />
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-black text-white leading-tight">{team.id}</span>
                          <span className="text-[9px] text-slate-400 font-semibold truncate max-w-full leading-none">
                            {team.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Navigation & Status Footer */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
            <div className="text-xs font-extrabold select-none flex items-center gap-1.5">
              {isAllGroupsCompleted ? (
                <span className="text-amber-500 flex items-center gap-1.5 animate-fade-in">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  All predictions complete! Click "Seed Knockout Bracket" to advance to the knockout stage.
                </span>
              ) : isActiveGroupCompleted ? (
                <span className="text-[#10B981] flex items-center gap-1.5 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4" />
                  Group {activeGroup} predictions complete!
                </span>
              ) : predictionMode === 'rank' ? (
                <span className="text-amber-500 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Fill all 4 target slots to calculate group standings.
                </span>
              ) : (
                <span className="text-amber-500 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Complete all matches in this group to calculate standings.
                </span>
              )}
            </div>

            {isAllGroupsCompleted ? (
              <button
                onClick={advanceToKnockouts}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer uppercase tracking-wider"
              >
                <Play className="h-3 w-3 fill-slate-950 stroke-none" />
                Proceed to Qualifiers
              </button>
            ) : (
              isActiveGroupCompleted && activeGroup !== 'L' && (
                <button
                  onClick={handleNextGroup}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-bold bg-slate-850 text-white border border-slate-700 hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
                >
                  Next Group
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )
            )}
          </div>
        </div>

        {/* Live Standings Section */}
        {predictionMode === 'match' && (
          <div className="lg:col-span-2">
            <StandingsTable
              groupId={activeGroup}
              standings={standings[activeGroup] || []}
            />
          </div>
        )}
      </div>

      {/* All Groups Overview Grid */}
      <div className="flex flex-col gap-4 animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-xs font-extrabold tracking-wider uppercase text-slate-400">All Groups</h3>
          <span className="text-xs text-slate-500 font-bold">
            {GROUPS.filter(g => {
              const { completed, total } = getGroupProgress(g);
              return completed === total;
            }).length} of 12 complete
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {GROUPS.map((group) => {
            const displayTeams = getGroupDisplayTeams(group);
            const { completed, total } = getGroupProgress(group);
            const isCompleted = completed === total;
            const isActive = activeGroup === group;

            return (
              <button
                key={`overview-${group}`}
                onClick={() => setActiveGroup(group)}
                className={`flex flex-col p-3 rounded-xl border transition-all text-left duration-200 transform hover:scale-[1.02] cursor-pointer ${
                  isActive
                    ? 'bg-[#111827] border-[#10B981] border-2 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                    : 'bg-[#111827] border-[#1F2937] text-white hover:bg-[#161f30] hover:border-[#2b3a4e]'
                }`}
              >
                {/* Header row: Letter and Status */}
                <div className="flex items-center justify-between w-full mb-3 select-none">
                  <span className="text-xl font-black text-[#F3F4F6]">{group}</span>
                  {isCompleted ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 bg-slate-900 rounded-full flex-shrink-0" />
                  ) : isActive ? (
                    <div className="h-4.5 w-4.5 rounded-full border-2 border-dashed border-[#10B981] animate-spin-slow flex-shrink-0" />
                  ) : (
                    <div className="h-4.5 w-4.5 rounded-full border border-slate-700 bg-slate-800/40 flex-shrink-0" />
                  )}
                </div>

                {/* 4 Teams Horizontal Grid */}
                <div className="grid grid-cols-4 gap-1.5 w-full select-none">
                  {displayTeams.map((team) => (
                    <div key={team.id} className="flex flex-col items-center gap-1">
                      <img
                        src={getFlagUrl(team.id)}
                        alt={`${team.name} Flag`}
                        className="w-6 h-4 object-cover rounded shadow-sm border border-black/20 flex-shrink-0"
                      />
                      <span className="text-[9px] font-bold text-center tracking-tight text-[#9CA3AF]">
                        {team.id}
                      </span>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
