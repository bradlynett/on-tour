const tripEngine = require('./services/tripSuggestionEngine');

async function testTributeBandFiltering() {
    console.log('🎵 Testing Tribute Band Filtering...\n');

    // Test cases for tribute band detection
    const testCases = [
        { name: 'The Beatles Tribute Band', expected: true },
        { name: 'Pink Floyd Experience', expected: true },
        { name: 'Led Zeppelin Revival', expected: true },
        { name: 'Queen Tribute Show', expected: true },
        { name: 'The Rolling Stones Project', expected: true },
        { name: 'A Tribute to Michael Jackson', expected: true },
        { name: 'The Music of Prince', expected: true },
        { name: 'Elvis Presley as The King', expected: true },
        { name: 'Tribute to The Doors', expected: true },
        { name: 'The Eagles Revisited', expected: true },
        { name: 'U2 Tribute Act', expected: true },
        { name: 'The Who Replay', expected: true },
        { name: 'Bruce Springsteen Homage', expected: true },
        { name: 'Celebration of David Bowie', expected: true },
        { name: 'The Real Beatles', expected: false },
        { name: 'Pink Floyd Live', expected: false },
        { name: 'Led Zeppelin Concert', expected: false },
        { name: 'Queen Official Tour', expected: false },
        { name: 'The Rolling Stones', expected: false },
        { name: 'Michael Jackson Tribute', expected: true },
        { name: 'Prince and The Revolution', expected: false },
        { name: 'Elvis Presley', expected: false },
        { name: 'The Doors', expected: false },
        { name: 'The Eagles', expected: false }
    ];

    console.log('🔍 Testing tribute band detection:');
    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
        const isTribute = tripEngine.isTributeBand(testCase.name);
        const status = isTribute === testCase.expected ? '✅ PASS' : '❌ FAIL';
        const result = isTribute ? 'TRIBUTE' : 'ORIGINAL';
        const expected = testCase.expected ? 'TRIBUTE' : 'ORIGINAL';
        
        console.log(`${status} "${testCase.name}" -> ${result} (expected: ${expected})`);
        
        if (isTribute === testCase.expected) {
            passed++;
        } else {
            failed++;
        }
    }

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
    console.log(`🎯 Accuracy: ${((passed / testCases.length) * 100).toFixed(1)}%`);

    // Test with metadata
    console.log('\n🔍 Testing with metadata:');
    const metadataTest = {
        name: 'Test Band',
        is_tribute: true,
        genres: ['tribute', 'rock']
    };
    
    const withMetadata = tripEngine.isTributeBand('Test Band', metadataTest);
    console.log(`✅ With metadata (is_tribute: true): ${withMetadata ? 'TRIBUTE' : 'ORIGINAL'}`);

    const metadataTest2 = {
        name: 'Test Band 2',
        is_tribute: false,
        genres: ['rock', 'pop']
    };
    
    const withMetadata2 = tripEngine.isTributeBand('Test Band 2', metadataTest2);
    console.log(`✅ With metadata (is_tribute: false): ${withMetadata2 ? 'TRIBUTE' : 'ORIGINAL'}`);

    console.log('\n🎵 Tribute Band Filtering Test Complete!');
}

// Run the test
testTributeBandFiltering().catch(console.error); 