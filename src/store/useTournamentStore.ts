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
  setStep: (step: TournamentStep) => void;
  selectWinner: (matchId: string, winnerId: string) => void;
  quickRankGroup: (groupId: string, teamIdsInOrder: string[]) => void;
  clearGroupPredictions: (groupId: string) => void;
  advanceToKnockouts: () => void;
  reset: () => void;
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

export const useTournamentStore = create<TournamentState>()(
  persist(
    (set, get) => ({
      step: 'home',
      matches: [...generateGroupMatches(), ...KNOCKOUT_METADATA.map(m => ({ ...m }))],
      standings: initialGroupStandings(),
      qualifiedTeams: { winners: [], runnersUp: [], thirdPlaces: [] },
      championId: undefined,
      runnerUpId: undefined,

      setStep: (step) => set({ step }),

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

        const bestEightThirdsObj = sortedThirdPlaces.slice(0, 8);
        
        // Sort the qualifying third-place teams by group letter A-L to fill designated slots sequentially
        const bestEightThirdsIds = bestEightThirdsObj
          .sort((a, b) => a.group.localeCompare(b.group))
          .map((t) => t.teamId);

        // 3. Populate Round of 32 Matches
        const updatedMatches = [...matches];

        // Map containing index for R32 matchups
        // Matching structure (Winner E vs 3rd A/B/C/D/F is R32_3 away team)
        const findWinner = (group: string) => standings[group][0].teamId;
        const findRunnerUp = (group: string) => standings[group][1].teamId;

        const r32Pairings: { id: string; home: string; away: string }[] = [
          { id: 'R32_1', home: findRunnerUp('A'), away: findRunnerUp('B') },
          { id: 'R32_2', home: findWinner('C'), away: findRunnerUp('F') },
          { id: 'R32_3', home: findWinner('E'), away: bestEightThirdsIds[0] }, // 1st 3rd-place team
          { id: 'R32_4', home: findWinner('F'), away: findRunnerUp('C') },
          { id: 'R32_5', home: findRunnerUp('E'), away: findRunnerUp('I') },
          { id: 'R32_6', home: findWinner('I'), away: bestEightThirdsIds[1] }, // 2nd 3rd-place team
          { id: 'R32_7', home: findWinner('A'), away: bestEightThirdsIds[2] }, // 3rd 3rd-place team
          { id: 'R32_8', home: findWinner('L'), away: bestEightThirdsIds[3] }, // 4th 3rd-place team
          { id: 'R32_9', home: findWinner('G'), away: bestEightThirdsIds[4] }, // 5th 3rd-place team
          { id: 'R32_10', home: findWinner('D'), away: bestEightThirdsIds[5] }, // 6th 3rd-place team
          { id: 'R32_11', home: findWinner('H'), away: findRunnerUp('J') },
          { id: 'R32_12', home: findRunnerUp('K'), away: findRunnerUp('L') },
          { id: 'R32_13', home: findWinner('B'), away: bestEightThirdsIds[6] }, // 7th 3rd-place team
          { id: 'R32_14', home: findRunnerUp('D'), away: findRunnerUp('G') },
          { id: 'R32_15', home: findWinner('J'), away: findRunnerUp('H') },
          { id: 'R32_16', home: findWinner('K'), away: bestEightThirdsIds[7] }, // 8th 3rd-place team
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

      reset: () => {
        set({
          step: 'home',
          matches: [...generateGroupMatches(), ...KNOCKOUT_METADATA.map(m => ({ ...m }))],
          standings: initialGroupStandings(),
          qualifiedTeams: { winners: [], runnersUp: [], thirdPlaces: [] },
          championId: undefined,
          runnerUpId: undefined,
        });
      },
    }),
    {
      name: 'fifa-2026-predictor-store',
    }
  )
);
