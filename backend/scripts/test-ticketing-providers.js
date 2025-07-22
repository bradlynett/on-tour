const axios = require('axios');
const UnifiedTicketingService = require('../services/unifiedTicketingService');

const BASE_URL = 'http://localhost:5001/api';
let authToken = null;

// Test data
const testEvent = {
    id: 1,
    name: 'Taylor Swift Concert',
    venue: 'MetLife Stadium',
    date: '2024-12-15'
};

async function login() {
    try {
        console.log('🔐 Logging in...');
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'test@example.com',
            password: 'password123'
        });

        if (response.data.success) {
            authToken = response.data.token;
            console.log('✅ Login successful');
            return true;
        } else {
            console.log('❌ Login failed:', response.data.message);
            return false;
        }
    } catch (error) {
        console.log('❌ Login error:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testProviderHealth() {
    console.log('\n🏥 Testing Provider Health...');
    try {
        const response = await axios.get(`${BASE_URL}/ticketing/health`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (response.data.success) {
            console.log('✅ Provider health check successful');
            console.log('Provider Status:');
            Object.entries(response.data.data).forEach(([provider, status]) => {
                const statusIcon = status.status === 'healthy' ? '✅' : 
                                 status.status === 'unavailable' ? '⚠️' : '❌';
                console.log(`   ${statusIcon} ${provider}: ${status.status}`);
                if (status.reason) console.log(`      Reason: ${status.reason}`);
                if (status.error) console.log(`      Error: ${status.error}`);
            });
            return true;
        } else {
            console.log('❌ Health check failed:', response.data.message);
            return false;
        }
    } catch (error) {
        console.log('❌ Health check error:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testAvailableProviders() {
    console.log('\n📋 Testing Available Providers...');
    try {
        const response = await axios.get(`${BASE_URL}/ticketing/providers`);

        if (response.data.success) {
            console.log('✅ Available providers check successful');
            console.log('Available Providers:', response.data.data.available);
            console.log('All Providers:', response.data.data.all);
            return true;
        } else {
            console.log('❌ Providers check failed:', response.data.message);
            return false;
        }
    } catch (error) {
        console.log('❌ Providers check error:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testTicketSearch() {
    console.log('\n🎫 Testing Ticket Search...');
    try {
        const response = await axios.get(`${BASE_URL}/ticketing/search`, {
            headers: { Authorization: `Bearer ${authToken}` },
            params: {
                eventName: testEvent.name,
                venueName: testEvent.venue,
                eventDate: testEvent.date,
                maxResults: 5
            }
        });

        if (response.data.success) {
            console.log('✅ Ticket search successful');
            console.log(`Found ${response.data.data.tickets.length} tickets`);
            console.log(`Providers searched: ${response.data.data.providers.length}`);
            
            response.data.data.providers.forEach(provider => {
                const statusIcon = provider.status === 'success' ? '✅' : '❌';
                console.log(`   ${statusIcon} ${provider.name}: ${provider.status} (${provider.count || 0} tickets)`);
            });

            if (response.data.data.tickets.length > 0) {
                console.log('\nSample ticket:');
                const sampleTicket = response.data.data.tickets[0];
                console.log(`   Provider: ${sampleTicket.provider}`);
                console.log(`   Price: $${sampleTicket.price}`);
                console.log(`   Section: ${sampleTicket.section}`);
                console.log(`   Row: ${sampleTicket.row}`);
                console.log(`   Seat: ${sampleTicket.seat}`);
            }

            return true;
        } else {
            console.log('❌ Ticket search failed:', response.data.message);
            return false;
        }
    } catch (error) {
        console.log('❌ Ticket search error:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testPriceComparison() {
    console.log('\n💰 Testing Price Comparison...');
    try {
        const response = await axios.get(`${BASE_URL}/ticketing/compare`, {
            headers: { Authorization: `Bearer ${authToken}` },
            params: {
                eventName: testEvent.name,
                venueName: testEvent.venue,
                eventDate: testEvent.date
            }
        });

        if (response.data.success) {
            console.log('✅ Price comparison successful');
            console.log('Price Ranges:');
            Object.entries(response.data.data.priceRanges).forEach(([provider, range]) => {
                console.log(`   ${provider}:`);
                console.log(`     Min: $${range.min}`);
                console.log(`     Max: $${range.max}`);
                console.log(`     Average: $${range.average.toFixed(2)}`);
                console.log(`     Count: ${range.count}`);
            });
            return true;
        } else {
            console.log('❌ Price comparison failed:', response.data.message);
            return false;
        }
    } catch (error) {
        console.log('❌ Price comparison error:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testTrendingEvents() {
    console.log('\n🔥 Testing Trending Events...');
    try {
        const response = await axios.get(`${BASE_URL}/ticketing/trending`, {
            params: { limit: 5 }
        });

        if (response.data.success) {
            console.log('✅ Trending events successful');
            console.log(`Found ${response.data.data.length} trending events`);
            return true;
        } else {
            console.log('❌ Trending events failed:', response.data.message);
            return false;
        }
    } catch (error) {
        console.log('❌ Trending events error:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testServiceDirectly() {
    console.log('\n🔧 Testing Service Directly...');
    try {
        const ticketingService = new UnifiedTicketingService();
        
        // Test provider availability
        const availableProviders = await ticketingService.getAvailableProviders();
        console.log('Available providers (direct):', availableProviders);
        
        // Test health check
        const healthStatus = await ticketingService.getProviderHealth();
        console.log('Health status (direct):', healthStatus);
        
        return true;
    } catch (error) {
        console.log('❌ Direct service test error:', error.message);
        return false;
    }
}

async function runAllTests() {
    console.log('🎵 Testing Ticketing Providers Integration\n');
    
    const tests = [
        { name: 'Login', fn: login },
        { name: 'Provider Health', fn: testProviderHealth },
        { name: 'Available Providers', fn: testAvailableProviders },
        { name: 'Ticket Search', fn: testTicketSearch },
        { name: 'Price Comparison', fn: testPriceComparison },
        { name: 'Trending Events', fn: testTrendingEvents },
        { name: 'Direct Service Test', fn: testServiceDirectly }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            console.log(`❌ ${test.name} test crashed:`, error.message);
            failed++;
        }
    }

    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

    if (failed === 0) {
        console.log('\n🎉 All tests passed! Ticketing providers are working correctly.');
    } else {
        console.log('\n⚠️ Some tests failed. Check the logs above for details.');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    runAllTests,
    testProviderHealth,
    testAvailableProviders,
    testTicketSearch,
    testPriceComparison,
    testTrendingEvents,
    testServiceDirectly
}; 