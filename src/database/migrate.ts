import Database from "@tauri-apps/plugin-sql";
import m0001 from "./migrations/0001_init.sql?raw";

interface MigrationDef {
  version: number;
  description: string;
  sql: string;
}

const migrations: MigrationDef[] = [
  { version: 1, description: "init baseline schema", sql: m0001 },
];

export async function runMigrations(db: Database): Promise<void> {
  const result = await db.select<{ user_version: number }[]>("PRAGMA user_version");
  const currentVersion = result[0]?.user_version ?? 0;

  const pending = migrations
    .filter((m) => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    // Setiap statement dipisah ";" dijalankan berurutan dalam satu "batch"
    const statements = migration.sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      await db.execute(statement);
    }
    await db.execute(`PRAGMA user_version = ${migration.version}`);
    console.log(`Migration ${migration.version} (${migration.description}) applied.`);
  }
}