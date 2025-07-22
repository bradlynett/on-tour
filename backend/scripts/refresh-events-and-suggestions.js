// scripts/refresh-events-and-suggestions.js
const { pool } = require('../config/database');
const eventService = require('../services/eventService');
const tripEngine = require('../services/tripSuggestionEngine');

async function truncateTables() {
  console.log('🧹 Truncating events, trip_suggestions, and trip_components tables...');
  await pool.query('TRUNCATE TABLE trip_components RESTART IDENTITY CASCADE;');
  await pool.query('TRUNCATE TABLE trip_suggestions RESTART IDENTITY CASCADE;');
  await pool.query('TRUNCATE TABLE events RESTART IDENTITY CASCADE;');
  console.log('✅ Tables truncated.');
}

async function syncEventsForUserInterests() {
  console.log('🔄 Syncing events for all user interests...');
  // This logic is similar to scripts/sync-user-interest-events.js
  const interestsResult = await pool.query(`
    SELECT DISTINCT interest_type, interest_value
    FROM user_interests
    WHERE interest_type IN ('artist', 'event_type', 'venue', 'city')
  `);

  let totalSynced = 0;
  for (const row of interestsResult.rows) {
    const { interest_type, interest_value } = row;
    try {
      let searchResult;
      if (interest_type === 'artist') {
        searchResult = await eventService.searchEventsByArtist(interest_value, { size: 20 });
      } else if (interest_type === 'venue') {
        searchResult = await eventService.searchEventsByVenue(interest_value, { size: 20 });
      } else if (interest_type === 'city') {
        searchResult = await eventService.searchEventsByCity(interest_value, { size: 20 });
      } else if (interest_type === 'event_type') {
        searchResult = await eventService.searchEvents({ keyword: interest_value, size: 20 });
      }
      if (searchResult && searchResult.events && searchResult.events.length > 0) {
        const savedIds = await eventService.saveEvents(searchResult.events);
        totalSynced += savedIds.length;
        console.log(`   ✅ Synced ${savedIds.length} events for ${interest_type}: ${interest_value}`);
      }
    } catch (err) {
      console.error(`   ❌ Error syncing events for ${interest_type} ${interest_value}:`, err.message);
    }
    // Optional: add delay to avoid API rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log(`🎉 Event sync complete. Total events synced: ${totalSynced}`);
}

async function generateTripSuggestionsForAllUsers() {
  console.log('🚀 Generating trip suggestions for all users...');
  const usersResult = await pool.query('SELECT id, email FROM users');
  let totalSuggestions = 0;
  for (const user of usersResult.rows) {
    try {
      const result = await tripEngine.generateTripSuggestions(user.id, 5);
      const count = result.suggestions ? result.suggestions.length : 0;
      totalSuggestions += count;
      console.log(`   ✅ Generated ${count} suggestions for ${user.email}`);
    } catch (err) {
      console.error(`   ❌ Error generating suggestions for user ${user.email}:`, err.message);
    }
  }
  console.log(`🎉 Trip suggestion generation complete. Total suggestions: ${totalSuggestions}`);
}

(async () => {
  try {
    await truncateTables();
    await syncEventsForUserInterests();
    await generateTripSuggestionsForAllUsers();
    console.log('✅ All steps completed successfully!');
  } catch (err) {
    console.error('❌ Error in automation script:', err);
  } finally {
    await pool.end();
  }
})();