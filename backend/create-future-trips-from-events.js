const { pool } = require('./config/database');
const tripSuggestionEngine = require('./services/tripSuggestionEngine');

async function createFutureTripsFromEvents() {
  try {
    console.log('🔧 Creating trips for future events...');
    
    // Find future events with Ticketmaster IDs
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
    
    if (eventsResult.rows.length === 0) {
      console.log('❌ No future events found. Creating trips for events in the next 60 days...');
      
      // Try a broader search
      const broaderDate = new Date();
      broaderDate.setDate(broaderDate.getDate() + 60);
      
      const broaderEventsResult = await pool.query(`
        SELECT id, name, artist, venue_name, venue_city, venue_state, event_date, external_id
        FROM events 
        WHERE event_date > $1 AND external_id IS NOT NULL
        ORDER BY event_date ASC
        LIMIT 5
      `, [broaderDate.toISOString()]);
      
      if (broaderEventsResult.rows.length === 0) {
        console.log('❌ No future events found even with broader search.');
        return;
      }
      
      eventsResult.rows = broaderEventsResult.rows;
    }
    
    // Display found events
    eventsResult.rows.forEach((event, index) => {
      console.log(`\n📅 Event ${index + 1}: ${event.name}`);
      console.log(`   Artist: ${event.artist}`);
      console.log(`   Venue: ${event.venue_name}, ${event.venue_city}, ${event.venue_state}`);
      console.log(`   Date: ${new Date(event.event_date).toLocaleDateString()}`);
      console.log(`   Ticketmaster ID: ${event.external_id}`);
    });
    
    // Create trips for these events
    console.log('\n🎯 Creating trips for future events...');
    
    for (const event of eventsResult.rows) {
      console.log(`\n🔄 Creating trip for: ${event.name}`);
      
      try {
        // Use the existing createTripSuggestion method
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
        } else {
          console.log(`⚠️ Trip creation skipped (likely missing airports)`);
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

createFutureTripsFromEvents(); 