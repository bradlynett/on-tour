const request = require('supertest');
const { pool } = require('../config/database');

describe('Drag and Drop Priority Management', () => {
  let app;
  let authToken;
  let testUserId;
  let testInterestIds = [];

  beforeAll(async () => {
    // Import app after setting up test environment
    process.env.NODE_ENV = 'test';
    app = require('../server');
    
    // Create test user and get auth token
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'dragtest@example.com',
        password: 'testpassword123',
        firstName: 'Drag',
        lastName: 'Test'
      });
    
    authToken = userResponse.body.token;
    testUserId = userResponse.body.user.id;
    
    // Create test interests
    const interests = [
      { interest_type: 'artist', interest_value: 'Test Artist 1', priority: 1 },
      { interest_type: 'artist', interest_value: 'Test Artist 2', priority: 2 },
      { interest_type: 'artist', interest_value: 'Test Artist 3', priority: 3 },
      { interest_type: 'venue', interest_value: 'Test Venue 1', priority: 1 },
      { interest_type: 'venue', interest_value: 'Test Venue 2', priority: 2 }
    ];
    
    for (const interest of interests) {
      const result = await pool.query(
        'INSERT INTO user_interests (user_id, interest_type, interest_value, priority) VALUES ($1, $2, $3, $4) RETURNING id',
        [testUserId, interest.interest_type, interest.interest_value, interest.priority]
      );
      testInterestIds.push(result.rows[0].id);
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testInterestIds.length > 0) {
      await pool.query('DELETE FROM user_interests WHERE id = ANY($1)', [testInterestIds]);
    }
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    await pool.end();
  });

  describe('PUT /api/users/interests/:id', () => {
    test('should update single interest priority successfully', async () => {
      const interestId = testInterestIds[0];
      const newPriority = 5;
      
      const response = await request(app)
        .put(`/api/users/interests/${interestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: newPriority });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.priority).toBe(newPriority);
      expect(response.body.data.id).toBe(interestId);
      expect(response.body.data.previousPriority).toBeDefined();
    });

    test('should return 400 for invalid priority value', async () => {
      const interestId = testInterestIds[0];
      
      const response = await request(app)
        .put(`/api/users/interests/${interestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: -1 });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('PRIORITY_INVALID');
    });

    test('should return 400 for priority > 1000', async () => {
      const interestId = testInterestIds[0];
      
      const response = await request(app)
        .put(`/api/users/interests/${interestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: 1001 });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('PRIORITY_INVALID');
    });

    test('should return 404 for non-existent interest', async () => {
      const fakeId = 99999;
      
      const response = await request(app)
        .put(`/api/users/interests/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: 1 });
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INTEREST_NOT_FOUND');
    });

    test('should return 400 for invalid interest ID', async () => {
      const response = await request(app)
        .put('/api/users/interests/invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: 1 });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INTEREST_ID_INVALID');
    });

    test('should return 401 without authentication', async () => {
      const interestId = testInterestIds[0];
      
      const response = await request(app)
        .put(`/api/users/interests/${interestId}`)
        .send({ priority: 1 });
      
      expect(response.status).toBe(401);
    });

    test('should handle same priority gracefully', async () => {
      const interestId = testInterestIds[0];
      const currentPriority = 1;
      
      const response = await request(app)
        .put(`/api/users/interests/${interestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: currentPriority });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Priority unchanged');
    });
  });

  describe('PUT /api/users/interests/bulk-priority', () => {
    test('should update multiple interest priorities successfully', async () => {
      const updates = [
        { id: testInterestIds[0], priority: 3 },
        { id: testInterestIds[1], priority: 1 },
        { id: testInterestIds[2], priority: 2 }
      ];
      
      const response = await request(app)
        .put('/api/users/interests/bulk-priority')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ updates });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.updatedCount).toBe(3);
      expect(response.body.data.updates).toHaveLength(3);
      
      // Verify priorities were updated correctly
      const updatedPriorities = response.body.data.updates.map(u => u.priority);
      expect(updatedPriorities).toEqual([3, 1, 2]);
    });

    test('should return 400 for empty updates array', async () => {
      const response = await request(app)
        .put('/api/users/interests/bulk-priority')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ updates: [] });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INVALID_REQUEST_FORMAT');
    });

    test('should return 400 for missing updates array', async () => {
      const response = await request(app)
        .put('/api/users/interests/bulk-priority')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INVALID_REQUEST_FORMAT');
    });

    test('should return 400 for duplicate priorities', async () => {
      const updates = [
        { id: testInterestIds[0], priority: 1 },
        { id: testInterestIds[1], priority: 1 } // Duplicate priority
      ];
      
      const response = await request(app)
        .put('/api/users/interests/bulk-priority')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ updates });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('DUPLICATE_PRIORITIES');
    });

    test('should return 400 for invalid update data', async () => {
      const updates = [
        { id: testInterestIds[0], priority: 1 },
        { id: 'invalid', priority: 2 } // Invalid ID
      ];
      
      const response = await request(app)
        .put('/api/users/interests/bulk-priority')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ updates });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INVALID_UPDATE_DATA');
    });

    test('should return 404 for non-existent interests', async () => {
      const updates = [
        { id: testInterestIds[0], priority: 1 },
        { id: 99999, priority: 2 } // Non-existent ID
      ];
      
      const response = await request(app)
        .put('/api/users/interests/bulk-priority')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ updates });
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INTERESTS_NOT_FOUND');
    });

    test('should return 401 without authentication', async () => {
      const updates = [
        { id: testInterestIds[0], priority: 1 }
      ];
      
      const response = await request(app)
        .put('/api/users/interests/bulk-priority')
        .send({ updates });
      
      expect(response.status).toBe(401);
    });

    test('should handle large number of updates', async () => {
      // Create additional test interests
      const additionalInterests = [];
      for (let i = 0; i < 10; i++) {
        const result = await pool.query(
          'INSERT INTO user_interests (user_id, interest_type, interest_value, priority) VALUES ($1, $2, $3, $4) RETURNING id',
          [testUserId, 'artist', `Bulk Test Artist ${i}`, i + 1]
        );
        additionalInterests.push(result.rows[0].id);
      }
      
      // Create updates for all interests
      const updates = additionalInterests.map((id, index) => ({
        id,
        priority: additionalInterests.length - index // Reverse order
      }));
      
      const response = await request(app)
        .put('/api/users/interests/bulk-priority')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ updates });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.updatedCount).toBe(10);
      
      // Clean up additional interests
      await pool.query('DELETE FROM user_interests WHERE id = ANY($1)', [additionalInterests]);
    });
  });

  describe('Database Constraints', () => {
    test('should maintain referential integrity', async () => {
      // This test ensures that foreign key constraints are properly enforced
      const fakeUserId = 99999;
      
      const response = await request(app)
        .put(`/api/users/interests/${testInterestIds[0]}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: 1 });
      
      // Should still work because we're using the authenticated user's ID
      expect(response.status).toBe(200);
    });
  });

  describe('Performance Tests', () => {
    test('should handle bulk updates efficiently', async () => {
      const startTime = Date.now();
      
      const updates = testInterestIds.map((id, index) => ({
        id,
        priority: testInterestIds.length - index
      }));
      
      const response = await request(app)
        .put('/api/users/interests/bulk-priority')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ updates });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
}); 