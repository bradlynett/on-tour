const { pool } = require('./config/database');
const bcrypt = require('bcryptjs');

async function checkUsers() {
    try {
        console.log('🔍 Checking users in database...');
        
        // Get all users
        const result = await pool.query('SELECT id, email, password_hash, first_name, last_name FROM users LIMIT 10');
        
        console.log(`Found ${result.rows.length} users:`);
        
        for (const user of result.rows) {
            console.log(`\nUser ID: ${user.id}`);
            console.log(`Email: ${user.email}`);
            console.log(`Name: ${user.first_name} ${user.last_name}`);
            console.log(`Password Hash: ${user.password_hash.substring(0, 20)}...`);
            
            // Test password 'password123'
            const isValid = await bcrypt.compare('password123', user.password_hash);
            console.log(`Password 'password123' valid: ${isValid}`);
            
            // Test password 'password'
            const isValid2 = await bcrypt.compare('password', user.password_hash);
            console.log(`Password 'password' valid: ${isValid2}`);
        }
        
        // Test creating a new user with known password
        console.log('\n🧪 Testing user creation...');
        const testPassword = 'password123';
        const hashedPassword = await bcrypt.hash(testPassword, 10);
        
        console.log(`Test password: ${testPassword}`);
        console.log(`Hashed password: ${hashedPassword.substring(0, 20)}...`);
        
        // Check if we can verify it
        const testValid = await bcrypt.compare(testPassword, hashedPassword);
        console.log(`Verification test: ${testValid}`);
        
    } catch (error) {
        console.error('❌ Error checking users:', error);
    } finally {
        await pool.end();
    }
}

checkUsers(); 