// Run artist metadata migration using Node.js
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('🎵 Running Artist Metadata Migration...');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, '../database/migrations/08_create_artist_metadata_table.sql');
        
        if (!fs.existsSync(migrationPath)) {
            console.error('❌ Migration file not found:', migrationPath);
            process.exit(1);
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Split the SQL into individual statements
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`Found ${statements.length} SQL statements to execute`);
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                try {
                    console.log(`Executing statement ${i + 1}/${statements.length}...`);
                    await pool.query(statement);
                    console.log(`✅ Statement ${i + 1} executed successfully`);
                } catch (error) {
                    // Some statements might fail if they already exist (like indexes)
                    if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
                        console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message.split('\n')[0]}`);
                    } else {
                        console.error(`❌ Statement ${i + 1} failed:`, error.message);
                        throw error;
                    }
                }
            }
        }
        
        console.log('✅ Artist metadata migration completed successfully!');
        
        // Verify the migration by checking if the table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'artist_metadata'
            );
        `);
        
        if (tableCheck.rows[0].exists) {
            console.log('✅ artist_metadata table verified');
            
            // Check if data was inserted
            const dataCheck = await pool.query('SELECT COUNT(*) FROM artist_metadata');
            console.log(`✅ Found ${dataCheck.rows[0].count} artist records`);
        } else {
            console.error('❌ artist_metadata table not found after migration');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the migration
if (require.main === module) {
    runMigration();
}

module.exports = { runMigration }; 