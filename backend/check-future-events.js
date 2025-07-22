const { pool } = require('./config/database');

async function checkFutureEvents() {
  try {
    console.log('🔍 Checking for future events...');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days from now
    
    const eventsResult = await pool.query(`
      SELECT id, name, artist, venue_name, venue_city, venue_state, event_date, external_id
      FROM events 
      WHERE event_date > $1
      ORDER BY event_date ASC
      LIMIT 10
    `, [futureDate.toISOString()]);
    
    console.log(`Found ${eventsResult.rows.length} future events:`);
    
    eventsResult.rows.forEach(event => {
      console.log(`\n📅 ${event.name}`);
      console.log(`   Artist: ${event.artist}`);
      console.log(`   Venue: ${event.venue_name}, ${event.venue_city}, ${event.venue_state}`);
      console.log(`   Date: ${new Date(event.event_date).toLocaleDateString()}`);
      console.log(`   Ticketmaster ID: ${event.external_id || 'None'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking future events:', error);
  } finally {
    await pool.end();
  }
}

checkFutureEvents(); 