const { pool } = require('./config/database');
const tripSuggestionEngine = require('./services/tripSuggestionEngine');

async function updateExistingTrips() {
  try {
    console.log('🔧 Updating existing trip suggestions with real travel components...');
    
    // Get all existing trip suggestions for Brad
    const tripsResult = await pool.query(`
      SELECT ts.id, ts.user_id, ts.event_id, e.name as event_name, e.artist, 
             e.venue_name, e.venue_city, e.venue_state, e.event_date, e.ticket_url,
             e.external_id
      FROM trip_suggestions ts
      JOIN events e ON ts.event_id = e.id
      WHERE ts.user_id = 20
      ORDER BY ts.created_at DESC
    `);
    
    console.log(`Found ${tripsResult.rows.length} existing trips to update`);
    
    for (const trip of tripsResult.rows) {
      console.log(`\n🔄 Updating trip ${trip.id}: ${trip.event_name}`);
      console.log(`   Date: ${new Date(trip.event_date).toLocaleDateString()}`);
      console.log(`   Venue: ${trip.venue_name}, ${trip.venue_city}, ${trip.venue_state}`);
      
      try {
        // Use the existing update logic in createTripSuggestion
        const updatedTrip = await tripSuggestionEngine.createTripSuggestion(
          trip.user_id, 
          trip.event_id, 
          {
            primary_airport: 'DEN', // Denver airport for Brad
            preferred_airlines: ['United', 'Southwest'],
            preferred_hotel_brands: ['Hilton', 'Marriott'],
            rental_car_preference: 'Hertz'
          }
        );
        
        if (updatedTrip) {
          console.log(`✅ Updated trip ${updatedTrip.id} with real components`);
          console.log(`   Total cost: $${updatedTrip.totalCost || 0}`);
          console.log(`   Service fee: $${updatedTrip.serviceFee || 0}`);
          console.log(`   Components: ${updatedTrip.components?.length || 0}`);
          
          if (updatedTrip.components) {
            updatedTrip.components.forEach(comp => {
              const price = comp.price || comp.enrichedDetails?.price || 'N/A';
              const provider = comp.provider || comp.enrichedDetails?.provider || 'Unknown';
              console.log(`   - ${comp.componentType}: $${price} (${provider})`);
            });
          }
        } else {
          console.log(`⚠️ Trip update skipped (likely past event or missing airports)`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to update trip ${trip.id}:`, error.message);
      }
    }
    
    console.log('\n✅ Trip updates complete!');
    
  } catch (error) {
    console.error('❌ Error updating trips:', error);
  } finally {
    await pool.end();
  }
}

updateExistingTrips(); 