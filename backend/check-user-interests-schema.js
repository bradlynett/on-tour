const { pool } = require('./config/database');
require('dotenv').config();

async function checkUserInterestsSchema() {
    console.log('🔍 Checking user_interests table schema');
    console.log('=' .repeat(60));

    try {
        // Check table structure
        const schemaResult = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'user_interests'
            ORDER BY ordinal_position
        `);

        console.log('\n📋 user_interests table columns:');
        schemaResult.rows.forEach(col => {
            console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
        });

        // Check sample data
        const sampleResult = await pool.query(`
            SELECT * FROM user_interests WHERE user_id = 20 LIMIT 3
        `);

        console.log('\n📊 Sample data for user 20:');
        sampleResult.rows.forEach((row, idx) => {
            console.log(`   Row ${idx + 1}:`, row);
        });

    } catch (error) {
        console.error('❌ Error checking schema:', error);
    } finally {
        await pool.end();
    }
}

checkUserInterestsSchema(); 