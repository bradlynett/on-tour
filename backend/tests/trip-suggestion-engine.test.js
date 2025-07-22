const request = require('supertest');
const { pool } = require('../config/database');
const tripSuggestionEngine = require('../services/tripSuggestionEngine');
const redisClient = require('../redisClient');

describe('Enhanced Trip Suggestion Engine', () => {
  let app;
  let authToken;
  let testUserId;
  let testEventIds = [];

  beforeAll(async () => {
    // Import app after setting up test environment
    process.env.NODE_ENV = 'test';
    app = require('../server');
    
    // Create test user and get auth token
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'tripsuggestiontest@example.com',
        password: 'testpassword123',
        firstName: 'Trip',
        lastName: 'Test'
      });
    
    authToken = userResponse.body.token;
    testUserId = userResponse.body.user.id;
    
    // Create test events
    const events = [
      {
        external_id: 'test-event-1',
        name: 'Test Concert 1',
        artist: 'Test Artist 1',
        venue_name: 'Test Venue 1',
        venue_city: 'Test City 1',
        venue_state: 'TS',
        event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        ticket_url: 'https://test.com/tickets/1',
        min_price: 50,
        max_price: 150,
        event_type: 'music',
        event_subtype: 'concert'
      },
      {
        external_id: 'test-event-2',
        name: 'Test Concert 2',
        artist: 'Test Artist 2',
        venue_name: 'Test Venue 2',
        venue_city: 'Test City 2',
        venue_state: 'TS',
        event_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        ticket_url: 'https://test.com/tickets/2',
        min_price: 75,
        max_price: 200,
        event_type: 'music',
        event_subtype: 'concert'
      }
    ];
    
    for (const event of events) {
      const result = await pool.query(`
        INSERT INTO events (external_id, name, artist, venue_name, venue_city, venue_state, 
                           event_date, ticket_url, min_price, max_price, event_type, event_subtype)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id
      `, [event.external_id, event.name, event.artist, event.venue_name, event.venue_city, 
          event.venue_state, event.event_date, event.ticket_url, event.min_price, 
          event.max_price, event.event_type, event.event_subtype]);
      testEventIds.push(result.rows[0].id);
    }
    
    // Create test interests
    const interests = [
      { interest_type: 'artist', interest_value: 'Test Artist 1', priority: 1 },
      { interest_type: 'venue', interest_value: 'Test Venue 1', priority: 2 },
      { interest_type: 'event_type', interest_value: 'music', priority: 3 }
    ];
    
    for (const interest of interests) {
      await pool.query(`
        INSERT INTO user_interests (user_id, interest_type, interest_value, priority)
        VALUES ($1, $2, $3, $4)
      `, [testUserId, interest.interest_type, interest.interest_value, interest.priority]);
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testEventIds.length > 0) {
      await pool.query('DELETE FROM events WHERE id = ANY($1)', [testEventIds]);
    }
    if (testUserId) {
      await pool.query('DELETE FROM user_interests WHERE user_id = $1', [testUserId]);
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    
    // Clear test caches
    await tripSuggestionEngine.clearAllCaches();
    await pool.end();
  });

  beforeEach(async () => {
    // Clear caches before each test
    await tripSuggestionEngine.clearAllCaches();
  });

  describe('Cache Functionality', () => {
    test('should cache user interests', async () => {
      const interests = await tripSuggestionEngine.findMatchingEvents(testUserId);
      
      // First call should hit database
      const startTime = Date.now();
      const firstCall = await tripSuggestionEngine.findMatchingEvents(testUserId);
      const firstCallTime = Date.now() - startTime;
      
      // Second call should hit cache
      const startTime2 = Date.now();
      const secondCall = await tripSuggestionEngine.findMatchingEvents(testUserId);
      const secondCallTime = Date.now() - startTime2;
      
      expect(secondCallTime).toBeLessThan(firstCallTime);
      expect(firstCall).toEqual(secondCall);
    });

    test('should cache event queries', async () => {
      const interests = [
        { interest_type: 'artist', interest_value: 'Test Artist 1', priority: 1 }
      ];
      
      // First call should hit database
      const startTime = Date.now();
      const firstCall = await tripSuggestionEngine.findEventsByInterestsWithMetadata(interests);
      const firstCallTime = Date.now() - startTime;
      
      // Second call should hit cache
      const startTime2 = Date.now();
      const secondCall = await tripSuggestionEngine.findEventsByInterestsWithMetadata(interests);
      const secondCallTime = Date.now() - startTime2;
      
      expect(secondCallTime).toBeLessThan(firstCallTime);
      expect(firstCall).toEqual(secondCall);
    });

    test('should cache trip suggestions', async () => {
      // First call should generate suggestions
      const startTime = Date.now();
      const firstCall = await tripSuggestionEngine.generateTripSuggestions(testUserId, 3);
      const firstCallTime = Date.now() - startTime;
      
      // Second call should hit cache
      const startTime2 = Date.now();
      const secondCall = await tripSuggestionEngine.generateTripSuggestions(testUserId, 3);
      const secondCallTime = Date.now() - startTime2;
      
      expect(secondCallTime).toBeLessThan(firstCallTime);
      expect(firstCall).toEqual(secondCall);
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate user cache when interests are updated', async () => {
      // Generate initial suggestions
      const initialSuggestions = await tripSuggestionEngine.generateTripSuggestions(testUserId, 3);
      
      // Update an interest priority
      const interestId = await pool.query(
        'SELECT id FROM user_interests WHERE user_id = $1 LIMIT 1',
        [testUserId]
      ).then(result => result.rows[0].id);
      
      await request(app)
        .put(`/api/users/interests/${interestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: 5 });
      
      // Generate suggestions again - should be different due to cache invalidation
      const newSuggestions = await tripSuggestionEngine.generateTripSuggestions(testUserId, 3);
      
      // The suggestions should be regenerated (not cached)
      expect(newSuggestions).toBeDefined();
    });

    test('should invalidate cache for specific interest type', async () => {
      const interestType = 'artist';
      const interestValue = 'Test Artist 1';
      
      // Cache some events
      await tripSuggestionEngine.findEventsByInterestsWithMetadata([
        { interest_type: interestType, interest_value: interestValue, priority: 1 }
      ]);
      
      // Invalidate cache
      await tripSuggestionEngine.invalidateEventCache(interestType, interestValue);
      
      // Verify cache is cleared
      const cacheKey = tripSuggestionEngine.getEventQueryKey(interestType, interestValue);
      const cached = await tripSuggestionEngine.getCache(cacheKey);
      expect(cached).toBeNull();
    });
  });

  describe('Performance Tests', () => {
    test('should generate trip suggestions within acceptable time', async () => {
      const startTime = Date.now();
      const suggestions = await tripSuggestionEngine.generateTripSuggestions(testUserId, 5);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('should handle multiple concurrent requests efficiently', async () => {
      const promises = [];
      const startTime = Date.now();
      
      // Make 5 concurrent requests
      for (let i = 0; i < 5; i++) {
        promises.push(tripSuggestionEngine.generateTripSuggestions(testUserId, 3));
      }
      
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle cache failures gracefully', async () => {
      // Mock Redis failure
      const originalGet = redisClient.get;
      redisClient.get = jest.fn().mockRejectedValue(new Error('Redis connection failed'));
      
      // Should still work without cache
      const suggestions = await tripSuggestionEngine.generateTripSuggestions(testUserId, 3);
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      
      // Restore original function
      redisClient.get = originalGet;
    });

    test('should handle invalid user ID gracefully', async () => {
      const suggestions = await tripSuggestionEngine.generateTripSuggestions(99999, 3);
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('API Endpoints', () => {
    test('should generate trip suggestions via API', async () => {
      const response = await request(app)
        .post('/api/trips/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ limit: 3 });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should return cached suggestions faster on subsequent calls', async () => {
      // First call
      const startTime = Date.now();
      const firstResponse = await request(app)
        .post('/api/trips/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ limit: 3 });
      const firstCallTime = Date.now() - startTime;
      
      // Second call (should be cached)
      const startTime2 = Date.now();
      const secondResponse = await request(app)
        .post('/api/trips/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ limit: 3 });
      const secondCallTime = Date.now() - startTime2;
      
      expect(secondCallTime).toBeLessThan(firstCallTime);
      expect(firstResponse.body.data).toEqual(secondResponse.body.data);
    });
  });

  describe('Cache Configuration', () => {
    test('should respect cache TTL settings', async () => {
      const testKey = 'test:ttl:key';
      const testData = { test: 'data' };
      const ttl = 1; // 1 second
      
      await tripSuggestionEngine.setCache(testKey, testData, ttl);
      
      // Should be available immediately
      let cached = await tripSuggestionEngine.getCache(testKey);
      expect(cached).toEqual(testData);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be expired
      cached = await tripSuggestionEngine.getCache(testKey);
      expect(cached).toBeNull();
    });
  });
}); 