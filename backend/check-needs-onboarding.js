const { pool } = require('./config/database');

async function checkNeedsOnboarding() {
  try {
    // Check if the column exists
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'needs_onboarding'
    `);
    
    console.log('needs_onboarding column exists:', result.rows.length > 0);
    
    if (result.rows.length > 0) {
      // Check a few users to see their needs_onboarding status
      const users = await pool.query(`
        SELECT id, email, first_name, needs_onboarding 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log('Recent users:');
      users.rows.forEach(user => {
        console.log(`- ${user.email} (${user.first_name}): needs_onboarding = ${user.needs_onboarding}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking needs_onboarding:', error);
  } finally {
    await pool.end();
  }
}

checkNeedsOnboarding(); 