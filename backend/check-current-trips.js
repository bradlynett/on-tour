const { pool } = require('./config/database');

async function checkCurrentTrips() {
  try {
    console.log('🔍 Checking current trips in database...');
    
    // Check all trips for Brad
    const tripsResult = await pool.query(`
      SELECT ts.id, ts.user_id, ts.event_id, ts.total_cost, ts.service_fee, ts.created_at,
             e.name as event_name, e.artist, e.venue_name, e.venue_city, e.venue_state, 
             e.event_date, e.external_id
      FROM trip_suggestions ts
      JOIN events e ON ts.event_id = e.id
      WHERE ts.user_id = 20
      ORDER BY ts.created_at DESC
    `);
    
    console.log(`Found ${tripsResult.rows.length} trips for Brad:`);
    
    tripsResult.rows.forEach((trip, index) => {
      console.log(`\n📅 Trip ${index + 1}: ${trip.event_name}`);
      console.log(`   ID: ${trip.id}`);
      console.log(`   Artist: ${trip.artist}`);
      console.log(`   Venue: ${trip.venue_name}, ${trip.venue_city}, ${trip.venue_state}`);
      console.log(`   Date: ${new Date(trip.event_date).toLocaleDateString()}`);
      console.log(`   Is Future: ${new Date(trip.event_date) > new Date()}`);
      console.log(`   Total Cost: $${trip.total_cost || 0}`);
      console.log(`   Service Fee: $${trip.service_fee || 0}`);
      console.log(`   Created: ${new Date(trip.created_at).toLocaleString()}`);
      console.log(`   Ticketmaster ID: ${trip.external_id || 'None'}`);
    });
    
    // Check components for each trip
    for (const trip of tripsResult.rows) {
      const componentsResult = await pool.query(`
        SELECT component_type, provider, price, details
        FROM trip_components
        WHERE trip_suggestion_id = $1
        ORDER BY component_type
      `, [trip.id]);
      
      console.log(`\n🔧 Components for Trip ${trip.id}:`);
      if (componentsResult.rows.length === 0) {
        console.log('   No components found');
      } else {
        componentsResult.rows.forEach(comp => {
          const price = comp.price || 'N/A';
          console.log(`   - ${comp.component_type}: $${price} (${comp.provider})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking trips:', error);
  } finally {
    await pool.end();
  }
}

checkCurrentTrips(); 