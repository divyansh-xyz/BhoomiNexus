import fs from "fs";
import path from "path";
import { pool } from "../config/db";

const runMigrations = async () => {
  try {
    const client = await pool.connect();
    console.log("⏳ Starting migrations...");

    const sqlFilePath = path.join(__dirname, "migrations", "001_initial_schema.sql");
    const sql = fs.readFileSync(sqlFilePath, { encoding: "utf-8" });

    await client.query(sql);

    console.log("✅ Migrations completed successfully!");
    client.release();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

runMigrations();
