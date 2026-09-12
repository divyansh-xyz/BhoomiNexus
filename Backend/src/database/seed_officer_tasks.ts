import { pool } from '../config/db';

async function seedOfficerWorkflowsAndTasks() {
  const client = await pool.connect();
  try {
    console.log('⏳ Seeding workflow instances and tasks for approved projects...');
    await client.query('BEGIN');

    // 1. Get officer user (Ananya Patel)
    const officerRes = await client.query("SELECT id, name, department FROM users WHERE email = 'officer@bhoomi.gov.in'");
    if (officerRes.rows.length === 0) {
      throw new Error('Officer user officer@bhoomi.gov.in not found');
    }
    const officer = officerRes.rows[0];
    console.log('Found Officer:', officer.name, officer.id);

    // 2. Get BOSS user (Dr. Vikramaditya Sen)
    const bossRes = await client.query("SELECT id FROM users WHERE email = 'boss@bhoomi.gov.in'");
    const bossId = bossRes.rows[0]?.id;

    // 3. Get Template
    const tplRes = await client.query("SELECT id, name FROM workflow_templates WHERE name ILIKE '%Prototype%' LIMIT 1");
    if (tplRes.rows.length === 0) {
      throw new Error('Workflow template not found');
    }
    const template = tplRes.rows[0];

    // 4. Projects to ensure have active workflows and tasks
    const targetCodes = ['PRJ-MH-4421', 'PRJ-KA-8890'];

    for (const code of targetCodes) {
      const projRes = await client.query("SELECT id, code, title, status FROM projects WHERE code = $1", [code]);
      if (projRes.rows.length === 0) continue;
      const project = projRes.rows[0];
      console.log(`Processing project ${project.code} (${project.title})...`);

      // Ensure project status is WORKFLOW_ACTIVE
      await client.query("UPDATE projects SET status = 'WORKFLOW_ACTIVE', updated_at = NOW() WHERE id = $1", [project.id]);

      // Check if workflow_instance exists
      let wfRes = await client.query("SELECT id, status FROM workflow_instances WHERE project_id = $1", [project.id]);
      let wfId: string;

      if (wfRes.rows.length === 0) {
        const insWf = await client.query(
          `INSERT INTO workflow_instances (project_id, template_id, template_name, status, activated_at, activated_by)
           VALUES ($1, $2, $3, 'ACTIVE', NOW(), $4)
           RETURNING id`,
          [project.id, template.id, template.name, bossId]
        );
        wfId = insWf.rows[0].id;
        console.log(`Created workflow instance ${wfId} for ${project.code}`);
      } else {
        wfId = wfRes.rows[0].id;
        await client.query(
          "UPDATE workflow_instances SET status = 'ACTIVE', activated_at = COALESCE(activated_at, NOW()), activated_by = COALESCE(activated_by, $1) WHERE id = $2",
          [bossId, wfId]
        );
      }

      // Check / create stages
      const stagesDefs = [
        {
          order: 1,
          name: 'Parcel Verification',
          desc: 'Verify cadastral parcel records against submitted land schedule',
          dept: 'Revenue & Land Records Branch',
          role: 'PROCESSING_OFFICER',
          sla: 7,
          docs: ['Land Schedule', 'Survey Map', 'Khasra/Khatauni'],
          status: 'ACTIVE',
        },
        {
          order: 2,
          name: 'Document Verification',
          desc: 'Verify all submitted legal and project documents',
          dept: 'Revenue Department',
          role: 'PROCESSING_OFFICER',
          sla: 10,
          docs: ['Project Proposal', 'DPR Extract', 'SIA Clearance'],
          status: 'PENDING',
        },
        {
          order: 3,
          name: 'Departmental Scrutiny',
          desc: 'Multi-departmental review and environmental clearance check',
          dept: 'Environment & Forest',
          role: 'PROCESSING_OFFICER',
          sla: 14,
          docs: ['Environmental Clearance', 'Forest Clearance', 'Departmental NOC'],
          status: 'PENDING',
        },
        {
          order: 4,
          name: 'Final Approval',
          desc: 'Final statutory approval and gazette notification preparation',
          dept: 'Revenue Department',
          role: 'PROCESSING_OFFICER',
          sla: 7,
          docs: ['Gazette Draft', 'Final Award', 'Compensation Schedule'],
          status: 'PENDING',
        },
      ];

      const existingStages = await client.query(
        "SELECT id, stage_order, name, status FROM workflow_instance_stages WHERE workflow_id = $1 ORDER BY stage_order",
        [wfId]
      );

      let stage1Id: string;

      if (existingStages.rows.length === 0) {
        for (const s of stagesDefs) {
          const sRes = await client.query(
            `INSERT INTO workflow_instance_stages
             (workflow_id, stage_order, name, description, department, assigned_role, assigned_officer_id, sla_days, is_mandatory, required_documents, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10)
             RETURNING id`,
            [wfId, s.order, s.name, s.desc, s.dept, s.role, officer.id, s.sla, JSON.stringify(s.docs), s.status]
          );
          if (s.order === 1) {
            stage1Id = sRes.rows[0].id;
          }
        }
      } else {
        // Update assigned officer to Ananya Patel for all stages
        await client.query(
          "UPDATE workflow_instance_stages SET assigned_officer_id = $1 WHERE workflow_id = $2",
          [officer.id, wfId]
        );
        // Ensure stage 1 is ACTIVE
        await client.query(
          "UPDATE workflow_instance_stages SET status = 'ACTIVE' WHERE workflow_id = $1 AND stage_order = 1",
          [wfId]
        );
        stage1Id = existingStages.rows.find((s: any) => s.stage_order === 1)?.id || existingStages.rows[0].id;
      }

      // Check if task exists for stage 1
      const taskCheck = await client.query(
        "SELECT id FROM tasks WHERE project_id = $1 AND stage_order = 1",
        [project.id]
      );

      if (taskCheck.rows.length === 0) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        const taskInsert = await client.query(
          `INSERT INTO tasks
           (project_id, workflow_id, stage_id, stage_order, stage_name, assigned_officer_id, department, sla_days, due_date, status, required_documents)
           VALUES ($1, $2, $3, 1, 'Parcel Verification', $4, 'Revenue & Land Records Branch', 7, $5, 'ASSIGNED', $6)
           RETURNING id`,
          [
            project.id,
            wfId,
            stage1Id!,
            officer.id,
            dueDate.toISOString().split('T')[0],
            JSON.stringify(['Land Schedule', 'Survey Map', 'Khasra/Khatauni']),
          ]
        );
        console.log(`Created Task ${taskInsert.rows[0].id} for ${project.code} Stage 1 (Parcel Verification)`);
      } else {
        // Ensure task is assigned to Ananya Patel
        await client.query(
          "UPDATE tasks SET assigned_officer_id = $1, status = 'ASSIGNED' WHERE project_id = $2 AND stage_order = 1",
          [officer.id, project.id]
        );
        console.log(`Updated Task for ${project.code} Stage 1 assigned to ${officer.name}`);
      }
    }

    await client.query('COMMIT');
    console.log('✅ Officer workflow tasks seeded successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding officer tasks:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedOfficerWorkflowsAndTasks();
