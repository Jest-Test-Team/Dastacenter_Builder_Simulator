export {};

declare global {
  interface CloudflareEnv {
    LEADERBOARD_DB?: D1Database;
    MY_DB?: D1Database;
    DATABASE?: D1Database;
  }
}
