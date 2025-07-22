const { pool } = require('./config/database');
const tripSuggestionEngine = require('./services/tripSuggestionEngine');

async function forceGenerateTrips() {
  try {
    console.log('🔧 Force generating trips...');
    
    // First, let's manually create a trip for a future event
    const futureEventResult = await pool.query(`
      SELECT id, name, artist, venue_name, venue_city, venue_state, event_date, external_id
      FROM events 
      WHERE event_date > CURRENT_DATE AND external_id IS NOT NULL
      ORDER BY event_date ASC
      LIMIT 1
    `);
    
    if (futureEventResult.rows.length === 0) {
      console.log('❌ No future events found');
      return;
    }
    
    const event = futureEventResult.rows[0];
    console.log(`\n🎯 Creating trip for: ${event.name}`);
    console.log(`   Artist: ${event.artist}`);
    console.log(`   Venue: ${event.venue_name}, ${event.venue_city}, ${event.venue_state}`);
    console.log(`   Date: ${new Date(event.event_date).toLocaleDateString()}`);
    console.log(`   Ticketmaster ID: ${event.external_id}`);
    
    try {
      // Create trip suggestion manually
      const trip = await tripSuggestionEngine.createTripSuggestion(
        20, // Brad's user ID
        event.id,
        {
          primary_airport: 'DEN', // Denver airport for Brad
          preferred_airlines: ['United', 'Southwest'],
          preferred_hotel_brands: ['Hilton', 'Marriott'],
          rental_car_preference: 'Hertz'
        }
      );
      
      if (trip) {
        console.log(`✅ Created trip ${trip.id} successfully`);
        console.log(`   Total cost: $${trip.totalCost || 0}`);
        console.log(`   Service fee: $${trip.serviceFee || 0}`);
        console.log(`   Components: ${trip.components?.length || 0}`);
        
        if (trip.components) {
          trip.components.forEach(comp => {
            const price = comp.price || comp.enrichedDetails?.price || 'N/A';
            const provider = comp.provider || comp.enrichedDetails?.provider || 'Unknown';
            console.log(`   - ${comp.componentType}: $${price} (${provider})`);
          });
        }
      } else {
        console.log(`❌ Trip creation returned null`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to create trip:`, error.message);
      console.error('Full error:', error);
    }
    
    // Now let's try the trip generation engine
    console.log('\n🎯 Testing trip generation engine...');
    try {
      const trips = await tripSuggestionEngine.generateTripSuggestions(20, 3);
      console.log(`✅ Generated ${trips.length} trips via engine`);
      
      trips.forEach((trip, index) => {
        console.log(`\n📅 Generated Trip ${index + 1}: ${trip.eventName}`);
        console.log(`   Components: ${trip.components?.length || 0}`);
      });
      
    } catch (error) {
      console.error(`❌ Trip generation engine failed:`, error.message);
      console.error('Full error:', error);
    }
    
  } catch (error) {
    console.error('❌ Error in force generate:', error);
  } finally {
    await pool.end();
  }
}

forceGenerateTrips(); 