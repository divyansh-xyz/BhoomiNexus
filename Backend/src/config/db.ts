import { Pool } from "pg";
import { env } from "./env";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const connectDB = async () => {
  try {
    const client = await pool.connect();
    
    // Verify PostGIS is enabled
    try {
      const result = await client.query("SELECT PostGIS_Version();");
      console.log(`✅ PostgreSQL Connected. PostGIS Version: ${result.rows[0].postgis_version}`);
    } catch (e) {
      console.log(`✅ PostgreSQL Connected. (PostGIS not yet enabled on this database)`);
    }
    
    client.release();
  } catch (error) {
    console.error("❌ PostgreSQL Connection Error:", error);
    process.exit(1);
  }
};
