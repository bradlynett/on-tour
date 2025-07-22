const { pool } = require('./config/database');
const tripSuggestionEngine = require('./services/tripSuggestionEngine');

async function debugTripSaving() {
  try {
    console.log('🔧 Debugging trip saving process...');
    
    // Check current database state
    const initialTripsResult = await pool.query('SELECT COUNT(*) as total FROM trip_suggestions');
    console.log(`Initial trips in database: ${initialTripsResult.rows[0].total}`);
    
    // Find a future event
    const futureEventResult = await pool.query(`
      SELECT id, name, artist, venue_name, venue_city, venue_state, event_date, external_id
      FROM events 
      WHERE event_date > (CURRENT_DATE + INTERVAL '3 days') AND external_id IS NOT NULL
      ORDER BY event_date ASC
      LIMIT 1
    `);
    
    if (futureEventResult.rows.length === 0) {
      console.log('❌ No future events found');
      return;
    }
    
    let event = futureEventResult.rows[0];
    console.log(`\n🎯 Testing with event: ${event.name}`);
    console.log(`   Artist: ${event.artist}`);
    console.log(`   Venue: ${event.venue_name}, ${event.venue_city}, ${event.venue_state}`);
    console.log(`   Date: ${new Date(event.event_date).toLocaleDateString()}`);
    
    // Test airport lookup
    console.log('\n✈️ Testing airport lookup...');
    try {
      const destinationAirport = await tripSuggestionEngine.getEventPrimaryAirport(event.venue_city, event.venue_state);
      console.log(`   Destination airport for ${event.venue_city}, ${event.venue_state}: ${destinationAirport}`);
      
      if (destinationAirport === 'DEN') {
        console.log('❌ Problem: Same airport as origin (DEN). This will cause API errors.');
        console.log('   Let\'s use a different event or fix the airport lookup.');
        
        // Find an event in a different city
        const differentEventResult = await pool.query(`
          SELECT id, name, artist, venue_name, venue_city, venue_state, event_date, external_id
          FROM events 
          WHERE event_date > (CURRENT_DATE + INTERVAL '3 days') 
          AND external_id IS NOT NULL 
          AND venue_city != 'Denver'
          ORDER BY event_date ASC
          LIMIT 1
        `);
        
        if (differentEventResult.rows.length > 0) {
          console.log(`✅ Found different event: ${differentEventResult.rows[0].name} in ${differentEventResult.rows[0].venue_city}`);
          event = differentEventResult.rows[0];
        }
      }
    } catch (error) {
      console.error(`❌ Airport lookup failed: ${error.message}`);
    }
    
    // Test creating a simple trip without API calls first
    console.log('\n🧪 Testing simple trip creation...');
    try {
      // Create a basic trip suggestion without API calls
      const basicTrip = await pool.query(`
        INSERT INTO trip_suggestions (user_id, event_id, status, total_cost, service_fee)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [20, event.id, 'pending', 0, 25]);
      
      if (basicTrip.rows.length > 0) {
        const tripId = basicTrip.rows[0].id;
        console.log(`✅ Basic trip created with ID: ${tripId}`);
        
        // Add some basic components
        const components = [
          {
            trip_suggestion_id: tripId,
            component_type: 'ticket',
            provider: 'ticketmaster',
            price: 100,
            details: JSON.stringify({
              section: 'General Admission',
              ticketType: 'Standard',
              delivery: 'Mobile Entry'
            })
          },
          {
            trip_suggestion_id: tripId,
            component_type: 'flight',
            provider: 'google_flights',
            price: 300,
            details: JSON.stringify({
              airline: 'Multiple Airlines',
              departure: 'DEN',
              arrival: 'ORD',
              date: new Date(event.event_date).toISOString().split('T')[0]
            })
          },
          {
            trip_suggestion_id: tripId,
            component_type: 'hotel',
            provider: 'booking.com',
            price: 150,
            details: JSON.stringify({
              brand: 'Various Hotels',
              city: event.venue_city,
              checkIn: new Date(event.event_date).toISOString().split('T')[0],
              checkOut: new Date(new Date(event.event_date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            })
          }
        ];
        
        for (const component of components) {
          await pool.query(`
            INSERT INTO trip_components (trip_suggestion_id, component_type, provider, price, details)
            VALUES ($1, $2, $3, $4, $5)
          `, [component.trip_suggestion_id, component.component_type, component.provider, component.price, component.details]);
        }
        
        console.log(`✅ Added ${components.length} components to trip ${tripId}`);
        
        // Update total cost
        const totalCost = components.reduce((sum, comp) => sum + comp.price, 0);
        await pool.query(`
          UPDATE trip_suggestions 
          SET total_cost = $1 
          WHERE id = $2
        `, [totalCost, tripId]);
        
        console.log(`✅ Updated total cost to $${totalCost}`);
        
      } else {
        console.log('❌ Failed to create basic trip');
      }
      
    } catch (error) {
      console.error(`❌ Basic trip creation failed: ${error.message}`);
    }
    
    // Check final database state
    console.log('\n📊 Final database state:');
    const finalTripsResult = await pool.query('SELECT COUNT(*) as total FROM trip_suggestions');
    console.log(`   Total trips: ${finalTripsResult.rows[0].total}`);
    
    const finalComponentsResult = await pool.query('SELECT COUNT(*) as total FROM trip_components');
    console.log(`   Total components: ${finalComponentsResult.rows[0].total}`);
    
    // Show the new trip details
    const newTripsResult = await pool.query(`
      SELECT ts.*, e.name as event_name, e.artist, e.venue_city
      FROM trip_suggestions ts
      JOIN events e ON ts.event_id = e.id
      WHERE ts.user_id = 20
      ORDER BY ts.created_at DESC
      LIMIT 3
    `);
    
    console.log('\n📋 Recent trips:');
    newTripsResult.rows.forEach((trip, index) => {
      console.log(`   ${index + 1}. ${trip.event_name} - ${trip.artist}`);
      console.log(`      Venue: ${trip.venue_city}`);
      console.log(`      Cost: $${trip.total_cost || 0}`);
      console.log(`      Status: ${trip.status}`);
      console.log(`      Created: ${new Date(trip.created_at).toLocaleString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error debugging trip saving:', error);
  } finally {
    await pool.end();
  }
}

debugTripSaving(); 