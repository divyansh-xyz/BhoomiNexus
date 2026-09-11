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
    const passwordHash = await bcrypt.hash("demo", 10);
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
       ON CONFLICT (name) DO UPDATE SET
         category = EXCLUDED.category,
         description = EXCLUDED.description,
         statutory_act = EXCLUDED.statutory_act
       RETURNING id`,
      [
        "Land Acquisition — Prototype",
        "LINEAR_HIGHWAY",
        "Standard 4-stage land acquisition workflow for highway and linear infrastructure projects under RFCTLARR Act 2013",
        "Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013",
      ]
    );

    const templateId = templateResult.rows[0]?.id;

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
          status: "WORKFLOW_CONFIGURED", ministry: "Ministry of Railways",
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
        const projInsert = await client.query(
          `INSERT INTO projects
           (code, title, project_type, state, district, requested_area_acres,
            requested_area_ha, estimated_budget_cr, corridor_km, alignment_width_meters,
            status, created_by, ministry, proponent_authority, statutory_purpose,
            submission_date, sla_deadline)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::varchar,$12,$13,$14,$15,
                   CASE WHEN $11::varchar != 'DRAFT' THEN NOW() ELSE NULL END,
                   CASE WHEN $11::varchar != 'DRAFT' THEN NOW() + INTERVAL '30 days' ELSE NULL END)
           ON CONFLICT (code) DO UPDATE SET
             title = EXCLUDED.title,
             status = EXCLUDED.status,
             requested_area_acres = EXCLUDED.requested_area_acres
           RETURNING id`,
          [p.code, p.title, p.type, p.state, p.district, p.area,
           Math.round(p.area * 0.404686), p.budget, p.corridorKm, p.width,
           p.status, requestorId, p.ministry, p.authority, p.purpose]
        );

        let projId = projInsert.rows[0]?.id;
        if (!projId) {
          const res = await client.query("SELECT id FROM projects WHERE code = $1", [p.code]);
          projId = res.rows[0]?.id;
        }

        if (projId) {
          // Define realistic coordinates for each corridor
          let coords: [number, number][] = [];
          if (p.code === "PRJ-MH-4421") {
            coords = [
              [19.0760, 72.8777],
              [18.9894, 73.1175],
              [18.8250, 73.2800],
              [18.7557, 73.4116],
              [18.6200, 73.6500],
              [18.5204, 73.8567]
            ];
          } else if (p.code === "PRJ-KA-8890") {
            coords = [
              [12.9716, 77.5946],
              [13.0150, 77.6050],
              [13.0650, 77.6200],
              [13.1200, 77.6550],
              [13.1986, 77.7066]
            ];
          } else if (p.code === "PRJ-UP-1102") {
            coords = [
              [27.1767, 78.0081],
              [27.1950, 78.0250],
              [27.2150, 78.0450],
              [27.2350, 78.0650]
            ];
          }

          if (coords.length > 0) {
            const lineGeoJson = {
              type: "LineString",
              coordinates: coords.map((c) => [c[1], c[0]]) // GeoJSON [lon, lat]
            };

            await client.query(
              `INSERT INTO project_geometry (project_id, geometry, corridor_coordinates)
               VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3)
               ON CONFLICT (project_id) DO UPDATE SET
                 geometry = EXCLUDED.geometry,
                 corridor_coordinates = EXCLUDED.corridor_coordinates`,
              [projId, JSON.stringify(lineGeoJson), JSON.stringify(coords)]
            );

            // Clean & seed candidate parcels with valid polygons
            await client.query(`DELETE FROM project_parcels WHERE project_id = $1`, [projId]);
            const parcelCount = 20;

            for (let i = 0; i < parcelCount; i++) {
              const pArea = parseFloat((2 + (i % 6) * 1.4).toFixed(2));
              const wpIdx = i % (coords.length - 1);
              const frac = ((i * 7) % 10) / 10;
              const ptLat = coords[wpIdx][0] + (coords[wpIdx + 1][0] - coords[wpIdx][0]) * frac + (Math.sin(i) * 0.0035);
              const ptLon = coords[wpIdx][1] + (coords[wpIdx + 1][1] - coords[wpIdx][1]) * frac + (Math.cos(i) * 0.0035);
              const dLat = 0.0022;
              const dLon = 0.0022;

              const polyGeoJson = {
                type: "Polygon",
                coordinates: [[
                  [parseFloat((ptLon).toFixed(6)), parseFloat((ptLat).toFixed(6))],
                  [parseFloat((ptLon + dLon).toFixed(6)), parseFloat((ptLat).toFixed(6))],
                  [parseFloat((ptLon + dLon).toFixed(6)), parseFloat((ptLat + dLat).toFixed(6))],
                  [parseFloat((ptLon).toFixed(6)), parseFloat((ptLat + dLat).toFixed(6))],
                  [parseFloat((ptLon).toFixed(6)), parseFloat((ptLat).toFixed(6))],
                ]]
              };

              const parcelRes = await client.query(
                `INSERT INTO land_parcels
                 (ulpin, survey_number, owner_reference, village, district, state, area_acres, area_ha, land_type, market_rate_per_acre, geometry)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ST_SetSRID(ST_GeomFromGeoJSON($11), 4326))
                 RETURNING id`,
                [
                  `ULPIN-${Math.floor(100000 + (i * 37191) % 900000)}`,
                  `SV-${100 + i * 17}`,
                  `Owner-${200 + i * 23}`,
                  "Revenue Circle " + (1 + (i % 4)),
                  p.district,
                  p.state,
                  pArea,
                  parseFloat((pArea * 0.404686).toFixed(4)),
                  i % 3 === 0 ? "COMMERCIAL" : "AGRICULTURAL",
                  Math.round(1200000 + i * 150000),
                  JSON.stringify(polyGeoJson)
                ]
              );

              const pId = parcelRes.rows[0].id;
              const isConfirmed = (p.status === 'PARCELS_CONFIRMED' || p.status === 'WORKFLOW_CONFIGURED' || p.status === 'WORKFLOW_ACTIVE') && i < 2;
              await client.query(
                `INSERT INTO project_parcels (project_id, parcel_id, status, intersect_percent, confirmed_at)
                 VALUES ($1, $2, $3, $4, $5)`,
                [projId, pId, isConfirmed ? 'CONFIRMED' : 'CANDIDATE', 65 + (i % 35), isConfirmed ? new Date() : null]
              );
            }

            const confirmedCount = (p.status === 'PARCELS_CONFIRMED' || p.status === 'WORKFLOW_CONFIGURED' || p.status === 'WORKFLOW_ACTIVE') ? 2 : 0;
            const areaRes = await client.query(
              `SELECT SUM(lp.area_acres) as c_area FROM land_parcels lp JOIN project_parcels pp ON pp.parcel_id = lp.id WHERE pp.project_id = $1 AND pp.status = 'CONFIRMED'`,
              [projId]
            );
            const confirmedArea = parseFloat(areaRes.rows[0]?.c_area || '0');

            await client.query(
              `UPDATE projects SET candidate_parcels_count = $1, selected_parcels_count = $2, confirmed_area_acres = $3 WHERE id = $4`,
              [parcelCount, confirmedCount, confirmedArea, projId]
            );

            // Seed initial statutory documents for the project if not present
            const existingDocs = await client.query(`SELECT id FROM documents WHERE project_id = $1`, [projId]);
            if (existingDocs.rows.length === 0) {
              const seedDocDefs = [
                { title: `Gazette Notification Draft (Section 4(1)) - ${p.code}`, type: 'GAZETTE_DRAFT', size: 4404019, mime: 'application/pdf', hash: '0x8f2ae639d1b54a20b79872e411b9c7', path: `/uploads/${p.code}_gazette.pdf` },
                { title: 'Detailed Project Report (DPR) - Land Alignment Extract', type: 'DPR_EXTRACT', size: 19398656, mime: 'application/pdf', hash: '0x3c7d9e81b52a4401c900384ef11329', path: `/uploads/${p.code}_dpr.pdf` },
                { title: 'Social Impact Assessment (SIA) Clearance & Study', type: 'SIA_CLEARANCE', size: 12687769, mime: 'application/pdf', hash: '0x11b9204cd76e3952a1048b9910c2ef', path: `/uploads/${p.code}_sia.pdf` },
                { title: 'Cadastral Survey Map & Right-of-Way Vector Layer', type: 'ALIGNMENT_GEOJSON', size: 7130316, mime: 'application/geo+json', hash: '0x5e41aa9098bc14d69300451a77401d', path: `/uploads/${p.code}_alignment.geojson` },
                { title: 'Khasra & Khatauni Schedule of Land Holdings', type: 'LAND_RECORD', size: 8808038, mime: 'application/pdf', hash: '0x99a2185b304c21fe90223910ab38cc', path: `/uploads/${p.code}_schedule.pdf` },
                { title: 'State Environmental & Forest NOC Clearance', type: 'OTHER', size: 3774873, mime: 'application/pdf', hash: '0x77ef428019a2b53c109845f201048b', path: `/uploads/${p.code}_env_noc.pdf` },
              ];

              for (const sDoc of seedDocDefs) {
                const dRes = await client.query(
                  `INSERT INTO documents (project_id, title, document_type, file_path, file_size, mime_type, hash, uploader_id, verification_status)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'VERIFIED') RETURNING id`,
                  [projId, sDoc.title, sDoc.type, sDoc.path, sDoc.size, sDoc.mime, sDoc.hash, requestorId]
                );
                const newDocId = dRes.rows[0].id;
                await client.query(
                  `INSERT INTO document_versions (document_id, version_number, file_path, file_size, hash, uploader_id)
                   VALUES ($1, 1, $2, $3, $4, $5)`,
                  [newDocId, sDoc.path, sDoc.size, sDoc.hash, requestorId]
                );
              }
            }
          }
        }
      }

      // 7. Seed Active Workflow Instances & Tasks for Approved Projects
      console.log("Seeding Active Workflow Instances & Officer Tasks...");
      const officerResult = await client.query("SELECT id FROM users WHERE email = 'officer@bhoomi.gov.in'");
      const officerId = officerResult.rows[0]?.id;
      const bossResult = await client.query("SELECT id FROM users WHERE email = 'boss@bhoomi.gov.in'");
      const bossId = bossResult.rows[0]?.id;

      if (officerId && templateId) {
        for (const code of ["PRJ-MH-4421", "PRJ-KA-8890"]) {
          const pRow = await client.query("SELECT id, code FROM projects WHERE code = $1", [code]);
          if (pRow.rows.length === 0) continue;
          const pId = pRow.rows[0].id;

          let wfId: string;
          const wfRow = await client.query("SELECT id FROM workflow_instances WHERE project_id = $1", [pId]);
          const wfStatus = code === "PRJ-MH-4421" ? "ACTIVE" : "DRAFT";
          if (wfRow.rows.length === 0) {
            const insWf = await client.query(
              `INSERT INTO workflow_instances (project_id, template_id, template_name, status, activated_at, activated_by)
               VALUES ($1, $2, 'Land Acquisition — Prototype', $3, ${wfStatus === 'ACTIVE' ? 'NOW()' : 'NULL'}, $4) RETURNING id`,
              [pId, templateId, wfStatus, bossId]
            );
            wfId = insWf.rows[0].id;
          } else {
            wfId = wfRow.rows[0].id;
            await client.query("UPDATE workflow_instances SET status = $1 WHERE id = $2", [wfStatus, wfId]);
          }

          const existingStages = await client.query("SELECT id, stage_order FROM workflow_instance_stages WHERE workflow_id = $1", [wfId]);
          let stage1Id: string | null = null;

          if (existingStages.rows.length === 0) {
            const stagesDefs = [
              { order: 1, name: "Parcel Verification", desc: "Verify cadastral parcel records against submitted land schedule", dept: "Revenue & Land Records Branch", sla: 7, docs: ["Land Schedule", "Survey Map", "Khasra/Khatauni"], status: "ACTIVE" },
              { order: 2, name: "Document Verification", desc: "Verify all submitted legal and project documents", dept: "Revenue Department", sla: 10, docs: ["Project Proposal", "DPR Extract", "SIA Clearance"], status: "PENDING" },
              { order: 3, name: "Departmental Scrutiny", desc: "Multi-departmental review and environmental clearance check", dept: "Environment & Forest", sla: 14, docs: ["Environmental Clearance", "Forest Clearance", "Departmental NOC"], status: "PENDING" },
              { order: 4, name: "Final Approval", desc: "Final statutory approval and gazette notification preparation", dept: "Revenue Department", sla: 7, docs: ["Gazette Draft", "Final Award", "Compensation Schedule"], status: "PENDING" },
            ];

            for (const s of stagesDefs) {
              const sRes = await client.query(
                `INSERT INTO workflow_instance_stages
                 (workflow_id, stage_order, name, description, department, assigned_role, assigned_officer_id, sla_days, is_mandatory, required_documents, status)
                 VALUES ($1, $2, $3, $4, $5, 'PROCESSING_OFFICER', $6, $7, true, $8, $9) RETURNING id`,
                [wfId, s.order, s.name, s.desc, s.dept, officerId, s.sla, JSON.stringify(s.docs), s.status]
              );
              if (s.order === 1) stage1Id = sRes.rows[0].id;
            }
          } else {
            await client.query("UPDATE workflow_instance_stages SET assigned_officer_id = $1 WHERE workflow_id = $2 AND assigned_officer_id IS NULL", [officerId, wfId]);
            await client.query("UPDATE workflow_instance_stages SET status = 'ACTIVE' WHERE workflow_id = $1 AND stage_order = 1 AND status NOT IN ('REJECTED', 'COMPLETED')", [wfId]);
            stage1Id = existingStages.rows.find((s: any) => s.stage_order === 1)?.id || existingStages.rows[0].id;
          }

          if (stage1Id) {
            const taskCheck = await client.query("SELECT id FROM tasks WHERE project_id = $1 AND stage_order = 1", [pId]);
            if (taskCheck.rows.length === 0) {
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + 7);
              await client.query(
                `INSERT INTO tasks
                 (project_id, workflow_id, stage_id, stage_order, stage_name, assigned_officer_id, department, sla_days, due_date, status, required_documents)
                 VALUES ($1, $2, $3, 1, 'Parcel Verification', $4, 'Revenue & Land Records Branch', 7, $5, 'ASSIGNED', $6)`,
                [pId, wfId, stage1Id, officerId, dueDate.toISOString().split("T")[0], JSON.stringify(["Land Schedule", "Survey Map", "Khasra/Khatauni"])]
              );
            } else {
              await client.query(
                `UPDATE tasks SET assigned_officer_id = $1 
                 WHERE project_id = $2 AND stage_order = 1 AND (assigned_officer_id IS NULL OR assigned_officer_id != $1)`,
                [officerId, pId]
              );
            }
          }
        }
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
