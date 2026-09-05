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
      { name: "Rajesh Sharma", email: "requestor@bhoomi.gov.in", role: "REQUESTING_AUTHORITY",
        dept: "Ministry of Road Transport & Highways", designation: "Executive Engineer",
        cadre: "IAS", phone: "+91-11-23384823", office: "Bhawan, New Delhi" },
      { name: "Dr. Vikramaditya Sen", email: "boss@bhoomi.gov.in", role: "BOSS",
        dept: "National Land Acquisition Authority", designation: "Bureau Officer & Section Supervisor",
        cadre: "IAS", phone: "+91-11-23071234", office: "Krishi Bhawan, New Delhi" },
      { name: "Ananya Patel", email: "officer@bhoomi.gov.in", role: "PROCESSING_OFFICER",
        dept: "Revenue & Land Records Branch", designation: "Processing & Field Officer",
        cadre: "State Revenue", phone: "+91-20-25501234", office: "Collectorate, Pune" },
      { name: "S. K. Verma", email: "admin@bhoomi.gov.in", role: "ADMIN",
        dept: "NIC / BhoomiNexus System Administration", designation: "System Administrator",
        cadre: "NIC", phone: "+91-11-24305678", office: "NIC HQ, New Delhi" },
      // Additional processing officers for workflow assignment
      { name: "Priya Deshmukh", email: "officer2@bhoomi.gov.in", role: "PROCESSING_OFFICER",
        dept: "Survey & Settlement", designation: "Deputy Surveyor",
        cadre: "State Revenue", phone: "+91-20-25501235", office: "Survey Office, Pune" },
      { name: "Ravi Kumar Singh", email: "officer3@bhoomi.gov.in", role: "PROCESSING_OFFICER",
        dept: "Revenue Department", designation: "Tehsildar",
        cadre: "State Revenue", phone: "+91-522-2612345", office: "Tehsil Office, Lucknow" },
      { name: "Meera Nair", email: "officer4@bhoomi.gov.in", role: "PROCESSING_OFFICER",
        dept: "Environment & Forest", designation: "Environmental Officer",
        cadre: "IFS", phone: "+91-80-22255678", office: "Forest Office, Bengaluru" },
    ];

    for (const user of users) {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role_id, department, designation, cadre, phone, office_location)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (email) DO UPDATE SET
         name = $1, designation = $6, cadre = $7, phone = $8, office_location = $9`,
        [user.name, user.email, passwordHash, user.role, user.dept, user.designation, user.cadre, user.phone, user.office]
      );
    }

    // 3. Insert States
    console.log("Seeding States...");
    const states = [
      "AP:Andhra Pradesh", "AR:Arunachal Pradesh", "AS:Assam", "BR:Bihar",
      "CG:Chhattisgarh", "GA:Goa", "GJ:Gujarat", "HR:Haryana",
      "HP:Himachal Pradesh", "JH:Jharkhand", "KA:Karnataka", "KL:Kerala",
      "MP:Madhya Pradesh", "MH:Maharashtra", "MN:Manipur", "ML:Meghalaya",
      "MZ:Mizoram", "NL:Nagaland", "OD:Odisha", "PB:Punjab",
      "RJ:Rajasthan", "SK:Sikkim", "TN:Tamil Nadu", "TS:Telangana",
      "TR:Tripura", "UP:Uttar Pradesh", "UK:Uttarakhand", "WB:West Bengal",
      "AN:Andaman & Nicobar", "CH:Chandigarh", "DN:Dadra & Nagar Haveli",
      "DL:Delhi", "JK:Jammu & Kashmir", "LA:Ladakh", "LD:Lakshadweep", "PY:Puducherry",
    ];

    for (const s of states) {
      const [code, name] = s.split(":");
      await client.query(
        "INSERT INTO states (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING",
        [code, name]
      );
    }

    // 4. Insert Districts
    console.log("Seeding Districts...");
    const districts: Record<string, string[]> = {
      MH: ["Pune", "Mumbai", "Nagpur", "Nashik", "Aurangabad", "Thane", "Raigad", "Satara"],
      KA: ["Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Mangaluru", "Hubballi-Dharwad", "Belagavi"],
      UP: ["Lucknow", "Agra", "Varanasi", "Kanpur", "Noida", "Prayagraj", "Meerut"],
    };

    for (const [stateCode, districtList] of Object.entries(districts)) {
      const stateResult = await client.query("SELECT id FROM states WHERE code = $1", [stateCode]);
      if (stateResult.rows.length > 0) {
        const stateId = stateResult.rows[0].id;
        for (const distName of districtList) {
          const dCode = `${stateCode}-${distName.substring(0, 3).toUpperCase()}`;
          await client.query(
            "INSERT INTO districts (state_id, code, name) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING",
            [stateId, dCode, distName]
          );
        }
      }
    }

    // 5. Seed Workflow Template
    console.log("Seeding Workflow Templates...");
    const templateResult = await client.query(
      `INSERT INTO workflow_templates (name, category, description, statutory_act)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        "Land Acquisition — Prototype",
        "LINEAR_HIGHWAY",
        "Standard 4-stage land acquisition workflow for highway and linear infrastructure projects under RFCTLARR Act 2013",
        "Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013",
      ]
    );

    let templateId: string | null = null;
    if (templateResult.rows.length > 0) {
      templateId = templateResult.rows[0].id;
    } else {
      const existing = await client.query("SELECT id FROM workflow_templates WHERE name = $1", ["Land Acquisition — Prototype"]);
      if (existing.rows.length > 0) templateId = existing.rows[0].id;
    }

    if (templateId) {
      const stages = [
        { order: 1, name: "Parcel Verification", desc: "Verify cadastral parcel records against submitted land schedule", dept: "Revenue & Land Records Branch", role: "PROCESSING_OFFICER", sla: 7, docs: ["Land Schedule", "Survey Map", "Khasra/Khatauni"] },
        { order: 2, name: "Document Verification", desc: "Verify all submitted legal and project documents", dept: "Revenue Department", role: "PROCESSING_OFFICER", sla: 10, docs: ["Project Proposal", "DPR Extract", "SIA Clearance"] },
        { order: 3, name: "Departmental Scrutiny", desc: "Multi-departmental review and environmental clearance check", dept: "Environment & Forest", role: "PROCESSING_OFFICER", sla: 14, docs: ["Environmental Clearance", "Forest Clearance", "Departmental NOC"] },
        { order: 4, name: "Final Approval", desc: "Final statutory approval and gazette notification preparation", dept: "Revenue Department", role: "PROCESSING_OFFICER", sla: 7, docs: ["Gazette Draft", "Final Award", "Compensation Schedule"] },
      ];

      await client.query("DELETE FROM workflow_template_stages WHERE template_id = $1", [templateId]);

      for (const s of stages) {
        await client.query(
          `INSERT INTO workflow_template_stages
           (template_id, stage_order, name, description, department, assigned_role, default_sla_days, is_mandatory, required_documents)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)`,
          [templateId, s.order, s.name, s.desc, s.dept, s.role, s.sla, JSON.stringify(s.docs)]
        );
      }
    }

    // 6. Seed Sample Projects
    console.log("Seeding Sample Projects...");
    const requestorResult = await client.query("SELECT id FROM users WHERE email = 'requestor@bhoomi.gov.in'");
    const requestorId = requestorResult.rows[0]?.id;

    if (requestorId) {
      const projects = [
        {
          code: "PRJ-MH-4421", title: "Mumbai-Pune Expressway Expansion - Phase 3",
          type: "HIGHWAY_CORRIDOR", state: "Maharashtra", district: "Pune",
          area: 500, budget: 12500, corridorKm: 45.2, width: 60,
          status: "WORKFLOW_ACTIVE", ministry: "Ministry of Road Transport & Highways",
          authority: "NHAI", purpose: "Public Purpose - Highway Infrastructure",
        },
        {
          code: "PRJ-KA-8890", title: "Bengaluru Suburban Rail Corridor",
          type: "METRO_RAIL", state: "Karnataka", district: "Bengaluru Urban",
          area: 280, budget: 8900, corridorKm: 22.5, width: 30,
          status: "PARCELS_CONFIRMED", ministry: "Ministry of Railways",
          authority: "KRCL", purpose: "Public Purpose - Rail Transit",
        },
        {
          code: "PRJ-UP-1102", title: "Agra Solar Power Park",
          type: "RENEWABLE_PARK", state: "Uttar Pradesh", district: "Agra",
          area: 1200, budget: 4500, corridorKm: 0, width: 0,
          status: "NEW_REQUEST", ministry: "Ministry of New & Renewable Energy",
          authority: "SECI", purpose: "Public Purpose - Renewable Energy",
        },
      ];

      for (const p of projects) {
        await client.query(
          `INSERT INTO projects
           (code, title, project_type, state, district, requested_area_acres,
            requested_area_ha, estimated_budget_cr, corridor_km, alignment_width_meters,
            status, created_by, ministry, proponent_authority, statutory_purpose,
            submission_date, sla_deadline)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::varchar,$12,$13,$14,$15,
                   CASE WHEN $11::varchar != 'DRAFT' THEN NOW() ELSE NULL END,
                   CASE WHEN $11::varchar != 'DRAFT' THEN NOW() + INTERVAL '30 days' ELSE NULL END)
           ON CONFLICT (code) DO NOTHING`,
          [p.code, p.title, p.type, p.state, p.district, p.area,
           Math.round(p.area * 0.404686), p.budget, p.corridorKm, p.width,
           p.status, requestorId, p.ministry, p.authority, p.purpose]
        );
      }
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
