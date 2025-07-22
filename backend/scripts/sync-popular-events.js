const eventService = require('../services/eventService');

async function syncPopularEvents() {
    console.log('🔄 Syncing popular events from Ticketmaster for all event types...');
    
    // Define event types to sync
    const eventTypes = [
        { name: 'music', classificationName: 'music', keyword: 'concert' },
        { name: 'sports', classificationName: 'sports', keyword: 'game' },
        { name: 'comedy', classificationName: 'comedy', keyword: 'comedy' },
        { name: 'theater', classificationName: 'arts', keyword: 'theater' },
        { name: 'family', classificationName: 'family', keyword: 'family' }
    ];

    let totalSynced = 0;

    try {
        for (const eventType of eventTypes) {
            try {
                console.log(`📡 Syncing ${eventType.name} events...`);
                const result = await eventService.searchEvents({
                    keyword: eventType.keyword,
                    size: 30, // Reduced size per type to avoid rate limits
                    classificationName: eventType.classificationName,
                    sort: 'date,asc'
                });
                
                if (result.events.length > 0) {
                    const savedIds = await eventService.saveEvents(result.events);
                    console.log(`✅ Synced ${savedIds.length} ${eventType.name} events to the database.`);
                    totalSynced += savedIds.length;
                } else {
                    console.log(`⚠️ No ${eventType.name} events found to sync.`);
                }

                // Small delay between event types to be respectful to API
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.error(`❌ Error syncing ${eventType.name} events:`, error.message);
            }
        }

        console.log(`🎉 Sync complete! Total events synced: ${totalSynced}`);
    } catch (error) {
        console.error('❌ Error syncing events:', error.message);
    }
}

module.exports = syncPopularEvents;

// Run if called directly
if (require.main === module) {
    syncPopularEvents().then(() => {
        console.log('Sync script completed');
        process.exit(0);
    }).catch(error => {
        console.error('Sync script failed:', error);
        process.exit(1);
    });
} 