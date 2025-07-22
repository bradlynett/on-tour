// Scheduled script to sync events for user interests
// This can be run via cron, Windows Task Scheduler, or any other scheduling tool

const { pool } = require('../config/database');
const eventService = require('../services/eventService');
const fs = require('fs');
const path = require('path');

// Logging setup
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'user-interest-sync.log');

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    // Console output
    console.log(logMessage.trim());
    
    // File output
    fs.appendFileSync(logFile, logMessage);
}

async function syncUserInterestEvents() {
    const startTime = new Date();
    log('🎯 Starting scheduled sync of user interest events...');
    
    try {
        // Get all user interests
        const interestsResult = await pool.query(`
            SELECT DISTINCT interest_type, interest_value, priority
            FROM user_interests 
            WHERE interest_type IN ('artist', 'event_type', 'event_subtype')
            ORDER BY priority ASC
        `);

        if (interestsResult.rows.length === 0) {
            log('No user interests found to sync events for.');
            return;
        }

        log(`Found ${interestsResult.rows.length} user interests to sync events for.`);

        let totalSynced = 0;
        let totalErrors = 0;
        const syncedArtists = new Set();
        const syncedEventTypes = new Set();

        for (const row of interestsResult.rows) {
            const { interest_type, interest_value, priority } = row;
            
            try {
                if (interest_type === 'artist') {
                    // Skip if we already synced this artist in this run
                    if (syncedArtists.has(interest_value.toLowerCase())) {
                        continue;
                    }

                    log(`🔍 Searching for events by artist: ${interest_value}`);
                    
                    // Search for events by this artist
                    const searchResult = await eventService.searchEventsByArtist(interest_value, {
                        startDateTime: new Date().toISOString(),
                        endDateTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
                        size: 20
                    });

                    if (searchResult.events && searchResult.events.length > 0) {
                        log(`✅ Found ${searchResult.events.length} events for artist ${interest_value}`);
                        
                        // Save events to database
                        const savedIds = await eventService.saveEvents(searchResult.events);
                        log(`💾 Saved ${savedIds.length} events for artist ${interest_value}`);
                        totalSynced += savedIds.length;
                    } else {
                        log(`⚠️ No events found for artist ${interest_value}`);
                    }

                    syncedArtists.add(interest_value.toLowerCase());
                } else if (interest_type === 'event_type' || interest_type === 'event_subtype') {
                    // Skip if we already synced this event type/subtype in this run
                    const syncKey = `${interest_type}_${interest_value}`;
                    if (syncedEventTypes.has(syncKey)) {
                        continue;
                    }

                    log(`🔍 Searching for ${interest_type} events: ${interest_value}`);
                    
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
                        log(`✅ Found ${searchResult.events.length} ${interest_type} events for ${interest_value}`);
                        
                        // Save events to database
                        const savedIds = await eventService.saveEvents(searchResult.events);
                        log(`💾 Saved ${savedIds.length} ${interest_type} events for ${interest_value}`);
                        totalSynced += savedIds.length;
                    } else {
                        log(`⚠️ No ${interest_type} events found for ${interest_value}`);
                    }

                    syncedEventTypes.add(syncKey);
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                log(`❌ Error syncing events for ${interest_type} ${interest_value}: ${error.message}`);
                totalErrors++;
            }
        }

        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;
        
        log(`🎉 Sync complete!`);
        log(`   Total events synced: ${totalSynced}`);
        log(`   Total errors: ${totalErrors}`);
        log(`   Duration: ${duration.toFixed(2)} seconds`);
        
        // Write summary to a separate file for monitoring
        const summary = {
            timestamp: new Date().toISOString(),
            totalArtists: interestsResult.rows.length,
            totalEventsSynced: totalSynced,
            totalErrors: totalErrors,
            durationSeconds: duration,
            status: totalErrors === 0 ? 'success' : 'partial_success'
        };
        
        fs.writeFileSync(
            path.join(logDir, 'last-sync-summary.json'), 
            JSON.stringify(summary, null, 2)
        );
        
    } catch (error) {
        log(`❌ Fatal error during sync: ${error.message}`);
        log(`Stack trace: ${error.stack}`);
        
        // Write error summary
        const errorSummary = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            status: 'failed'
        };
        
        fs.writeFileSync(
            path.join(logDir, 'last-sync-summary.json'), 
            JSON.stringify(errorSummary, null, 2)
        );
        
        throw error;
    } finally {
        await pool.end();
    }
}

// If this script is run directly (not imported), execute the sync
if (require.main === module) {
    syncUserInterestEvents()
        .then(() => {
            log('✅ Sync script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            log(`❌ Sync script failed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { syncUserInterestEvents }; 