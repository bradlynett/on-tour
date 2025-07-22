require('dotenv').config();
const { pool } = require('../config/database');

async function getUserEmail(userId) {
    try {
        console.log(`🔍 Getting email for user ID: ${userId}`);
        
        const result = await pool.query(`
            SELECT email, first_name, last_name
            FROM users
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            console.log('❌ User not found');
            return;
        }

        const user = result.rows[0];
        console.log('✅ User found:');
        console.log(`   Name: ${user.first_name} ${user.last_name}`);
        console.log(`   Email: ${user.email}`);
        console.log('');
        console.log('📧 Add this email as a test user in Spotify Developer Dashboard:');
        console.log(`   ${user.email}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

// Get user ID from command line argument or default to 24
const userId = process.argv[2] || 24;
getUserEmail(parseInt(userId)); 