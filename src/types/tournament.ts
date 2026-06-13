export interface Team {
  id: string;
  name: string;
  flag: string; // Emoji flag
  group: string; // A - L
  rank: number; // FIFA world ranking
}

export interface Match {
  id: string; // e.g., "G_A_1", "R32_1", "R16_1", "QF_1", "SF_1", "F"
  type: 'group' | 'knockout';
  stage: 'group' | 'R32' | 'R16' | 'QF' | 'SF' | 'final';
  homeTeamId?: string; // Team ID, undefined if knockout and not decided yet
  awayTeamId?: string; // Team ID, undefined if knockout and not decided yet
  winnerId?: string; // Undefined if match not played
  groupId?: string; // "A" - "L" if type is 'group'
  nextMatchId?: string; // Next match this winner advances to
  nextMatchIsHome?: boolean; // True if this winner becomes home team in next match
  placeholderHome?: string; // e.g., "1A" (Winner Group A)
  placeholderAway?: string; // e.g., "2B" (Runner-up Group B)
}

export interface TeamStanding {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  points: number;
}

export type TournamentStep =
  | 'home'
  | 'group'
  | 'qualification'
  | 'R32'
  | 'R16'
  | 'QF'
  | 'SF'
  | 'final'
  | 'champion';
