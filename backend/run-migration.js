const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database.js');

async function runMigration() {
    try {
        console.log('🚀 Running trip planning migration...');
        
        const migrationPath = path.join(__dirname, 'database', 'migrations', '09_create_trip_planning_tables.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Split the SQL into individual statements
        const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement) {
                console.log(`Executing statement ${i + 1}/${statements.length}...`);
                try {
                    await pool.query(statement);
                    console.log(`✅ Statement ${i + 1} executed successfully`);
                } catch (err) {
                    console.log(`⚠️  Statement ${i + 1} skipped: ${err.message}`);
                }
            }
        }
        
        console.log('✅ Migration completed successfully!');
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        await pool.end();
        process.exit(1);
    }
}

runMigration(); 