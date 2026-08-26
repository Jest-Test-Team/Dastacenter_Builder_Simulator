export {};

declare global {
  interface CloudflareEnv {
    LEADERBOARD_DB?: D1Database;
    MY_DB?: D1Database;
    DATABASE?: D1Database;
    /** Workers AI. Optional: absent locally and in tests, where the tutor reports offline. */
    AI?: Ai;
  }
}
