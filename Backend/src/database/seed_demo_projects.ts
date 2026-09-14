import { pool } from "../config/db";

export async function seedDemoProjects() {
  const client = await pool.connect();
  try {
    console.log("Starting atomic cleanup of existing projects and seeding demonstration datasets...");
    await client.query("BEGIN");

    // 1. Wipe all existing project data in cascade order
    await client.query("DELETE FROM workflow_tasks");
    await client.query("DELETE FROM workflow_executions");
    await client.query("DELETE FROM tasks");
    await client.query("DELETE FROM workflow_instance_stages");
    await client.query("DELETE FROM workflow_node_parcels");
    await client.query("DELETE FROM workflow_edges");
    await client.query("DELETE FROM workflow_nodes");
    await client.query("DELETE FROM workflow_instances");
    await client.query("DELETE FROM project_geometry");
    await client.query("DELETE FROM project_parcels");
    await client.query("DELETE FROM land_record_imports");
    await client.query("DELETE FROM documents");
    await client.query("DELETE FROM grievances");
    await client.query("DELETE FROM compensation_records");
    await client.query("DELETE FROM possession_records");
    await client.query("DELETE FROM notifications");
    await client.query("DELETE FROM projects");
    console.log("✓ Cleared all old projects and dependent records.");

    // 2. Fetch required user IDs for attribution
    const reqRes = await client.query("SELECT id FROM users WHERE email = 'requestor@bhoomi.gov.in'");
    const requestorId = reqRes.rows[0]?.id;
    const bossRes = await client.query("SELECT id FROM users WHERE email = 'boss@bhoomi.gov.in'");
    const bossId = bossRes.rows[0]?.id;
    const offRes = await client.query("SELECT id FROM users WHERE email = 'officer@bhoomi.gov.in'");
    const officerId = offRes.rows[0]?.id;
    const off2Res = await client.query("SELECT id FROM users WHERE email = 'officer2@bhoomi.gov.in'");
    const officer2Id = off2Res.rows[0]?.id || officerId;
    const off3Res = await client.query("SELECT id FROM users WHERE email = 'officer3@bhoomi.gov.in'");
    const officer3Id = off3Res.rows[0]?.id || officerId;
    const compRes = await client.query("SELECT id FROM users WHERE email = 'comp.officer@bhoomi.gov.in'");
    const compOfficerId = compRes.rows[0]?.id || officerId;
    const possRes = await client.query("SELECT id FROM users WHERE email = 'possession.officer@bhoomi.gov.in'");
    const possOfficerId = possRes.rows[0]?.id || officerId;
    const distPuneRes = await client.query("SELECT id FROM users WHERE email = 'district.pune@bhoomi.gov.in'");
    const distPuneId = distPuneRes.rows[0]?.id || bossId;

    // 3. Project Definitions
    const projectsData = [
      {
        code: "PRJ-MH-4421",
        title: "Mumbai-Pune Greenfield Expressway Expansion (Phase 3)",
        type: "HIGHWAY_CORRIDOR",
        state: "Maharashtra",
        district: "Pune",
        areaAcres: 500,
        budgetCr: 12500,
        corridorKm: 45.2,
        widthMeters: 60,
        status: "WORKFLOW_CONFIGURED",
        ministry: "Ministry of Road Transport & Highways",
        authority: "NHAI",
        statutoryPurpose: "Public Purpose — National Highway Corridor Expansion",
        rfctlarrSection: "Section 2(1)(a) — Strategic National Highways",
        scope: "Greenfield 8-lane expressway connecting Pune Industrial Belt to Navi Mumbai International Airport with automated tolling and environmental mitigation.",
        coords: [
          [19.0760, 72.8777],
          [18.9894, 73.1175],
          [18.8250, 73.2800],
          [18.7557, 73.4116],
          [18.6200, 73.6500],
          [18.5204, 73.8567]
        ],
        nodes: [
          { key: "root", name: "Pune District Central Authority", type: "DISTRICT", role: "DISTRICT_AUTHORITY", userId: distPuneId, x: 80, y: 320, sla: 15, desc: "District Magistrate statutory jurisdiction over all Pune acquisition parcels" },
          { key: "sub_maval", name: "Sub-Division A (Maval-Lonavala Section)", type: "STAGE", role: "PROCESSING_OFFICER", userId: officerId, x: 380, y: 160, sla: 14, desc: "Chainage 0+000 to 22+500 western ghats expressway alignment", isBranchA: true },
          { key: "maval_demarc", name: "Cadastral Demarcation & Boundary Pinning", type: "STAGE", role: "PROCESSING_OFFICER", userId: officer2Id, x: 680, y: 100, sla: 10, desc: "Total Station DGPS boundary demarcation and cadastral pillar installation" },
          { key: "maval_jlm", name: "Joint Land Measurement (JLM) Field Survey", type: "STAGE", role: "PROCESSING_OFFICER", userId: officer3Id, x: 980, y: 100, sla: 14, desc: "Joint field survey with landowners, revenue patwari, and NHAI engineers" },
          { key: "maval_mut", name: "Title Verification & Revenue Records Mutation", type: "STAGE", role: "PROCESSING_OFFICER", userId: officerId, x: 1280, y: 100, sla: 12, desc: "7/12 extract validation, inheritance heir scrutiny, and encumbrance check" },
          { key: "sub_talegaon", name: "Sub-Division B (Talegaon Industrial Spur)", type: "STAGE", role: "PROCESSING_OFFICER", userId: officer3Id, x: 380, y: 480, sla: 14, desc: "Chainage 22+500 to 45+200 industrial logistics corridor alignment", isBranchB: true },
          { key: "tale_row", name: "Industrial RoW Survey & Encroachment Check", type: "STAGE", role: "PROCESSING_OFFICER", userId: officer2Id, x: 680, y: 420, sla: 10, desc: "MIDC corridor intersection survey and commercial obstruction identification" },
          { key: "tale_val", name: "Valuation Assessment & Circle Rate Appraisal", type: "STAGE", role: "COMPENSATION_OFFICER", userId: compOfficerId, x: 980, y: 420, sla: 15, desc: "Statutory circle rate valuation, structural assessment, and tree enumeration" },
          { key: "tale_hear", name: "Claims & Objections Scrutiny (Sec 15 Hearing)", type: "STAGE", role: "PROCESSING_OFFICER", userId: officerId, x: 1280, y: 420, sla: 10, desc: "Statutory public hearing of landowner objections under RFCTLARR Section 15" },
          { key: "gate_env", name: "SIA & Environmental Clearance Gate", type: "APPROVAL_GATE", role: "DISTRICT_AUTHORITY", userId: distPuneId, x: 1580, y: 290, sla: 7, desc: "Consolidated Social Impact Assessment (SIA) & MoEFCC clearance gate" },
          { key: "sec19_award", name: "Section 19 Statutory Final Award Declaration", type: "STAGE", role: "DISTRICT_AUTHORITY", userId: distPuneId, x: 1880, y: 290, sla: 10, desc: "Gazette publication of final acquisition declaration and award determination" },
          { key: "pfms_pay", name: "PFMS Direct Bank Account Disbursal", type: "STAGE", role: "COMPENSATION_OFFICER", userId: compOfficerId, x: 2180, y: 290, sla: 14, desc: "Direct benefit transfer of compensation and 100% solatium into bank accounts" },
          { key: "possession", name: "Physical Possession & Vesting Certificate (Sec 38)", type: "STAGE", role: "POSSESSION_OFFICER", userId: possOfficerId, x: 2480, y: 290, sla: 7, desc: "Formal possession handover free from all encumbrances vested in NHAI" },
          { key: "pune_comp", name: "District Compensation & Solatium Determination", type: "STAGE", role: "COMPENSATION_OFFICER", userId: compOfficerId, x: 380, y: 720, sla: 15, desc: "Statutory compensation assessment under Section 26-30 RFCTLARR, 100% solatium calculation, and award determination" },
          { key: "pune_poss", name: "District Physical Possession & RoR Mutation", type: "STAGE", role: "POSSESSION_OFFICER", userId: possOfficerId, x: 380, y: 900, sla: 14, desc: "Section 38 notice to vacate, spot panchnama with video evidence, and sovereign RoR mutation" }
        ],
        edges: [
          ["root", "sub_maval"],
          ["sub_maval", "maval_demarc"],
          ["maval_demarc", "maval_jlm"],
          ["maval_jlm", "maval_mut"],
          ["maval_mut", "gate_env"],
          ["root", "sub_talegaon"],
          ["sub_talegaon", "tale_row"],
          ["tale_row", "tale_val"],
          ["tale_val", "tale_hear"],
          ["tale_hear", "gate_env"],
          ["gate_env", "sec19_award"],
          ["sec19_award", "pfms_pay"],
          ["pfms_pay", "possession"],
          ["root", "pune_comp"],
          ["root", "pune_poss"]
        ]
      },
      {
        code: "PRJ-DL-7701",
        title: "Delhi Metro Phase-IV Rithala-Narela Elevated Transit Corridor",
        type: "METRO_RAIL",
        state: "Delhi",
        district: "Rithala",
        areaAcres: 220,
        budgetCr: 6800,
        corridorKm: 26.5,
        widthMeters: 25,
        status: "WORKFLOW_CONFIGURED",
        ministry: "Ministry of Housing and Urban Affairs",
        authority: "DMRC",
        statutoryPurpose: "Public Purpose — Mass Rapid Transit System",
        rfctlarrSection: "Section 2(1)(b) — Urban Infrastructure & Rapid Transit",
        scope: "26.5 km rapid mass transit link spanning Rithala, Rohini Sectors 25-34, and Narela Special Economic Zone.",
        coords: [
          [28.7208, 77.1071],
          [28.7450, 77.0950],
          [28.7800, 77.0850],
          [28.8500, 77.0900]
        ],
        nodes: [
          { key: "root", name: "Rithala", type: "DISTRICT", role: "DISTRICT_AUTHORITY", userId: officerId, x: 120, y: 300, sla: 15, desc: "District Acquisition Authority & Competent Authority (Rithala District, Delhi)" },
          { key: "dl_comp", name: "Sec 26-30 Statutory Compensation Award & Disbursal", type: "STAGE", role: "COMPENSATION_OFFICER", userId: compOfficerId, x: 500, y: 300, sla: 15, desc: "Statutory compensation assessment, 100% solatium calculation, and PFMS DBT award disbursal" },
          { key: "dl_poss", name: "Physical Possession, Spot Panchnama & Handover", type: "STAGE", role: "POSSESSION_OFFICER", userId: possOfficerId, x: 880, y: 300, sla: 14, desc: "Physical site takeover, spot panchnama with geotagged evidence, and Section 38 unencumbered handover" }
        ],
        edges: [
          ["root", "dl_comp"],
          ["dl_comp", "dl_poss"]
        ]
      },
      {
        code: "PRJ-KA-8890",
        title: "Bengaluru Suburban Rail Corridor 4 (Kanaka Line)",
        type: "METRO_RAIL",
        state: "Karnataka",
        district: "Bengaluru Urban",
        areaAcres: 340,
        budgetCr: 9400,
        corridorKm: 46.2,
        widthMeters: 30,
        status: "WORKFLOW_CONFIGURED",
        ministry: "Ministry of Railways",
        authority: "KRCL",
        statutoryPurpose: "Public Purpose — Suburban Rail Transit",
        rfctlarrSection: "Section 2(1)(a) — Railways & Urban Transit",
        scope: "46.2 km multi-modal commuter rail corridor intersecting Electronic City, Heelalige, Yelahanka, and Rajanukunte.",
        coords: [
          [12.9716, 77.5946],
          [13.0150, 77.6050],
          [13.0650, 77.6200],
          [13.1200, 77.6550],
          [13.1986, 77.7066]
        ],
        nodes: [
          { key: "root", name: "Bengaluru Urban DC Authority", type: "DISTRICT", role: "DISTRICT_AUTHORITY", userId: bossId, x: 80, y: 320, sla: 15, desc: "Deputy Commissioner Bengaluru Urban statutory CalA jurisdiction" },
          { key: "sub_stations", name: "Station Area Development Cohort (19 Stations)", type: "STAGE", role: "PROCESSING_OFFICER", userId: officerId, x: 380, y: 160, sla: 12, desc: "Multi-modal transit hub and station access road parcels", isBranchA: true },
          { key: "bmrcl_pin", name: "BMRCL Interchange Joint Cadastral Pinning", type: "STAGE", role: "PROCESSING_OFFICER", userId: officer2Id, x: 680, y: 100, sla: 14, desc: "Joint boundary demarcation with Namma Metro Interchange lines" },
          { key: "struct_val", name: "Commercial Structure Valuation & Shifting Assessment", type: "STAGE", role: "COMPENSATION_OFFICER", userId: compOfficerId, x: 980, y: 100, sla: 14, desc: "Independent engineering valuation of commercial buildings and structures" },
          { key: "sub_track", name: "Linear Track Corridor Strips (0+000 to 46+200)", type: "STAGE", role: "PROCESSING_OFFICER", userId: officer3Id, x: 380, y: 480, sla: 12, desc: "Continuous right-of-way linear strips for double track embankment", isBranchB: true },
          { key: "track_demarc", name: "Railway Track Right-of-Way Demarcation Survey", type: "STAGE", role: "PROCESSING_OFFICER", userId: officer2Id, x: 680, y: 420, sla: 14, desc: "DGPS field boundary verification along existing railway right of way" },
          { key: "rtc_bhoomi", name: "RTC Bhoomi Revenue Record Harmonization", type: "STAGE", role: "PROCESSING_OFFICER", userId: officerId, x: 980, y: 420, sla: 12, desc: "Direct electronic synchronization with Karnataka Bhoomi RTC database" },
          { key: "solatium_award", name: "Agricultural Compensation & 100% Solatium Determination", type: "STAGE", role: "COMPENSATION_OFFICER", userId: compOfficerId, x: 1280, y: 420, sla: 14, desc: "Section 26 statutory award computation with 100% solatium and 12% interest" },
          { key: "slec_gate", name: "State Level Empowered Committee (SLEC) Clearance", type: "APPROVAL_GATE", role: "DISTRICT_AUTHORITY", userId: bossId, x: 1580, y: 290, sla: 7, desc: "High-level statutory clearance chaired by Chief Secretary Karnataka" },
          { key: "rtgs_pay", name: "PFMS Direct Bank RTGS Disbursal", type: "STAGE", role: "COMPENSATION_OFFICER", userId: compOfficerId, x: 1880, y: 290, sla: 10, desc: "Automated RTGS disbursal into Aadhaar-linked bank accounts" },
          { key: "kride_vesting", name: "K-RIDE Statutory Possession & Track Handover", type: "STAGE", role: "POSSESSION_OFFICER", userId: possOfficerId, x: 2180, y: 290, sla: 7, desc: "Complete vesting and physical possession handover to K-RIDE" },
          { key: "ka_comp", name: "Bengaluru District Compensation & Award Disbursal", type: "STAGE", role: "COMPENSATION_OFFICER", userId: compOfficerId, x: 380, y: 720, sla: 15, desc: "Circle rate computation, 100% statutory solatium, and direct RTGS beneficiary disbursal" },
          { key: "ka_poss", name: "Bengaluru District Physical Possession & Vesting", type: "STAGE", role: "POSSESSION_OFFICER", userId: possOfficerId, x: 380, y: 900, sla: 14, desc: "Spot panchnama, obstruction removal, and K-RIDE corridor physical possession vesting" }
        ],
        edges: [
          ["root", "sub_stations"],
          ["sub_stations", "bmrcl_pin"],
          ["bmrcl_pin", "struct_val"],
          ["struct_val", "slec_gate"],
          ["root", "sub_track"],
          ["sub_track", "track_demarc"],
          ["track_demarc", "rtc_bhoomi"],
          ["rtc_bhoomi", "solatium_award"],
          ["solatium_award", "slec_gate"],
          ["slec_gate", "rtgs_pay"],
          ["rtgs_pay", "kride_vesting"],
          ["root", "ka_comp"],
          ["root", "ka_poss"]
        ]
      },
      {
        code: "PRJ-UP-1102",
        title: "Agra Yamuna Expressway Logistics Hub & Solar Belt",
        type: "RENEWABLE_PARK",
        state: "Uttar Pradesh",
        district: "Agra",
        areaAcres: 1200,
        budgetCr: 4500,
        corridorKm: 0,
        widthMeters: 0,
        status: "PARCELS_CONFIRMED",
        ministry: "Ministry of New & Renewable Energy",
        authority: "SECI",
        statutoryPurpose: "Public Purpose — Clean Energy & Freight Logistics",
        rfctlarrSection: "Section 2(1)(e) — Infrastructure & Industrial Parks",
        scope: "Dedicated renewable logistics corridor and 500MW solar park buffer zone along Yamuna Expressway.",
        coords: [
          [27.1767, 78.0081],
          [27.1950, 78.0250],
          [27.2150, 78.0450],
          [27.2350, 78.0650]
        ],
        nodes: [
          { key: "root", name: "Agra District Revenue Authority", type: "DISTRICT", role: "DISTRICT_AUTHORITY", userId: bossId, x: 80, y: 320, sla: 15, desc: "Collectorate Agra sovereign CALA jurisdiction" },
          { key: "sub_logistics", name: "Logistics Park Terminal Cohort", type: "STAGE", role: "PROCESSING_OFFICER", userId: officerId, x: 380, y: 160, sla: 14, desc: "Freight handling and multi-modal container terminal land parcels", isBranchA: true },
          { key: "exp_demarc", name: "Expressway Connectivity Cadastral Demarcation", type: "STAGE", role: "PROCESSING_OFFICER", userId: officer2Id, x: 680, y: 100, sla: 12, desc: "Interchange link boundary survey and pillar demarcation" },
          { key: "khasra_rec", name: "Khasra & Khatauni Land Record Verification", type: "STAGE", role: "PROCESSING_OFFICER", userId: officer3Id, x: 980, y: 100, sla: 14, desc: "Comprehensive UP Bhulekh revenue record matching and mutation verification" },
          { key: "sub_solar", name: "Solar Array High-Capacity Buffer Zone", type: "STAGE", role: "PROCESSING_OFFICER", userId: officer3Id, x: 380, y: 480, sla: 14, desc: "500MW solar photovoltaic park buffer and high-voltage corridor", isBranchB: true },
          { key: "substat_demarc", name: "Solar Substation Boundary Demarcation", type: "STAGE", role: "PROCESSING_OFFICER", userId: officer2Id, x: 680, y: 420, sla: 12, desc: "Power grid substation perimeter survey and geo-referencing" },
          { key: "circle_award", name: "Circle Rate Assessment & Agricultural Award Computation", type: "STAGE", role: "COMPENSATION_OFFICER", userId: compOfficerId, x: 980, y: 420, sla: 14, desc: "District circle rate valuation and statutory award drafting" },
          { key: "gate_rera", name: "UP RERA & Pollution Control Board Clearance Gate", type: "APPROVAL_GATE", role: "DISTRICT_AUTHORITY", userId: bossId, x: 1380, y: 290, sla: 7, desc: "Environmental and regulatory statutory clearance verification" },
          { key: "treasury_pay", name: "Treasury Direct Compensation Disbursal", type: "STAGE", role: "COMPENSATION_OFFICER", userId: compOfficerId, x: 1680, y: 290, sla: 12, desc: "Direct treasury voucher disbursement into verified farmer accounts" },
          { key: "seci_vesting", name: "SECI Clean Energy Possession Handover", type: "STAGE", role: "POSSESSION_OFFICER", userId: possOfficerId, x: 1980, y: 290, sla: 7, desc: "Formal vesting of clean title and unencumbered possession to SECI" },
          { key: "up_comp", name: "Agra District Statutory Compensation Disbursal", type: "STAGE", role: "COMPENSATION_OFFICER", userId: compOfficerId, x: 380, y: 720, sla: 15, desc: "Agricultural circle rate multiplier, 100% solatium computation, and treasury award disbursal" },
          { key: "up_poss", name: "Agra District Physical Possession & Land Handover", type: "STAGE", role: "POSSESSION_OFFICER", userId: possOfficerId, x: 380, y: 900, sla: 14, desc: "Section 38 notice to vacate, spot panchnama, and state industrial title vesting handover" }
        ],
        edges: [
          ["root", "sub_logistics"],
          ["sub_logistics", "exp_demarc"],
          ["exp_demarc", "khasra_rec"],
          ["khasra_rec", "gate_rera"],
          ["root", "sub_solar"],
          ["sub_solar", "substat_demarc"],
          ["substat_demarc", "circle_award"],
          ["circle_award", "gate_rera"],
          ["gate_rera", "treasury_pay"],
          ["treasury_pay", "seci_vesting"],
          ["root", "up_comp"],
          ["root", "up_poss"]
        ]
      }
    ];

    for (const p of projectsData) {
      console.log(`Seeding project ${p.code}: ${p.title}...`);

      // 4. Insert Project
      const projInsert = await client.query(
        `INSERT INTO projects
         (code, title, project_type, state, district, requested_area_acres,
          requested_area_ha, estimated_budget_cr, corridor_km, alignment_width_meters,
          status, created_by, ministry, proponent_authority, statutory_purpose,
          rfctlarr_section, scope, submission_date, sla_deadline, candidate_parcels_count,
          selected_parcels_count, confirmed_area_acres)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
                 NOW() - INTERVAL '4 days', NOW() + INTERVAL '26 days', 45, 45, $6)
         RETURNING id`,
        [
          p.code, p.title, p.type, p.state, p.district, p.areaAcres,
          Math.round(p.areaAcres * 0.404686), p.budgetCr, p.corridorKm, p.widthMeters,
          p.status, requestorId, p.ministry, p.authority, p.statutoryPurpose,
          p.rfctlarrSection, p.scope
        ]
      );
      const projectId = projInsert.rows[0].id;

      // 5. Insert Geometry
      const lineGeoJson = {
        type: "LineString",
        coordinates: p.coords.map(c => [c[1], c[0]])
      };
      await client.query(
        `INSERT INTO project_geometry (project_id, geometry, corridor_coordinates)
         VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3)`,
        [projectId, JSON.stringify(lineGeoJson), JSON.stringify(p.coords)]
      );

      // 6. Link parcels from this district (up to 45 parcels)
      const parcelsRes = await client.query(
        `SELECT id FROM land_parcels WHERE district = $1 ORDER BY ulpin ASC LIMIT 45`,
        [p.district]
      );
      const districtParcels = parcelsRes.rows.map(r => r.id);
      console.log(`  Found ${districtParcels.length} parcels in ${p.district} for ${p.code}`);

      for (const parcelId of districtParcels) {
        await client.query(
          `INSERT INTO project_parcels (project_id, parcel_id, status, intersect_percent, confirmed_at)
           VALUES ($1, $2, 'CONFIRMED', 100.0, NOW())
           ON CONFLICT (project_id, parcel_id) DO NOTHING`,
          [projectId, parcelId]
        );
      }

      // 7. Create Workflow Instance (in DRAFT status, NOT approved)
      const wfRes = await client.query(
        `INSERT INTO workflow_instances (project_id, template_name, status, version, activated_at, activated_by)
         VALUES ($1, $2, 'DRAFT', 2, NULL, NULL)
         RETURNING id`,
        [projectId, `Statutory Workflow — ${p.title}`]
      );
      const wfInstanceId = wfRes.rows[0].id;

      // 8. Insert Workflow Nodes
      const nodeKeyToIdMap = new Map<string, string>();
      let branchANodeId: string | null = null;
      let branchBNodeId: string | null = null;
      let rootNodeId: string | null = null;

      for (const n of p.nodes) {
        const nRes = await client.query(
          `INSERT INTO workflow_nodes
           (workflow_instance_id, node_key, name, node_type, responsible_role,
            responsible_user_id, x_position, y_position, configuration)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            wfInstanceId,
            n.key,
            n.name,
            n.type,
            n.role,
            n.userId,
            n.x,
            n.y,
            JSON.stringify({
              description: n.desc,
              slaDays: n.sla,
              requiredDocuments: ["Cadastral Survey Map", "Title Deed Extract", "Field Inspection Report"]
            })
          ]
        );
        const nodeId = nRes.rows[0].id;
        nodeKeyToIdMap.set(n.key, nodeId);

        if (n.type === "DISTRICT" || n.key === "root") {
          rootNodeId = nodeId;
        }
        if ((n as any).isBranchA) {
          branchANodeId = nodeId;
        }
        if ((n as any).isBranchB) {
          branchBNodeId = nodeId;
        }
      }

      // 9. Insert Workflow Edges
      for (const [srcKey, tgtKey] of p.edges) {
        const srcId = nodeKeyToIdMap.get(srcKey);
        const tgtId = nodeKeyToIdMap.get(tgtKey);
        if (srcId && tgtId) {
          await client.query(
            `INSERT INTO workflow_edges
             (workflow_instance_id, source_node_id, target_node_id, edge_type)
             VALUES ($1, $2, $3, 'STANDARD')`,
            [wfInstanceId, srcId, tgtId]
          );
        }
      }

      // 10. Allocate Parcels cleanly to avoid duplicates between sibling branches
      // Root gets all district parcels
      if (rootNodeId) {
        for (const pid of districtParcels) {
          await client.query(
            `INSERT INTO workflow_node_parcels (workflow_node_id, parcel_id, assigned_by)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [rootNodeId, pid, bossId]
          );
        }
      }

      // Split parcels 50/50 between Branch A and Branch B
      const halfCount = Math.floor(districtParcels.length / 2);
      const branchAParcels = districtParcels.slice(0, halfCount);
      const branchBParcels = districtParcels.slice(halfCount);

      if (branchANodeId) {
        const parcelsForBranchA = branchBNodeId ? branchAParcels : districtParcels;
        for (const pid of parcelsForBranchA) {
          await client.query(
            `INSERT INTO workflow_node_parcels (workflow_node_id, parcel_id, assigned_by)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [branchANodeId, pid, bossId]
          );
        }
      }

      if (branchBNodeId) {
        for (const pid of branchBParcels) {
          await client.query(
            `INSERT INTO workflow_node_parcels (workflow_node_id, parcel_id, assigned_by)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [branchBNodeId, pid, bossId]
          );
        }
      }

      // Parallel Compensation and Possession branches get all district parcels
      const compKey = p.code === "PRJ-MH-4421" ? "pune_comp" : p.code === "PRJ-DL-7701" ? "dl_comp" : p.code === "PRJ-KA-8890" ? "ka_comp" : "up_comp";
      const possKey = p.code === "PRJ-MH-4421" ? "pune_poss" : p.code === "PRJ-DL-7701" ? "dl_poss" : p.code === "PRJ-KA-8890" ? "ka_poss" : "up_poss";
      const compNodeId = nodeKeyToIdMap.get(compKey);
      const possNodeId = nodeKeyToIdMap.get(possKey);

      if (compNodeId) {
        for (const pid of districtParcels) {
          await client.query(
            `INSERT INTO workflow_node_parcels (workflow_node_id, parcel_id, assigned_by)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [compNodeId, pid, bossId]
          );
        }
      }

      if (possNodeId) {
        for (const pid of districtParcels) {
          await client.query(
            `INSERT INTO workflow_node_parcels (workflow_node_id, parcel_id, assigned_by)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [possNodeId, pid, bossId]
          );
        }
      }

      console.log(`  ✓ Created workflow (${p.nodes.length} nodes, ${p.edges.length} edges) in DRAFT status`);
    }

    await client.query("COMMIT");
    console.log("✅ All demonstration projects successfully seeded!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to seed demonstration projects:", err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedDemoProjects()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
