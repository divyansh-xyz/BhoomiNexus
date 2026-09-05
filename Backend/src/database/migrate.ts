import fs from "fs";
import path from "path";
import { pool } from "../config/db";

const runMigrations = async () => {
  try {
    const client = await pool.connect();
    console.log("⏳ Starting migrations...");

    const migrationsDir = path.join(__dirname, "migrations");
    const files = fs.readdirSync(migrationsDir)
      .filter((f: string) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, { encoding: "utf-8" });
      console.log(`  Running: ${file}...`);
      await client.query(sql);
      console.log(`  ✅ ${file} completed.`);
    }

    console.log("✅ All migrations completed successfully!");
    client.release();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

runMigrations();
