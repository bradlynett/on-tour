// Test script for updated_at trigger on events, artist_aliases, and artist_metadata tables
const { pool } = require('../config/database');

async function testUpdatedAtTrigger() {
    try {
        // EVENTS TABLE
        const eventInsert = await pool.query(`
            INSERT INTO events (external_id, name, event_date)
            VALUES ('test_ext_id', 'Test Event', NOW())
            RETURNING id, created_at, updated_at
        `);
        const eventId = eventInsert.rows[0].id;
        console.log('Inserted event:', eventInsert.rows[0]);

        await new Promise(res => setTimeout(res, 1000));
        await pool.query(`UPDATE events SET name = 'Test Event Updated' WHERE id = $1`, [eventId]);
        const eventAfter = await pool.query(`SELECT created_at, updated_at FROM events WHERE id = $1`, [eventId]);
        console.log('Event after update:', eventAfter.rows[0]);

        // ARTIST_ALIASES TABLE
        const aliasInsert = await pool.query(`
            INSERT INTO artist_aliases (primary_name, alias_name)
            VALUES ('test_primary', 'test_alias')
            RETURNING id, created_at, updated_at
        `);
        const aliasId = aliasInsert.rows[0].id;
        console.log('Inserted artist_alias:', aliasInsert.rows[0]);

        await new Promise(res => setTimeout(res, 1000));
        await pool.query(`UPDATE artist_aliases SET alias_name = 'test_alias_updated' WHERE id = $1`, [aliasId]);
        const aliasAfter = await pool.query(`SELECT created_at, updated_at FROM artist_aliases WHERE id = $1`, [aliasId]);
        console.log('Artist_alias after update:', aliasAfter.rows[0]);

        // ARTIST_METADATA TABLE
        const metaInsert = await pool.query(`
            INSERT INTO artist_metadata (artist_name, normalized_name, genres, popularity_score)
            VALUES ('Test Artist', 'test artist', ARRAY['Test'], 1)
            RETURNING id, created_at, updated_at
        `);
        const metaId = metaInsert.rows[0].id;
        console.log('Inserted artist_metadata:', metaInsert.rows[0]);

        await new Promise(res => setTimeout(res, 1000));
        await pool.query(`UPDATE artist_metadata SET artist_name = 'Test Artist Updated' WHERE id = $1`, [metaId]);
        const metaAfter = await pool.query(`SELECT created_at, updated_at FROM artist_metadata WHERE id = $1`, [metaId]);
        console.log('Artist_metadata after update:', metaAfter.rows[0]);

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

testUpdatedAtTrigger(); 