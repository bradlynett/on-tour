const { pool } = require('../config/database');

async function checkTableStructure() {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'artist_metadata' 
            ORDER BY ordinal_position
        `);
        
        console.log('Artist Metadata Table Structure:');
        result.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type}`);
        });
        
        // Also check what data exists
        const dataResult = await pool.query(`
            SELECT artist_name, created_at 
            FROM artist_metadata 
            LIMIT 5
        `);
        
        console.log('\nSample Artist Metadata:');
        dataResult.rows.forEach(row => {
            console.log(`  ${row.artist_name} (created: ${row.created_at})`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkTableStructure(); 