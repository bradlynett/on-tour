const cron = require('node-cron');
const tripEngine = require('./tripSuggestionEngine');
const { pool } = require('../config/database');

class SchedulerService {
    constructor() {
        this.tripEngine = tripEngine;
        this.isRunning = false;
        this.serviceFeeRate = 0.05;
        this.minServiceFee = 25;
    }

    // Schedule trip suggestions
    scheduleTripSuggestions() {
        // Run every day at 2 AM
        cron.schedule('0 2 * * *', async () => {
            console.log('🕐 Running scheduled trip suggestions...');
            try {
                await this.generateAllTripSuggestions();
                console.log('✅ Scheduled trip suggestions completed');
            } catch (error) {
                console.error('❌ Scheduled trip suggestions failed:', error);
            }
        });
        console.log('🕐 Trip suggestions scheduled for 2 AM daily');
    }

    // Schedule event syncing
    scheduleEventSyncing() {
        // Run every night at 3 AM
        cron.schedule('0 3 * * *', async () => {
            console.log('🕐 Running scheduled event sync...');
            try {
                await this.syncAllEventSources();
                console.log('✅ Scheduled event sync completed');
            } catch (error) {
                console.error('❌ Scheduled event sync failed:', error);
            }
        });
        console.log('🕐 Event syncing scheduled for 3 AM daily');
    }

    // Sync all event sources
    async syncAllEventSources() {
        const eventService = require('./eventService');
        const eventbriteService = require('./eventbriteService');
        
        console.log('🔄 Starting multi-source event sync for all event types...');
        
        try {
            // Define event types to sync
            const eventTypes = [
                { name: 'music', classificationName: 'music', keyword: 'concert' },
                { name: 'sports', classificationName: 'sports', keyword: 'game' },
                { name: 'comedy', classificationName: 'comedy', keyword: 'comedy' },
                { name: 'theater', classificationName: 'arts', keyword: 'theater' },
                { name: 'family', classificationName: 'family', keyword: 'family' }
            ];

            let totalSynced = 0;

            // Sync from Ticketmaster for each event type
            for (const eventType of eventTypes) {
                try {
                    console.log(`📡 Syncing ${eventType.name} events from Ticketmaster...`);
                    const ticketmasterResult = await eventService.searchEvents({
                        keyword: eventType.keyword,
                        size: 50, // Reduced size per type to avoid rate limits
                        classificationName: eventType.classificationName,
                        sort: 'date,asc'
                    });
                    
                    if (ticketmasterResult.events.length > 0) {
                        const savedIds = await eventService.saveEvents(ticketmasterResult.events);
                        console.log(`✅ Synced ${savedIds.length} ${eventType.name} events from Ticketmaster`);
                        totalSynced += savedIds.length;
                    } else {
                        console.log(`⚠️ No ${eventType.name} events found from Ticketmaster`);
                    }

                    // Small delay between event types to be respectful to API
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (error) {
                    console.log(`⚠️ Failed to sync ${eventType.name} events from Ticketmaster:`, error.message);
                }
            }

            // Sync from Eventbrite (if service exists)
            try {
                console.log('📡 Syncing from Eventbrite...');
                const eventbriteResult = await eventbriteService.searchEvents({
                    keyword: 'event',
                    size: 100 // Eventbrite can handle more diverse events
                });
                
                if (eventbriteResult.events.length > 0) {
                    const savedIds = await eventService.saveEvents(eventbriteResult.events);
                    console.log(`✅ Synced ${savedIds.length} events from Eventbrite`);
                    totalSynced += savedIds.length;
                }
            } catch (error) {
                console.log('⚠️ Eventbrite sync skipped (service not configured)');
            }

            // Deduplicate and merge events
            await this.deduplicateEvents();
            
            console.log(`✅ Multi-source event sync completed. Total events synced: ${totalSynced}`);
        } catch (error) {
            console.error('❌ Event sync failed:', error);
            throw error;
        }
    }

    // Deduplicate events across sources
    async deduplicateEvents() {
        console.log('🔍 Deduplicating events...');
        
        try {
            // Find and merge duplicate events
            const result = await pool.query(`
                WITH duplicates AS (
                    SELECT 
                        name,
                        artist,
                        venue_name,
                        venue_city,
                        event_date,
                        COUNT(*) as count,
                        MIN(id) as keep_id,
                        array_agg(id) as all_ids
                    FROM events 
                    WHERE event_date >= CURRENT_DATE
                    GROUP BY name, artist, venue_name, venue_city, event_date
                    HAVING COUNT(*) > 1
                )
                SELECT * FROM duplicates
            `);

            if (result.rows.length > 0) {
                console.log(`Found ${result.rows.length} sets of duplicate events`);
                
                for (const duplicate of result.rows) {
                    // Keep the first event, delete the rest
                    const deleteIds = duplicate.all_ids.filter(id => id !== duplicate.keep_id);
                    
                    if (deleteIds.length > 0) {
                        await pool.query(`
                            DELETE FROM events 
                            WHERE id = ANY($1)
                        `, [deleteIds]);
                        
                        console.log(`Merged ${deleteIds.length} duplicates for: ${duplicate.name}`);
                    }
                }
            }
            
            console.log('✅ Event deduplication completed');
        } catch (error) {
            console.error('❌ Event deduplication failed:', error);
            throw error;
        }
    }

    // Generate trip suggestions for all users
    async generateTripSuggestionsForAllUsers() {
        if (this.isRunning) {
            console.log('⏳ Trip suggestions generation already running, skipping...');
            return;
        }

        this.isRunning = true;
        const startTime = new Date();
        
        try {
            console.log(`🔄 Starting scheduled trip suggestions generation at ${startTime.toISOString()}`);
            
            const usersResult = await pool.query('SELECT id, email FROM users');
            const users = usersResult.rows;
            let totalSuggestions = 0;
            let successCount = 0;
            let errorCount = 0;

            for (const user of users) {
                try {
                    console.log(`➡️  User: ${user.email} (ID: ${user.id})`);
                    const result = await this.tripEngine.generateTripSuggestions(user.id, 5);
                    const count = result.suggestions ? result.suggestions.length : 0;
                    totalSuggestions += count;
                    successCount++;
                    console.log(`   ✅ Generated ${count} suggestions.`);
                } catch (err) {
                    errorCount++;
                    console.error(`   ❌ Error generating suggestions for user ${user.email}:`, err.message);
                }
            }

            const endTime = new Date();
            const duration = (endTime - startTime) / 1000; // seconds
            
            console.log(`\n🎉 Scheduled trip suggestions completed:`);
            console.log(`   📊 Total suggestions generated: ${totalSuggestions}`);
            console.log(`   ✅ Successful users: ${successCount}`);
            console.log(`   ❌ Failed users: ${errorCount}`);
            console.log(`   ⏱️  Duration: ${duration.toFixed(2)} seconds`);
            console.log(`   🕐 Completed at: ${endTime.toISOString()}`);

        } catch (err) {
            console.error('❌ Scheduled trip suggestions generation failed:', err);
        } finally {
            this.isRunning = false;
        }
    }

    // Manual trigger for testing
    async triggerManualGeneration() {
        console.log('🔧 Manually triggering trip suggestions generation...');
        await this.generateTripSuggestionsForAllUsers();
    }

    // Get scheduler status
    getStatus() {
        return {
            isRunning: this.isRunning,
            scheduled: true,
            nextRun: 'Every hour at minute 0'
        };
    }
}

module.exports = SchedulerService; 