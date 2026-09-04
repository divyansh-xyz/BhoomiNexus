import bcrypt from "bcryptjs";
import { pool } from "../config/db";

const seedData = async () => {
  const client = await pool.connect();
  try {
    console.log("⏳ Starting seeding...");
    
    await client.query("BEGIN");

    // 1. Insert Roles
    console.log("Seeding Roles...");
    const roles = [
      { id: "REQUESTING_AUTHORITY", name: "Requesting Authority", description: "Initiates projects" },
      { id: "BOSS", name: "BOSS / Higher Officer", description: "Initializes workflows" },
      { id: "PROCESSING_OFFICER", name: "Processing Officer", description: "Executes stages" },
      { id: "ADMIN", name: "Administrator", description: "System Admin" }
    ];

    for (const role of roles) {
      await client.query(
        "INSERT INTO roles (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
        [role.id, role.name, role.description]
      );
    }

    // 2. Insert Users
    console.log("Seeding Users...");
    const passwordHash = await bcrypt.hash("Demo@123", 10);
    const users = [
      { name: "Requestor Test", email: "requestor@bhoomi.gov.in", role: "REQUESTING_AUTHORITY", dept: "NHAI" },
      { name: "Boss Test", email: "boss@bhoomi.gov.in", role: "BOSS", dept: "Revenue Dept" },
      { name: "Officer Test", email: "officer@bhoomi.gov.in", role: "PROCESSING_OFFICER", dept: "Collectorate" },
      { name: "Admin Test", email: "admin@bhoomi.gov.in", role: "ADMIN", dept: "IT" }
    ];

    for (const user of users) {
      await client.query(
        "INSERT INTO users (name, email, password_hash, role_id, department) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING",
        [user.name, user.email, passwordHash, user.role, user.dept]
      );
    }

    // 3. Insert States (Basic Data)
    console.log("Seeding States...");
    const states = [
      { code: "MH", name: "Maharashtra" },
      { code: "KA", name: "Karnataka" },
      { code: "UP", name: "Uttar Pradesh" }
    ];

    for (const state of states) {
      await client.query(
        "INSERT INTO states (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING",
        [state.code, state.name]
      );
    }

    await client.query("COMMIT");
    console.log("✅ Seeding completed successfully!");
    
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding failed:", error);
  } finally {
    client.release();
    process.exit(0);
  }
};

seedData();
