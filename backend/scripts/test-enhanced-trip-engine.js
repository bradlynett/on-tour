// Test script for enhanced trip suggestion engine
require('dotenv').config();
const engine = require('../services/tripSuggestionEngine');
const { pool } = require('../config/database');

async function testEnhancedTripEngine() {
    console.log('🚀 Testing Enhanced Trip Suggestion Engine');
    console.log('=====================================');
    
    try {
        // Test 1: User Behavior Analysis
        console.log('\n📊 Test 1: User Behavior Analysis');
        console.log('--------------------------------');
        const userId = 1; // Test with user ID 1
        const userBehavior = await engine.analyzeUserBehavior(userId);
        console.log('User Behavior Analysis:', JSON.stringify(userBehavior, null, 2));
        
        // Test 2: Collaborative Filtering
        console.log('\n🤝 Test 2: Collaborative Filtering');
        console.log('--------------------------------');
        const interestsResult = await pool.query(`
            SELECT interest_type, interest_value, priority
            FROM user_interests 
            WHERE user_id = $1
            ORDER BY priority DESC
        `, [userId]);
        
        const collaborativeRecs = await engine.getCollaborativeRecommendations(userId, interestsResult.rows);
        console.log('Collaborative Recommendations:', JSON.stringify(collaborativeRecs, null, 2));
        
        // Test 3: Enhanced Artist Recommendations
        console.log('\n🎵 Test 3: Enhanced Artist Recommendations');
        console.log('----------------------------------------');
        const enhancedRecs = await engine.getEnhancedArtistRecommendations(userId, 5);
        console.log('Enhanced Artist Recommendations:', JSON.stringify(enhancedRecs, null, 2));
        
        // Test 4: Market Trend Analysis
        console.log('\n📈 Test 4: Market Trend Analysis');
        console.log('-------------------------------');
        const testArtists = ['Taylor Swift', 'Drake', 'Beyoncé', 'Ed Sheeran'];
        for (const artist of testArtists) {
            const trendScore = await engine.getMarketTrendScore(artist);
            console.log(`${artist}: Trend Score = ${trendScore}`);
        }
        
        // Test 5: Seasonal Factors
        console.log('\n🌤️ Test 5: Seasonal Factors');
        console.log('---------------------------');
        const testDates = [
            new Date('2024-07-15'), // Summer
            new Date('2024-12-25'), // Holiday season
            new Date('2024-02-14'), // Winter
            new Date('2024-05-15')  // Spring
        ];
        
        testDates.forEach(date => {
            const seasonalFactor = engine.getSeasonalFactor(date);
            console.log(`${date.toDateString()}: Seasonal Factor = ${seasonalFactor}`);
        });
        
        // Test 6: Pricing Value Analysis
        console.log('\n💰 Test 6: Pricing Value Analysis');
        console.log('-------------------------------');
        const testEvents = [
            { min_price: 50, max_price: 100, event_type: 'concert' },
            { min_price: 150, max_price: 300, event_type: 'festival' },
            { min_price: 30, max_price: 60, event_type: 'comedy' }
        ];
        
        for (const event of testEvents) {
            const priceValue = await engine.analyzePricingValue(event, userBehavior);
            console.log(`Event (${event.event_type}, $${event.min_price}-${event.max_price}): Price Value Score = ${priceValue}`);
        }
        
        // Test 7: Enhanced Distance Scoring
        console.log('\n📍 Test 7: Enhanced Distance Scoring');
        console.log('-----------------------------------');
        const testDistances = [25, 100, 300, 800, 1500];
        testDistances.forEach(distance => {
            const distanceScore = engine.calculateEnhancedDistanceScore(distance, userBehavior);
            console.log(`${distance} miles: Distance Score = ${distanceScore}`);
        });
        
        // Test 8: Genre Diversity
        console.log('\n🎼 Test 8: Genre Diversity');
        console.log('-------------------------');
        const testGenres = [
            ['pop', 'rock'],
            ['hip-hop', 'rap', 'r&b'],
            ['country', 'folk', 'bluegrass'],
            ['jazz', 'blues', 'soul', 'funk', 'r&b']
        ];
        
        testGenres.forEach(genres => {
            const diversity = engine.calculateGenreDiversity(genres);
            console.log(`${genres.join(', ')}: Diversity Score = ${diversity}`);
        });
        
        // Test 9: Scoring Weights
        console.log('\n⚖️ Test 9: Scoring Weights Configuration');
        console.log('--------------------------------------');
        console.log('Current Scoring Weights:', JSON.stringify(engine.scoringWeights, null, 2));
        
        // Test 10: Cache Configuration
        console.log('\n💾 Test 10: Cache Configuration');
        console.log('-----------------------------');
        console.log('Cache TTL Configuration:', JSON.stringify(engine.cacheConfig, null, 2));
        
        console.log('\n✅ All Enhanced Trip Engine Tests Completed Successfully!');
        console.log('=====================================');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testEnhancedTripEngine();
}

module.exports = { testEnhancedTripEngine }; 