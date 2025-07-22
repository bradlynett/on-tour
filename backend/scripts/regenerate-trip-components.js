// Script: regenerate-trip-components.js
// Purpose: For every trip suggestion, regenerate and persist all trip components using the trip suggestion engine

const { pool } = require('../config/database');
const TripSuggestionEngine = require('../services/tripSuggestionEngine');

async function getAllTripSuggestions() {
  const res = await pool.query('SELECT id, user_id, event_id FROM trip_suggestions');
  return res.rows;
}

async function main() {
  const suggestions = await getAllTripSuggestions();
  let updated = 0;
  for (const suggestion of suggestions) {
    try {
      // Regenerate the enhanced trip suggestion (this will now save all components)
      await TripSuggestionEngine.createEnhancedTripSuggestion(suggestion.user_id, { id: suggestion.event_id });
      console.log(`Regenerated components for trip_suggestion ${suggestion.id}`);
      updated++;
    } catch (err) {
      console.error(`Failed to regenerate components for trip_suggestion ${suggestion.id}:`, err.message);
    }
  }
  console.log(`Done. Regenerated components for ${updated} trip suggestions.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Failed to regenerate trip components:', err);
  process.exit(1);
}); 