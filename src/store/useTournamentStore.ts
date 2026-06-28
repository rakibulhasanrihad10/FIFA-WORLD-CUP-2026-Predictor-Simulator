import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Team, Match, TeamStanding, TournamentStep } from '../types/tournament';
import { TEAMS, GROUPS, generateGroupMatches, KNOCKOUT_METADATA } from '../data/initialData';

interface TournamentState {
  step: TournamentStep;
  matches: Match[];
  standings: Record<string, TeamStanding[]>; // Key: Group letter A-L
  qualifiedTeams: {
    winners: string[]; // Team IDs
    runnersUp: string[];
    thirdPlaces: string[];
  };
  championId?: string;
  runnerUpId?: string;
  userName?: string;
  userAvatar?: string;
  apiStandings: Record<string, TeamStanding[]> | null;
  isFetchingApiStandings: boolean;
  apiStandingsError: string | null;
  setStep: (step: TournamentStep) => void;
  selectWinner: (matchId: string, winnerId: string) => void;
  quickRankGroup: (groupId: string, teamIdsInOrder: string[]) => void;
  clearGroupPredictions: (groupId: string) => void;
  advanceToKnockouts: () => void;
  toggleThirdPlaceQualifier: (teamId: string) => void;
  setBrandingDetails: (userName: string, userAvatar: string | undefined) => void;
  autoPredictAllGroupsByRank: () => void;
  autoSelectThirdPlacesByRank: () => void;
  reset: () => void;
  fetchApiStandings: () => Promise<void>;
  autoPredictAllGroupsByApi: () => Promise<void>;
}

// Initial state helpers
const initialGroupStandings = (): Record<string, TeamStanding[]> => {
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

// Sort function incorporating Head-to-Head tiebreaker
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

// Recalculates standings for a single group based on current matches
const calculateGroupStandings = (groupId: string, matches: Match[]): TeamStanding[] => {
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

// Helper to recursively propagate knockout winners and clear stale downstream choices
const propagateKnockoutWinner = (matches: Match[], matchId: string, winnerId: string | undefined): { updatedMatches: Match[]; championId?: string; runnerUpId?: string } => {
  const updated = [...matches];
  const matchIdx = updated.findIndex((m) => m.id === matchId);
  if (matchIdx === -1) return { updatedMatches: updated };

  const currentMatch = { ...updated[matchIdx] };
  currentMatch.winnerId = winnerId;
  updated[matchIdx] = currentMatch;

  let finalChamp: string | undefined = undefined;
  let finalRunnerUp: string | undefined = undefined;

  // If this is the Final, set champion and runner-up directly
  if (currentMatch.stage === 'final') {
    if (winnerId) {
      finalChamp = winnerId;
      finalRunnerUp = winnerId === currentMatch.homeTeamId ? currentMatch.awayTeamId : currentMatch.homeTeamId;
    }
    return { updatedMatches: updated, championId: finalChamp, runnerUpId: finalRunnerUp };
  }

  // Otherwise, propagate to the next match
  if (currentMatch.nextMatchId) {
    const nextIdx = updated.findIndex((m) => m.id === currentMatch.nextMatchId);
    if (nextIdx !== -1) {
      const nextMatch = { ...updated[nextIdx] };
      const oldTeamId = currentMatch.nextMatchIsHome ? nextMatch.homeTeamId : nextMatch.awayTeamId;

      if (oldTeamId !== winnerId) {
        if (currentMatch.nextMatchIsHome) {
          nextMatch.homeTeamId = winnerId;
        } else {
          nextMatch.awayTeamId = winnerId;
        }
        updated[nextIdx] = nextMatch;

        // If the next match had a winner selected, that selection is now invalid since the competitor changed.
        // We must recursively clear the downstream winner.
        if (nextMatch.winnerId) {
          const propagation = propagateKnockoutWinner(updated, nextMatch.id, undefined);
          return {
            updatedMatches: propagation.updatedMatches,
            championId: propagation.championId,
            runnerUpId: propagation.runnerUpId,
          };
        }
      }
    }
  }

  return { updatedMatches: updated };
};

// Helper to dynamically assign the 8 qualified 3rd-placed teams to R32 slots
// without any team facing an opponent from their own original group.
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

  const success = backtrack(0);
  
  if (!success) {
    slots.forEach((slot, idx) => {
      assignment[slot.id] = thirdPlaceIds[idx] || '';
    });
  }

  return assignment;
};

export const useTournamentStore = create<TournamentState>()(
  persist(
    (set, get) => ({
      step: 'home',
      matches: [...generateGroupMatches(), ...KNOCKOUT_METADATA.map(m => ({ ...m }))],
      standings: initialGroupStandings(),
      qualifiedTeams: { winners: [], runnersUp: [], thirdPlaces: [] },
      championId: undefined,
      runnerUpId: undefined,
      userName: undefined,
      userAvatar: undefined,
      apiStandings: null,
      isFetchingApiStandings: false,
      apiStandingsError: null,

      setStep: (step) => set({ step }),

      setBrandingDetails: (userName, userAvatar) => set({ userName, userAvatar }),

      selectWinner: (matchId, winnerId) => {
        const { matches, standings, step } = get();

        // Handle Group Stage Winner Selection
        if (matchId.startsWith('G_')) {
          const matchIdx = matches.findIndex((m) => m.id === matchId);
          if (matchIdx === -1) return;

          const updatedMatches = [...matches];
          updatedMatches[matchIdx] = { ...updatedMatches[matchIdx], winnerId };

          const groupId = updatedMatches[matchIdx].groupId!;
          const updatedStandingsForGroup = calculateGroupStandings(groupId, updatedMatches);

          set({
            matches: updatedMatches,
            standings: {
              ...standings,
              [groupId]: updatedStandingsForGroup,
            },
          });
        }
        // Handle Knockout Stage Winner Selection
        else {
          const { updatedMatches, championId, runnerUpId } = propagateKnockoutWinner(matches, matchId, winnerId);
          
          set({
            matches: updatedMatches,
            championId: championId !== undefined ? championId : get().championId,
            runnerUpId: runnerUpId !== undefined ? runnerUpId : get().runnerUpId,
          });

          // If final match has a winner, advance to champion screen after updates
          if (matchId === 'F') {
            set({ step: 'champion' });
          }
        }
      },

      quickRankGroup: (groupId, teamIdsInOrder) => {
        const { matches, standings } = get();
        const t1 = teamIdsInOrder[0];
        const t2 = teamIdsInOrder[1];
        const t3 = teamIdsInOrder[2];
        const t4 = teamIdsInOrder[3];

        // Define match winners that deterministically result in t1 > t2 > t3 > t4 (9, 6, 3, 0 pts)
        const updates = [
          { home: t1, away: t2, winner: t1 },
          { home: t3, away: t4, winner: t3 },
          { home: t1, away: t3, winner: t1 },
          { home: t2, away: t4, winner: t2 },
          { home: t1, away: t4, winner: t1 },
          { home: t2, away: t3, winner: t2 },
        ];

        const updatedMatches = [...matches];
        updates.forEach((update) => {
          const matchIdx = updatedMatches.findIndex(
            (m) =>
              m.groupId === groupId &&
              ((m.homeTeamId === update.home && m.awayTeamId === update.away) ||
                (m.homeTeamId === update.away && m.awayTeamId === update.home))
          );
          if (matchIdx !== -1) {
            updatedMatches[matchIdx] = {
              ...updatedMatches[matchIdx],
              winnerId: update.winner,
            };
          }
        });

        const updatedStandingsForGroup = calculateGroupStandings(groupId, updatedMatches);

        set({
          matches: updatedMatches,
          standings: {
            ...standings,
            [groupId]: updatedStandingsForGroup,
          },
        });
      },

      clearGroupPredictions: (groupId) => {
        const { matches, standings } = get();
        const updatedMatches = matches.map((m) =>
          m.groupId === groupId ? { ...m, winnerId: undefined } : m
        );
        const updatedStandingsForGroup = calculateGroupStandings(groupId, updatedMatches);
        set({
          matches: updatedMatches,
          standings: {
            ...standings,
            [groupId]: updatedStandingsForGroup,
          },
        });
      },

      advanceToKnockouts: () => {
        const { standings, matches } = get();

        const winners: string[] = [];
        const runnersUp: string[] = [];
        const thirdPlaceTeams: { teamId: string; group: string; points: number }[] = [];

        // 1. Collect Top 2 and 3rd Places for each group
        GROUPS.forEach((group) => {
          const groupStandings = standings[group];
          if (groupStandings && groupStandings.length >= 3) {
            winners.push(groupStandings[0].teamId);
            runnersUp.push(groupStandings[1].teamId);
            thirdPlaceTeams.push({
              teamId: groupStandings[2].teamId,
              group,
              points: groupStandings[2].points,
            });
          }
        });

        // 2. Determine Best 8 Third-Place Teams
        // Ranked by: 1. Points, 2. Group alphabetical (A-L) as stable fallback
        const sortedThirdPlaces = [...thirdPlaceTeams].sort((a, b) => {
          if (b.points !== a.points) {
            return b.points - a.points;
          }
          return a.group.localeCompare(b.group);
        });

        // If all third-place teams have equal points (typical for Direct Group Ranking where all 3rd places get 3 points),
        // we do not pre-select any teams and force the user to choose their best 8 on the qualification screen.
        const allPointsEqual = thirdPlaceTeams.length > 0 && thirdPlaceTeams.every((t) => t.points === thirdPlaceTeams[0].points);

        const bestEightThirdsIds = allPointsEqual
          ? []
          : sortedThirdPlaces
              .slice(0, 8)
              .sort((a, b) => a.group.localeCompare(b.group))
              .map((t) => t.teamId);

        // 3. Populate Round of 32 Matches
        const updatedMatches = [...matches];

        // Map containing index for R32 matchups
        // Matching structure (Winner E vs 3rd A/B/C/D/F is R32_3 away team)
        const findWinner = (group: string) => standings[group][0].teamId;
        const findRunnerUp = (group: string) => standings[group][1].teamId;

        const thirdPlaceAssignments = assignThirdPlaces(bestEightThirdsIds);

        const r32Pairings: { id: string; home: string; away: string }[] = [
          { id: 'R32_1', home: findWinner('E'), away: thirdPlaceAssignments['R32_1'] || '' }, // Match 74
          { id: 'R32_2', home: findWinner('I'), away: thirdPlaceAssignments['R32_2'] || '' }, // Match 77
          { id: 'R32_3', home: findRunnerUp('A'), away: findRunnerUp('B') }, // Match 73
          { id: 'R32_4', home: findWinner('F'), away: findRunnerUp('C') }, // Match 75
          { id: 'R32_5', home: findRunnerUp('K'), away: findRunnerUp('L') }, // Match 83
          { id: 'R32_6', home: findWinner('H'), away: findRunnerUp('J') }, // Match 84
          { id: 'R32_7', home: findWinner('D'), away: thirdPlaceAssignments['R32_7'] || '' }, // Match 81
          { id: 'R32_8', home: findWinner('G'), away: thirdPlaceAssignments['R32_8'] || '' }, // Match 82
          { id: 'R32_9', home: findWinner('C'), away: findRunnerUp('F') }, // Match 76
          { id: 'R32_10', home: findRunnerUp('E'), away: findRunnerUp('I') }, // Match 78
          { id: 'R32_11', home: findWinner('A'), away: thirdPlaceAssignments['R32_11'] || '' }, // Match 79
          { id: 'R32_12', home: findWinner('L'), away: thirdPlaceAssignments['R32_12'] || '' }, // Match 80
          { id: 'R32_13', home: findWinner('J'), away: findRunnerUp('H') }, // Match 86
          { id: 'R32_14', home: findRunnerUp('D'), away: findRunnerUp('G') }, // Match 88
          { id: 'R32_15', home: findWinner('B'), away: thirdPlaceAssignments['R32_15'] || '' }, // Match 85
          { id: 'R32_16', home: findWinner('K'), away: thirdPlaceAssignments['R32_16'] || '' }, // Match 87
        ];

        r32Pairings.forEach((pairing) => {
          const matchIdx = updatedMatches.findIndex((m) => m.id === pairing.id);
          if (matchIdx !== -1) {
            updatedMatches[matchIdx] = {
              ...updatedMatches[matchIdx],
              homeTeamId: pairing.home,
              awayTeamId: pairing.away,
              winnerId: undefined, // Reset any old knockout data
            };
          }
        });

        // Reset all subsequent knockout rounds to ensure no stale data remains
        updatedMatches.forEach((m, idx) => {
          if (m.type === 'knockout' && !m.id.startsWith('R32_')) {
            updatedMatches[idx] = {
              ...m,
              homeTeamId: undefined,
              awayTeamId: undefined,
              winnerId: undefined,
            };
          }
        });

        set({
          matches: updatedMatches,
          qualifiedTeams: {
            winners,
            runnersUp,
            thirdPlaces: bestEightThirdsIds,
          },
          championId: undefined,
          runnerUpId: undefined,
          step: 'qualification',
        });
      },
      
      toggleThirdPlaceQualifier: (teamId) => {
        const { qualifiedTeams, standings, matches } = get();
        let updatedThirds = [...qualifiedTeams.thirdPlaces];
        
        if (updatedThirds.includes(teamId)) {
          updatedThirds = updatedThirds.filter(id => id !== teamId);
        } else {
          if (updatedThirds.length < 8) {
            updatedThirds.push(teamId);
          } else {
            return;
          }
        }

        // Sort by group letter A-L
        const getGroupOfTeam = (tId: string) => TEAMS.find(t => t.id === tId)?.group || 'A';
        updatedThirds.sort((a, b) => getGroupOfTeam(a).localeCompare(getGroupOfTeam(b)));

        const updatedMatches = [...matches];
        const findWinner = (group: string) => standings[group][0].teamId;
        const findRunnerUp = (group: string) => standings[group][1].teamId;

        const thirdPlaceAssignments = assignThirdPlaces(updatedThirds);

        const r32Pairings: { id: string; home: string; away: string }[] = [
          { id: 'R32_1', home: findWinner('E'), away: thirdPlaceAssignments['R32_1'] || '' }, // Match 74
          { id: 'R32_2', home: findWinner('I'), away: thirdPlaceAssignments['R32_2'] || '' }, // Match 77
          { id: 'R32_3', home: findRunnerUp('A'), away: findRunnerUp('B') }, // Match 73
          { id: 'R32_4', home: findWinner('F'), away: findRunnerUp('C') }, // Match 75
          { id: 'R32_5', home: findRunnerUp('K'), away: findRunnerUp('L') }, // Match 83
          { id: 'R32_6', home: findWinner('H'), away: findRunnerUp('J') }, // Match 84
          { id: 'R32_7', home: findWinner('D'), away: thirdPlaceAssignments['R32_7'] || '' }, // Match 81
          { id: 'R32_8', home: findWinner('G'), away: thirdPlaceAssignments['R32_8'] || '' }, // Match 82
          { id: 'R32_9', home: findWinner('C'), away: findRunnerUp('F') }, // Match 76
          { id: 'R32_10', home: findRunnerUp('E'), away: findRunnerUp('I') }, // Match 78
          { id: 'R32_11', home: findWinner('A'), away: thirdPlaceAssignments['R32_11'] || '' }, // Match 79
          { id: 'R32_12', home: findWinner('L'), away: thirdPlaceAssignments['R32_12'] || '' }, // Match 80
          { id: 'R32_13', home: findWinner('J'), away: findRunnerUp('H') }, // Match 86
          { id: 'R32_14', home: findRunnerUp('D'), away: findRunnerUp('G') }, // Match 88
          { id: 'R32_15', home: findWinner('B'), away: thirdPlaceAssignments['R32_15'] || '' }, // Match 85
          { id: 'R32_16', home: findWinner('K'), away: thirdPlaceAssignments['R32_16'] || '' }, // Match 87
        ];

        r32Pairings.forEach((pairing) => {
          const matchIdx = updatedMatches.findIndex((m) => m.id === pairing.id);
          if (matchIdx !== -1) {
            updatedMatches[matchIdx] = {
              ...updatedMatches[matchIdx],
              homeTeamId: pairing.home,
              awayTeamId: pairing.away,
              winnerId: undefined,
            };
          }
        });

        // Reset all subsequent knockout rounds
        updatedMatches.forEach((m, idx) => {
          if (m.type === 'knockout' && !m.id.startsWith('R32_')) {
            updatedMatches[idx] = {
              ...m,
              homeTeamId: undefined,
              awayTeamId: undefined,
              winnerId: undefined,
            };
          }
        });

        set({
          matches: updatedMatches,
          qualifiedTeams: {
            ...qualifiedTeams,
            thirdPlaces: updatedThirds,
          },
          championId: undefined,
          runnerUpId: undefined,
        });
      },

      autoPredictAllGroupsByRank: () => {
        const { matches, standings } = get();
        const updatedMatches = [...matches];
        const updatedStandings = { ...standings };

        // Process only group stage matches
        updatedMatches.forEach((match, idx) => {
          if (match.type === 'group' && match.homeTeamId && match.awayTeamId) {
            const homeTeam = TEAMS.find((t) => t.id === match.homeTeamId);
            const awayTeam = TEAMS.find((t) => t.id === match.awayTeamId);
            
            if (homeTeam && awayTeam) {
              const winnerId = homeTeam.rank < awayTeam.rank ? homeTeam.id : awayTeam.id;
              updatedMatches[idx] = {
                ...match,
                winnerId,
              };
            }
          }
        });

        // Recalculate standings for all groups
        GROUPS.forEach((groupId) => {
          updatedStandings[groupId] = calculateGroupStandings(groupId, updatedMatches);
        });

        // Reset all knockout matches to their default structure
        updatedMatches.forEach((m, idx) => {
          if (m.type === 'knockout') {
            updatedMatches[idx] = {
              ...m,
              homeTeamId: undefined,
              awayTeamId: undefined,
              winnerId: undefined,
            };
          }
        });

        set({
          matches: updatedMatches,
          standings: updatedStandings,
          qualifiedTeams: { winners: [], runnersUp: [], thirdPlaces: [] },
          championId: undefined,
          runnerUpId: undefined,
        });
      },

      autoPredictAllGroupsByApi: async () => {
        set({ isFetchingApiStandings: true, apiStandingsError: null });
        try {
          // 1. Fetch teams metadata to build API ID -> FIFA Code map
          const teamsResponse = await fetch('https://worldcup26.ir/get/teams');
          if (!teamsResponse.ok) {
            throw new Error(`Failed to fetch teams: ${teamsResponse.statusText}`);
          }
          const teamsData = await teamsResponse.json();
          const apiTeams: any[] = teamsData.teams || [];
          
          const apiIdToFifaCode: Record<string, string> = {};
          apiTeams.forEach((team) => {
            if (team.id && team.fifa_code) {
              apiIdToFifaCode[team.id] = team.fifa_code;
            }
          });

          // 2. Fetch current group standings and games in parallel
          const [groupsResponse, gamesResponse] = await Promise.all([
            fetch('https://worldcup26.ir/get/groups'),
            fetch('https://worldcup26.ir/get/games')
          ]);
          if (!groupsResponse.ok || !gamesResponse.ok) {
            throw new Error(`Failed to fetch standings/games: ${groupsResponse.statusText} / ${gamesResponse.statusText}`);
          }
          const groupsData = await groupsResponse.json();
          const gamesData = await gamesResponse.json();
          const apiGroups: any[] = groupsData.groups || [];
          const apiGames: any[] = gamesData.games || [];

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

          // Process matches and set winners according to API games/ranks
          const { matches } = get();
          const updatedMatches = [...matches];

          updatedMatches.forEach((match, idx) => {
            if (match.type === 'group' && match.homeTeamId && match.awayTeamId && match.groupId) {
              // Find matching game in API games list
              const apiMatch = apiGames.find(g => {
                const homeFifa = apiIdToFifaCode[g.home_team_id];
                const awayFifa = apiIdToFifaCode[g.away_team_id];
                return (homeFifa === match.homeTeamId && awayFifa === match.awayTeamId) ||
                       (homeFifa === match.awayTeamId && awayFifa === match.homeTeamId);
              });

              if (apiMatch) {
                const isFinished = apiMatch.finished === 'TRUE' || apiMatch.finished === true;
                const isLive = apiMatch.time_elapsed === 'live' || (apiMatch.time_elapsed && apiMatch.time_elapsed !== 'notstarted' && apiMatch.time_elapsed !== 'finished');

                if (isFinished || isLive) {
                  const hScore = parseInt(apiMatch.home_score, 10) || 0;
                  const aScore = parseInt(apiMatch.away_score, 10) || 0;
                  const homeFifa = apiIdToFifaCode[apiMatch.home_team_id];
                  const awayFifa = apiIdToFifaCode[apiMatch.away_team_id];

                  if (hScore > aScore) {
                    updatedMatches[idx] = { ...match, winnerId: homeFifa };
                  } else if (aScore > hScore) {
                    updatedMatches[idx] = { ...match, winnerId: awayFifa };
                  } else {
                    updatedMatches[idx] = { ...match, winnerId: 'draw' };
                  }
                } else {
                  // Not started: Predict based on FIFA rank
                  const homeObj = TEAMS.find(t => t.id === match.homeTeamId);
                  const awayObj = TEAMS.find(t => t.id === match.awayTeamId);
                  if (homeObj && awayObj) {
                    updatedMatches[idx] = {
                      ...match,
                      winnerId: homeObj.rank < awayObj.rank ? match.homeTeamId : match.awayTeamId
                    };
                  } else {
                    updatedMatches[idx] = { ...match, winnerId: undefined };
                  }
                }
              } else {
                // No apiMatch found: Fallback rank
                const homeObj = TEAMS.find(t => t.id === match.homeTeamId);
                const awayObj = TEAMS.find(t => t.id === match.awayTeamId);
                if (homeObj && awayObj) {
                  updatedMatches[idx] = {
                    ...match,
                    winnerId: homeObj.rank < awayObj.rank ? match.homeTeamId : match.awayTeamId
                  };
                } else {
                  updatedMatches[idx] = { ...match, winnerId: undefined };
                }
              }
            }
          });

          // Reset all knockout matches to their default structure
          updatedMatches.forEach((m, idx) => {
            if (m.type === 'knockout') {
              updatedMatches[idx] = {
                ...m,
                homeTeamId: undefined,
                awayTeamId: undefined,
                winnerId: undefined,
              };
            }
          });

          set({
            matches: updatedMatches,
            standings: apiStandingsRecord,
            apiStandings: apiStandingsRecord,
            isFetchingApiStandings: false,
            apiStandingsError: null,
            qualifiedTeams: { winners: [], runnersUp: [], thirdPlaces: [] },
            championId: undefined,
            runnerUpId: undefined,
          });
        } catch (error: any) {
          console.error('Error fetching API standings:', error);
          set({
            isFetchingApiStandings: false,
            apiStandingsError: error.message || 'Failed to load standings from server.',
          });
          throw error;
        }
      },

      autoSelectThirdPlacesByRank: () => {
        const { standings, qualifiedTeams, matches } = get();
        
        // 1. Get current 3rd place team ID from each of the 12 groups
        const thirdPlaceCandidateIds = GROUPS.map((group) => {
          const groupStandings = standings[group];
          return groupStandings && groupStandings.length >= 3 ? groupStandings[2].teamId : null;
        }).filter((id): id is string => id !== null);

        // 2. Sort candidates by FIFA rank (ascending: lower value is better)
        const sortedByRank = thirdPlaceCandidateIds
          .map((id) => {
            const team = TEAMS.find((t) => t.id === id);
            return { id, rank: team ? team.rank : 999 };
          })
          .sort((a, b) => a.rank - b.rank);

        // 3. Take the top 8 teams
        const bestEightThirdsIds = sortedByRank
          .slice(0, 8)
          .map((item) => item.id);

        // 4. Sort selection by group letter (A-L) to maintain stable bracket pairings
        const getGroupOfTeam = (tId: string) => TEAMS.find(t => t.id === tId)?.group || 'A';
        bestEightThirdsIds.sort((a, b) => getGroupOfTeam(a).localeCompare(getGroupOfTeam(b)));

        // 5. Populate Round of 32 Matches
        const updatedMatches = [...matches];
        const findWinner = (group: string) => standings[group][0].teamId;
        const findRunnerUp = (group: string) => standings[group][1].teamId;

        const thirdPlaceAssignments = assignThirdPlaces(bestEightThirdsIds);

        const r32Pairings: { id: string; home: string; away: string }[] = [
          { id: 'R32_1', home: findWinner('E'), away: thirdPlaceAssignments['R32_1'] || '' }, // Match 74
          { id: 'R32_2', home: findWinner('I'), away: thirdPlaceAssignments['R32_2'] || '' }, // Match 77
          { id: 'R32_3', home: findRunnerUp('A'), away: findRunnerUp('B') }, // Match 73
          { id: 'R32_4', home: findWinner('F'), away: findRunnerUp('C') }, // Match 75
          { id: 'R32_5', home: findRunnerUp('K'), away: findRunnerUp('L') }, // Match 83
          { id: 'R32_6', home: findWinner('H'), away: findRunnerUp('J') }, // Match 84
          { id: 'R32_7', home: findWinner('D'), away: thirdPlaceAssignments['R32_7'] || '' }, // Match 81
          { id: 'R32_8', home: findWinner('G'), away: thirdPlaceAssignments['R32_8'] || '' }, // Match 82
          { id: 'R32_9', home: findWinner('C'), away: findRunnerUp('F') }, // Match 76
          { id: 'R32_10', home: findRunnerUp('E'), away: findRunnerUp('I') }, // Match 78
          { id: 'R32_11', home: findWinner('A'), away: thirdPlaceAssignments['R32_11'] || '' }, // Match 79
          { id: 'R32_12', home: findWinner('L'), away: thirdPlaceAssignments['R32_12'] || '' }, // Match 80
          { id: 'R32_13', home: findWinner('J'), away: findRunnerUp('H') }, // Match 86
          { id: 'R32_14', home: findRunnerUp('D'), away: findRunnerUp('G') }, // Match 88
          { id: 'R32_15', home: findWinner('B'), away: thirdPlaceAssignments['R32_15'] || '' }, // Match 85
          { id: 'R32_16', home: findWinner('K'), away: thirdPlaceAssignments['R32_16'] || '' }, // Match 87
        ];

        r32Pairings.forEach((pairing) => {
          const matchIdx = updatedMatches.findIndex((m) => m.id === pairing.id);
          if (matchIdx !== -1) {
            updatedMatches[matchIdx] = {
              ...updatedMatches[matchIdx],
              homeTeamId: pairing.home,
              awayTeamId: pairing.away,
              winnerId: undefined,
            };
          }
        });

        // Reset all subsequent knockout rounds
        updatedMatches.forEach((m, idx) => {
          if (m.type === 'knockout' && !m.id.startsWith('R32_')) {
            updatedMatches[idx] = {
              ...m,
              homeTeamId: undefined,
              awayTeamId: undefined,
              winnerId: undefined,
            };
          }
        });

        set({
          matches: updatedMatches,
          qualifiedTeams: {
            ...qualifiedTeams,
            thirdPlaces: bestEightThirdsIds,
          },
          championId: undefined,
          runnerUpId: undefined,
        });
      },

      reset: () => {
        set({
          step: 'home',
          matches: [...generateGroupMatches(), ...KNOCKOUT_METADATA.map(m => ({ ...m }))],
          standings: initialGroupStandings(),
          qualifiedTeams: { winners: [], runnersUp: [], thirdPlaces: [] },
          championId: undefined,
          runnerUpId: undefined,
          userName: undefined,
          userAvatar: undefined,
          apiStandings: null,
          isFetchingApiStandings: false,
          apiStandingsError: null,
        });
      },

      fetchApiStandings: async () => {
        set({ isFetchingApiStandings: true, apiStandingsError: null });
        try {
          // 1. Fetch teams metadata to build API ID -> FIFA Code map
          const teamsResponse = await fetch('https://worldcup26.ir/get/teams');
          if (!teamsResponse.ok) {
            throw new Error(`Failed to fetch teams: ${teamsResponse.statusText}`);
          }
          const teamsData = await teamsResponse.json();
          const apiTeams: any[] = teamsData.teams || [];
          
          const apiIdToFifaCode: Record<string, string> = {};
          apiTeams.forEach((team) => {
            if (team.id && team.fifa_code) {
              apiIdToFifaCode[team.id] = team.fifa_code;
            }
          });

          // 2. Fetch current group standings
          const groupsResponse = await fetch('https://worldcup26.ir/get/groups');
          if (!groupsResponse.ok) {
            throw new Error(`Failed to fetch group standings: ${groupsResponse.statusText}`);
          }
          const groupsData = await groupsResponse.json();
          const apiGroups: any[] = groupsData.groups || [];

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

          set({
            apiStandings: apiStandingsRecord,
            isFetchingApiStandings: false,
            apiStandingsError: null,
          });
        } catch (error: any) {
          console.error('Error fetching API standings:', error);
          set({
            isFetchingApiStandings: false,
            apiStandingsError: error.message || 'Failed to load standings from server.',
          });
        }
      },
    }),
    {
      name: 'fifa-2026-predictor-store',
    }
  )
);
