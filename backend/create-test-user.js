const bcrypt = require('bcrypt');
const { pool } = require('./config/database');

async function createTestUser() {
  try {
    console.log('🔧 Creating test user...');
    
    // Check if test user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['test@dashboard.com']
    );
    
    if (existingUser.rows.length > 0) {
      console.log('✅ Test user already exists with ID:', existingUser.rows[0].id);
      return existingUser.rows[0].id;
    }
    
    // Create new test user
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const result = await pool.query(`
      INSERT INTO users (email, password, first_name, last_name, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING id
    `, ['test@dashboard.com', hashedPassword, 'Test', 'User']);
    
    const userId = result.rows[0].id;
    console.log('✅ Test user created with ID:', userId);
    
    // Add some test interests
    const interests = [
      { type: 'artist', value: 'Taylor Swift', priority: 1 },
      { type: 'artist', value: 'Ed Sheeran', priority: 2 },
      { type: 'genre', value: 'Pop', priority: 3 },
      { type: 'city', value: 'New York', priority: 4 },
      { type: 'venue', value: 'Madison Square Garden', priority: 5 }
    ];
    
    for (const interest of interests) {
      await pool.query(`
        INSERT INTO user_interests (user_id, interest_type, interest_value, priority, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `, [userId, interest.type, interest.value, interest.priority]);
    }
    
    console.log('✅ Test interests added');
    console.log('📧 Test user credentials:');
    console.log('   Email: test@dashboard.com');
    console.log('   Password: test123');
    
    return userId;
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createTestUser(); 