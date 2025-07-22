const { pool } = require('./config/database');
const tripSuggestionEngine = require('./services/tripSuggestionEngine');

async function fixFutureEvents() {
  try {
    console.log('🔧 Fixing future events and generating trips...');
    
    // Check current date
    const now = new Date();
    console.log(`Current date: ${now.toISOString()}`);
    console.log(`Current date (local): ${now.toLocaleDateString()}`);
    
    // Find events that are actually in the future (at least 3 days from now)
    const futureEventsResult = await pool.query(`
      SELECT id, name, artist, venue_name, venue_city, venue_state, event_date, external_id
      FROM events 
      WHERE event_date > (CURRENT_DATE + INTERVAL '3 days') AND external_id IS NOT NULL
      ORDER BY event_date ASC
      LIMIT 10
    `);
    
    console.log(`\nFound ${futureEventsResult.rows.length} truly future events`);
    
    if (futureEventsResult.rows.length === 0) {
      console.log('❌ No future events found. Let me check what events exist...');
      
      // Check all events to understand the date range
      const allEventsResult = await pool.query(`
        SELECT 
          MIN(event_date) as earliest_date,
          MAX(event_date) as latest_date,
          COUNT(*) as total_events,
          COUNT(CASE WHEN event_date > CURRENT_DATE THEN 1 END) as future_events
        FROM events
      `);
      
      const stats = allEventsResult.rows[0];
      console.log('\nEvent date statistics:');
      console.log(`   Earliest: ${stats.earliest_date}`);
      console.log(`   Latest: ${stats.latest_date}`);
      console.log(`   Total: ${stats.total_events}`);
      console.log(`   Future: ${stats.future_events}`);
      
      // Let's create some test events in the future
      console.log('\n🔧 Creating test events in the future...');
      const testEvents = [
        {
          name: 'Test Concert 1',
          artist: 'Test Artist 1',
          venue_name: 'Test Venue 1',
          venue_city: 'Denver',
          venue_state: 'CO',
          event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          external_id: 'test_event_1'
        },
        {
          name: 'Test Concert 2',
          artist: 'Test Artist 2',
          venue_name: 'Test Venue 2',
          venue_city: 'Chicago',
          venue_state: 'IL',
          event_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          external_id: 'test_event_2'
        }
      ];
      
      for (const event of testEvents) {
        try {
          const result = await pool.query(`
            INSERT INTO events (name, artist, venue_name, venue_city, venue_state, event_date, external_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (external_id) DO NOTHING
            RETURNING id
          `, [event.name, event.artist, event.venue_name, event.venue_city, event.venue_state, event.event_date, event.external_id]);
          
          if (result.rows.length > 0) {
            console.log(`✅ Created test event: ${event.name} (ID: ${result.rows[0].id})`);
          } else {
            console.log(`ℹ️ Test event already exists: ${event.name}`);
          }
        } catch (error) {
          console.error(`❌ Failed to create test event: ${error.message}`);
        }
      }
      
      // Now try to find future events again
      const newFutureEventsResult = await pool.query(`
        SELECT id, name, artist, venue_name, venue_city, venue_state, event_date, external_id
        FROM events 
        WHERE event_date > (CURRENT_DATE + INTERVAL '3 days') AND external_id IS NOT NULL
        ORDER BY event_date ASC
        LIMIT 5
      `);
      
      if (newFutureEventsResult.rows.length > 0) {
        console.log(`\n✅ Now found ${newFutureEventsResult.rows.length} future events`);
        futureEventsResult.rows = newFutureEventsResult.rows;
      } else {
        console.log('❌ Still no future events found');
        return;
      }
    }
    
    // Generate trips for future events
    console.log('\n🎯 Generating trips for future events...');
    
    for (const event of futureEventsResult.rows) {
      console.log(`\n📅 Processing: ${event.name} - ${event.artist}`);
      console.log(`   Date: ${new Date(event.event_date).toLocaleDateString()}`);
      console.log(`   Venue: ${event.venue_name}, ${event.venue_city}, ${event.venue_state}`);
      
      try {
        // Create trip suggestion with deep linking strategy
        const trip = await tripSuggestionEngine.createEnhancedTripSuggestion(
          20, // Brad's user ID
          event,
          {
            primary_airport: 'DEN',
            preferred_airlines: ['United', 'Southwest'],
            preferred_hotel_brands: ['Hilton', 'Marriott'],
            rental_car_preference: 'Hertz'
          }
        );
        
        if (trip) {
          console.log(`✅ Created trip successfully`);
          console.log(`   Total Cost: $${trip.totalCost || 0}`);
          console.log(`   Components: ${trip.components?.length || 0}`);
          
          if (trip.priceBreakdown) {
            console.log(`   Real: $${trip.priceBreakdown.real || 0}, Estimated: $${trip.priceBreakdown.estimated || 0}`);
          }
          
          // Show components
          trip.components?.forEach((comp, index) => {
            console.log(`   ${index + 1}. ${comp.componentType}: $${comp.price || 0} (${comp.priceType || 'unknown'}) - ${comp.provider}`);
          });
          
        } else {
          console.log(`❌ Trip creation returned null`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to create trip for ${event.name}:`, error.message);
      }
    }
    
    // Check final database state
    console.log('\n📊 Final database state:');
    const finalTripsResult = await pool.query('SELECT COUNT(*) as total FROM trip_suggestions');
    console.log(`   Total trips: ${finalTripsResult.rows[0].total}`);
    
    const finalComponentsResult = await pool.query('SELECT COUNT(*) as total FROM trip_components');
    console.log(`   Total components: ${finalComponentsResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Error fixing future events:', error);
  } finally {
    await pool.end();
  }
}

fixFutureEvents(); 