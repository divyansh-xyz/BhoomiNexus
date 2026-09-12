import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';

describe('Officer Review & Verification API', () => {
  it('should process officer verification action', async () => {
    const res = await request(app)
      .post('/api/v1/documents/doc-123/verify')
      .send({
        action: 'APPROVED',
        notes: 'Verified against land revenue register',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'APPROVED');
  });

  it('should process document rejection action', async () => {
    const res = await request(app)
      .post('/api/v1/documents/doc-123/reject')
      .send({
        notes: 'Unclear stamp paper image',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'REJECTED');
  });
});
