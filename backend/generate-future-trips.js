const { pool } = require('./config/database');
const tripSuggestionEngine = require('./services/tripSuggestionEngine');

async function generateFutureTrips() {
  try {
    console.log('🔧 Generating real trip suggestions for future events...');
    
    // Use the existing trip suggestion engine to generate trips
    console.log('\n🎯 Running trip suggestion engine for Brad...');
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

generateFutureTrips(); 