'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, X, RefreshCw, CloudOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GROUPS, TEAMS } from '../data/initialData';
import { TeamStanding } from '../types/tournament';
import StandingsTable from './StandingsTable';

interface StandingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Local helper to generate initial empty standings
const getInitialEmptyStandings = (): Record<string, TeamStanding[]> => {
  const standingsRecord: Record<string, TeamStanding[]> = {};
  GROUPS.forEach((group) => {
    const groupTeams = TEAMS.filter((t) => t.group === group);
    standingsRecord[group] = groupTeams.map((team) => ({
      teamId: team.id,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
    }));
  });
  return standingsRecord;
};

// Helper to format ISO timestamp nicely
const formatTimestamp = (isoString: string | undefined): string => {
  if (!isoString) return 'Never';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
           ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch (e) {
    return 'Unknown';
  }
};

export default function StandingsModal({ isOpen, onClose }: StandingsModalProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [cachedData, setCachedData] = useState<{ standings: Record<string, TeamStanding[]>; timestamp: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Load cached data from LocalStorage
  const loadFromCache = (): boolean => {
    try {
      const stored = localStorage.getItem('fifa-predictor-cached-standings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.standings) {
          setCachedData(parsed);
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to parse cached standings:', e);
    }
    return false;
  };

  // 2. Fetch and sync standings from Live API
  const syncStandings = async () => {
    setIsLoading(true);
    setSyncError(null);
    setIsOfflineMode(false);

    try {
      // Fetch teams and groups in parallel
      const [teamsRes, groupsRes] = await Promise.all([
        fetch('https://worldcup26.ir/get/teams'),
        fetch('https://worldcup26.ir/get/groups')
      ]);

      if (!teamsRes.ok || !groupsRes.ok) {
        throw new Error('API server returned error status');
      }

      const teamsData = await teamsRes.json();
      const groupsData = await groupsRes.json();

      const apiTeams: any[] = teamsData.teams || [];
      const apiGroups: any[] = groupsData.groups || [];

      // Build mapping
      const apiIdToFifaCode: Record<string, string> = {};
      apiTeams.forEach((team) => {
        if (team.id && team.fifa_code) {
          apiIdToFifaCode[team.id] = team.fifa_code;
        }
      });

      // Map group standings
      const apiStandingsRecord: Record<string, TeamStanding[]> = {};
      apiGroups.forEach((group) => {
        const groupLetter = group.name; // e.g. "A"
        if (!groupLetter) return;

        const standingsList: TeamStanding[] = (group.teams || []).map((team: any) => {
          const fifaCode = apiIdToFifaCode[team.team_id] || team.team_id;
          return {
            teamId: fifaCode,
            played: parseInt(team.mp, 10) || 0,
            won: parseInt(team.w, 10) || 0,
            lost: parseInt(team.l, 10) || 0,
            points: parseInt(team.pts, 10) || 0,
          };
        });

        apiStandingsRecord[groupLetter] = standingsList;
      });

      // Construct cache package
      const cachePackage = {
        standings: apiStandingsRecord,
        timestamp: new Date().toISOString(),
      };

      setCachedData(cachePackage);
      localStorage.setItem('fifa-predictor-cached-standings', JSON.stringify(cachePackage));
    } catch (error: any) {
      console.error('Error syncing standings from API:', error);
      setIsOfflineMode(true);
      setSyncError('Could not sync live standings. Showing cached points table.');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger sync on modal open
  useEffect(() => {
    if (isOpen) {
      loadFromCache();
      syncStandings();
    }
  }, [isOpen]);

  // Escape key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  // Retrieve active standings dataset (uses cache, falls back to empty standings)
  const activeStandings = cachedData?.standings || getInitialEmptyStandings();

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Modal backdrop click closer */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Modal Content Panel */}
      <div className="relative bg-[#060a08] border border-[#22c55e]/15 rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden select-none animate-scale-in">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-900 bg-slate-950/40 p-5 sm:px-6.5 select-none">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD700]/10 p-2 rounded-xl border border-[#FFD700]/25 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-[#FFD700]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-sports-header">
                World Cup 2026 Point Table
              </h2>
              {/* Sync Status Label */}
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold">
                {isLoading ? (
                  <span className="flex items-center gap-1 text-[#FFD700]">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Syncing live standings...
                  </span>
                ) : isOfflineMode ? (
                  <span className="flex items-center gap-1 text-orange-400">
                    <CloudOff className="h-3 w-3" /> Offline (Using Cache)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Live Synced
                  </span>
                )}
                {cachedData && (
                  <span className="text-slate-500 font-medium ml-1">
                    Last updated: {formatTimestamp(cachedData.timestamp)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sync Refresh Button */}
            {!isLoading && (
              <button
                onClick={syncStandings}
                title="Refresh Standings Table"
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer hover:bg-slate-850"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-rose-950/20 hover:border-rose-900/30 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Offline Banner */}
        {isOfflineMode && (
          <div className="bg-orange-500/10 border-b border-orange-500/20 px-5 py-2.5 flex items-center gap-2 text-xs text-orange-400 font-semibold select-none">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              {cachedData 
                ? `Live sync failed due to connection error. Displaying stored standings from ${formatTimestamp(cachedData.timestamp)}.`
                : 'Live sync failed due to connection error. Displaying default initial standings.'}
            </span>
          </div>
        )}

        {/* Modal Scrollable Body (standings grid) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6.5 no-scrollbar bg-slate-950/20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {GROUPS.map((groupId) => (
              <StandingsTable
                key={groupId}
                groupId={groupId}
                standings={activeStandings[groupId] || []}
              />
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
