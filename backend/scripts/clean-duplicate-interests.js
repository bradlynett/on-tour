require('dotenv').config();
const { pool } = require('../config/database');

async function cleanDuplicateInterests() {
    try {
        console.log('🧹 Cleaning up duplicate interests...\n');
        
        // First, let's see what duplicates exist
        console.log('📋 Checking for duplicates...');
        const duplicatesResult = await pool.query(`
            SELECT 
                user_id,
                interest_type,
                interest_value,
                COUNT(*) as count,
                ARRAY_AGG(id) as ids
            FROM user_interests
            GROUP BY user_id, interest_type, interest_value
            HAVING COUNT(*) > 1
            ORDER BY user_id, interest_type, interest_value
        `);
        
        if (duplicatesResult.rows.length === 0) {
            console.log('✅ No duplicates found!');
            return;
        }
        
        console.log(`⚠️  Found ${duplicatesResult.rows.length} duplicate groups:`);
        duplicatesResult.rows.forEach(row => {
            console.log(`   User ${row.user_id}: ${row.interest_type} - "${row.interest_value}" (${row.count} duplicates)`);
        });
        
        // Get user details for better reporting
        console.log('\n📊 Detailed duplicate report:');
        for (const duplicate of duplicatesResult.rows) {
            const userResult = await pool.query('SELECT email, first_name, last_name FROM users WHERE id = $1', [duplicate.user_id]);
            const user = userResult.rows[0];
            
            console.log(`\n👤 ${user.first_name} ${user.last_name} (${user.email}):`);
            console.log(`   ${duplicate.interest_type}: "${duplicate.interest_value}"`);
            console.log(`   Duplicate IDs: [${duplicate.ids.join(', ')}]`);
            
            // Keep the first one (lowest ID) and delete the rest
            const idsToDelete = duplicate.ids.slice(1); // Keep the first, delete the rest
            console.log(`   Keeping ID: ${duplicate.ids[0]}`);
            console.log(`   Deleting IDs: [${idsToDelete.join(', ')}]`);
            
            // Delete the duplicates
            const deleteResult = await pool.query(`
                DELETE FROM user_interests 
                WHERE id = ANY($1)
            `, [idsToDelete]);
            
            console.log(`   ✅ Deleted ${deleteResult.rowCount} duplicates`);
        }
        
        // Verify cleanup
        console.log('\n🔍 Verifying cleanup...');
        const remainingDuplicates = await pool.query(`
            SELECT 
                user_id,
                interest_type,
                interest_value,
                COUNT(*) as count
            FROM user_interests
            GROUP BY user_id, interest_type, interest_value
            HAVING COUNT(*) > 1
        `);
        
        if (remainingDuplicates.rows.length === 0) {
            console.log('✅ All duplicates cleaned up successfully!');
        } else {
            console.log(`⚠️  Still have ${remainingDuplicates.rows.length} duplicate groups remaining`);
        }
        
        // Show final count
        const totalInterests = await pool.query('SELECT COUNT(*) as count FROM user_interests');
        console.log(`\n📊 Total interests after cleanup: ${totalInterests.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Error cleaning duplicates:', error);
    } finally {
        await pool.end();
    }
}

cleanDuplicateInterests(); 