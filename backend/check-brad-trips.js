const { pool } = require('./config/database');

async function checkBradTrips() {
  try {
    console.log('🔍 Checking trips for Brad...');
    
    // First, find Brad's user ID
    const userResult = await pool.query(`
      SELECT id, email, first_name, last_name
      FROM users 
      WHERE email = 'brad@lynett.com'
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Brad not found in users table');
      return;
    }
    
    const brad = userResult.rows[0];
    console.log(`✅ Found Brad: ID ${brad.id}, ${brad.email}`);
    
    // Check all trips for Brad
    const tripsResult = await pool.query(`
      SELECT ts.id, ts.user_id, ts.event_id, e.name as event_name, e.artist, 
             e.venue_name, e.venue_city, e.venue_state, e.event_date, e.ticket_url,
             e.external_id, ts.total_cost, ts.service_fee
      FROM trip_suggestions ts
      JOIN events e ON ts.event_id = e.id
      WHERE ts.user_id = $1
      ORDER BY ts.created_at DESC
    `, [brad.id]);
    
    console.log(`\nFound ${tripsResult.rows.length} trips for Brad:`);
    
    tripsResult.rows.forEach(trip => {
      console.log(`\n📅 Trip ${trip.id}: ${trip.event_name}`);
      console.log(`   Artist: ${trip.artist}`);
      console.log(`   Venue: ${trip.venue_name}, ${trip.venue_city}, ${trip.venue_state}`);
      console.log(`   Date: ${new Date(trip.event_date).toLocaleDateString()}`);
      console.log(`   Total Cost: $${trip.total_cost || 0}`);
      console.log(`   Service Fee: $${trip.service_fee || 0}`);
      console.log(`   Ticketmaster ID: ${trip.external_id || 'None'}`);
    });
    
    // Check trip components
    if (tripsResult.rows.length > 0) {
      console.log('\n🔍 Checking trip components...');
      for (const trip of tripsResult.rows) {
        const componentsResult = await pool.query(`
          SELECT component_type, provider, price, details
          FROM trip_components
          WHERE trip_suggestion_id = $1
          ORDER BY component_type
        `, [trip.id]);
        
        console.log(`\n   Trip ${trip.id} components: ${componentsResult.rows.length}`);
        componentsResult.rows.forEach(comp => {
          console.log(`   - ${comp.component_type}: $${comp.price} (${comp.provider})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking Brad trips:', error);
  } finally {
    await pool.end();
  }
}

checkBradTrips(); 