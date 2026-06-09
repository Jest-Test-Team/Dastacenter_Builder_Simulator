import { nanoid } from 'nanoid';
import { getCloudflareContext } from '@opennextjs/cloudflare';

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

interface LeaderboardDbRow {
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
  overBudget: number;
  issuedBadgeId: string | null;
  issuedBadgeUrl: string | null;
  scenarioId: string;
  scenarioName: string;
  createdAt: string;
  updatedAt: string;
}

const leaderboard = globalThis as typeof globalThis & {
  __dcbLeaderboard?: LeaderboardEntry[];
};

const LEADERBOARD_SQL = `
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id TEXT PRIMARY KEY,
  buildId TEXT NOT NULL UNIQUE,
  walletAddress TEXT NOT NULL,
  blueprintHash TEXT NOT NULL,
  competitionScore REAL NOT NULL,
  score REAL NOT NULL,
  tier TEXT NOT NULL,
  level TEXT NOT NULL,
  pue REAL NOT NULL,
  buildCostUsd REAL NOT NULL,
  budgetUsd REAL NOT NULL,
  overBudget INTEGER NOT NULL,
  issuedBadgeId TEXT,
  issuedBadgeUrl TEXT,
  scenarioId TEXT NOT NULL,
  scenarioName TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_top
  ON leaderboard_entries (competitionScore DESC, updatedAt ASC, id ASC);
`;

function getMemoryStore() {
  if (!leaderboard.__dcbLeaderboard) leaderboard.__dcbLeaderboard = [];
  return leaderboard.__dcbLeaderboard;
}

async function getLeaderboardDb(): Promise<D1Database | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = env.LEADERBOARD_DB ?? env.MY_DB ?? env.DATABASE;
    if (db && typeof db.prepare === 'function') return db as D1Database;
  } catch {
    // Fall back to in-memory storage in local tests and non-Cloudflare runtimes.
  }
  return null;
}

let schemaReady: Promise<void> | null = null;

async function ensureSchema(db: D1Database): Promise<void> {
  schemaReady ??= db.exec(LEADERBOARD_SQL).then(() => undefined);
  await schemaReady;
}

function toDbRow(entry: LeaderboardEntry): LeaderboardDbRow {
  return {
    ...entry,
    overBudget: entry.overBudget ? 1 : 0,
    issuedBadgeId: entry.issuedBadgeId ?? null,
    issuedBadgeUrl: entry.issuedBadgeUrl ?? null,
  };
}

function fromDbRow(row: LeaderboardDbRow): LeaderboardEntry {
  return {
    ...row,
    overBudget: row.overBudget === 1,
    issuedBadgeId: row.issuedBadgeId ?? undefined,
    issuedBadgeUrl: row.issuedBadgeUrl ?? undefined,
  };
}

function sortEntries(entries: LeaderboardEntry[]) {
  return entries.sort((a, b) => {
    if (b.competitionScore !== a.competitionScore) return b.competitionScore - a.competitionScore;
    if (a.updatedAt !== b.updatedAt) return a.updatedAt.localeCompare(b.updatedAt);
    return a.id.localeCompare(b.id);
  });
}

export async function recordLeaderboardEntry(
  input: Omit<LeaderboardEntry, 'id' | 'createdAt' | 'updatedAt'> &
    Partial<Pick<LeaderboardEntry, 'id' | 'createdAt'>>,
): Promise<LeaderboardEntry> {
  const now = new Date().toISOString();
  const entry: LeaderboardEntry = {
    ...input,
    id: input.id ?? nanoid(12),
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };

  const db = await getLeaderboardDb();
  if (!db) {
    const store = getMemoryStore();
    const idx = store.findIndex((row) => row.buildId === entry.buildId);
    if (idx >= 0) store[idx] = entry;
    else store.push(entry);
    return entry;
  }

  await ensureSchema(db);
  const row = toDbRow(entry);
  await db
    .prepare(
      `
      INSERT INTO leaderboard_entries (
        id, buildId, walletAddress, blueprintHash, competitionScore, score,
        tier, level, pue, buildCostUsd, budgetUsd, overBudget,
        issuedBadgeId, issuedBadgeUrl, scenarioId, scenarioName, createdAt, updatedAt
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6,
        ?7, ?8, ?9, ?10, ?11, ?12,
        ?13, ?14, ?15, ?16, ?17, ?18
      )
      ON CONFLICT(buildId) DO UPDATE SET
        walletAddress = excluded.walletAddress,
        blueprintHash = excluded.blueprintHash,
        competitionScore = excluded.competitionScore,
        score = excluded.score,
        tier = excluded.tier,
        level = excluded.level,
        pue = excluded.pue,
        buildCostUsd = excluded.buildCostUsd,
        budgetUsd = excluded.budgetUsd,
        overBudget = excluded.overBudget,
        issuedBadgeId = excluded.issuedBadgeId,
        issuedBadgeUrl = excluded.issuedBadgeUrl,
        scenarioId = excluded.scenarioId,
        scenarioName = excluded.scenarioName,
        updatedAt = excluded.updatedAt
      `,
    )
    .bind(
      row.id,
      row.buildId,
      row.walletAddress,
      row.blueprintHash,
      row.competitionScore,
      row.score,
      row.tier,
      row.level,
      row.pue,
      row.buildCostUsd,
      row.budgetUsd,
      row.overBudget,
      row.issuedBadgeId,
      row.issuedBadgeUrl,
      row.scenarioId,
      row.scenarioName,
      row.createdAt,
      row.updatedAt,
    )
    .run();
  return entry;
}

export async function listLeaderboardEntries(limit = 20): Promise<LeaderboardEntry[]> {
  const max = Math.max(1, limit);
  const db = await getLeaderboardDb();
  if (!db) {
    return sortEntries([...getMemoryStore()]).slice(0, max);
  }

  await ensureSchema(db);
  const result = await db
    .prepare(
      `
      SELECT
        id, buildId, walletAddress, blueprintHash, competitionScore, score,
        tier, level, pue, buildCostUsd, budgetUsd, overBudget,
        issuedBadgeId, issuedBadgeUrl, scenarioId, scenarioName, createdAt, updatedAt
      FROM leaderboard_entries
      ORDER BY competitionScore DESC, updatedAt ASC, id ASC
      LIMIT ?
      `,
    )
    .bind(max)
    .all<LeaderboardDbRow>();
  return (result.results ?? []).map(fromDbRow);
}

export async function getLeaderboardEntry(buildId: string): Promise<LeaderboardEntry | null> {
  const db = await getLeaderboardDb();
  if (!db) {
    return getMemoryStore().find((row) => row.buildId === buildId) ?? null;
  }

  await ensureSchema(db);
  const row = await db
    .prepare(
      `
      SELECT
        id, buildId, walletAddress, blueprintHash, competitionScore, score,
        tier, level, pue, buildCostUsd, budgetUsd, overBudget,
        issuedBadgeId, issuedBadgeUrl, scenarioId, scenarioName, createdAt, updatedAt
      FROM leaderboard_entries
      WHERE buildId = ?
      LIMIT 1
      `,
    )
    .bind(buildId)
    .first<LeaderboardDbRow>();
  return row ? fromDbRow(row) : null;
}
