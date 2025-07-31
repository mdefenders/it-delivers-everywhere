const request = require('supertest');
const app = require('../../server');

describe('GET /health', () => {
  it('should return 200 and correct text', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.text).toContain('\"status\":\"ok\",\"version\":');
  });
});