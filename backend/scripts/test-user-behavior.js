const { pool } = require('../config/database');

async function testUserBehavior() {
    try {
        console.log('🧪 Testing user_behavior table...\n');

        // 1. Check if table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'user_behavior'
            );
        `);
        if (!tableCheck.rows[0].exists) {
            console.log('❌ user_behavior table does not exist');
            return;
        }
        console.log('✅ user_behavior table exists');

        // 2. Print table columns
        const columnsResult = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'user_behavior'
            ORDER BY ordinal_position;
        `);
        console.log('📋 Table columns:');
        columnsResult.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        // 3. Insert a test row (using only schema columns)
        // Find a valid user_id, event_id, and trip_suggestion_id
        const userRes = await pool.query('SELECT id FROM users LIMIT 1');
        const eventRes = await pool.query('SELECT id FROM events LIMIT 1');
        const tripRes = await pool.query('SELECT id FROM trip_suggestions LIMIT 1');
        if (!userRes.rows.length) {
            console.log('❌ No users found');
            return;
        }
        const userId = userRes.rows[0].id;
        const eventId = eventRes.rows.length ? eventRes.rows[0].id : null;
        const tripSuggestionId = tripRes.rows.length ? tripRes.rows[0].id : null;

        // Check for action_type or action column
        const hasActionType = columnsResult.rows.some(col => col.column_name === 'action_type');
        const actionCol = hasActionType ? 'action_type' : 'action';

        // Build insert query dynamically
        const insertCols = ['user_id', 'event_id', 'trip_suggestion_id', actionCol, 'value', 'details'];
        const insertVals = [userId, eventId, tripSuggestionId, 'view', 5, { test: true }];
        const insertPlaceholders = insertCols.map((_, i) => `$${i + 1}`).join(', ');
        const insertRes = await pool.query(
            `INSERT INTO user_behavior (${insertCols.join(', ')})\n             VALUES (${insertPlaceholders})\n             RETURNING *`,
            insertVals
        );
        const inserted = insertRes.rows[0];
        console.log('\n✅ Inserted test row:');
        console.log(inserted);

        // 4. Query the test row
        const queryRes = await pool.query(
            'SELECT * FROM user_behavior WHERE id = $1',
            [inserted.id]
        );
        console.log('\n🔍 Queried test row:');
        console.log(queryRes.rows[0]);

        // 5. Clean up
        await pool.query('DELETE FROM user_behavior WHERE id = $1', [inserted.id]);
        console.log('\n🧹 Cleaned up test row');

    } catch (error) {
        console.error('❌ Error during user_behavior test:', error);
    } finally {
        await pool.end();
    }
}

testUserBehavior(); 