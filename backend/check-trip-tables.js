const { pool } = require('./config/database');

async function checkTripTables() {
    try {
        console.log('Checking trip-related tables...');
        
        // Check all tables with 'trip' in the name
        const tripTables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%trip%'
            ORDER BY table_name
        `);
        
        console.log('Trip-related tables found:');
        tripTables.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });
        
        // Check trip_components table specifically
        const componentsExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'trip_components'
            );
        `);
        
        if (componentsExists.rows[0].exists) {
            console.log('\n✅ trip_components table exists');
            
            // Check its structure
            const structure = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' 
                AND table_name = 'trip_components'
                ORDER BY ordinal_position
            `);
            
            console.log('Columns:');
            structure.rows.forEach(row => {
                console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
            });
            
            // Check if it has trip_suggestion_id or trip_plan_id
            const hasSuggestionId = structure.rows.some(r => r.column_name === 'trip_suggestion_id');
            const hasPlanId = structure.rows.some(r => r.column_name === 'trip_plan_id');
            
            console.log(`\nHas trip_suggestion_id: ${hasSuggestionId}`);
            console.log(`Has trip_plan_id: ${hasPlanId}`);
            
            // Check record count
            const count = await pool.query('SELECT COUNT(*) as count FROM trip_components');
            console.log(`Record count: ${count.rows[0].count}`);
            
            if (count.rows[0].count > 0) {
                // Show sample records
                const samples = await pool.query('SELECT * FROM trip_components LIMIT 3');
                console.log('\nSample records:');
                samples.rows.forEach((row, i) => {
                    console.log(`  Record ${i + 1}:`, row);
                });
            }
        } else {
            console.log('\n❌ trip_components table does not exist');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking trip tables:', error.message);
        process.exit(1);
    }
}

checkTripTables(); 