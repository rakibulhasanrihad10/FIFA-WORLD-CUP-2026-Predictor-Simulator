import { Team } from '../types/tournament';

function getLevenshteinDistance(a: string, b: string): number {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) tmp[i] = [i];
  for (let j = 0; j <= b.length; j++) tmp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = a[i - 1] === b[j - 1]
        ? tmp[i - 1][j - 1]
        : Math.min(tmp[i - 1][j] + 1, tmp[i][j - 1] + 1, tmp[i - 1][j - 1] + 1);
    }
  }
  return tmp[a.length][b.length];
}

export function fuzzySearchTeams(teams: Team[], query: string): Team[] {
  const q = query.trim().toLowerCase();
  if (!q) return teams;

  const scoredTeams = teams
    .map((team) => {
      const name = team.name.toLowerCase();
      const id = team.id.toLowerCase();
      let score = -1;

      // 1. Exact match / exact prefix match (Highest Priority)
      if (name === q || id === q) {
        score = 0;
      } else if (name.startsWith(q) || id.startsWith(q)) {
        score = 10;
      }
      // 2. Word-boundary match (Secondary Priority)
      else {
        const words = name.split(/\s+/);
        const wordMatch = words.some((word) => word.startsWith(q));
        if (wordMatch) {
          score = 20;
        }
        // 3. Substring match
        else if (name.includes(q) || id.includes(q)) {
          score = 30;
        }
        // 4. Typos & Partial Matches (Tertiary Priority)
        else if (q.length >= 3) {
          const dist = getLevenshteinDistance(q, name);
          if (dist <= 2) {
            score = 40 + dist; // Distance 1 is score 41, distance 2 is score 42
          }
        }
      }

      return { team, score };
    })
    .filter((item) => item.score !== -1)
    .sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      // Tie breaker: standard FIFA rank (smaller number is better rank)
      return a.team.rank - b.team.rank;
    });

  return scoredTeams.map((item) => item.team);
}
