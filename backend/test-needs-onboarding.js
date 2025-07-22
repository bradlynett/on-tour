const { pool } = require('./config/database');

async function testNeedsOnboarding() {
  try {
    // Get the latest user
    const result = await pool.query(`
      SELECT id, email, first_name, needs_onboarding, created_at
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('Latest user:', user);
      console.log('needs_onboarding type:', typeof user.needs_onboarding);
      console.log('needs_onboarding value:', user.needs_onboarding);
    } else {
      console.log('No users found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testNeedsOnboarding(); 