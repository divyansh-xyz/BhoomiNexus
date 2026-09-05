import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';

describe('Document Upload API', () => {
  it('should return 400 when no file is provided', async () => {
    const res = await request(app).post('/api/v1/documents/upload');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should upload a text/plain or mock document successfully', async () => {
    const res = await request(app)
      .post('/api/v1/documents/upload')
      .attach('file', Buffer.from('DEED OF ABSOLUTE SALE. Survey No: 123/A, Village: Whitefield.'), 'sale_deed.txt');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('document_id');
    expect(res.body.status).toBe('PENDING');
  });
});
