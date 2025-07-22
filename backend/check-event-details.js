const { pool } = require('./config/database');

async function checkEventDetails() {
  try {
    console.log('🔍 Checking event details for trip 380...');
    
    const eventResult = await pool.query(`
      SELECT id, name, artist, venue_name, venue_city, venue_state, event_date, external_id
      FROM events 
      WHERE id = 553
    `);
    
    if (eventResult.rows.length > 0) {
      const event = eventResult.rows[0];
      console.log('Event details:', event);
      console.log('Event date:', new Date(event.event_date).toLocaleDateString());
      console.log('Is in the past:', new Date(event.event_date) < new Date());
    }
    
  } catch (error) {
    console.error('❌ Error checking event details:', error);
  } finally {
    await pool.end();
  }
}

checkEventDetails(); 