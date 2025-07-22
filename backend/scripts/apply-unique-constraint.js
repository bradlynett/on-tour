require('dotenv').config();
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function applyUniqueConstraint() {
    try {
        console.log('🔧 Applying unique constraint to user_interests table...\n');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, '../database/migrations/05_add_unique_interests.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📋 Migration SQL:');
        console.log(migrationSQL);
        console.log('\n🔄 Applying migration...');
        
        // Execute the migration
        await pool.query(migrationSQL);
        
        console.log('✅ Unique constraint applied successfully!');
        
        // Verify the constraint exists
        console.log('\n🔍 Verifying constraint...');
        const constraintResult = await pool.query(`
            SELECT constraint_name, constraint_type 
            FROM information_schema.table_constraints 
            WHERE table_name = 'user_interests' 
            AND constraint_name = 'unique_user_interest'
        `);
        
        if (constraintResult.rows.length > 0) {
            console.log('✅ Unique constraint verified: unique_user_interest');
        } else {
            console.log('⚠️  Constraint not found');
        }
        
        // Test that duplicates are prevented
        console.log('\n🧪 Testing duplicate prevention...');
        try {
            // Try to insert a duplicate (this should fail)
            await pool.query(`
                INSERT INTO user_interests (user_id, interest_type, interest_value, priority)
                VALUES (1, 'artist', 'Ed Sheeran', 1)
            `);
            console.log('❌ Duplicate prevention test failed - duplicate was inserted');
        } catch (error) {
            if (error.code === '23505') {
                console.log('✅ Duplicate prevention working correctly - constraint violation caught');
            } else {
                console.log('⚠️  Unexpected error during test:', error.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Error applying constraint:', error);
    } finally {
        await pool.end();
    }
}

applyUniqueConstraint(); 