const { pool } = require('./config/database');
const tripSuggestionEngine = require('./services/tripSuggestionEngine');

async function testDeepLinkingStrategy() {
  try {
    console.log('🔧 Testing deep linking strategy with fallback pricing...');
    
    // Find a future event that should work
    const futureEventResult = await pool.query(`
      SELECT id, name, artist, venue_name, venue_city, venue_state, event_date, external_id
      FROM events 
      WHERE event_date > (CURRENT_DATE + INTERVAL '2 days') AND external_id IS NOT NULL
      ORDER BY event_date ASC
      LIMIT 1
    `);
    
    if (futureEventResult.rows.length === 0) {
      console.log('❌ No future events found');
      return;
    }
    
    const event = futureEventResult.rows[0];
    console.log(`\n🎯 Testing with event: ${event.name}`);
    console.log(`   Artist: ${event.artist}`);
    console.log(`   Venue: ${event.venue_name}, ${event.venue_city}, ${event.venue_state}`);
    console.log(`   Date: ${new Date(event.event_date).toLocaleDateString()}`);
    console.log(`   Ticketmaster ID: ${event.external_id}`);
    
    // Test with Brad's preferences
    const preferences = {
      primary_airport: 'DEN',
      preferred_airlines: ['United', 'Southwest'],
      preferred_hotel_brands: ['Hilton', 'Marriott'],
      rental_car_preference: 'Hertz'
    };
    
    console.log('\n🔗 Testing deep linking strategy...');
    
    try {
      // Create enhanced trip suggestion
      const enhancedTrip = await tripSuggestionEngine.createEnhancedTripSuggestion(
        20, // Brad's user ID
        event,
        preferences
      );
      
      if (enhancedTrip) {
        console.log(`✅ Enhanced trip created successfully`);
        console.log(`   Total Cost: $${enhancedTrip.totalCost || 0}`);
        console.log(`   Service Fee: $${enhancedTrip.serviceFee || 0}`);
        console.log(`   Components: ${enhancedTrip.components?.length || 0}`);
        
        if (enhancedTrip.priceBreakdown) {
          console.log(`   Price Breakdown:`);
          console.log(`     Real: $${enhancedTrip.priceBreakdown.real || 0}`);
          console.log(`     Estimated: $${enhancedTrip.priceBreakdown.estimated || 0}`);
        }
        
        console.log('\n📋 Components with deep links:');
        enhancedTrip.components?.forEach((comp, index) => {
          console.log(`\n   ${index + 1}. ${comp.componentType.toUpperCase()}`);
          console.log(`      Provider: ${comp.provider}`);
          console.log(`      Price: $${comp.price || 0} (${comp.priceType || 'unknown'})`);
          console.log(`      Booking URL: ${comp.bookingUrl ? '✅ Available' : '❌ Not available'}`);
          if (comp.details) {
            console.log(`      Details: ${JSON.stringify(comp.details, null, 2)}`);
          }
        });
        
        if (enhancedTrip.bookingUrls) {
          console.log('\n🔗 Quick Booking URLs:');
          Object.entries(enhancedTrip.bookingUrls).forEach(([type, url]) => {
            console.log(`   ${type}: ${url}`);
          });
        }
        
        // Test saving to database
        console.log('\n💾 Testing database save...');
        const savedTrip = await tripSuggestionEngine.saveTripSuggestion(enhancedTrip);
        if (savedTrip) {
          console.log(`✅ Trip saved to database with ID: ${savedTrip.id}`);
          
          // Test retrieving from database
          const retrievedTrip = await tripSuggestionEngine.getTripSuggestionWithDetails(savedTrip.id);
          if (retrievedTrip) {
            console.log(`✅ Trip retrieved from database successfully`);
            console.log(`   Components retrieved: ${retrievedTrip.components?.length || 0}`);
          }
        }
        
      } else {
        console.log(`❌ Enhanced trip creation returned null`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to create enhanced trip:`, error.message);
      console.error('Full error:', error);
    }
    
  } catch (error) {
    console.error('❌ Error testing deep linking strategy:', error);
  } finally {
    await pool.end();
  }
}

testDeepLinkingStrategy(); 