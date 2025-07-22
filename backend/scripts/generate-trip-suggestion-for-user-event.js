const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Check for Amadeus credentials
if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
  console.error('❌ Missing Amadeus credentials. Please check your .env file for AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET.');
  process.exit(1);
}

const { pool } = require('../config/database');
const engine = require('../services/tripSuggestionEngine');

const userId = 20;
const eventId = 437;

console.log(`Generating trip suggestion for user ${userId}, event ${eventId}...`);

async function run() {
  // Fetch user travel preferences
  const prefResult = await pool.query(
    'SELECT * FROM travel_preferences WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  const preferences = prefResult.rows[0] || {};
  console.log('[DEBUG] Loaded preferences:', preferences);

  await engine.createTripSuggestion(userId, eventId, preferences)
    .then(result => {
      console.log('✅ Trip suggestion created:', result);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error creating trip suggestion:', err);
      process.exit(1);
    });
}

run(); 