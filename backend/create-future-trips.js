const { pool } = require('./config/database');
const tripSuggestionEngine = require('./services/tripSuggestionEngine');

async function createFutureTrips() {
  try {
    console.log('🔧 Creating real trip suggestions for future events...');
    
    // Get future events
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days from now
    
    const eventsResult = await pool.query(`
      SELECT id, name, artist, venue_name, venue_city, venue_state, event_date, external_id
      FROM events 
      WHERE event_date > $1 AND external_id IS NOT NULL
      ORDER BY event_date ASC
      LIMIT 5
    `, [futureDate.toISOString()]);
    
    console.log(`Found ${eventsResult.rows.length} future events with Ticketmaster IDs`);
    
    // Clear existing trip suggestions for Brad
    await pool.query('DELETE FROM trip_suggestions WHERE user_id = 20');
    
    for (const event of eventsResult.rows) {
      console.log(`\n🎯 Creating trip for: ${event.name}`);
      console.log(`   Date: ${new Date(event.event_date).toLocaleDateString()}`);
      console.log(`   Venue: ${event.venue_name}, ${event.venue_city}, ${event.venue_state}`);
      
      try {
        // Create trip suggestion with real API data
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
        
        console.log(`✅ Created trip ${trip.id} with real components`);
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
        
      } catch (error) {
        console.error(`❌ Failed to create trip for ${event.name}:`, error.message);
      }
    }
    
    console.log('\n✅ Future trip creation complete!');
    
  } catch (error) {
    console.error('❌ Error creating future trips:', error);
  } finally {
    await pool.end();
  }
}

createFutureTrips(); 