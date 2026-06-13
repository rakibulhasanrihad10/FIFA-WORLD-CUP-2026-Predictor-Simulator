import { Team, Match } from '../types/tournament';

export const TEAMS: Team[] = [
  // Group A
  { id: 'MEX', name: 'Mexico', flag: '🇲🇽', group: 'A', rank: 15 },
  { id: 'RSA', name: 'South Africa', flag: '🇿🇦', group: 'A', rank: 59 },
  { id: 'KOR', name: 'South Korea', flag: '🇰🇷', group: 'A', rank: 22 },
  { id: 'CZE', name: 'Czechia', flag: '🇨🇿', group: 'A', rank: 36 },

  // Group B
  { id: 'CAN', name: 'Canada', flag: '🇨🇦', group: 'B', rank: 40 },
  { id: 'BIH', name: 'Bosnia and Herzegovina', flag: '🇧🇦', group: 'B', rank: 74 },
  { id: 'QAT', name: 'Qatar', flag: '🇶🇦', group: 'B', rank: 38 },
  { id: 'SUI', name: 'Switzerland', flag: '🇨🇭', group: 'B', rank: 19 },

  // Group C
  { id: 'BRA', name: 'Brazil', flag: '🇧🇷', group: 'C', rank: 5 },
  { id: 'MAR', name: 'Morocco', flag: '🇲🇦', group: 'C', rank: 12 },
  { id: 'HAI', name: 'Haiti', flag: '🇭🇹', group: 'C', rank: 86 },
  { id: 'SCO', name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', group: 'C', rank: 34 },

  // Group D
  { id: 'USA', name: 'United States', flag: '🇺🇸', group: 'D', rank: 16 },
  { id: 'PAR', name: 'Paraguay', flag: '🇵🇾', group: 'D', rank: 56 },
  { id: 'AUS', name: 'Australia', flag: '🇦🇺', group: 'D', rank: 24 },
  { id: 'TUR', name: 'Türkiye', flag: '🇹🇷', group: 'D', rank: 26 },

  // Group E
  { id: 'GER', name: 'Germany', flag: '🇩🇪', group: 'E', rank: 11 },
  { id: 'CUW', name: 'Curaçao', flag: '🇨🇼', group: 'E', rank: 91 },
  { id: 'CIV', name: "Côte d'Ivoire", flag: '🇨🇮', group: 'E', rank: 39 },
  { id: 'ECU', name: 'Ecuador', flag: '🇪🇨', group: 'E', rank: 31 },

  // Group F
  { id: 'NED', name: 'Netherlands', flag: '🇳🇱', group: 'F', rank: 7 },
  { id: 'JPN', name: 'Japan', flag: '🇯🇵', group: 'F', rank: 18 },
  { id: 'SWE', name: 'Sweden', flag: '🇸🇪', group: 'F', rank: 28 },
  { id: 'TUN', name: 'Tunisia', flag: '🇹🇳', group: 'F', rank: 41 },

  // Group G
  { id: 'BEL', name: 'Belgium', flag: '🇧🇪', group: 'G', rank: 3 },
  { id: 'EGY', name: 'Egypt', flag: '🇪🇬', group: 'G', rank: 30 },
  { id: 'IRN', name: 'IR Iran', flag: '🇮🇷', group: 'G', rank: 20 },
  { id: 'NZL', name: 'New Zealand', flag: '🇳🇿', group: 'G', rank: 104 },

  // Group H
  { id: 'ESP', name: 'Spain', flag: '🇪🇸', group: 'H', rank: 1 },
  { id: 'CPV', name: 'Cabo Verde', flag: '🇨🇻', group: 'H', rank: 65 },
  { id: 'KSA', name: 'Saudi Arabia', flag: '🇸🇦', group: 'H', rank: 57 },
  { id: 'URU', name: 'Uruguay', flag: '🇺🇾', group: 'H', rank: 14 },

  // Group I
  { id: 'FRA', name: 'France', flag: '🇫🇷', group: 'I', rank: 2 },
  { id: 'SEN', name: 'Senegal', flag: '🇸🇳', group: 'I', rank: 17 },
  { id: 'IRQ', name: 'Iraq', flag: '🇮🇶', group: 'I', rank: 55 },
  { id: 'NOR', name: 'Norway', flag: '🇳🇴', group: 'I', rank: 44 },

  // Group J
  { id: 'ARG', name: 'Argentina', flag: '🇦🇷', group: 'J', rank: 1 },
  { id: 'ALG', name: 'Algeria', flag: '🇩🇿', group: 'J', rank: 32 },
  { id: 'AUT', name: 'Austria', flag: '🇦🇹', group: 'J', rank: 23 },
  { id: 'JOR', name: 'Jordan', flag: '🇯🇴', group: 'J', rank: 71 },

  // Group K
  { id: 'POR', name: 'Portugal', flag: '🇵🇹', group: 'K', rank: 8 },
  { id: 'COD', name: 'DR Congo', flag: '🇨🇩', group: 'K', rank: 61 },
  { id: 'UZB', name: 'Uzbekistan', flag: '🇺🇿', group: 'K', rank: 68 },
  { id: 'COL', name: 'Colombia', flag: '🇨🇴', group: 'K', rank: 9 },

  // Group L
  { id: 'ENG', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'L', rank: 4 },
  { id: 'CRO', name: 'Croatia', flag: '🇭🇷', group: 'L', rank: 10 },
  { id: 'GHA', name: 'Ghana', flag: '🇬🇭', group: 'L', rank: 64 },
  { id: 'PAN', name: 'Panama', flag: '🇵🇦', group: 'L', rank: 43 },
];

export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// Generates group matches programmatically
export function generateGroupMatches(): Match[] {
  const matches: Match[] = [];
  GROUPS.forEach((group) => {
    const groupTeams = TEAMS.filter((t) => t.group === group);
    if (groupTeams.length === 4) {
      const t1 = groupTeams[0].id;
      const t2 = groupTeams[1].id;
      const t3 = groupTeams[2].id;
      const t4 = groupTeams[3].id;

      // Match pairings corresponding to standard round robin:
      // Round 1
      matches.push({ id: `G_${group}_1`, type: 'group', stage: 'group', groupId: group, homeTeamId: t1, awayTeamId: t2 });
      matches.push({ id: `G_${group}_2`, type: 'group', stage: 'group', groupId: group, homeTeamId: t3, awayTeamId: t4 });
      // Round 2
      matches.push({ id: `G_${group}_3`, type: 'group', stage: 'group', groupId: group, homeTeamId: t1, awayTeamId: t3 });
      matches.push({ id: `G_${group}_4`, type: 'group', stage: 'group', groupId: group, homeTeamId: t2, awayTeamId: t4 });
      // Round 3
      matches.push({ id: `G_${group}_5`, type: 'group', stage: 'group', groupId: group, homeTeamId: t1, awayTeamId: t4 });
      matches.push({ id: `G_${group}_6`, type: 'group', stage: 'group', groupId: group, homeTeamId: t2, awayTeamId: t3 });
    }
  });
  return matches;
}

// Structure for the Round of 32 knockout matches and their paths to the final
export const KNOCKOUT_METADATA: Omit<Match, 'homeTeamId' | 'awayTeamId' | 'winnerId'>[] = [
  // Round of 32
  { id: 'R32_1', type: 'knockout', stage: 'R32', placeholderHome: '2A', placeholderAway: '2B', nextMatchId: 'R16_1', nextMatchIsHome: true },
  { id: 'R32_2', type: 'knockout', stage: 'R32', placeholderHome: '1C', placeholderAway: '2F', nextMatchId: 'R16_1', nextMatchIsHome: false },
  { id: 'R32_3', type: 'knockout', stage: 'R32', placeholderHome: '1E', placeholderAway: '3rd A/B/C/D/F', nextMatchId: 'R16_2', nextMatchIsHome: true },
  { id: 'R32_4', type: 'knockout', stage: 'R32', placeholderHome: '1F', placeholderAway: '2C', nextMatchId: 'R16_2', nextMatchIsHome: false },
  { id: 'R32_5', type: 'knockout', stage: 'R32', placeholderHome: '2E', placeholderAway: '2I', nextMatchId: 'R16_3', nextMatchIsHome: true },
  { id: 'R32_6', type: 'knockout', stage: 'R32', placeholderHome: '1I', placeholderAway: '3rd C/D/F/G/H', nextMatchId: 'R16_3', nextMatchIsHome: false },
  { id: 'R32_7', type: 'knockout', stage: 'R32', placeholderHome: '1A', placeholderAway: '3rd C/E/F/H/I', nextMatchId: 'R16_4', nextMatchIsHome: true },
  { id: 'R32_8', type: 'knockout', stage: 'R32', placeholderHome: '1L', placeholderAway: '3rd E/H/I/J/K', nextMatchId: 'R16_4', nextMatchIsHome: false },
  { id: 'R32_9', type: 'knockout', stage: 'R32', placeholderHome: '1G', placeholderAway: '3rd A/E/H/I/J', nextMatchId: 'R16_5', nextMatchIsHome: true },
  { id: 'R32_10', type: 'knockout', stage: 'R32', placeholderHome: '1D', placeholderAway: '3rd B/E/F/I/J', nextMatchId: 'R16_5', nextMatchIsHome: false },
  { id: 'R32_11', type: 'knockout', stage: 'R32', placeholderHome: '1H', placeholderAway: '2J', nextMatchId: 'R16_6', nextMatchIsHome: true },
  { id: 'R32_12', type: 'knockout', stage: 'R32', placeholderHome: '2K', placeholderAway: '2L', nextMatchId: 'R16_6', nextMatchIsHome: false },
  { id: 'R32_13', type: 'knockout', stage: 'R32', placeholderHome: '1B', placeholderAway: '3rd E/F/G/I/J', nextMatchId: 'R16_7', nextMatchIsHome: true },
  { id: 'R32_14', type: 'knockout', stage: 'R32', placeholderHome: '2D', placeholderAway: '2G', nextMatchId: 'R16_7', nextMatchIsHome: false },
  { id: 'R32_15', type: 'knockout', stage: 'R32', placeholderHome: '1J', placeholderAway: '2H', nextMatchId: 'R16_8', nextMatchIsHome: true },
  { id: 'R32_16', type: 'knockout', stage: 'R32', placeholderHome: '1K', placeholderAway: '3rd D/E/I/J/L', nextMatchId: 'R16_8', nextMatchIsHome: false },

  // Round of 16
  { id: 'R16_1', type: 'knockout', stage: 'R16', placeholderHome: 'Winner R32_1', placeholderAway: 'Winner R32_2', nextMatchId: 'QF_1', nextMatchIsHome: true },
  { id: 'R16_2', type: 'knockout', stage: 'R16', placeholderHome: 'Winner R32_3', placeholderAway: 'Winner R32_4', nextMatchId: 'QF_1', nextMatchIsHome: false },
  { id: 'R16_3', type: 'knockout', stage: 'R16', placeholderHome: 'Winner R32_5', placeholderAway: 'Winner R32_6', nextMatchId: 'QF_2', nextMatchIsHome: true },
  { id: 'R16_4', type: 'knockout', stage: 'R16', placeholderHome: 'Winner R32_7', placeholderAway: 'Winner R32_8', nextMatchId: 'QF_2', nextMatchIsHome: false },
  { id: 'R16_5', type: 'knockout', stage: 'R16', placeholderHome: 'Winner R32_9', placeholderAway: 'Winner R32_10', nextMatchId: 'QF_3', nextMatchIsHome: true },
  { id: 'R16_6', type: 'knockout', stage: 'R16', placeholderHome: 'Winner R32_11', placeholderAway: 'Winner R32_12', nextMatchId: 'QF_3', nextMatchIsHome: false },
  { id: 'R16_7', type: 'knockout', stage: 'R16', placeholderHome: 'Winner R32_13', placeholderAway: 'Winner R32_14', nextMatchId: 'QF_4', nextMatchIsHome: true },
  { id: 'R16_8', type: 'knockout', stage: 'R16', placeholderHome: 'Winner R32_15', placeholderAway: 'Winner R32_16', nextMatchId: 'QF_4', nextMatchIsHome: false },

  // Quarter Finals
  { id: 'QF_1', type: 'knockout', stage: 'QF', placeholderHome: 'Winner R16_1', placeholderAway: 'Winner R16_2', nextMatchId: 'SF_1', nextMatchIsHome: true },
  { id: 'QF_2', type: 'knockout', stage: 'QF', placeholderHome: 'Winner R16_3', placeholderAway: 'Winner R16_4', nextMatchId: 'SF_1', nextMatchIsHome: false },
  { id: 'QF_3', type: 'knockout', stage: 'QF', placeholderHome: 'Winner R16_5', placeholderAway: 'Winner R16_6', nextMatchId: 'SF_2', nextMatchIsHome: true },
  { id: 'QF_4', type: 'knockout', stage: 'QF', placeholderHome: 'Winner R16_7', placeholderAway: 'Winner R16_8', nextMatchId: 'SF_2', nextMatchIsHome: false },

  // Semi Finals
  { id: 'SF_1', type: 'knockout', stage: 'SF', placeholderHome: 'Winner QF_1', placeholderAway: 'Winner QF_2', nextMatchId: 'F', nextMatchIsHome: true },
  { id: 'SF_2', type: 'knockout', stage: 'SF', placeholderHome: 'Winner QF_3', placeholderAway: 'Winner QF_4', nextMatchId: 'F', nextMatchIsHome: false },

  // Final
  { id: 'F', type: 'knockout', stage: 'final', placeholderHome: 'Winner SF_1', placeholderAway: 'Winner SF_2' }
];

export function getFlagUrl(teamId: string): string {
  const mapping: Record<string, string> = {
    MEX: 'mx', RSA: 'za', KOR: 'kr', CZE: 'cz',
    CAN: 'ca', BIH: 'ba', QAT: 'qa', SUI: 'ch',
    BRA: 'br', MAR: 'ma', HAI: 'ht', SCO: 'gb-sct',
    USA: 'us', PAR: 'py', AUS: 'au', TUR: 'tr',
    GER: 'de', CUW: 'cw', CIV: 'ci', ECU: 'ec',
    NED: 'nl', JPN: 'jp', SWE: 'se', TUN: 'tn',
    BEL: 'be', EGY: 'eg', IRN: 'ir', NZL: 'nz',
    ESP: 'es', CPV: 'cv', KSA: 'sa', URU: 'uy',
    FRA: 'fr', SEN: 'sn', IRQ: 'iq', NOR: 'no',
    ARG: 'ar', ALG: 'dz', AUT: 'at', JOR: 'jo',
    POR: 'pt', COD: 'cd', UZB: 'uz', COL: 'co',
    ENG: 'gb-eng', CRO: 'hr', GHA: 'gh', PAN: 'pa'
  };
  const code = mapping[teamId.toUpperCase()] || teamId.toLowerCase().substring(0, 2);
  return `https://flagcdn.com/w80/${code}.png`;
}
