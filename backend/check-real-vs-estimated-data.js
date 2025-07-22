const { pool } = require('./config/database');

async function checkRealVsEstimatedData() {
  try {
    console.log('🔍 Checking real vs estimated data in trips...');
    
    // Get recent trips with components
    const tripsResult = await pool.query(`
      SELECT ts.id, ts.total_cost, ts.service_fee, ts.created_at,
             e.name as event_name, e.artist, e.venue_city, e.venue_state,
             e.min_price, e.max_price
      FROM trip_suggestions ts
      JOIN events e ON ts.event_id = e.id
      WHERE ts.user_id = 20
      ORDER BY ts.created_at DESC
      LIMIT 5
    `);
    
    console.log(`\nFound ${tripsResult.rows.length} recent trips`);
    
    for (const trip of tripsResult.rows) {
      console.log(`\n📅 Trip ${trip.id}: ${trip.event_name} - ${trip.artist}`);
      console.log(`   Venue: ${trip.venue_city}, ${trip.venue_state}`);
      console.log(`   Total Cost: $${trip.total_cost || 0}`);
      console.log(`   Service Fee: $${trip.service_fee || 0}`);
      console.log(`   Event Price Range: $${trip.min_price || 'N/A'} - $${trip.max_price || 'N/A'}`);
      console.log(`   Created: ${new Date(trip.created_at).toLocaleString()}`);
      
      // Get components for this trip
      const componentsResult = await pool.query(`
        SELECT component_type, provider, price, details, booking_reference
        FROM trip_components
        WHERE trip_suggestion_id = $1
        ORDER BY component_type
      `, [trip.id]);
      
      console.log(`   Components (${componentsResult.rows.length}):`);
      componentsResult.rows.forEach((comp, index) => {
        const details = typeof comp.details === 'string' ? JSON.parse(comp.details) : comp.details;
        console.log(`     ${index + 1}. ${comp.component_type.toUpperCase()}`);
        console.log(`        Provider: ${comp.provider}`);
        console.log(`        Price: $${comp.price || 0}`);
        console.log(`        Booking URL: ${comp.booking_reference ? '✅ Available' : '❌ Not available'}`);
        
        // Show component-specific details
        if (details) {
          if (comp.component_type === 'ticket') {
            console.log(`        Section: ${details.section || 'N/A'}`);
            console.log(`        Price Range: ${details.priceRange || 'N/A'}`);
            console.log(`        Note: ${details.note || 'N/A'}`);
          } else if (comp.component_type === 'flight') {
            console.log(`        Airline: ${details.airline || 'N/A'}`);
            console.log(`        Route: ${details.departure || 'N/A'} → ${details.arrival || 'N/A'}`);
            console.log(`        Flight: ${details.flightNumber || 'N/A'}`);
            console.log(`        Note: ${details.note || 'N/A'}`);
          } else if (comp.component_type === 'hotel') {
            console.log(`        Hotel: ${details.name || 'N/A'}`);
            console.log(`        Brand: ${details.brand || 'N/A'}`);
            console.log(`        Rating: ${details.rating || 'N/A'}`);
            console.log(`        Note: ${details.note || 'N/A'}`);
          } else if (comp.component_type === 'car') {
            console.log(`        Brand: ${details.brand || 'N/A'}`);
            console.log(`        Location: ${details.pickupLocation || 'N/A'}`);
            console.log(`        Note: ${details.note || 'N/A'}`);
          }
        }
      });
    }
    
    // Summary statistics
    console.log('\n📊 Data Quality Summary:');
    
    const allComponentsResult = await pool.query(`
      SELECT component_type, COUNT(*) as total,
             COUNT(CASE WHEN price > 0 THEN 1 END) as with_price,
             AVG(price) as avg_price
      FROM trip_components
      WHERE trip_suggestion_id IN (
        SELECT id FROM trip_suggestions WHERE user_id = 20
      )
      GROUP BY component_type
    `);
    
    allComponentsResult.rows.forEach(row => {
      console.log(`   ${row.component_type}: ${row.total} total, ${row.with_price} with prices, avg $${Math.round(row.avg_price || 0)}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await pool.end();
  }
}

checkRealVsEstimatedData(); 