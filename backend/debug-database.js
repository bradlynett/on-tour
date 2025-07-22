const { pool } = require('./config/database');

async function debugDatabase() {
  try {
    console.log('🔍 Debugging database state...');
    
    // Check total trips in database
    const totalTripsResult = await pool.query('SELECT COUNT(*) as total FROM trip_suggestions');
    console.log(`Total trips in database: ${totalTripsResult.rows[0].total}`);
    
    // Check trips by user
    const userTripsResult = await pool.query(`
      SELECT user_id, COUNT(*) as count 
      FROM trip_suggestions 
      GROUP BY user_id
    `);
    console.log('\nTrips by user:');
    userTripsResult.rows.forEach(row => {
      console.log(`   User ${row.user_id}: ${row.count} trips`);
    });
    
    // Check if Brad has interests
    const interestsResult = await pool.query(`
      SELECT interest_type, interest_value, priority
      FROM user_interests 
      WHERE user_id = 20
      ORDER BY priority ASC
    `);
    console.log(`\nBrad's interests: ${interestsResult.rows.length}`);
    interestsResult.rows.forEach(interest => {
      console.log(`   - ${interest.interest_type}: ${interest.interest_value} (priority: ${interest.priority})`);
    });
    
    // Check events table
    const eventsResult = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN event_date > CURRENT_DATE THEN 1 END) as future,
             COUNT(CASE WHEN external_id IS NOT NULL THEN 1 END) as with_ticketmaster
      FROM events
    `);
    console.log('\nEvents in database:');
    console.log(`   Total: ${eventsResult.rows[0].total}`);
    console.log(`   Future: ${eventsResult.rows[0].future}`);
    console.log(`   With Ticketmaster ID: ${eventsResult.rows[0].with_ticketmaster}`);
    
    // Check some sample future events
    const futureEventsResult = await pool.query(`
      SELECT id, name, artist, venue_city, venue_state, event_date, external_id
      FROM events 
      WHERE event_date > CURRENT_DATE AND external_id IS NOT NULL
      ORDER BY event_date ASC
      LIMIT 5
    `);
    
    console.log('\nSample future events:');
    futureEventsResult.rows.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.name} - ${event.artist}`);
      console.log(`      ${event.venue_city}, ${event.venue_state} - ${new Date(event.event_date).toLocaleDateString()}`);
      console.log(`      Ticketmaster ID: ${event.external_id}`);
    });
    
    // Check trip components
    const componentsResult = await pool.query('SELECT COUNT(*) as total FROM trip_components');
    console.log(`\nTotal trip components: ${componentsResult.rows[0].total}`);
    
    // Check components by type
    const componentTypesResult = await pool.query(`
      SELECT component_type, COUNT(*) as count
      FROM trip_components
      GROUP BY component_type
    `);
    console.log('\nComponents by type:');
    componentTypesResult.rows.forEach(row => {
      console.log(`   ${row.component_type}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error debugging database:', error);
  } finally {
    await pool.end();
  }
}

debugDatabase(); 