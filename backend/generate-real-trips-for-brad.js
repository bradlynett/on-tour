const { pool } = require('./config/database');
const tripSuggestionEngine = require('./services/tripSuggestionEngine');

async function generateRealTripsForBrad() {
  try {
    console.log('🔧 Generating real trip suggestions for Brad...');
    
    // First, let's check if Brad has interests
    const interestsResult = await pool.query(`
      SELECT interest_type, interest_value, priority
      FROM user_interests 
      WHERE user_id = 20
      ORDER BY priority ASC
    `);
    
    console.log(`Brad has ${interestsResult.rows.length} interests:`, interestsResult.rows);
    
    if (interestsResult.rows.length === 0) {
      console.log('❌ Brad has no interests. Cannot generate trips.');
      return;
    }
    
    // Generate trip suggestions using the existing system
    console.log('\n🎯 Generating trip suggestions...');
    const trips = await tripSuggestionEngine.generateTripSuggestions(20, 5);
    
    console.log(`✅ Generated ${trips.length} trip suggestions`);
    
    // Display the generated trips
    trips.forEach((trip, index) => {
      console.log(`\n📅 Trip ${index + 1}: ${trip.eventName}`);
      console.log(`   Artist: ${trip.artist}`);
      console.log(`   Venue: ${trip.venueName}, ${trip.venueCity}, ${trip.venueState}`);
      console.log(`   Date: ${new Date(trip.eventDate).toLocaleDateString()}`);
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
    
    console.log('\n✅ Trip generation complete!');
    
  } catch (error) {
    console.error('❌ Error generating trips:', error);
  } finally {
    await pool.end();
  }
}

generateRealTripsForBrad(); 