const { pool } = require('./config/database');
const tripSuggestionEngine = require('./services/tripSuggestionEngine');

async function regenerateRealTrips() {
  try {
    console.log('🔧 Regenerating trip suggestions with real API data...');
    
    // Get all trip suggestions for Brad
    const tripsResult = await pool.query(`
      SELECT ts.id, ts.user_id, ts.event_id, e.name as event_name, e.artist, 
             e.venue_name, e.venue_city, e.venue_state, e.event_date, e.ticket_url,
             e.external_id
      FROM trip_suggestions ts
      JOIN events e ON ts.event_id = e.id
      WHERE ts.user_id = 20
      ORDER BY ts.created_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${tripsResult.rows.length} trips to regenerate`);
    
    for (const trip of tripsResult.rows) {
      console.log(`\n🔄 Regenerating trip ${trip.id}: ${trip.event_name}`);
      
      try {
        // Delete the old trip suggestion (this will cascade delete components)
        await pool.query('DELETE FROM trip_suggestions WHERE id = $1', [trip.id]);
        
        // Create new trip suggestion with real API data
        const newTrip = await tripSuggestionEngine.createTripSuggestion(
          trip.user_id, 
          trip.event_id, 
          {
            primary_airport: 'DEN', // Denver airport for Brad
            preferred_airlines: ['United', 'Southwest'],
            preferred_hotel_brands: ['Hilton', 'Marriott'],
            rental_car_preference: 'Hertz'
          }
        );
        
        console.log(`✅ Regenerated trip ${newTrip.id} with real components`);
        console.log(`   Components: ${newTrip.components?.length || 0}`);
        
        if (newTrip.components) {
          newTrip.components.forEach(comp => {
            console.log(`   - ${comp.componentType}: $${comp.price} (${comp.provider})`);
          });
        }
        
      } catch (error) {
        console.error(`❌ Failed to regenerate trip ${trip.id}:`, error.message);
      }
    }
    
    console.log('\n✅ Trip regeneration complete!');
    
  } catch (error) {
    console.error('❌ Error regenerating trips:', error);
  } finally {
    await pool.end();
  }
}

regenerateRealTrips(); 