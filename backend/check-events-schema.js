const { pool } = require('./config/database');
require('dotenv').config();

async function checkEventsSchema() {
    console.log('🔍 Checking events table schema');
    console.log('=' .repeat(60));

    try {
        // Check events table structure
        const eventsSchemaResult = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'events'
            ORDER BY ordinal_position
        `);

        console.log('\n📋 events table columns:');
        eventsSchemaResult.rows.forEach(col => {
            console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
        });

        // Check what tables exist with 'interest' in the name
        const interestTablesResult = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_name LIKE '%interest%'
            AND table_schema = 'public'
        `);

        console.log('\n📋 Tables with "interest" in name:');
        interestTablesResult.rows.forEach(table => {
            console.log(`   - ${table.table_name}`);
        });

        // Check sample events data
        const sampleEventsResult = await pool.query(`
            SELECT id, name, artist, venue, city, state, event_date
            FROM events 
            WHERE event_date >= CURRENT_DATE
            ORDER BY event_date ASC
            LIMIT 5
        `);

        console.log('\n📊 Sample future events:');
        sampleEventsResult.rows.forEach((event, idx) => {
            console.log(`   Event ${idx + 1}: ${event.artist} at ${event.venue} on ${event.event_date}`);
        });

        // Check if there's a direct artist match
        const artistMatchResult = await pool.query(`
            SELECT e.id, e.name, e.artist, e.venue, e.city, e.state, e.event_date
            FROM events e
            WHERE e.event_date >= CURRENT_DATE
            AND LOWER(e.artist) LIKE '%ween%'
            ORDER BY e.event_date ASC
            LIMIT 3
        `);

        console.log('\n🎵 Events matching "Ween" (user interest):');
        artistMatchResult.rows.forEach((event, idx) => {
            console.log(`   ${idx + 1}. ${event.artist} at ${event.venue} on ${event.event_date}`);
        });

    } catch (error) {
        console.error('❌ Error checking schema:', error);
    } finally {
        await pool.end();
    }
}

checkEventsSchema(); 