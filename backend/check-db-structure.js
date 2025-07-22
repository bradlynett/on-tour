const { pool } = require('./config/database');

async function checkDatabaseStructure() {
    try {
        console.log('🔍 Checking Database Structure...\n');

        // Check if trip_components table exists
        console.log('1. Checking trip_components table...');
        const componentsResult = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'trip_components'
            ORDER BY ordinal_position
        `);
        
        if (componentsResult.rows.length === 0) {
            console.log('❌ trip_components table does not exist!');
        } else {
            console.log('✅ trip_components table exists with columns:');
            componentsResult.rows.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });
        }

        // Check if trip_suggestions table exists
        console.log('\n2. Checking trip_suggestions table...');
        const suggestionsResult = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'trip_suggestions'
            ORDER BY ordinal_position
        `);
        
        if (suggestionsResult.rows.length === 0) {
            console.log('❌ trip_suggestions table does not exist!');
        } else {
            console.log('✅ trip_suggestions table exists with columns:');
            suggestionsResult.rows.forEach(col => {
                console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });
        }

        // Check sample data
        console.log('\n3. Checking sample data...');
        const sampleSuggestions = await pool.query('SELECT COUNT(*) as count FROM trip_suggestions');
        console.log(`   trip_suggestions: ${sampleSuggestions.rows[0].count} records`);

        const sampleComponents = await pool.query('SELECT COUNT(*) as count FROM trip_components');
        console.log(`   trip_components: ${sampleComponents.rows[0].count} records`);

        // Check recent trip suggestions
        console.log('\n4. Recent trip suggestions:');
        const recentSuggestions = await pool.query(`
            SELECT id, user_id, name, status, booking_id, booking_status 
            FROM trip_suggestions 
            ORDER BY created_at DESC 
            LIMIT 3
        `);
        
        recentSuggestions.rows.forEach(suggestion => {
            console.log(`   ID: ${suggestion.id}, User: ${suggestion.user_id}, Name: ${suggestion.name}, Status: ${suggestion.status}, Booking: ${suggestion.booking_id || 'none'}`);
        });

    } catch (error) {
        console.error('❌ Error checking database structure:', error.message);
    } finally {
        await pool.end();
    }
}

checkDatabaseStructure(); 