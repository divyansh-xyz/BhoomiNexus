import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { pool } from '../../../config/db';

describe('Projects API Integration Tests', () => {
  let token: string;
  let projectId: string;

  beforeAll(async () => {
    // Authenticate as a seeded REQUESTING_AUTHORITY user to get a token
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'requestor@bhoomi.gov.in',
        password: 'Demo@123',
      });
      
    token = res.body.data?.token;
    if (!token) {
      throw new Error('Failed to get authentication token for tests');
    }
  });

  afterAll(async () => {
    // Clean up any test projects that might have been created
    if (projectId) {
      await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
    }
    await pool.end();
  });

  it('should fetch all projects', async () => {
    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Should have seeded projects
    expect(res.body.length).toBeGreaterThan(0); 
  });

  it('should create a new project', async () => {
    const payload = {
      title: 'Test Integration Project',
      type: 'HIGHWAY_CORRIDOR',
      state: 'Maharashtra',
      district: 'Pune',
      areaAcres: 100,
      budget: 500,
      description: 'A project created by automated tests',
      purpose: 'Public Purpose',
      ministry: 'Test Ministry',
      authority: 'Test Authority'
    };

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe(payload.title);
    expect(res.body.status).toBe('DRAFT');

    projectId = res.body.id;
  });

  it('should fetch the created project by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(projectId);
    expect(res.body.title).toBe('Test Integration Project');
  });

  it('should update the project details', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        budget: 600,
        description: 'Updated description'
      });

    expect(res.status).toBe(200);
    expect(res.body.budget).toBe('600.00'); // Numeric types often come back as strings in pg
    expect(res.body.description).toBe('Updated description');
  });

  it('should submit the project', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/submit`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('NEW_REQUEST');
  });

  it('should fail to submit a project that is already submitted', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/submit`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('not in DRAFT status');
  });
});
