// Script: fix-trip-suggestion-prices.js
// Purpose: Recalculate and update totalCost and serviceFee for all trip suggestions

const { pool } = require('../config/database');

const SERVICE_FEE_RATE = 0.05;
const MIN_SERVICE_FEE = 25;

async function getAllTripSuggestions() {
  const res = await pool.query('SELECT id FROM trip_suggestions');
  return res.rows.map(r => r.id);
}

async function getComponentsForSuggestion(tripSuggestionId) {
  const res = await pool.query('SELECT price FROM trip_components WHERE trip_suggestion_id = $1', [tripSuggestionId]);
  return res.rows.map(r => {
    let price = r.price;
    if (typeof price === 'string') price = parseFloat(price);
    return price || 0;
  });
}

async function updateTripSuggestion(tripSuggestionId, totalCost, serviceFee) {
  await pool.query('UPDATE trip_suggestions SET total_cost = $1, service_fee = $2 WHERE id = $3', [totalCost, serviceFee, tripSuggestionId]);
}

async function main() {
  const ids = await getAllTripSuggestions();
  let updated = 0;
  for (const id of ids) {
    const prices = await getComponentsForSuggestion(id);
    const totalCost = prices.reduce((sum, p) => sum + (p || 0), 0);
    const serviceFee = Math.max(totalCost * SERVICE_FEE_RATE, MIN_SERVICE_FEE);
    await updateTripSuggestion(id, totalCost, serviceFee);
    console.log(`Updated trip_suggestion ${id}: totalCost=${totalCost}, serviceFee=${serviceFee}`);
    updated++;
  }
  console.log(`Done. Updated ${updated} trip suggestions.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Failed to update trip suggestions:', err);
  process.exit(1);
}); 