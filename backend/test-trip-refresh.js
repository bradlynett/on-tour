const { pool } = require('./config/database');
const tripSuggestionEngine = require('./services/tripSuggestionEngine');

async function testTripRefresh() {
  try {
    console.log('🧪 Testing trip refresh functionality...');
    
    // Get current trips for Brad
    const tripsResult = await pool.query(`
      SELECT ts.id, ts.user_id, ts.event_id, e.name as event_name, e.artist, 
             e.venue_name, e.venue_city, e.venue_state, e.event_date, e.ticket_url,
             e.external_id
      FROM trip_suggestions ts
      JOIN events e ON ts.event_id = e.id
      WHERE ts.user_id = 20
      ORDER BY ts.created_at DESC
      LIMIT 3
    `);
    
    console.log(`Found ${tripsResult.rows.length} trips to test`);
    
    for (const trip of tripsResult.rows) {
      console.log(`\n🔍 Testing trip ${trip.id}: ${trip.event_name}`);
      console.log(`   Date: ${new Date(trip.event_date).toLocaleDateString()}`);
      console.log(`   Venue: ${trip.venue_name}, ${trip.venue_city}, ${trip.venue_state}`);
      
      // Test the refreshTripComponents method directly
      const testSuggestion = {
        id: trip.id,
        userId: trip.user_id,
        eventId: trip.event_id,
        eventName: trip.event_name,
        artist: trip.artist,
        venueName: trip.venue_name,
        venueCity: trip.venue_city,
        venueState: trip.venue_state,
        eventDate: trip.event_date,
        ticketUrl: trip.ticket_url,
        externalId: trip.external_id
      };
      
      try {
        const refreshed = await tripSuggestionEngine.refreshTripComponents(testSuggestion);
        
        if (refreshed && refreshed !== testSuggestion) {
          console.log(`✅ Trip ${trip.id} was refreshed successfully`);
          console.log(`   Components: ${refreshed.components?.length || 0}`);
          
          if (refreshed.components) {
            refreshed.components.forEach(comp => {
              const price = comp.price || comp.enrichedDetails?.price || 'N/A';
              const provider = comp.provider || comp.enrichedDetails?.provider || 'Unknown';
              console.log(`   - ${comp.componentType}: $${price} (${provider})`);
            });
          }
        } else {
          console.log(`⚠️ Trip ${trip.id} was not refreshed (likely past event or no new options)`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to refresh trip ${trip.id}:`, error.message);
      }
    }
    
    console.log('\n🧪 Testing getEnhancedTripSuggestions...');
    
    // Test the full enhanced trip suggestions method
    const enhancedTrips = await tripSuggestionEngine.getEnhancedTripSuggestions(20, 5);
    
    console.log(`✅ Retrieved ${enhancedTrips.length} enhanced trips`);
    
    enhancedTrips.forEach((trip, index) => {
      console.log(`\n📅 Trip ${index + 1}: ${trip.eventName}`);
      console.log(`   Total Cost: $${trip.totalCost || 0}`);
      console.log(`   Service Fee: $${trip.serviceFee || 0}`);
      console.log(`   Components: ${trip.components?.length || 0}`);
      
      if (trip.components) {
        trip.components.forEach(comp => {
          const price = comp.price || comp.enrichedDetails?.price || 'N/A';
          const provider = comp.provider || comp.enrichedDetails?.provider || 'Unknown';
          console.log(`   - ${comp.componentType}: $${price} (${provider})`);
        });
      }
    });
    
    console.log('\n✅ Trip refresh testing complete!');
    
  } catch (error) {
    console.error('❌ Error testing trip refresh:', error);
  } finally {
    await pool.end();
  }
}

testTripRefresh(); 