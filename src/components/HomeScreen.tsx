'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { Trophy, HelpCircle, Users, MapPin, Search, Sparkles, X, ChevronDown, Info, AlertCircle } from 'lucide-react';
import { GROUPS, TEAMS, getFlagUrl, KNOCKOUT_METADATA } from '../data/initialData';
import { fuzzySearchTeams } from '../utils/fuzzySearch';
import { parseScenarioText } from '../utils/textFormatter';
import PathToFinal from './PathToFinal';

export default function HomeScreen() {
  const {
    setStep,
    standings,
    apiStandings,
    isFetchingApiStandings,
    fetchApiStandings
  } = useTournamentStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // State variables for matchup scenarios selector
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [scenario, setScenario] = useState<'1st' | '2nd' | '3rd'>('1st');
  const [searchText, setSearchText] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [scenariosText, setScenariosText] = useState<{ english: string; bengali: string; isError?: boolean } | null>(null);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState<boolean>(false);
  const [groupRankingMode, setGroupRankingMode] = useState<'expert' | 'fifa'>('fifa');

  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Selected Team Object
  const selectedTeam = TEAMS.find((t) => t.id === selectedTeamId);

  // Helper: Starting R32 match for a team based on group and scenario
  const getStartingMatch = (group: string, scen: '1st' | '2nd' | '3rd'): { matchId: string; isHome: boolean } => {
    if (scen === '1st') {
      const placeholder = `1${group}`;
      const match = KNOCKOUT_METADATA.find(
        (m) => m.stage === 'R32' && (m.placeholderHome === placeholder || m.placeholderAway === placeholder)
      );
      if (match) {
        return { matchId: match.id, isHome: match.placeholderHome === placeholder };
      }
    } else if (scen === '2nd') {
      const placeholder = `2${group}`;
      const match = KNOCKOUT_METADATA.find(
        (m) => m.stage === 'R32' && (m.placeholderHome === placeholder || m.placeholderAway === placeholder)
      );
      if (match) {
        return { matchId: match.id, isHome: match.placeholderHome === placeholder };
      }
    } else if (scen === '3rd') {
      let matchId = '';
      if (['A', 'D'].includes(group)) matchId = 'R32_1';
      else if (group === 'B') matchId = 'R32_7';
      else if (['C', 'G'].includes(group)) matchId = 'R32_2';
      else if (group === 'E') matchId = 'R32_11';
      else if (group === 'F') matchId = 'R32_15';
      else if (group === 'H') matchId = 'R32_8';
      else if (['I', 'K'].includes(group)) matchId = 'R32_12';
      else if (['J', 'L'].includes(group)) matchId = 'R32_16';

      return { matchId, isHome: false };
    }
    return { matchId: 'R32_1', isHome: true };
  };

  const getOpponentGroupsAndPlaceholder = (teamObj: typeof selectedTeam, scen: '1st' | '2nd' | '3rd'): { opponentGroup: string; placeholder: string } => {
    if (!teamObj) return { opponentGroup: '', placeholder: '' };
    const startingMatch = getStartingMatch(teamObj.group, scen);
    const matchMetadata = KNOCKOUT_METADATA.find((m) => m.id === startingMatch.matchId);
    if (!matchMetadata) return { opponentGroup: '', placeholder: '' };
    const placeholder = startingMatch.isHome ? matchMetadata.placeholderAway : matchMetadata.placeholderHome;
    if (!placeholder) return { opponentGroup: '', placeholder: '' };

    // Example placeholders: "2F", "3rd A/B/C/D/F", etc.
    let opponentGroup = '';
    if (placeholder.startsWith('3rd ')) {
      opponentGroup = placeholder.replace('3rd ', ''); // Keep "A/B/C/D/F"
    } else {
      const match = placeholder.match(/^([12])([A-L])$/);
      if (match) {
        opponentGroup = match[2];
      }
    }
    return { opponentGroup, placeholder };
  };

  // Sync Search text with selected team on mount/change
  useEffect(() => {
    if (selectedTeam) {
      setSearchText(selectedTeam.name);
    } else {
      setSearchText('');
    }
  }, [selectedTeamId, selectedTeam]);

  // Handle clicking outside of the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-fetch API standings if they are the default and haven't been loaded yet
  useEffect(() => {
    if (groupRankingMode === 'fifa' && !apiStandings && !isFetchingApiStandings) {
      fetchApiStandings().catch((err) => console.error('Failed auto-fetching standings:', err));
    }
  }, [groupRankingMode, apiStandings, isFetchingApiStandings, fetchApiStandings]);

  // Automatically determine the finishing scenario when team or ranking mode changes
  useEffect(() => {
    if (!selectedTeamId || !selectedTeam) return;

    if (groupRankingMode === 'fifa') {
      if (apiStandings && apiStandings[selectedTeam.group]) {
        const idx = apiStandings[selectedTeam.group].findIndex((s) => s.teamId === selectedTeamId);
        if (idx === 0) setScenario('1st');
        else if (idx === 1) setScenario('2nd');
        else if (idx >= 2) setScenario('3rd');
      }
    } else if (groupRankingMode === 'expert') {
      const groupTeams = TEAMS.filter((t) => t.group === selectedTeam.group);
      const sorted = [...groupTeams].sort((a, b) => a.rank - b.rank);
      const idx = sorted.findIndex((t) => t.id === selectedTeamId);
      if (idx === 0) setScenario('1st');
      else if (idx === 1) setScenario('2nd');
      else if (idx >= 2) setScenario('3rd');
    }
  }, [selectedTeamId, selectedTeam, groupRankingMode, apiStandings]);

  // Fetch scenarios from Gemini
  useEffect(() => {
    if (!selectedTeamId || !selectedTeam) {
      setScenariosText(null);
      return;
    }

    const { opponentGroup, placeholder } = getOpponentGroupsAndPlaceholder(selectedTeam, scenario);
    if (!opponentGroup || !placeholder) {
      setScenariosText(null);
      return;
    }

    const controller = new AbortController();
    const fetchScenarios = async () => {
      setIsLoadingScenarios(true);
      setScenariosText(null);

      const currentStandings = groupRankingMode === 'fifa' && apiStandings ? apiStandings : standings;
      const opponentGroupsList = opponentGroup.split('/');
      const groupStandings = opponentGroupsList.reduce((acc, g) => {
        if (currentStandings[g]) {
          acc[g] = currentStandings[g].map(s => {
            const team = TEAMS.find(t => t.id === s.teamId);
            return {
              teamName: team?.name || s.teamId,
              played: s.played,
              won: s.won,
              lost: s.lost,
              points: s.points
            };
          });
        }
        return acc;
      }, {} as Record<string, any>);

      // Determine remaining matches based on apiStandings played count if using fifa mode
      let remainingMatches: Array<{ group: string; homeTeam: string; awayTeam: string }> = [];
      if (groupRankingMode === 'fifa' && apiStandings) {
        const opponentGroupsList = opponentGroup.split('/');
        opponentGroupsList.forEach((g) => {
          const groupStandings = apiStandings[g] || [];
          const playedCount = groupStandings[0]?.played ?? 0;
          const groupTeams = TEAMS.filter((t) => t.group === g);
          if (groupTeams.length === 4) {
            const t1 = groupTeams[0];
            const t2 = groupTeams[1];
            const t3 = groupTeams[2];
            const t4 = groupTeams[3];

            if (playedCount === 0) {
              remainingMatches.push(
                { group: g, homeTeam: t1.name, awayTeam: t2.name },
                { group: g, homeTeam: t3.name, awayTeam: t4.name },
                { group: g, homeTeam: t1.name, awayTeam: t3.name },
                { group: g, homeTeam: t2.name, awayTeam: t4.name },
                { group: g, homeTeam: t1.name, awayTeam: t4.name },
                { group: g, homeTeam: t2.name, awayTeam: t3.name }
              );
            } else if (playedCount === 1) {
              remainingMatches.push(
                { group: g, homeTeam: t1.name, awayTeam: t3.name },
                { group: g, homeTeam: t2.name, awayTeam: t4.name },
                { group: g, homeTeam: t1.name, awayTeam: t4.name },
                { group: g, homeTeam: t2.name, awayTeam: t3.name }
              );
            } else if (playedCount === 2) {
              remainingMatches.push(
                { group: g, homeTeam: t1.name, awayTeam: t4.name },
                { group: g, homeTeam: t2.name, awayTeam: t3.name }
              );
            }
          }
        });
      } else {
        const opponentGroupsList = opponentGroup.split('/');
        const groupMatches = useTournamentStore.getState().matches.filter(m => m.type === 'group');
        const unplayed = groupMatches.filter(m => !m.winnerId);
        const getTeamName = (id: string) => TEAMS.find(t => t.id === id)?.name || id;
        remainingMatches = unplayed
          .filter(m => opponentGroupsList.includes(m.groupId!))
          .map(m => ({
            group: m.groupId!,
            homeTeam: getTeamName(m.homeTeamId!),
            awayTeam: getTeamName(m.awayTeamId!)
          }));
      }

      try {
        const response = await fetch('/api/scenarios', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            selectedTeamName: selectedTeam.name,
            group: selectedTeam.group,
            scenario,
            opponentGroup,
            opponentGroupPlaceholder: placeholder,
            groupStandings,
            remainingMatches,
            mode: groupRankingMode,
          }),
          signal: controller.signal,
        });

        if (response.ok) {
          const data = await response.json();
          setScenariosText(data);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Error fetching scenarios:", err);
        }
      } finally {
        setIsLoadingScenarios(false);
      }
    };

    fetchScenarios();

    return () => {
      controller.abort();
    };
  }, [selectedTeamId, scenario, groupRankingMode, standings, apiStandings]);

  // Click handler to select and scroll to the scenarios search widget
  const handleGroupTeamClick = (teamId: string) => {
    setSelectedTeamId(teamId);
    const team = TEAMS.find(t => t.id === teamId);
    if (team) {
      setSearchText(team.name);
    }
    setIsDropdownOpen(false);

    // Smooth scroll to the widget
    if (widgetRef.current) {
      widgetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

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
            {/* Title with inline World Cup trophy after 'CUP' */}
            <div className="flex items-center justify-center">
              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-none font-sports-title uppercase flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                <span>FIFA WORLD CUP</span>
                <img
                  src="/world_cup_trophy.png"
                  alt="FIFA World Cup Trophy"
                  className="h-8 sm:h-12 md:h-14 lg:h-16 object-contain drop-shadow-[0_4px_8px_rgba(255,215,0,0.2)] animate-pulse"
                />
                <span className="text-[#FFD700] font-sports-title drop-shadow-[0_0_16px_rgba(255,215,0,0.35)]">2026</span>
              </h1>
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


      {/* MATCHUP SCENARIOS & EQUATIONS SEARCH WIDGET */}
      <div 
        ref={widgetRef} 
        className="w-full max-w-5xl mx-auto glass-panel rounded-3xl p-6 sm:p-8 border-[#FFD700]/15 bg-slate-950/40 shadow-xl flex flex-col gap-6 select-none relative overflow-hidden"
      >
        {/* Background radial gold glow */}
        <div className="absolute -right-40 -top-40 w-96 h-96 bg-gradient-to-br from-[#FFD700]/5 to-transparent blur-[100px] rounded-full pointer-events-none -z-10" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-start gap-3">
            <div className="bg-[#FFD700]/10 p-2.5 rounded-xl border border-[#FFD700]/20 flex-shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5 text-[#FFD700] animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider font-sports-header flex items-center gap-2">
                Matchup Scenarios & Equations
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-black uppercase font-sports-header">
                  Gemini AI
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Select your country to analyze their potential Round of 32 equations based on live standings and unplayed matches.
              </p>
            </div>
          </div>
          
          {/* Standing Source / Mode Switcher */}
          {selectedTeam && (
            <div className="flex items-center gap-1.5 self-start md:self-center">
              <span className="text-[10px] uppercase font-bold text-slate-500">Source:</span>
              <div className="inline-flex rounded-lg p-0.5 bg-slate-950/80 border border-slate-800">
                <button
                  onClick={() => setGroupRankingMode('fifa')}
                  className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-md transition-all cursor-pointer ${groupRankingMode === 'fifa' ? 'bg-[#FFD700] text-slate-950' : 'text-slate-450 hover:text-white'}`}
                >
                  FIFA Projected
                </button>
                <button
                  onClick={() => setGroupRankingMode('expert')}
                  className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-md transition-all cursor-pointer ${groupRankingMode === 'expert' ? 'bg-[#FFD700] text-slate-950' : 'text-slate-450 hover:text-white'}`}
                >
                  Expert Rank
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input & Scenario Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Autocomplete Input */}
          <div className="lg:col-span-5 flex flex-col gap-2 relative" ref={dropdownRef}>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Search or Choose Team
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-455">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Type team name (e.g., Brazil, Germany, Japan...)"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-800 bg-slate-950/60 text-sm font-semibold text-white focus:outline-none focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.08)] transition-all"
              />
              {selectedTeam && (
                <button
                  onClick={() => {
                    setSelectedTeamId('');
                    setSearchText('');
                    setScenariosText(null);
                  }}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Dropdown list */}
            {isDropdownOpen && (
              <div className="absolute top-[76px] left-0 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 shadow-2xl z-50 py-1">
                {fuzzySearchTeams(TEAMS, searchText).length > 0 ? (
                  fuzzySearchTeams(TEAMS, searchText).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTeamId(t.id);
                        setSearchText(t.name);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-slate-900 transition-colors text-xs font-semibold ${t.id === selectedTeamId ? 'bg-slate-900/60 text-[#FFD700]' : 'text-slate-350'}`}
                    >
                      <div className="flex items-center gap-2">
                        <img src={getFlagUrl(t.id)} alt={t.name} className="w-5.5 h-3.5 object-cover rounded border border-slate-950/30" />
                        <span>{t.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase font-sports-header">Group {t.group}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-slate-500 font-bold text-center">No nations found</div>
                )}
              </div>
            )}
          </div>

          {/* Scenario Tab Selectors */}
          {selectedTeam && (
            <div className="lg:col-span-7 flex flex-col gap-2 animate-fade-in">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Finishing Scenario
              </label>
              <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-850">
                {(['1st', '2nd', '3rd'] as const).map((scen) => (
                  <button
                    key={scen}
                    onClick={() => setScenario(scen)}
                    className={`py-2 rounded-lg text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                      scenario === scen
                        ? 'bg-gradient-to-r from-[#FFD700] to-[#b45309] text-white border-[#FFD700]/30 shadow-md shadow-amber-950/30'
                        : 'bg-transparent text-slate-400 hover:text-slate-300 border-transparent'
                    }`}
                  >
                    {scen === '1st' ? '1st in Group' : scen === '2nd' ? '2nd in Group' : '3rd in Group'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Card */}
        {selectedTeam ? (
          <div className="w-full min-h-[140px] flex flex-col justify-center">
            {isLoadingScenarios ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-slate-450">
                <div className="h-8 w-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] uppercase font-black tracking-widest text-[#FFD700]/80 animate-pulse font-sports-header">
                  Analyzing qualification matches & opponent paths...
                </span>
              </div>
            ) : scenariosText ? (
              scenariosText.isError ? (
                <div className="w-full glass-panel rounded-2xl border border-rose-500/25 bg-rose-950/20 p-5 md:p-6 shadow-xl relative overflow-hidden flex flex-col gap-4 animate-fade-in">
                  <div className="flex items-center gap-2 border-b border-rose-900/30 pb-3">
                    <AlertCircle className="h-5 w-5 text-rose-400" />
                    <span className="text-sm font-black text-rose-350 uppercase tracking-wider font-sports-header flex items-center gap-2">
                      API Scenarios Error
                      <span className="text-[9px] bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-full font-bold uppercase select-none">
                        Error Details
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-rose-250 leading-relaxed font-semibold">
                    <div className="flex flex-col gap-1 border-b md:border-b-0 md:border-r border-rose-900/20 pb-4 md:pb-0 md:pr-6 last:border-0 last:pr-0">
                      <span className="text-[10px] text-rose-400 font-black uppercase tracking-widest mb-1.5 font-sports-header">English Error</span>
                      <p className="whitespace-pre-line leading-relaxed">{scenariosText.english}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-rose-400 font-black uppercase tracking-widest mb-1.5 font-sports-header">বাংলা ত্রুটি</span>
                      <p className="whitespace-pre-line leading-relaxed">{scenariosText.bengali}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full glass-panel rounded-2xl border border-[#FFD700]/25 bg-slate-950/60 p-5 md:p-6 shadow-xl relative overflow-hidden flex flex-col gap-5 animate-fade-in">
                  {/* Glow accent */}
                  <div className="absolute -left-10 -top-10 w-32 h-32 bg-[#FFD700]/5 blur-[40px] rounded-full pointer-events-none animate-pulse" />
                  
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <img src={getFlagUrl(selectedTeam.id)} alt={selectedTeam.name} className="w-6 h-4 object-cover rounded shadow border border-slate-950/40" />
                      <span className="text-sm font-black text-white uppercase tracking-wider font-sports-header">
                        {selectedTeam.name} Matchup Analysis
                      </span>
                    </div>
                    <span className="text-[9px] bg-slate-800 text-slate-450 border border-slate-750 px-2.5 py-0.5 rounded-full font-bold uppercase select-none">
                      Group {selectedTeam.group} • Finishing {scenario}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                    {/* English Column */}
                    <div className="flex flex-col gap-1 border-b md:border-b-0 md:border-r border-slate-800/80 pb-4 md:pb-0 md:pr-6 last:border-0 last:pr-0">
                      <span className="text-[10px] text-[#FFD700] font-black uppercase tracking-widest mb-1.5 font-sports-header">English Analysis</span>
                      <p className="whitespace-pre-line leading-relaxed">{parseScenarioText(scenariosText.english)}</p>
                    </div>
                    {/* Bengali Column */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[#FFD700] font-black uppercase tracking-widest mb-1.5 font-sports-header">বাংলা সমীকরণ</span>
                      <p className="whitespace-pre-line leading-relaxed">{parseScenarioText(scenariosText.bengali)}</p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-rose-950/30 bg-rose-950/10 text-rose-350 text-xs">
                <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
                <span>Could not retrieve scenario analysis. Please verify your internet connection and GEMINI_API_KEY.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-slate-800 rounded-2xl text-center gap-2">
            <Search className="h-8 w-8 text-slate-650" />
            <h4 className="font-bold text-slate-450 text-xs sm:text-sm uppercase tracking-wide font-sports-header">No Team Selected</h4>
            <p className="text-slate-500 text-xs max-w-sm">
              Use the search box above or click on any nation below to view their dynamic matchup scenarios & equations.
            </p>
          </div>
        )}
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
                        onClick={() => handleGroupTeamClick(team.id)}
                        className="flex items-center gap-1.5 sm:gap-2 text-[13px] sm:text-[15px] font-semibold text-[#f2f7f5] hover:text-[#FFD700] hover:scale-[1.02] cursor-pointer transition-all w-full"
                        title={`Click to check Matchup Scenarios for ${team.name} (FIFA Rank #${team.rank})`}
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
                        onClick={() => handleGroupTeamClick(team.id)}
                        className="flex items-center gap-1.5 sm:gap-2 text-[13px] sm:text-[15px] font-semibold text-[#f2f7f5] hover:text-[#FFD700] hover:scale-[1.02] cursor-pointer transition-all w-full"
                        title={`Click to check Matchup Scenarios for ${team.name} (FIFA Rank #${team.rank})`}
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
