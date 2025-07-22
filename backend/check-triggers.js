const { pool } = require('./config/database.js');

async function checkDatabase() {
    try {
        console.log('Checking existing triggers...');
        const triggers = await pool.query('SELECT trigger_name FROM information_schema.triggers WHERE trigger_name LIKE \'%updated_at%\'');
        console.log('Existing updated_at triggers:', triggers.rows.map(t => t.trigger_name));
        
        console.log('\nChecking existing functions...');
        const functions = await pool.query('SELECT routine_name FROM information_schema.routines WHERE routine_name = \'update_updated_at_column\'');
        console.log('update_updated_at_column function exists:', functions.rows.length > 0);
        
        console.log('\nChecking trip_plans table...');
        const tables = await pool.query('SELECT table_name FROM information_schema.tables WHERE table_name = \'trip_plans\'');
        console.log('trip_plans table exists:', tables.rows.length > 0);
        
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        await pool.end();
        process.exit(1);
    }
}

checkDatabase(); 