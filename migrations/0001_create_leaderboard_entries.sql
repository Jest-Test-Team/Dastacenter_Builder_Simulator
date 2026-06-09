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
