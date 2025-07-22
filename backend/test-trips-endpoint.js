const { pool } = require('./config/database');

async function testTripsEndpoint() {
    try {
        console.log('Testing trips endpoint...');
        
        // Test 1: Check if trip_suggestions table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'trip_suggestions'
            );
        `);
        
        console.log('trip_suggestions table exists:', tableExists.rows[0].exists);
        
        if (!tableExists.rows[0].exists) {
            console.log('❌ trip_suggestions table does not exist!');
            return;
        }
        
        // Test 2: Check table structure
        const tableStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = 'trip_suggestions'
            ORDER BY ordinal_position;
        `);
        
        console.log('Table structure:');
        tableStructure.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
        
        // Test 3: Check if there are any records
        const recordCount = await pool.query('SELECT COUNT(*) as count FROM trip_suggestions');
        console.log('Record count:', recordCount.rows[0].count);
        
        // Test 4: Try the actual query from the trips route
        const testUserId = 1; // Use a test user ID
        const query = `
            SELECT ts.*, e.name as event_name, e.artist, e.venue_name, e.venue_city, 
                   e.venue_state, e.event_date, e.ticket_url
            FROM trip_suggestions ts
            JOIN events e ON ts.event_id = e.id
            WHERE ts.user_id = $1
        `;
        
        console.log('Testing query with user_id =', testUserId);
        const result = await pool.query(query, [testUserId]);
        console.log('Query result count:', result.rows.length);
        
        if (result.rows.length > 0) {
            console.log('Sample record:', result.rows[0]);
        }
        
        // Test 5: Check if events table exists and has data
        const eventsCount = await pool.query('SELECT COUNT(*) as count FROM events');
        console.log('Events table count:', eventsCount.rows[0].count);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error testing trips endpoint:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

testTripsEndpoint(); 