const { pool } = require('./config/database');

async function testTables() {
    try {
        console.log('Testing database tables...');
        
        // Check for trip-related tables
        const tripTablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%trip%'
        `);
        
        console.log('Trip tables found:', tripTablesResult.rows.map(r => r.table_name));
        
        // Check if trip_suggestions table exists
        const tripSuggestionsResult = await pool.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'trip_suggestions'
        `);
        
        console.log('trip_suggestions table exists:', tripSuggestionsResult.rows[0].count > 0);
        
        // Check if trip_plans table exists
        const tripPlansResult = await pool.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'trip_plans'
        `);
        
        console.log('trip_plans table exists:', tripPlansResult.rows[0].count > 0);
        
        // Try to query trip_suggestions if it exists
        if (tripSuggestionsResult.rows[0].count > 0) {
            const sampleResult = await pool.query('SELECT COUNT(*) as count FROM trip_suggestions');
            console.log('trip_suggestions count:', sampleResult.rows[0].count);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Database error:', error.message);
        process.exit(1);
    }
}

testTables(); 