// Sync events for artists that users have as interests
const { pool } = require('../config/database');
const eventService = require('../services/eventService');

async function syncUserInterestEvents() {
    console.log('🔄 Starting user interest event sync...');
    
    let totalSynced = 0;
    const syncedArtists = new Set();
    const syncedEventTypes = new Set();

    try {
        // Get all user interests
        const interestsResult = await pool.query(`
            SELECT DISTINCT interest_type, interest_value, priority
            FROM user_interests 
            WHERE interest_type IN ('artist', 'event_type', 'event_subtype')
            ORDER BY priority ASC
        `);

        if (interestsResult.rows.length === 0) {
            console.log('No user interests found to sync events for.');
            return;
        }

        console.log(`Found ${interestsResult.rows.length} user interests to sync events for.`);

        for (const row of interestsResult.rows) {
            const { interest_type, interest_value, priority } = row;
            
            try {
                if (interest_type === 'artist') {
                    // Skip if we already synced this artist recently
                    if (syncedArtists.has(interest_value.toLowerCase())) {
                        continue;
                    }

                    console.log(`🔍 Searching for events by artist: ${interest_value}`);
                    
                    // Search for events by this artist
                    const searchResult = await eventService.searchEventsByArtist(interest_value, {
                        startDateTime: new Date().toISOString(),
                        endDateTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
                        size: 20
                    });

                    if (searchResult.events && searchResult.events.length > 0) {
                        console.log(`✅ Found ${searchResult.events.length} events for artist ${interest_value}`);
                        
                        // Save events to database
                        const savedIds = await eventService.saveEvents(searchResult.events);
                        console.log(`💾 Saved ${savedIds.length} events for artist ${interest_value}`);
                        totalSynced += savedIds.length;
                    } else {
                        console.log(`⚠️ No events found for artist ${interest_value}`);
                    }

                    syncedArtists.add(interest_value.toLowerCase());
                } else if (interest_type === 'event_type' || interest_type === 'event_subtype') {
                    // Skip if we already synced this event type/subtype recently
                    const syncKey = `${interest_type}_${interest_value}`;
                    if (syncedEventTypes.has(syncKey)) {
                        continue;
                    }

                    console.log(`🔍 Searching for ${interest_type} events: ${interest_value}`);
                    
                    // Search for events by this type/subtype
                    const searchOptions = {
                        startDateTime: new Date().toISOString(),
                        endDateTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                        size: 30
                    };

                    // Add type-specific filters
                    if (interest_type === 'event_type') {
                        searchOptions.eventType = interest_value;
                        // Map event types to Ticketmaster classification names
                        const typeMapping = {
                            'music': 'music',
                            'sports': 'sports', 
                            'comedy': 'comedy',
                            'theater': 'arts', // Ticketmaster uses 'arts' for theater
                            'family': 'family'
                        };
                        searchOptions.classificationName = typeMapping[interest_value] || 'music';
                    } else if (interest_type === 'event_subtype') {
                        searchOptions.eventSubtype = interest_value;
                    }

                    const searchResult = await eventService.searchEvents(searchOptions);

                    if (searchResult.events && searchResult.events.length > 0) {
                        console.log(`✅ Found ${searchResult.events.length} ${interest_type} events for ${interest_value}`);
                        
                        // Save events to database
                        const savedIds = await eventService.saveEvents(searchResult.events);
                        console.log(`💾 Saved ${savedIds.length} ${interest_type} events for ${interest_value}`);
                        totalSynced += savedIds.length;
                    } else {
                        console.log(`⚠️ No ${interest_type} events found for ${interest_value}`);
                    }

                    syncedEventTypes.add(syncKey);
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`❌ Error syncing events for ${interest_type} ${interest_value}:`, error.message);
            }
        }

        console.log(`🎉 Sync complete! Total events synced: ${totalSynced}`);
        
    } catch (error) {
        console.error('❌ Error syncing user interest events:', error);
    } finally {
        await pool.end();
    }
}

module.exports = syncUserInterestEvents;

// Run if called directly
if (require.main === module) {
    syncUserInterestEvents().then(() => {
        console.log('User interest sync script completed');
        process.exit(0);
    }).catch(error => {
        console.error('User interest sync script failed:', error);
        process.exit(1);
    });
} 