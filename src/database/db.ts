import Database from "@tauri-apps/plugin-sql";
import { runMigrations } from "./migrate";

let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await Database.load("sqlite:archizin.db");
      await runMigrations(db);
      return db;
    })();
  }
  return dbPromise;
}