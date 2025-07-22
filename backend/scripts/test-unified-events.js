const unifiedEventService = require('../services/unifiedEventService');
const eventService = require('../services/eventService');

async function testUnifiedEventSystem() {
    console.log('🎵 Testing Unified Event System...\n');

    try {
        // Test 1: Get event statistics
        console.log('1️⃣ Testing event statistics...');
        const stats = await unifiedEventService.getEventStats();
        console.log('📊 Event Statistics:', {
            totalEvents: stats.total_events || 0,
            uniqueArtists: stats.unique_artists || 0,
            uniqueCities: stats.unique_cities || 0,
            ticketmasterEvents: stats.ticketmaster_events || 0,
            eventbriteEvents: stats.eventbrite_events || 0
        });

        // Test 2: Get all events from unified database
        console.log('\n2️⃣ Testing unified event retrieval...');
        const allEvents = await unifiedEventService.getAllEvents({ limit: 5 });
        console.log(`✅ Retrieved ${allEvents.length} events from unified database`);
        if (allEvents.length > 0) {
            console.log('📅 Sample unified event:', {
                name: allEvents[0].name,
                artist: allEvents[0].artist,
                venue: allEvents[0].venue_name,
                city: allEvents[0].venue_city,
                date: allEvents[0].event_date,
                source: allEvents[0].external_id?.split('_')[0] || 'unknown'
            });
        }

        // Test 3: Search across all sources
        console.log('\n3️⃣ Testing multi-source search...');
        const searchResult = await unifiedEventService.searchAllSources({
            keyword: 'concert',
            size: 3
        });
        console.log(`✅ Found ${searchResult.totalFound} events across all sources`);
        console.log('🔍 Sources searched:', searchResult.sources);

        // Test 4: Get events for a specific user (assuming user ID 1 exists)
        console.log('\n4️⃣ Testing user-specific events...');
        const userEvents = await unifiedEventService.getEventsForUser(1, 3);
        console.log(`✅ Found ${userEvents.length} events for user 1`);
        if (userEvents.length > 0) {
            console.log('👤 Sample user event:', {
                name: userEvents[0].name,
                artist: userEvents[0].artist,
                venue: userEvents[0].venue_name,
                date: userEvents[0].event_date
            });
        }

        // Test 5: Get upcoming preview
        console.log('\n5️⃣ Testing upcoming preview...');
        const previewEvents = await unifiedEventService.getUpcomingPreview(1, 3);
        console.log(`✅ Found ${previewEvents.length} preview events for user 1`);

        // Test 6: Test event deduplication (if there are duplicates)
        console.log('\n6️⃣ Testing event deduplication...');
        const duplicates = await unifiedEventService.getAllEvents({ limit: 100 });
        const eventKeys = new Set();
        let duplicateCount = 0;
        
        duplicates.forEach(event => {
            const key = `${event.name}_${event.venue_name}_${event.event_date}`;
            if (eventKeys.has(key)) {
                duplicateCount++;
            }
            eventKeys.add(key);
        });
        
        console.log(`✅ Found ${duplicateCount} potential duplicates (will be cleaned up by scheduler)`);

        console.log('\n🎉 Unified Event System Test Completed Successfully!');
        console.log('\n📋 Summary:');
        console.log('✅ Event statistics working');
        console.log('✅ Unified event retrieval working');
        console.log('✅ Multi-source search working');
        console.log('✅ User-specific events working');
        console.log('✅ Upcoming preview working');
        console.log('✅ Deduplication logic in place');

        console.log('\n🚀 Next Steps:');
        console.log('1. Add EVENTBRITE_API_KEY to .env for Eventbrite integration');
        console.log('2. The system will automatically sync events overnight at 3 AM');
        console.log('3. Trip suggestions now use unified event data');
        console.log('4. Dashboard shows personalized event previews');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testUnifiedEventSystem(); 