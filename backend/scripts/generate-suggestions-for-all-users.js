const { pool } = require('../config/database');
const engine = require('../services/tripSuggestionEngine');

(async () => {
  try {
    console.log('🔄 Generating trip suggestions for all users...');
    const usersResult = await pool.query('SELECT id, email FROM users');
    const users = usersResult.rows;
    let totalSuggestions = 0;
    for (const user of users) {
      try {
        console.log(`\n➡️  User: ${user.email} (ID: ${user.id})`);
        const result = await engine.generateTripSuggestions(user.id, 5);
        const count = result.suggestions ? result.suggestions.length : 0;
        totalSuggestions += count;
        console.log(`   ✅ Generated ${count} suggestions.`);
      } catch (err) {
        console.error(`   ❌ Error generating suggestions for user ${user.email}:`, err.message);
      }
    }
    console.log(`\n🎉 Done. Total suggestions generated: ${totalSuggestions}`);
  } catch (err) {
    console.error('❌ Batch trip suggestion generation failed:', err);
  } finally {
    await pool.end();
  }
})(); 