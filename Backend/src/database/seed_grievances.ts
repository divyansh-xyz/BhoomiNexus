import { pool } from '../config/db';

export async function seedGrievancesData() {
  const mhProj = await pool.query("SELECT id FROM projects WHERE code = 'PRJ-MH-4421'");
  const dlProj = await pool.query("SELECT id FROM projects WHERE code = 'PRJ-DL-7701'");

  if (mhProj.rows.length === 0 && dlProj.rows.length === 0) {
    console.log('No projects found to seed grievances.');
    return;
  }

  // Clear existing grievances
  await pool.query('DELETE FROM grievances');

  const items = [];

  if (mhProj.rows.length > 0) {
    const mhId = mhProj.rows[0].id;
    items.push(
      {
        projectId: mhId,
        ref: 'GRV-2026-MH4421-01',
        source: 'WHATSAPP',
        phone: '919822014421',
        name: 'Kisan Ramchandra Patil',
        citizenRef: 'Village Khalapur, Survey No. 117/2',
        survey: 'SV-117',
        type: 'COMPENSATION_VALUATION',
        subject: 'Objection to Circle Rate valuation for irrigated agricultural land',
        desc: 'Land parcel SV-117 currently assessed under dry-crop circle rates despite having perennial borewell irrigation since 2018. Requesting re-assessment under irrigated agricultural slab per RFCTLARR First Schedule.',
        status: 'UNDER_REVIEW',
        slaDays: 15,
        createdAt: new Date(Date.now() - 2 * 86400000),
        notes: 'Collectorate revenue inquiry notice issued to District Agriculture Officer for soil & irrigation certification.'
      },
      {
        projectId: mhId,
        ref: 'GRV-2026-MH4421-02',
        source: 'WHATSAPP',
        phone: '919822045532',
        name: 'Sunita Dnyaneshwar More',
        citizenRef: 'Khopoli Ward 4, Gat No. 45',
        survey: 'SV-134',
        type: 'BOUNDARY_DISPUTE',
        subject: 'Cadastral boundary demarcation overlap with ancestral residential plot',
        desc: 'Acquisition buffer demarcation encroaches approximately 3.2 meters into ancestral residential structure. Requesting joint ground DGPS verification with Revenue Circle Inspector.',
        status: 'OPEN',
        slaDays: 15,
        createdAt: new Date(Date.now() - 4 * 86400000),
        notes: null
      },
      {
        projectId: mhId,
        ref: 'GRV-2026-MH4421-03',
        source: 'PORTAL',
        phone: '919822088765',
        name: 'Babanrao Tukaram Deshmukh',
        citizenRef: 'Village Urse, Survey No. 89',
        survey: 'SV-168',
        type: 'REHABILITATION_RESETTLEMENT',
        subject: 'Inclusion in Second Schedule Resettlement Entitlement Register',
        desc: 'Representing agricultural tenancy workers dependent on parcel SV-168 for livelihood over 12 consecutive years. Entitlement under Section 3(c) livelihood loss claimed.',
        status: 'RESOLVED',
        slaDays: 15,
        createdAt: new Date(Date.now() - 10 * 86400000),
        resolvedAt: new Date(Date.now() - 1 * 86400000),
        notes: 'Joint verification completed by SLAO. Tenancy documentation confirmed. Beneficiary added to preliminary R&R entitlement matrix approved by Collector.'
      }
    );
  }

  if (dlProj.rows.length > 0) {
    const dlId = dlProj.rows[0].id;
    items.push(
      {
        projectId: dlId,
        ref: 'GRV-2026-DL7701-01',
        source: 'WHATSAPP',
        phone: '919811099234',
        name: 'Rajesh Sharma & Family',
        citizenRef: 'Rithala Village, Khasra 101/A',
        survey: 'SV-101/A',
        type: 'COMPENSATION_VALUATION',
        subject: 'Request for structural valuation of commercial shop on alignment',
        desc: 'Registered shop on plot 101/A not included in commercial compensation category. Seeking appointment with SLAO valuation panel.',
        status: 'OPEN',
        slaDays: 15,
        createdAt: new Date(Date.now() - 1 * 86400000),
        notes: null
      },
      {
        projectId: dlId,
        ref: 'GRV-2026-DL7701-02',
        source: 'WHATSAPP',
        phone: '919811044819',
        name: 'Harish Chandra Gupta',
        citizenRef: 'Rohini Sector 28, Survey 102/B',
        survey: 'SV-102/B',
        type: 'TITLE_OWNERSHIP',
        subject: 'Mutation record discrepancy in Khatauni',
        desc: 'Joint ownership partition deed dated 2019 was submitted to Tehsildar but online Khatauni still displays undivided ancestral title.',
        status: 'UNDER_REVIEW',
        slaDays: 15,
        createdAt: new Date(Date.now() - 3 * 86400000),
        notes: 'Tehsil revenue records requisitioned by Competent Authority.'
      }
    );
  }

  for (const g of items) {
    await pool.query(
      `INSERT INTO grievances 
       (reference_number, project_id, source, citizen_name, citizen_phone, citizen_reference, survey_number, grievance_type, subject, description, status, sla_days, created_at, resolved_at, resolution_notes, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        g.ref,
        g.projectId,
        g.source,
        g.name,
        g.phone,
        g.citizenRef,
        g.survey,
        g.type,
        g.subject,
        g.desc,
        g.status,
        g.slaDays,
        g.createdAt,
        g.resolvedAt || null,
        g.notes,
        JSON.stringify({ channel: g.source === 'WHATSAPP' ? 'META_WHATSAPP_CLOUD_API' : 'PORTAL_DIRECT' })
      ]
    );
  }
  console.log(`✓ Seeded ${items.length} grievances across active projects (including WhatsApp channel intakes)!`);
}

if (require.main === module) {
  seedGrievancesData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
