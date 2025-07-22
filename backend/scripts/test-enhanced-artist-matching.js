// Test script for enhanced artist matching functionality
const TripSuggestionEngine = require('../services/tripSuggestionEngine');
const { pool } = require('../config/database');

async function testArtistMatching() {
    console.log('🎵 Testing Enhanced Artist Matching System\n');

    try {
        // Test 1: Basic artist name variations
        console.log('1. Testing basic artist name variations:');
        const testArtists = [
            'Taylor Swift',
            'taylor swift',
            'TAYLOR SWIFT',
            'taylor alison swift',
            'tswift',
            'tay'
        ];

        for (const artist of testArtists) {
            const patterns = await TripSuggestionEngine.generateArtistMatchPatterns(artist);
            console.log(`   "${artist}" -> ${patterns.patterns.length} patterns:`, patterns.patterns.slice(0, 5));
        }

        // Test 2: Special character handling
        console.log('\n2. Testing special character handling:');
        const specialArtists = [
            'Beyoncé',
            'Beyonce',
            'Beyoncé Knowles-Carter',
            'Bad Bunny',
            'The Weeknd',
            'Weeknd'
        ];

        for (const artist of specialArtists) {
            const patterns = await TripSuggestionEngine.generateArtistMatchPatterns(artist);
            console.log(`   "${artist}" -> ${patterns.patterns.length} patterns:`, patterns.patterns.slice(0, 5));
        }

        // Test 3: Match scoring
        console.log('\n3. Testing match scoring:');
        const matchTests = [
            { interest: 'Taylor Swift', eventArtist: 'Taylor Swift', expected: 'Exact match' },
            { interest: 'Taylor Swift', eventArtist: 'taylor swift', expected: 'Case insensitive' },
            { interest: 'Taylor Swift', eventArtist: 'Taylor Swift & Ed Sheeran', expected: 'Contains match' },
            { interest: 'Taylor', eventArtist: 'Taylor Swift', expected: 'Partial match' },
            { interest: 'Swift', eventArtist: 'Taylor Swift', expected: 'Word match' },
            { interest: 'Taylor Swift', eventArtist: 'tswift', expected: 'Alias match' },
            { interest: 'Drake', eventArtist: 'Aubrey Drake Graham', expected: 'Full name match' },
            { interest: 'Drake', eventArtist: 'Drizzy', expected: 'Nickname match' }
        ];

        for (const test of matchTests) {
            const score = TripSuggestionEngine.calculateArtistMatchScore(
                test.interest, 
                test.eventArtist, 
                1
            );
            console.log(`   "${test.interest}" vs "${test.eventArtist}" -> Score: ${score} (${test.expected})`);
        }

        // Test 4: Database alias operations
        console.log('\n4. Testing database alias operations:');
        
        // Create a test alias
        const testAlias = await TripSuggestionEngine.createArtistAlias('test artist', 'test alias', 0.9);
        console.log(`   Created alias: ${testAlias.primary_name} -> ${testAlias.alias_name}`);

        // Retrieve aliases
        const aliases = await TripSuggestionEngine.getArtistAliasesFromDB('test artist');
        console.log(`   Retrieved aliases for 'test artist':`, aliases);

        // Update confidence
        await TripSuggestionEngine.updateArtistAliasConfidence('test artist', 'test alias', 0.95);
        console.log(`   Updated confidence for test alias`);

        // Test 5: Learning from events
        console.log('\n5. Testing alias learning:');
        await TripSuggestionEngine.learnArtistAliasFromEvent('Taylor Alison Swift', 'Taylor Swift');
        console.log(`   Learned alias from event matching`);

        // Test 6: Complex artist matching scenarios
        console.log('\n6. Testing complex scenarios:');
        const complexTests = [
            'The Weeknd',
            'Weeknd',
            'Abel Makkonen Tesfaye',
            'Post Malone',
            'Posty',
            'Austin Richard Post',
            'Lady Gaga',
            'Gaga',
            'Stefani Joanne Angelina Germanotta'
        ];

        for (const artist of complexTests) {
            const patterns = await TripSuggestionEngine.generateArtistMatchPatterns(artist);
            console.log(`   "${artist}" -> ${patterns.patterns.length} patterns`);
        }

        // Test 7: Performance test with multiple interests
        console.log('\n7. Testing performance with multiple interests:');
        const mockInterests = [
            { interest_type: 'artist', interest_value: 'Taylor Swift', priority: 1 },
            { interest_type: 'artist', interest_value: 'Drake', priority: 2 },
            { interest_type: 'artist', interest_value: 'The Weeknd', priority: 1 },
            { interest_type: 'venue', interest_value: 'Madison Square Garden', priority: 1 },
            { interest_type: 'city', interest_value: 'New York', priority: 1 }
        ];

        const startTime = Date.now();
        const events = await TripSuggestionEngine.findEventsByInterests(mockInterests);
        const endTime = Date.now();

        console.log(`   Found ${events.length} events in ${endTime - startTime}ms`);
        
        if (events.length > 0) {
            console.log(`   First event: ${events[0].artist} at ${events[0].venue_name}`);
            if (events[0].matchScore) {
                console.log(`   Match score: ${events[0].matchScore}`);
            }
        }

        console.log('\n✅ All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

// Run the test
if (require.main === module) {
    testArtistMatching();
}

module.exports = { testArtistMatching }; 