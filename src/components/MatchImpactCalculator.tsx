'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { Trophy, Sparkles, AlertCircle, ChevronDown, Calendar, ArrowRight, RefreshCw, Eye } from 'lucide-react';
import { GROUPS, TEAMS, KNOCKOUT_METADATA, getFlagUrl, getOfficialMatchNumber } from '../data/initialData';
import { parseScenarioText } from '../utils/textFormatter';
import { TeamStanding, Match } from '../types/tournament';

// Helper to sort standings with head-to-head tiebreaker
const sortGroupStandings = (standings: TeamStanding[], groupMatches: Match[]): TeamStanding[] => {
  return [...standings].sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points; // Primary: Points
    }

    // Secondary: Head-to-Head
    const h2hMatch = groupMatches.find(
      (m) =>
        m.winnerId &&
        ((m.homeTeamId === a.teamId && m.awayTeamId === b.teamId) ||
          (m.homeTeamId === b.teamId && m.awayTeamId === a.teamId))
    );

    if (h2hMatch && h2hMatch.winnerId) {
      if (h2hMatch.winnerId === a.teamId) return -1;
      if (h2hMatch.winnerId === b.teamId) return 1;
    }

    // Fallback: Alphabetical sorting by team ID
    return a.teamId.localeCompare(b.teamId);
  });
};

// Recalculates standings for a single group supporting draws
const calculateGroupStandingsWithDraw = (groupId: string, matches: Match[]): TeamStanding[] => {
  const groupTeams = TEAMS.filter((t) => t.group === groupId);
  const groupMatches = matches.filter((m) => m.groupId === groupId);

  const standings: TeamStanding[] = groupTeams.map((team) => {
    let played = 0;
    let won = 0;
    let lost = 0;
    let points = 0;

    groupMatches.forEach((match) => {
      if (match.winnerId && (match.homeTeamId === team.id || match.awayTeamId === team.id)) {
        played += 1;
        if (match.winnerId === team.id) {
          won += 1;
          points += 3;
        } else if (match.winnerId === 'draw') {
          points += 1;
        } else {
          lost += 1;
        }
      }
    });

    return { teamId: team.id, played, won, lost, points };
  });

  return sortGroupStandings(standings, groupMatches);
};

// Helper to dynamically assign the 8 qualified 3rd-placed teams to R32 slots
const assignThirdPlaces = (thirdPlaceIds: string[]): Record<string, string> => {
  const slots = [
    { id: 'R32_1', groups: ['A', 'B', 'C', 'D', 'F'] },
    { id: 'R32_2', groups: ['C', 'D', 'F', 'G', 'H'] },
    { id: 'R32_11', groups: ['C', 'E', 'F', 'H', 'I'] },
    { id: 'R32_12', groups: ['E', 'H', 'I', 'J', 'K'] },
    { id: 'R32_8', groups: ['A', 'E', 'H', 'I', 'J'] },
    { id: 'R32_7', groups: ['B', 'E', 'F', 'I', 'J'] },
    { id: 'R32_15', groups: ['E', 'F', 'G', 'I', 'J'] },
    { id: 'R32_16', groups: ['D', 'E', 'I', 'J', 'L'] },
  ];

  const teamsWithGroups = thirdPlaceIds.map(id => {
    const team = TEAMS.find(t => t.id === id);
    return { id, group: team ? team.group : '' };
  });

  const assignment: Record<string, string> = {};
  const usedTeams = new Set<string>();

  const backtrack = (slotIdx: number): boolean => {
    if (slotIdx === slots.length) {
      return true;
    }

    const slot = slots[slotIdx];
    for (let i = 0; i < teamsWithGroups.length; i++) {
      const team = teamsWithGroups[i];
      if (!usedTeams.has(team.id) && slot.groups.includes(team.group)) {
        assignment[slot.id] = team.id;
        usedTeams.add(team.id);
        
        if (backtrack(slotIdx + 1)) {
          return true;
        }
        
        usedTeams.delete(team.id);
        delete assignment[slot.id];
      }
    }
    return false;
  };

  backtrack(0);
  return assignment;
};

const getStageLabel = (matchId: string | null): string => {
  if (!matchId) return '';
  if (matchId.startsWith('R32')) return 'Round of 32';
  if (matchId.startsWith('R16')) return 'Round of 16';
  if (matchId.startsWith('QF')) return 'Quarter-finals';
  if (matchId.startsWith('SF')) return 'Semi-finals';
  if (matchId === 'F') return 'Final';
  return matchId;
};

interface LocalMatchInfo {
  localTime12h: string;
  localDateStr: string;
  isToday: boolean;
  isTomorrow: boolean;
  displayLabel: string;
}

const STADIUM_OFFSETS: Record<string, number> = {
  '1': -6, // Mexico City
  '2': -6, // Guadalajara
  '3': -6, // Monterrey
  '4': -5, // Dallas
  '5': -5, // Houston
  '6': -5, // Kansas City
  '7': -4, // Atlanta
  '8': -4, // Miami
  '9': -4, // Boston
  '10': -4, // Philadelphia
  '11': -4, // New York/New Jersey
  '12': -4, // Toronto
  '13': -7, // Vancouver
  '14': -7, // Seattle
  '15': -7, // San Francisco
  '16': -7, // Los Angeles
};

const getLocalMatchInfo = (utcDateStr?: string, stadiumId?: string): LocalMatchInfo | null => {
  if (!utcDateStr) return null;
  const match = utcDateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, month, day, year, hour, minute] = match;
  const stadiumOffset = STADIUM_OFFSETS[stadiumId || ''] ?? -5;
  const utcDate = new Date(Date.UTC(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10) - stadiumOffset,
    parseInt(minute, 10)
  ));
  const localYear = utcDate.getFullYear();
  const localMonth = utcDate.getMonth() + 1;
  const localDay = utcDate.getDate();
  const localHour = utcDate.getHours();
  const localMinute = utcDate.getMinutes();
  const ampm = localHour >= 12 ? 'PM' : 'AM';
  const displayHour = localHour % 12 || 12;
  const displayMinute = String(localMinute).padStart(2, '0');
  const localTime12h = `${displayHour}:${displayMinute} ${ampm}`;
  const pad = (n: number) => String(n).padStart(2, '0');
  const localDateStr = `${pad(localMonth)}/${pad(localDay)}/${localYear}`;
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const isToday = localYear === today.getFullYear() && 
                  localMonth === (today.getMonth() + 1) && 
                  localDay === today.getDate();
  const isTomorrow = localYear === tomorrow.getFullYear() && 
                     localMonth === (tomorrow.getMonth() + 1) && 
                     localDay === tomorrow.getDate();
  const displayLabel = `${pad(localMonth)}/${pad(localDay)} ${localTime12h}`;
  return { localTime12h, localDateStr, isToday, isTomorrow, displayLabel };
};

// Interface for normalized matches in dropdown
interface CalcMatch {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  groupId: string;
  localDate?: string;
  stadiumId?: string;
  finished?: boolean;
  live?: boolean;
  apiWinnerId?: string | 'draw';
}

export default function MatchImpactCalculator() {
  const { matches: storeMatches } = useTournamentStore();

  const [games, setGames] = useState<CalcMatch[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [selectedMyTeamId, setSelectedMyTeamId] = useState<string>('');
  const [simOutcome, setSimOutcome] = useState<'home_win' | 'draw' | 'away_win'>('home_win');
  
  const [isFetchingGames, setIsFetchingGames] = useState<boolean>(false);
  const [gamesFetchError, setGamesFetchError] = useState<string | null>(null);
  const [showAllMatches, setShowAllMatches] = useState<boolean>(false);

  // AI commentary state
  const [aiCommentary, setAiCommentary] = useState<{ english: string; bengali: string; isError?: boolean } | null>(null);
  const [isLoadingCommentary, setIsLoadingCommentary] = useState<boolean>(false);

    // Dropdowns UI states
    const [isMatchDropdownOpen, setIsMatchDropdownOpen] = useState(false);
    const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
    const [matchSearchQuery, setMatchSearchQuery] = useState('');
    const [teamSearchQuery, setTeamSearchQuery] = useState('');

  const matchDropdownRef = useRef<HTMLDivElement>(null);
  const teamDropdownRef = useRef<HTMLDivElement>(null);

  // Slideshow state
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  // Filter games scheduled for today or tomorrow in user's local timezone
  const upcomingMatches = useMemo(() => {
    if (games.length === 0) return [];

    // Filter unplayed matches scheduled for today or tomorrow in local time
    let filtered = games.filter((g) => {
      if (g.finished) return false;
      const info = getLocalMatchInfo(g.localDate, g.stadiumId);
      if (!info) return false;
      return info.isToday || info.isTomorrow;
    });

    // Fallback to next 5 unplayed matches if none today/tomorrow
    if (filtered.length === 0) {
      filtered = games.filter((g) => !g.finished).slice(0, 5);
    }

    return filtered;
  }, [games]);

  // Slideshow timer
  useEffect(() => {
    if (upcomingMatches.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % upcomingMatches.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [upcomingMatches]);

  // Reset slide index when array changes
  useEffect(() => {
    setCurrentSlideIndex(0);
  }, [upcomingMatches.length]);

  // Fetch games list from worldcup26.ir on mount
  useEffect(() => {
    const fetchGames = async () => {
      setIsFetchingGames(true);
      setGamesFetchError(null);
      try {
        const teamsRes = await fetch('https://worldcup26.ir/get/teams');
        const gamesRes = await fetch('https://worldcup26.ir/get/games');
        if (!teamsRes.ok || !gamesRes.ok) {
          throw new Error('API fetch failed');
        }
        
        const teamsData = await teamsRes.json();
        const gamesData = await gamesRes.json();

        const apiTeams = teamsData.teams || [];
        const apiGames = gamesData.games || [];

        // Build mapping
        const apiIdToFifaCode: Record<string, string> = {};
        apiTeams.forEach((team: any) => {
          if (team.id && team.fifa_code) {
            apiIdToFifaCode[team.id] = team.fifa_code;
          }
        });

        // Filter and map group matches
        const mapped: CalcMatch[] = apiGames
          .filter((g: any) => g.type === 'group')
          .map((g: any) => {
            const homeFifa = apiIdToFifaCode[g.home_team_id];
            const awayFifa = apiIdToFifaCode[g.away_team_id];
            const homeObj = TEAMS.find((t) => t.id === homeFifa);
            const awayObj = TEAMS.find((t) => t.id === awayFifa);
            if (!homeObj || !awayObj) return null;

            // Determine if the game has started (either finished or live)
            const isFinished = g.finished === 'TRUE' || g.finished === true;
            const isLive = g.time_elapsed === 'live' || (g.time_elapsed && g.time_elapsed !== 'notstarted' && g.time_elapsed !== 'finished');
            
            let apiWinnerId: string | 'draw' | undefined = undefined;
            if (isFinished || isLive) {
              const hScore = parseInt(g.home_score, 10) || 0;
              const aScore = parseInt(g.away_score, 10) || 0;
              if (hScore > aScore) apiWinnerId = homeFifa;
              else if (aScore > hScore) apiWinnerId = awayFifa;
              else apiWinnerId = 'draw';
            }

            return {
              id: g.id,
              homeTeamId: homeFifa,
              awayTeamId: awayFifa,
              homeTeamName: homeObj.name,
              awayTeamName: awayObj.name,
              groupId: g.group || homeObj.group,
              localDate: g.local_date,
              stadiumId: g.stadium_id,
              finished: isFinished,
              live: isLive,
              apiWinnerId,
            };
          })
          .filter((x: CalcMatch | null): x is CalcMatch => x !== null);

        // Sort matches by time (earlier matches first, accounting for timezone offsets)
        const parseMatchDate = (dateStr?: string, stadiumId?: string) => {
          if (!dateStr) return 0;
          const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
          if (!match) return 0;
          const [, month, day, year, hour, minute] = match;
          const stadiumOffset = STADIUM_OFFSETS[stadiumId || ''] ?? -5;
          return Date.UTC(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            parseInt(hour, 10) - stadiumOffset,
            parseInt(minute, 10)
          );
        };
        mapped.sort((a, b) => parseMatchDate(a.localDate, a.stadiumId) - parseMatchDate(b.localDate, b.stadiumId));

        setGames(mapped);


      } catch (err: any) {
        console.error('Error loading calculator games:', err);
        setGamesFetchError(err.message || 'Failed to load live matches from API.');
        
        // Fallback to local group stage matches
        const fallback: CalcMatch[] = storeMatches
          .filter((m) => m.type === 'group')
          .map((m) => {
            const homeObj = TEAMS.find((t) => t.id === m.homeTeamId);
            const awayObj = TEAMS.find((t) => t.id === m.awayTeamId);
            return {
              id: m.id,
              homeTeamId: m.homeTeamId!,
              awayTeamId: m.awayTeamId!,
              homeTeamName: homeObj?.name || m.homeTeamId!,
              awayTeamName: awayObj?.name || m.awayTeamId!,
              groupId: m.groupId!,
              finished: m.winnerId !== undefined,
              live: false,
              apiWinnerId: m.winnerId,
            };
          });
        setGames(fallback);
        setSelectedMatchId('');
      } finally {
        setIsFetchingGames(false);
      }
    };

    fetchGames();
  }, [storeMatches]);

  // Set default simulation outcome based on the actual/live result of the selected match
  useEffect(() => {
    if (!selectedMatchId) return;
    const match = games.find((g) => g.id === selectedMatchId);
    if (!match) return;

    if (match.apiWinnerId) {
      if (match.apiWinnerId === 'draw') {
        setSimOutcome('draw');
      } else if (match.apiWinnerId === match.homeTeamId) {
        setSimOutcome('home_win');
      } else if (match.apiWinnerId === match.awayTeamId) {
        setSimOutcome('away_win');
      }
    } else {
      // Not started/no live winner: look in store prediction if any
      const storeMatch = storeMatches.find(m => 
        (m.homeTeamId === match.homeTeamId && m.awayTeamId === match.awayTeamId) ||
        (m.homeTeamId === match.awayTeamId && m.awayTeamId === match.homeTeamId)
      );
      if (storeMatch && storeMatch.winnerId) {
        if (storeMatch.winnerId === 'draw') {
          setSimOutcome('draw');
        } else if (storeMatch.winnerId === match.homeTeamId) {
          setSimOutcome('home_win');
        } else if (storeMatch.winnerId === match.awayTeamId) {
          setSimOutcome('away_win');
        }
      } else {
        setSimOutcome('home_win');
      }
    }
  }, [selectedMatchId, games, storeMatches]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (matchDropdownRef.current && !matchDropdownRef.current.contains(event.target as Node)) {
        setIsMatchDropdownOpen(false);
      }
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(event.target as Node)) {
        setIsTeamDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Retrieve selected objects
  const activeMatch = games.find((g) => g.id === selectedMatchId);
  const myTeam = TEAMS.find((t) => t.id === selectedMyTeamId);

  // Display name helpers
  const displayMatchName = activeMatch
    ? `${activeMatch.homeTeamName} vs ${activeMatch.awayTeamName} (Group ${activeMatch.groupId})`
    : isFetchingGames
      ? 'Loading matches...'
      : 'Select a match to analyze...';

  const displayTeamName = myTeam ? myTeam.name : 'Choose Team...';

  // ------------------------------------------------------------
  // JS Simulation Logic
  // ------------------------------------------------------------
  const runSimulation = (overrideOutcome?: 'home_win' | 'draw' | 'away_win') => {
    if (!activeMatch || !myTeam) return null;

    // 1. Clone matches state
    const simMatches: Match[] = storeMatches.map((m) => {
      // Find our target match (handles both store IDs and API IDs)
      const isTarget = m.id === activeMatch.id || 
        (m.type === 'group' && 
         ((m.homeTeamId === activeMatch.homeTeamId && m.awayTeamId === activeMatch.awayTeamId) || 
          (m.homeTeamId === activeMatch.awayTeamId && m.awayTeamId === activeMatch.homeTeamId)));

      if (isTarget) {
        // Apply simulated outcome
        const outcomeToUse = overrideOutcome || simOutcome;
        let winnerId: string | undefined = undefined;
        if (outcomeToUse === 'home_win') winnerId = activeMatch.homeTeamId;
        else if (outcomeToUse === 'away_win') winnerId = activeMatch.awayTeamId;
        else if (outcomeToUse === 'draw') winnerId = 'draw';
        return { ...m, homeTeamId: activeMatch.homeTeamId, awayTeamId: activeMatch.awayTeamId, winnerId };
      }

      if (m.type === 'group') {
        // Look for the match in our API games list
        const apiMatch = games.find(g => 
          (g.homeTeamId === m.homeTeamId && g.awayTeamId === m.awayTeamId) ||
          (g.homeTeamId === m.awayTeamId && g.awayTeamId === m.homeTeamId)
        );

        if (apiMatch && apiMatch.apiWinnerId) {
          // Use the real-world/live winner from the API
          return { ...m, winnerId: apiMatch.apiWinnerId };
        }

        if (m.winnerId) return { ...m };
        // Fallback simulation for unplayed group matches (by FIFA rank)
        const homeObj = TEAMS.find((t) => t.id === m.homeTeamId);
        const awayObj = TEAMS.find((t) => t.id === m.awayTeamId);
        const fallbackWinner = (homeObj && awayObj) 
          ? (homeObj.rank < awayObj.rank ? homeObj.id : awayObj.id) 
          : m.homeTeamId;
        return { ...m, winnerId: fallbackWinner };
      }
      return { ...m };
    });

    // 2. Recalculate group standings
    const simStandings: Record<string, TeamStanding[]> = {};
    GROUPS.forEach((g) => {
      simStandings[g] = calculateGroupStandingsWithDraw(g, simMatches);
    });

    // 3. Collect winners, runners-up, thirds
    const winners: string[] = [];
    const runnersUp: string[] = [];
    const thirdPlaces: { teamId: string; group: string; points: number }[] = [];

    GROUPS.forEach((g) => {
      const s = simStandings[g];
      if (s && s.length >= 3) {
        winners.push(s[0].teamId);
        runnersUp.push(s[1].teamId);
        thirdPlaces.push({
          teamId: s[2].teamId,
          group: g,
          points: s[2].points,
        });
      }
    });

    // 4. Determine best 8 thirds
    const sortedThirds = [...thirdPlaces].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.group.localeCompare(b.group);
    });
    const bestEightThirdsIds = sortedThirds.slice(0, 8).map((t) => t.teamId);
    const thirdPlaceAssignments = assignThirdPlaces(bestEightThirdsIds);

    // 5. Populate Round of 32
    const findWinner = (group: string) => simStandings[group][0].teamId;
    const findRunnerUp = (group: string) => simStandings[group][1].teamId;

    const r32Pairings: Record<string, { home: string; away: string }> = {
      R32_1: { home: findWinner('E'), away: thirdPlaceAssignments['R32_1'] || '' },
      R32_2: { home: findWinner('I'), away: thirdPlaceAssignments['R32_2'] || '' },
      R32_3: { home: findRunnerUp('A'), away: findRunnerUp('B') },
      R32_4: { home: findWinner('F'), away: findRunnerUp('C') },
      R32_5: { home: findRunnerUp('K'), away: findRunnerUp('L') },
      R32_6: { home: findWinner('H'), away: findRunnerUp('J') },
      R32_7: { home: findWinner('D'), away: thirdPlaceAssignments['R32_7'] || '' },
      R32_8: { home: findWinner('G'), away: thirdPlaceAssignments['R32_8'] || '' },
      R32_9: { home: findWinner('C'), away: findRunnerUp('F') },
      R32_10: { home: findRunnerUp('E'), away: findRunnerUp('I') },
      R32_11: { home: findWinner('A'), away: thirdPlaceAssignments['R32_11'] || '' },
      R32_12: { home: findWinner('L'), away: thirdPlaceAssignments['R32_12'] || '' },
      R32_13: { home: findWinner('J'), away: findRunnerUp('H') },
      R32_14: { home: findRunnerUp('D'), away: findRunnerUp('G') },
      R32_15: { home: findWinner('B'), away: thirdPlaceAssignments['R32_15'] || '' },
      R32_16: { home: findWinner('K'), away: thirdPlaceAssignments['R32_16'] || '' },
    };

    // 6. Trace Knockout Path
    const getKnockoutPath = (teamId: string) => {
      const matchId = Object.keys(r32Pairings).find(
        (id) => r32Pairings[id].home === teamId || r32Pairings[id].away === teamId
      );
      if (!matchId) return [];

      const path = [matchId];
      let currentId = matchId;
      while (true) {
        const meta = KNOCKOUT_METADATA.find((m) => m.id === currentId);
        if (meta && meta.nextMatchId) {
          path.push(meta.nextMatchId);
          currentId = meta.nextMatchId;
        } else {
          break;
        }
      }
      return path;
    };

    const myPath = getKnockoutPath(myTeam.id);
    const pathA = getKnockoutPath(activeMatch.homeTeamId);
    const pathB = getKnockoutPath(activeMatch.awayTeamId);

    // 7. Find intersection points
    const findIntersection = (p1: string[], p2: string[]) => {
      for (const mId of p1) {
        if (p2.includes(mId)) return mId;
      }
      return null;
    };

    const intersectionA = findIntersection(myPath, pathA);
    const intersectionB = findIntersection(myPath, pathB);

    return {
      standings: simStandings[activeMatch.groupId] || [],
      r32Pairings,
      paths: {
        myTeam: myPath,
        teamA: pathA,
        teamB: pathB,
      },
      intersections: {
        teamA: intersectionA,
        teamB: intersectionB,
      },
    };
  };

  const simResult = runSimulation();

  const recommendation = React.useMemo(() => {
    if (!activeMatch || !myTeam) return null;

    const simHome = runSimulation('home_win');
    const simAway = runSimulation('away_win');

    if (!simHome || !simAway) return null;

    const getMeetingDetails = (simRes: any) => {
      const meetA = simRes.intersections.teamA;
      const meetB = simRes.intersections.teamB;

      const roundWeight = (matchId: string | null) => {
        if (!matchId) return 6;
        if (matchId.startsWith('R32')) return 1;
        if (matchId.startsWith('R16')) return 2;
        if (matchId.startsWith('QF')) return 3;
        if (matchId.startsWith('SF')) return 4;
        if (matchId === 'F') return 5;
        return 6;
      };

      const wA = roundWeight(meetA);
      const wB = roundWeight(meetB);

      if (wA < wB) {
        return { teamId: activeMatch.homeTeamId, round: meetA, weight: wA };
      } else if (wB < wA) {
        return { teamId: activeMatch.awayTeamId, round: meetB, weight: wB };
      } else if (meetA) {
        return { teamId: activeMatch.homeTeamId, round: meetA, weight: wA };
      }
      return null;
    };

    const meetHome = getMeetingDetails(simHome);
    const meetAway = getMeetingDetails(simAway);

    if (!meetHome && !meetAway) return null;

    const homeObj = TEAMS.find(t => t.id === activeMatch.homeTeamId);
    const awayObj = TEAMS.find(t => t.id === activeMatch.awayTeamId);

    const weightHome = meetHome ? meetHome.weight : 6;
    const weightAway = meetAway ? meetAway.weight : 6;

    if (weightHome !== weightAway) {
      if (weightHome > weightAway) {
        const oppId = meetAway!.teamId;
        const oppObj = TEAMS.find(t => t.id === oppId);
        const stageName = getStageLabel(meetAway!.round);
        return {
          supportOutcome: 'home_win',
          supportTeamName: homeObj?.name || 'Home Team',
          reason: `Supporting ${homeObj?.name} avoids a potential early meeting with ${oppObj?.name} (FIFA Rank ${oppObj?.rank}) in the ${stageName}.`
        };
      } else {
        const oppId = meetHome!.teamId;
        const oppObj = TEAMS.find(t => t.id === oppId);
        const stageName = getStageLabel(meetHome!.round);
        return {
          supportOutcome: 'away_win',
          supportTeamName: awayObj?.name || 'Away Team',
          reason: `Supporting ${awayObj?.name} avoids a potential early meeting with ${oppObj?.name} (FIFA Rank ${oppObj?.rank}) in the ${stageName}.`
        };
      }
    }

    if (meetHome && meetAway) {
      const oppHomeObj = TEAMS.find(t => t.id === meetHome.teamId);
      const oppAwayObj = TEAMS.find(t => t.id === meetAway.teamId);

      if (oppHomeObj && oppAwayObj && oppHomeObj.rank !== oppAwayObj.rank) {
        if (oppHomeObj.rank > oppAwayObj.rank) {
          return {
            supportOutcome: 'home_win',
            supportTeamName: homeObj?.name || 'Home Team',
            reason: `It schedules a matchup against ${oppHomeObj.name} (FIFA Rank ${oppHomeObj.rank}) instead of the tougher ${oppAwayObj.name} (FIFA Rank ${oppAwayObj.rank}) in the ${getStageLabel(meetHome.round)}.`
          };
        } else {
          return {
            supportOutcome: 'away_win',
            supportTeamName: awayObj?.name || 'Away Team',
            reason: `It schedules a matchup against ${oppAwayObj.name} (FIFA Rank ${oppAwayObj.rank}) instead of the tougher ${oppHomeObj.name} (FIFA Rank ${oppHomeObj.rank}) in the ${getStageLabel(meetAway.round)}.`
          };
        }
      }
    }

    return null;
  }, [activeMatch, myTeam, storeMatches, games]);

  // ------------------------------------------------------------
  // AI Commentary Fetcher
  // ------------------------------------------------------------
  useEffect(() => {
    if (!activeMatch || !myTeam || !simResult) {
      setAiCommentary(null);
      return;
    }

    const controller = new AbortController();

    const fetchCommentary = async () => {
      setIsLoadingCommentary(true);
      setAiCommentary(null);

      // Construct a minimal group standings package for prompt
      const minStandings = simResult.standings.map((s) => {
        const teamObj = TEAMS.find((t) => t.id === s.teamId);
        return {
          teamName: teamObj?.name || s.teamId,
          played: s.played,
          won: s.won,
          lost: s.lost,
          points: s.points,
        };
      });

      const getStageName = (matchId: string | null) => {
        if (!matchId) return 'No Matchup';
        if (matchId.startsWith('R32')) return 'Round of 32';
        if (matchId.startsWith('R16')) return 'Round of 16';
        if (matchId.startsWith('QF')) return 'Quarter-finals';
        if (matchId.startsWith('SF')) return 'Semi-finals';
        if (matchId === 'F') return 'Final';
        return matchId;
      };

      const mockIntersection = {
        meetingWithHome: {
          team: activeMatch.homeTeamName,
          stage: getStageName(simResult.intersections.teamA),
          meet: simResult.intersections.teamA !== null,
        },
        meetingWithAway: {
          team: activeMatch.awayTeamName,
          stage: getStageName(simResult.intersections.teamB),
          meet: simResult.intersections.teamB !== null,
        },
      };

      try {
        const response = await fetch('/api/match-calculator', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            match: {
              homeTeamName: activeMatch.homeTeamName,
              awayTeamName: activeMatch.awayTeamName,
              groupId: activeMatch.groupId,
            },
            simulatedOutcome: simOutcome,
            selectedTeamName: myTeam.name,
            selectedTeamGroup: myTeam.group,
            simulatedGroupStandings: minStandings,
            simulatedBracketIntersection: mockIntersection,
            simulatedBracketPaths: {
              [myTeam.id]: simResult.paths.myTeam,
              [activeMatch.homeTeamId]: simResult.paths.teamA,
              [activeMatch.awayTeamId]: simResult.paths.teamB,
            },
          }),
          signal: controller.signal,
        });

        if (response.ok) {
          const data = await response.json();
          setAiCommentary(data);
        } else {
          throw new Error('API Error');
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching commentary:', err);
          setAiCommentary({
            english: '⚠️ Failed to fetch AI breakdown. Verify your network or Gemini API Key.',
            bengali: '⚠️ এআই বিশ্লেষণ লোড করা সম্ভব হয়নি। আপনার ইন্টারনেট কানেকশন বা জেমিনি এপিআই কি যাচাই করুন।',
            isError: true,
          });
        }
      } finally {
        setIsLoadingCommentary(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchCommentary();
    }, 450); // Small debounce to avoid redundant requests while changing tabs

    return () => {
      clearTimeout(delayDebounce);
      controller.abort();
    };
  }, [selectedMatchId, selectedMyTeamId, simOutcome]);

  // Filtering matches based on toggles/search
  const filteredMatches = games.filter((g) => {
    if (!showAllMatches && g.finished) return false;
    
    const searchLower = matchSearchQuery.toLowerCase();
    const term = `${g.homeTeamName} vs ${g.awayTeamName} group ${g.groupId}`.toLowerCase();
    
    return term.includes(searchLower) || g.homeTeamName.toLowerCase().includes(searchLower) || g.awayTeamName.toLowerCase().includes(searchLower);
  });



  const getInterestText = (stageA: string | null, stageB: string | null) => {
    if (!stageA && !stageB) {
      return { label: 'Eliminated', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', text: 'Low interest. Neither team qualifies or meets your team.' };
    }
    
    // Meeting stages ranking
    const stages = [stageA, stageB].filter((x): x is string => x !== null);
    if (stages.includes('R32') || stages.includes('R16')) {
      return { label: 'HIGH INTEREST', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse', text: `Potential meeting in the early rounds (${getStageLabel(stages[0])})!` };
    }
    if (stages.includes('QF') || stages.includes('SF')) {
      return { label: 'MEDIUM INTEREST', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', text: `Possible meeting in the deep knockout stages (${getStageLabel(stages[0])})!` };
    }
    return { label: 'POTENTIAL FINAL', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20', text: 'Opposite sides of the bracket. Meeting only possible in the Final!' };
  };

  const interest = getInterestText(simResult?.intersections.teamA || null, simResult?.intersections.teamB || null);

  return (
    <div className="w-full glass-panel rounded-3xl p-6 sm:p-8 border-[#FFD700]/15 bg-slate-950/40 shadow-xl flex flex-col gap-6 select-none relative overflow-hidden mt-6">
      
      {/* Background Radial Glow */}
      <div className="absolute -left-40 -bottom-40 w-96 h-96 bg-gradient-to-tr from-emerald-500/5 to-transparent blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-start gap-3">
          <div className="bg-[#FFD700]/10 p-2.5 rounded-xl border border-[#FFD700]/20 flex-shrink-0 mt-0.5">
            <Trophy className="h-5 w-5 text-[#FFD700] animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider font-sports-header flex items-center gap-2 flex-wrap">
              Match Impact Calculator
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-black uppercase font-sports-header">
                Interactive
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select a match and your country to calculate how different outcomes shift the brackets.
            </p>
          </div>
        </div>

        {/* Show Completed Toggle */}
        <div className="flex items-center gap-2.5 self-start md:self-center bg-slate-900/40 border border-slate-800/60 px-3 py-1.5 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400">Include Played:</span>
          <button
            onClick={() => setShowAllMatches(!showAllMatches)}
            className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${showAllMatches ? 'bg-emerald-500' : 'bg-slate-700'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showAllMatches ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Upcoming Matches Slideshow Ticker */}
      {upcomingMatches.length > 0 && (
        <div className="w-full bg-slate-900/30 border border-slate-850 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-xs animate-fade-in relative overflow-hidden select-none hover:border-slate-800/80 transition-all mb-4">
          {/* Left indicator tag */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-sports-header">
              Live Upcoming:
            </span>
          </div>

          {/* Scrolling/sliding match info */}
          <div 
            className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer transition-all hover:translate-x-1 group"
            title="Click to automatically load this match"
            onClick={() => {
              const currentMatch = upcomingMatches[currentSlideIndex];
              if (currentMatch) {
                setSelectedMatchId(currentMatch.id);
              }
            }}
          >
            {/* Slide content container */}
            <div className="flex items-center gap-2 truncate animate-fade-in" key={currentSlideIndex}>
              {/* Day Badge */}
              {(() => {
                const match = upcomingMatches[currentSlideIndex];
                const info = getLocalMatchInfo(match?.localDate, match?.stadiumId);
                if (!info) return null;
                return (
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded font-sports-header flex-shrink-0 ${
                    info.isToday ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {info.isToday ? 'Today' : 'Tomorrow'}
                  </span>
                );
              })()}

              <span className="text-slate-500 font-extrabold font-sports-header text-[10px] uppercase flex-shrink-0">
                {(() => {
                  const info = getLocalMatchInfo(upcomingMatches[currentSlideIndex]?.localDate, upcomingMatches[currentSlideIndex]?.stadiumId);
                  return info ? info.localTime12h : '';
                })()}
              </span>

              <div className="flex items-center gap-1.5 truncate">
                <img src={getFlagUrl(upcomingMatches[currentSlideIndex].homeTeamId)} alt="" className="w-5.5 h-3.5 object-cover rounded border border-slate-950/20 flex-shrink-0" />
                <span className="font-extrabold text-white text-xs group-hover:text-[#FFD700] transition-colors truncate">
                  {upcomingMatches[currentSlideIndex].homeTeamName}
                </span>
                <span className="text-slate-500 font-bold px-0.5 text-[10px]">vs</span>
                <img src={getFlagUrl(upcomingMatches[currentSlideIndex].awayTeamId)} alt="" className="w-5.5 h-3.5 object-cover rounded border border-slate-950/20 flex-shrink-0" />
                <span className="font-extrabold text-white text-xs group-hover:text-[#FFD700] transition-colors truncate">
                  {upcomingMatches[currentSlideIndex].awayTeamName}
                </span>
              </div>

              <span className="text-[10px] text-slate-500 font-bold flex-shrink-0">
                (Group {upcomingMatches[currentSlideIndex].groupId})
              </span>
            </div>
          </div>

          {/* Right helper tag */}
          <span className="hidden sm:inline-flex text-[9px] text-slate-500 uppercase font-black tracking-wider bg-slate-950 border border-slate-900 px-2 py-0.5 rounded font-sports-header flex-shrink-0 animate-pulse">
            Click to load match
          </span>
        </div>
      )}

      {/* Selectors grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
        {/* Match Select dropdown */}
        <div className="md:col-span-7 flex flex-col gap-2 relative" ref={matchDropdownRef}>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-emerald-400" /> Choose Match to Analyze
          </label>
          <div className="relative">
            <button
              onClick={() => {
                setIsMatchDropdownOpen(!isMatchDropdownOpen);
                if (!isMatchDropdownOpen) setMatchSearchQuery('');
              }}
              className="w-full text-left pl-4 pr-10 py-3 rounded-xl border border-slate-800 bg-slate-950/60 text-sm font-semibold text-white focus:outline-none flex items-center justify-between cursor-pointer"
            >
              <span className="truncate">{displayMatchName}</span>
              <ChevronDown className={`h-4 w-4 text-slate-450 transition-transform ${isMatchDropdownOpen ? 'rotate-185' : ''}`} />
            </button>

            {isMatchDropdownOpen && (
              <div className="absolute top-[50px] left-0 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-850 bg-slate-950 shadow-2xl z-50 py-1 font-semibold text-xs">
                {/* Search query field inside dropdown */}
                <div className="px-2 py-1.5 border-b border-slate-900 sticky top-0 bg-slate-950">
                  <input
                    type="text"
                    value={matchSearchQuery}
                    onChange={(e) => setMatchSearchQuery(e.target.value)}
                    placeholder="Search match..."
                    className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-800 text-white focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {filteredMatches.length > 0 ? (
                  filteredMatches.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => {
                        setSelectedMatchId(g.id);
                        setIsMatchDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-slate-900 transition-colors ${g.id === selectedMatchId ? 'bg-slate-900/60 text-[#FFD700]' : 'text-slate-350'}`}
                    >
                      <div className="flex items-center gap-2">
                        <img src={getFlagUrl(g.homeTeamId)} alt="" className="w-5.5 h-3.5 object-cover rounded border border-slate-950/20" />
                        <span>{g.homeTeamName}</span>
                        <span className="text-slate-500 font-bold px-0.5">vs</span>
                        <img src={getFlagUrl(g.awayTeamId)} alt="" className="w-5.5 h-3.5 object-cover rounded border border-slate-950/20" />
                        <span>{g.awayTeamName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase font-sports-header">
                        <span className="text-slate-500">
                          {(() => {
                            const info = getLocalMatchInfo(g.localDate, g.stadiumId);
                            return `Group ${g.groupId} ${info ? `• ${info.displayLabel}` : ''}`;
                          })()}
                        </span>
                        {g.finished && <span className="bg-emerald-500/10 text-emerald-400 px-1 py-0.2 rounded border border-emerald-500/20">Played</span>}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-slate-500 text-center font-bold">No matching matches</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* My Team dropdown */}
        <div className="md:col-span-5 flex flex-col gap-2 relative" ref={teamDropdownRef}>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-emerald-400" /> Select My Team (Fan View)
          </label>
          <div className="relative">
            <button
              onClick={() => {
                setIsTeamDropdownOpen(!isTeamDropdownOpen);
                if (!isTeamDropdownOpen) setTeamSearchQuery('');
              }}
              className="w-full text-left pl-4 pr-10 py-3 rounded-xl border border-slate-800 bg-slate-950/60 text-sm font-semibold text-white focus:outline-none flex items-center justify-between cursor-pointer"
            >
              {myTeam ? (
                <div className="flex items-center gap-2">
                  <img src={getFlagUrl(myTeam.id)} alt="" className="w-5.5 h-3.5 object-cover rounded border border-slate-950/20" />
                  <span>{displayTeamName}</span>
                </div>
              ) : (
                <span>Choose Team...</span>
              )}
              <ChevronDown className={`h-4 w-4 text-slate-450 transition-transform ${isTeamDropdownOpen ? 'rotate-185' : ''}`} />
            </button>

            {isTeamDropdownOpen && (
              <div className="absolute top-[50px] left-0 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-850 bg-slate-950 shadow-2xl z-50 py-1 font-semibold text-xs">
                <div className="px-2 py-1.5 border-b border-slate-900 sticky top-0 bg-slate-950">
                  <input
                    type="text"
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    placeholder="Search country..."
                    className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-800 text-white focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {TEAMS.filter(t => t.name.toLowerCase().includes(teamSearchQuery.toLowerCase())).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedMyTeamId(t.id);
                      setIsTeamDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-slate-900 transition-colors ${t.id === selectedMyTeamId ? 'bg-slate-900/60 text-[#FFD700]' : 'text-slate-350'}`}
                  >
                    <div className="flex items-center gap-2">
                      <img src={getFlagUrl(t.id)} alt="" className="w-5.5 h-3.5 object-cover rounded border border-slate-950/20" />
                      <span>{t.name}</span>
                    </div>
                    <span className="text-[9px] text-slate-500 uppercase font-bold font-sports-header">Group {t.group}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {activeMatch && myTeam && simResult ? (
        <div className="flex flex-col gap-6 animate-fade-in">
          
          {/* Outcome tabs */}
          <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-900">
            <button
              onClick={() => setSimOutcome('home_win')}
              className={`py-3 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                simOutcome === 'home_win'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-950 text-white border-emerald-500/30 shadow-lg'
                  : 'bg-transparent text-slate-400 hover:text-slate-300 border-transparent'
              }`}
            >
              {activeMatch.homeTeamName} Win
            </button>
            <button
              onClick={() => setSimOutcome('draw')}
              className={`py-3 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                simOutcome === 'draw'
                  ? 'bg-gradient-to-r from-slate-700 to-slate-900 text-white border-slate-600/30 shadow-lg'
                  : 'bg-transparent text-slate-400 hover:text-slate-300 border-transparent'
              }`}
            >
              Draw
            </button>
            <button
              onClick={() => setSimOutcome('away_win')}
              className={`py-3 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                simOutcome === 'away_win'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-950 text-white border-emerald-500/30 shadow-lg'
                  : 'bg-transparent text-slate-400 hover:text-slate-300 border-transparent'
              }`}
            >
              {activeMatch.awayTeamName} Win
            </button>
          </div>

          {/* Results grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Standings Column */}
            <div className="lg:col-span-5 flex flex-col p-4 rounded-2xl border border-slate-900 bg-slate-950/40">
              <span className="text-[10px] text-[#FFD700] font-black uppercase tracking-widest mb-3 pb-1 border-b border-slate-900 font-sports-header">
                Simulated Group {activeMatch.groupId} Standings
              </span>
              <div className="flex flex-col gap-2 font-semibold text-xs">
                {simResult.standings.map((s, index) => {
                  const teamObj = TEAMS.find(t => t.id === s.teamId);
                  const isHighlighted = s.teamId === activeMatch.homeTeamId || s.teamId === activeMatch.awayTeamId;
                  
                  return (
                    <div
                      key={s.teamId}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                        isHighlighted 
                          ? 'bg-slate-900/50 border-[#FFD700]/30 text-white shadow-sm'
                          : 'bg-transparent border-slate-900 text-slate-400'
                      }`}
                    >
                      <span className={`w-4 text-center font-bold text-[10px] font-sports-header ${index < 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {index + 1}
                      </span>
                      {teamObj && (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <img src={getFlagUrl(teamObj.id)} alt="" className="w-5.5 h-3.5 object-cover rounded border border-slate-950/20 flex-shrink-0" />
                          <span className="truncate font-bold">{teamObj.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-[10px] font-sports-header ml-auto select-none font-bold">
                        <span className="text-slate-500">P: {s.played}</span>
                        <span className={isHighlighted ? 'text-[#FFD700]' : 'text-slate-400'}>{s.points} PTS</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Path intersection / Interest Column */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              
              {/* Interest Level Card */}
              {!recommendation && (
                <div className={`p-4 rounded-2xl border flex flex-col gap-2 shadow-sm ${interest.color}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest font-sports-header">
                      Interest Level
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border border-current font-sports-header">
                      {interest.label}
                    </span>
                  </div>
                  <p className="text-xs font-semibold leading-relaxed">{interest.text}</p>
                </div>
              )}

              {/* Support Advice / Recommendation Card */}
              {recommendation && (
                <div className="p-4 rounded-2xl border border-[#FFD700]/25 bg-amber-500/5 flex flex-col gap-2 shadow-sm text-[#FFD700] animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 animate-pulse text-[#FFD700]" />
                      <span className="text-[10px] font-black uppercase tracking-widest font-sports-header">
                        Fan Support Advice
                      </span>
                    </div>
                    <span className="text-[9px] bg-[#FFD700]/10 border border-[#FFD700]/20 px-2 py-0.5 rounded font-black uppercase font-sports-header">
                      Tactical Recommendation
                    </span>
                  </div>
                  <p className="text-xs font-semibold leading-relaxed">
                    You should support <strong className="font-black text-emerald-400" style={{ textShadow: '0 0 8px rgba(52, 211, 153, 0.6)' }}>{recommendation.supportTeamName}</strong>: {recommendation.reason}
                  </p>
                </div>
              )}

              {/* Visual Pathway Connector */}
              <div className="p-4 rounded-2xl border border-slate-900 bg-slate-950/40 flex flex-col gap-4">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest pb-1 border-b border-slate-900 font-sports-header">
                  Potential Knockout Matchup Flow
                </span>

                <div className="flex flex-col gap-4 py-1.5 font-semibold text-xs items-center w-full">
                  
                  {/* Norway path */}
                  {simResult.paths.teamA.length > 0 ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 gap-3.5 transition-all hover:border-slate-700/80 shadow-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={getFlagUrl(activeMatch.homeTeamId)} alt="" className="w-6 h-4 object-cover rounded border border-slate-950/20 flex-shrink-0" />
                        <span className="font-extrabold text-sm sm:text-base text-white truncate">{activeMatch.homeTeamName}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                        <span className="text-xs sm:text-[13px] font-extrabold uppercase tracking-wider text-slate-100 bg-slate-850 border border-slate-750 px-3 py-1.5 rounded-lg font-sports-header">
                          Starts: {simResult.paths.teamA[0] ? `R32 Match ${getOfficialMatchNumber(simResult.paths.teamA[0])}` : 'TBD'}
                        </span>
                        {simResult.intersections.teamA ? (
                          <span className={`text-xs sm:text-[13px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-lg font-sports-header flex items-center gap-1.5 ${
                            simResult.intersections.teamA === 'F'
                              ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                              : 'bg-emerald-950/70 text-emerald-200 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                          }`}>
                            <Sparkles className="h-3.5 w-3.5 animate-pulse text-current" />
                            Meets {myTeam.name} in {getStageLabel(simResult.intersections.teamA)}
                          </span>
                        ) : (
                          <span className="text-xs sm:text-[13px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg font-sports-header">
                            No Matchup with {myTeam.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full p-3.5 rounded-xl bg-slate-950/40 border border-slate-900/60 opacity-60 gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={getFlagUrl(activeMatch.homeTeamId)} alt="" className="w-6 h-4 object-cover rounded border border-slate-950/20 flex-shrink-0 opacity-45" />
                        <span className="font-extrabold text-sm sm:text-base text-slate-500 truncate">{activeMatch.homeTeamName}</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider font-sports-header text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md self-start sm:self-auto">
                        Eliminated in Groups
                      </span>
                    </div>
                  )}

                  {/* Divider / Connector VS text */}
                  <div className="flex items-center justify-center w-full my-0.5">
                    <div className="h-[1px] bg-slate-900 flex-1" />
                    <span className="text-[9px] font-black text-slate-500 px-3 uppercase tracking-widest font-sports-header">VS</span>
                    <div className="h-[1px] bg-slate-900 flex-1" />
                  </div>

                  {/* France path */}
                  {simResult.paths.teamB.length > 0 ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 gap-3.5 transition-all hover:border-slate-700/80 shadow-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={getFlagUrl(activeMatch.awayTeamId)} alt="" className="w-6 h-4 object-cover rounded border border-slate-950/20 flex-shrink-0" />
                        <span className="font-extrabold text-sm sm:text-base text-white truncate">{activeMatch.awayTeamName}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                        <span className="text-xs sm:text-[13px] font-extrabold uppercase tracking-wider text-slate-100 bg-slate-850 border border-slate-750 px-3 py-1.5 rounded-lg font-sports-header">
                          Starts: {simResult.paths.teamB[0] ? `R32 Match ${getOfficialMatchNumber(simResult.paths.teamB[0])}` : 'TBD'}
                        </span>
                        {simResult.intersections.teamB ? (
                          <span className={`text-xs sm:text-[13px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-lg font-sports-header flex items-center gap-1.5 ${
                            simResult.intersections.teamB === 'F'
                              ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                              : 'bg-emerald-950/70 text-emerald-200 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                          }`}>
                            <Sparkles className="h-3.5 w-3.5 animate-pulse text-current" />
                            Meets {myTeam.name} in {getStageLabel(simResult.intersections.teamB)}
                          </span>
                        ) : (
                          <span className="text-xs sm:text-[13px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg font-sports-header">
                            No Matchup with {myTeam.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full p-3.5 rounded-xl bg-slate-950/40 border border-slate-900/60 opacity-60 gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={getFlagUrl(activeMatch.awayTeamId)} alt="" className="w-6 h-4 object-cover rounded border border-slate-950/20 flex-shrink-0 opacity-45" />
                        <span className="font-extrabold text-sm sm:text-base text-slate-500 truncate">{activeMatch.awayTeamName}</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider font-sports-header text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md self-start sm:self-auto">
                        Eliminated in Groups
                      </span>
                    </div>
                  )}



                </div>
              </div>

            </div>

          </div>

          {/* AI Commentary Card */}
          <div className="w-full min-h-[140px] flex flex-col justify-center border-t border-slate-900/60 pt-4">
            {isLoadingCommentary ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-slate-450">
                <RefreshCw className="h-6 w-6 text-[#FFD700] animate-spin" />
                <span className="text-[10px] uppercase font-black tracking-widest text-[#FFD700]/80 animate-pulse font-sports-header">
                  Generating AI tactical commentary...
                </span>
              </div>
            ) : aiCommentary ? (
              aiCommentary.isError ? (
                <div className="w-full glass-panel rounded-2xl border border-rose-500/25 bg-rose-950/20 p-5 shadow-lg relative overflow-hidden flex flex-col gap-4 animate-fade-in">
                  <div className="flex items-center gap-2 border-b border-rose-900/30 pb-3">
                    <AlertCircle className="h-5 w-5 text-rose-400" />
                    <span className="text-sm font-black text-rose-350 uppercase tracking-wider font-sports-header flex items-center gap-2">
                      Commentary Error
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-rose-250 leading-relaxed font-semibold">
                    <div className="flex flex-col gap-1 border-b md:border-b-0 md:border-r border-rose-900/20 pb-4 md:pb-0 md:pr-6 last:border-0 last:pr-0">
                      <span className="text-[10px] text-rose-400 font-black uppercase tracking-widest mb-1.5 font-sports-header">English</span>
                      <p className="whitespace-pre-line leading-relaxed">{aiCommentary.english}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-rose-400 font-black uppercase tracking-widest mb-1.5 font-sports-header">বাংলা</span>
                      <p className="whitespace-pre-line leading-relaxed">{aiCommentary.bengali}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full glass-panel rounded-2xl border border-[#FFD700]/25 bg-slate-950/60 p-5 md:p-6 shadow-xl relative overflow-hidden flex flex-col gap-5 animate-fade-in">
                  {/* Glow accent */}
                  <div className="absolute -left-10 -top-10 w-32 h-32 bg-[#FFD700]/5 blur-[40px] rounded-full pointer-events-none animate-pulse" />
                  
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4.5 w-4.5 text-[#FFD700] animate-pulse" />
                      <span className="text-sm font-black text-white uppercase tracking-wider font-sports-header">
                        Gemini Tactical Breakdown
                      </span>
                    </div>
                    <span className="text-[9px] bg-slate-800 text-slate-450 border border-slate-750 px-2.5 py-0.5 rounded-full font-bold uppercase select-none font-sports-header">
                      {simOutcome === 'home_win' ? `${activeMatch.homeTeamName} Win` : simOutcome === 'away_win' ? `${activeMatch.awayTeamName} Win` : 'Draw'} Scenario
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-slate-350 leading-relaxed font-medium">
                    {/* English Column */}
                    <div className="flex flex-col gap-1 border-b md:border-b-0 md:border-r border-slate-800/80 pb-4 md:pb-0 md:pr-6 last:border-0 last:pr-0">
                      <span className="text-[10px] text-[#FFD700] font-black uppercase tracking-widest mb-1.5 font-sports-header">English Analysis</span>
                      <p className="whitespace-pre-line leading-relaxed">{parseScenarioText(aiCommentary.english)}</p>
                    </div>
                    {/* Bengali Column */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[#FFD700] font-black uppercase tracking-widest mb-1.5 font-sports-header">বাংলা সমীকরণ</span>
                      <p className="whitespace-pre-line leading-relaxed">{parseScenarioText(aiCommentary.bengali)}</p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-rose-950/30 bg-rose-950/10 text-rose-350 text-xs">
                <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
                <span>Could not retrieve tactical commentary. Please verify your GEMINI_API_KEY.</span>
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-slate-800 rounded-3xl text-center gap-3 mt-6 animate-fade-in">
          <Calendar className="h-8 w-8 text-slate-650 animate-pulse" />
          <h4 className="font-bold text-slate-450 text-sm uppercase tracking-wide font-sports-header">Simulator Ready</h4>
          <p className="text-slate-500 text-xs max-w-md leading-relaxed">
            Please choose a match to analyze and select your team above to calculate standings shifts, path intersections, and tactical support advice.
          </p>
        </div>
      )}

    </div>
  );
}
