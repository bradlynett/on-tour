const { pool } = require('./config/database');
const tripSuggestionEngine = require('./services/tripSuggestionEngine');

async function createWorkingTrip() {
  try {
    console.log('🔧 Creating trip for an event that should work with flights...');
    
    // Find an event that's far enough in the future for flights
    const workingEventResult = await pool.query(`
      SELECT id, name, artist, venue_name, venue_city, venue_state, event_date, external_id
      FROM events 
      WHERE event_date > (CURRENT_DATE + INTERVAL '2 days') AND external_id IS NOT NULL
      ORDER BY event_date ASC
      LIMIT 1
    `);
    
    if (workingEventResult.rows.length === 0) {
      console.log('❌ No events found that are far enough in the future');
      return;
    }
    
    const event = workingEventResult.rows[0];
    console.log(`\n🎯 Creating trip for: ${event.name}`);
    console.log(`   Artist: ${event.artist}`);
    console.log(`   Venue: ${event.venue_name}, ${event.venue_city}, ${event.venue_state}`);
    console.log(`   Date: ${new Date(event.event_date).toLocaleDateString()}`);
    console.log(`   Ticketmaster ID: ${event.external_id}`);
    
    // Calculate flight dates to verify they're in the future
    const eventDate = new Date(event.event_date);
    const departureDate = new Date(eventDate);
    departureDate.setDate(eventDate.getDate() - 1);
    
    console.log(`   Flight departure: ${departureDate.toLocaleDateString()} (${departureDate > new Date() ? 'FUTURE' : 'PAST'})`);
    
    try {
      // Create trip suggestion
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
    }
    
  } catch (error) {
    console.error('❌ Error creating working trip:', error);
  } finally {
    await pool.end();
  }
}

createWorkingTrip(); 