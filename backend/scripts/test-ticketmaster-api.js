const eventService = require('../services/eventService');

async function testTicketmasterAPI() {
    console.log('🎵 Testing Ticketmaster API Integration...\n');

    try {
        // Test 1: Search for upcoming music events
        console.log('1️⃣ Testing general event search...');
        const searchResult = await eventService.searchEvents({
            keyword: 'concert',
            size: 5,
            classificationName: 'music'
        });
        
        console.log(`✅ Found ${searchResult.events.length} events`);
        if (searchResult.events.length > 0) {
            console.log('📅 Sample event:', {
                name: searchResult.events[0].name,
                artist: searchResult.events[0].artist,
                venue: searchResult.events[0].venueName,
                city: searchResult.events[0].venueCity,
                date: searchResult.events[0].eventDate,
                price: `$${searchResult.events[0].minPrice || 'N/A'} - $${searchResult.events[0].maxPrice || 'N/A'}`
            });
        }

        // Test 2: Search by artist
        console.log('\n2️⃣ Testing artist search...');
        const artistResult = await eventService.searchEventsByArtist('Taylor Swift', { size: 3 });
        console.log(`✅ Found ${artistResult.events.length} Taylor Swift events`);
        if (artistResult.events.length > 0) {
            console.log('🎤 Sample artist event:', {
                name: artistResult.events[0].name,
                venue: artistResult.events[0].venueName,
                city: artistResult.events[0].venueCity,
                date: artistResult.events[0].eventDate
            });
        }

        // Test 3: Search by city
        console.log('\n3️⃣ Testing city search...');
        const cityResult = await eventService.searchEventsByCity('Nashville', 'TN', { size: 3 });
        console.log(`✅ Found ${cityResult.events.length} events in Nashville, TN`);
        if (cityResult.events.length > 0) {
            console.log('🏙️ Sample city event:', {
                name: cityResult.events[0].name,
                artist: cityResult.events[0].artist,
                venue: cityResult.events[0].venueName,
                date: cityResult.events[0].eventDate
            });
        }

        // Test 4: Search by venue
        console.log('\n4️⃣ Testing venue search...');
        const venueResult = await eventService.searchEventsByVenue('Madison Square Garden', { size: 3 });
        console.log(`✅ Found ${venueResult.events.length} events at Madison Square Garden`);
        if (venueResult.events.length > 0) {
            console.log('🏟️ Sample venue event:', {
                name: venueResult.events[0].name,
                artist: venueResult.events[0].artist,
                date: venueResult.events[0].eventDate,
                price: `$${venueResult.events[0].minPrice || 'N/A'} - $${venueResult.events[0].maxPrice || 'N/A'}`
            });
        }

        // Test 5: Get upcoming events
        console.log('\n5️⃣ Testing upcoming events...');
        const upcomingResult = await eventService.getUpcomingEvents(
            new Date().toISOString(),
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Next 30 days
            { size: 3 }
        );
        console.log(`✅ Found ${upcomingResult.events.length} upcoming events`);
        if (upcomingResult.events.length > 0) {
            console.log('📅 Sample upcoming event:', {
                name: upcomingResult.events[0].name,
                artist: upcomingResult.events[0].artist,
                venue: upcomingResult.events[0].venueName,
                city: upcomingResult.events[0].venueCity,
                date: upcomingResult.events[0].eventDate
            });
        }

        // Test 6: Save events to database
        console.log('\n6️⃣ Testing database save...');
        if (searchResult.events.length > 0) {
            const sampleEvent = searchResult.events[0];
            const savedId = await eventService.saveEvent(sampleEvent);
            console.log(`✅ Saved event to database with ID: ${savedId}`);
            
            // Test retrieving from database
            const dbEvents = await eventService.getEvents({ limit: 1 });
            console.log(`✅ Retrieved ${dbEvents.length} events from database`);
        }

        console.log('\n🎉 All Ticketmaster API tests completed successfully!');
        console.log('\n📋 Summary:');
        console.log('✅ Event search working');
        console.log('✅ Artist search working');
        console.log('✅ City search working');
        console.log('✅ Venue search working');
        console.log('✅ Upcoming events working');
        console.log('✅ Database save/retrieve working');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.message.includes('API key not configured')) {
            console.log('\n🔑 To fix this:');
            console.log('1. Get a Ticketmaster API key from: https://developer-acct.ticketmaster.com/');
            console.log('2. Add TICKETMASTER_API_KEY=your_api_key to your .env file');
            console.log('3. Restart the server');
        }
        
        process.exit(1);
    }
}

// Run the test
testTicketmasterAPI(); 