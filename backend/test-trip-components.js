const { pool } = require('./config/database');

async function testTripComponents() {
    try {
        console.log('Testing trip_components table...');
        
        // Test 1: Check if trip_components table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'trip_components'
            );
        `);
        
        console.log('trip_components table exists:', tableExists.rows[0].exists);
        
        if (!tableExists.rows[0].exists) {
            console.log('❌ trip_components table does not exist!');
            return;
        }
        
        // Test 2: Check table structure
        const tableStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = 'trip_components'
            ORDER BY ordinal_position;
        `);
        
        console.log('Table structure:');
        tableStructure.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
        
        // Test 3: Check if there are any records
        const recordCount = await pool.query('SELECT COUNT(*) as count FROM trip_components');
        console.log('Record count:', recordCount.rows[0].count);
        
        // Test 4: Test the specific query from the trips route
        const testTripSuggestionId = 1; // Use a test trip suggestion ID
        const query = `
            SELECT component_type, provider, price, details, booking_reference
            FROM trip_components
            WHERE trip_suggestion_id = $1
            ORDER BY component_type
        `;
        
        console.log('Testing query with trip_suggestion_id =', testTripSuggestionId);
        const result = await pool.query(query, [testTripSuggestionId]);
        console.log('Query result count:', result.rows.length);
        
        if (result.rows.length > 0) {
            console.log('Sample component:', result.rows[0]);
        }
        
        // Test 5: Check what trip_suggestion_ids exist
        const tripIds = await pool.query(`
            SELECT DISTINCT trip_suggestion_id 
            FROM trip_components 
            ORDER BY trip_suggestion_id 
            LIMIT 5
        `);
        console.log('Available trip_suggestion_ids:', tripIds.rows.map(r => r.trip_suggestion_id));
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error testing trip_components:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

testTripComponents(); 