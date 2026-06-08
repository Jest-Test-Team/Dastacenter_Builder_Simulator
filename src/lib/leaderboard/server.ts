import { nanoid } from 'nanoid';

export interface LeaderboardEntry {
  id: string;
  buildId: string;
  walletAddress: string;
  blueprintHash: string;
  competitionScore: number;
  score: number;
  tier: string;
  level: string;
  pue: number;
  buildCostUsd: number;
  budgetUsd: number;
  overBudget: boolean;
  issuedBadgeId?: string;
  issuedBadgeUrl?: string;
  scenarioId: string;
  scenarioName: string;
  createdAt: string;
  updatedAt: string;
}

const leaderboard = globalThis as typeof globalThis & {
  __dcbLeaderboard?: LeaderboardEntry[];
};

function getStore() {
  if (!leaderboard.__dcbLeaderboard) leaderboard.__dcbLeaderboard = [];
  return leaderboard.__dcbLeaderboard;
}

export function recordLeaderboardEntry(
  input: Omit<LeaderboardEntry, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<LeaderboardEntry, 'id' | 'createdAt'>>,
): LeaderboardEntry {
  const now = new Date().toISOString();
  const entry: LeaderboardEntry = {
    ...input,
    id: input.id ?? nanoid(12),
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
  const store = getStore();
  const idx = store.findIndex((row) => row.buildId === entry.buildId);
  if (idx >= 0) store[idx] = entry;
  else store.push(entry);
  return entry;
}

export function listLeaderboardEntries(limit = 20): LeaderboardEntry[] {
  return [...getStore()]
    .sort((a, b) => {
      if (b.competitionScore !== a.competitionScore) return b.competitionScore - a.competitionScore;
      if (a.updatedAt !== b.updatedAt) return a.updatedAt.localeCompare(b.updatedAt);
      return a.id.localeCompare(b.id);
    })
    .slice(0, Math.max(1, limit));
}

export function getLeaderboardEntry(buildId: string): LeaderboardEntry | null {
  return getStore().find((row) => row.buildId === buildId) ?? null;
}
