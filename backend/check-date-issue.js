const { pool } = require('./config/database');

async function checkDateIssue() {
  try {
    console.log('🔍 Checking date issue...');
    
    // Check current date
    const now = new Date();
    console.log(`Current date: ${now.toISOString()}`);
    console.log(`Current date (local): ${now.toLocaleDateString()}`);
    
    // Check some future events and their dates
    const futureEventsResult = await pool.query(`
      SELECT id, name, artist, venue_city, venue_state, event_date, external_id
      FROM events 
      WHERE event_date > CURRENT_DATE AND external_id IS NOT NULL
      ORDER BY event_date ASC
      LIMIT 5
    `);
    
    console.log('\nFuture events:');
    futureEventsResult.rows.forEach((event, index) => {
      const eventDate = new Date(event.event_date);
      const isFuture = eventDate > now;
      console.log(`\n${index + 1}. ${event.name} - ${event.artist}`);
      console.log(`   Event date: ${event.event_date}`);
      console.log(`   Event date (parsed): ${eventDate.toISOString()}`);
      console.log(`   Event date (local): ${eventDate.toLocaleDateString()}`);
      console.log(`   Is future: ${isFuture}`);
      console.log(`   Days from now: ${Math.floor((eventDate - now) / (1000 * 60 * 60 * 24))}`);
      
      // Calculate flight dates
      const departureDate = new Date(eventDate);
      departureDate.setDate(eventDate.getDate() - 1); // Day before event
      
      const returnDate = new Date(eventDate);
      returnDate.setDate(eventDate.getDate() + 1); // Day after event
      
      console.log(`   Flight departure: ${departureDate.toLocaleDateString()} (${departureDate > now ? 'FUTURE' : 'PAST'})`);
      console.log(`   Flight return: ${returnDate.toLocaleDateString()} (${returnDate > now ? 'FUTURE' : 'PAST'})`);
    });
    
    // Check if there are any events that should work for flights
    const workingEventsResult = await pool.query(`
      SELECT id, name, artist, venue_city, venue_state, event_date, external_id
      FROM events 
      WHERE event_date > (CURRENT_DATE + INTERVAL '2 days') AND external_id IS NOT NULL
      ORDER BY event_date ASC
      LIMIT 3
    `);
    
    console.log('\nEvents that should work for flights:');
    workingEventsResult.rows.forEach((event, index) => {
      const eventDate = new Date(event.event_date);
      const departureDate = new Date(eventDate);
      departureDate.setDate(eventDate.getDate() - 1);
      
      console.log(`\n${index + 1}. ${event.name} - ${event.artist}`);
      console.log(`   Event: ${eventDate.toLocaleDateString()}`);
      console.log(`   Departure: ${departureDate.toLocaleDateString()}`);
      console.log(`   Should work: ${departureDate > now}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking date issue:', error);
  } finally {
    await pool.end();
  }
}

checkDateIssue(); 