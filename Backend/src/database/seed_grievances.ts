import { pool } from '../config/db';

export async function seedGrievancesData() {
  const mhProj = await pool.query("SELECT id FROM projects WHERE code = 'PRJ-MH-4421'");
  if (mhProj.rows.length === 0) return;
  const projId = mhProj.rows[0].id;

  await pool.query('DELETE FROM grievances WHERE project_id = $1', [projId]);

  const items = [
    {
      ref: 'GRV-2026-MH-4421-01',
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
      ref: 'GRV-2026-MH-4421-02',
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
      ref: 'GRV-2026-MH-4421-03',
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
  ];

  for (const g of items) {
    await pool.query(
      `INSERT INTO grievances 
       (reference_number, project_id, citizen_name, citizen_reference, survey_number, grievance_type, subject, description, status, sla_days, created_at, resolved_at, resolution_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [g.ref, projId, g.name, g.citizenRef, g.survey, g.type, g.subject, g.desc, g.status, g.slaDays, g.createdAt, g.resolvedAt || null, g.notes]
    );
  }
  console.log(`Seeded ${items.length} grievances for PRJ-MH-4421`);
}

if (require.main === module) {
  seedGrievancesData().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
