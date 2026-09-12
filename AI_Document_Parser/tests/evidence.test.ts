import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';

describe('Phase 10 Hard-Copy Evidence API', () => {
  it('should upload physical evidence record', async () => {
    const res = await request(app)
      .post('/api/v1/documents/doc-123/evidence')
      .field('evidence_type', 'HARD_COPY_SCAN')
      .field('description', 'Physical deed scan page 1')
      .attach('file', Buffer.from('Scan content'), 'evidence_scan.jpg');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('evidence_type', 'HARD_COPY_SCAN');
  });

  it('should check Phase 10 definition of done verification status', async () => {
    const res = await request(app).get('/api/v1/documents/doc-123/verification');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('is_definition_of_done_satisfied');
  });
});
