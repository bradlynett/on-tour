const { pool } = require('./config/database');

async function debugTrips() {
  try {
    console.log('🔍 Debugging trips for user 20...');
    
    // Check if user 20 exists
    const userResult = await pool.query('SELECT id, email FROM users WHERE id = 20');
    console.log('User 20:', userResult.rows[0] || 'Not found');
    
    // Check all trip suggestions
    const allTripsResult = await pool.query(`
      SELECT ts.id, ts.user_id, ts.event_id, e.name as event_name
      FROM trip_suggestions ts
      JOIN events e ON ts.event_id = e.id
      ORDER BY ts.created_at DESC
      LIMIT 10
    `);
    console.log(`\nAll trips (first 10):`, allTripsResult.rows);
    
    // Check trips specifically for user 20
    const userTripsResult = await pool.query(`
      SELECT ts.id, ts.user_id, ts.event_id, e.name as event_name, ts.created_at
      FROM trip_suggestions ts
      JOIN events e ON ts.event_id = e.id
      WHERE ts.user_id = 20
      ORDER BY ts.created_at DESC
    `);
    console.log(`\nTrips for user 20:`, userTripsResult.rows);
    
    // Check trip components
    if (userTripsResult.rows.length > 0) {
      const tripId = userTripsResult.rows[0].id;
      const componentsResult = await pool.query(`
        SELECT component_type, provider, price, details
        FROM trip_components
        WHERE trip_suggestion_id = $1
      `, [tripId]);
      console.log(`\nComponents for trip ${tripId}:`, componentsResult.rows);
    }
    
  } catch (error) {
    console.error('❌ Error debugging trips:', error);
  } finally {
    await pool.end();
  }
}

debugTrips(); 