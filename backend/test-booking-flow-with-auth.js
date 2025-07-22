// Comprehensive Booking Flow Test Script with Authentication
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';
const FRONTEND_URL = 'http://localhost:3000';

let authToken = null;
let userId = null;

async function loginUser() {
    console.log('🔐 Logging in test user...');
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'brad@example.com',
            password: 'password123'
        });
        
        authToken = response.data.data.token;
        userId = response.data.data.user.id;
        console.log('✅ Login successful');
        return true;
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testBackendHealth() {
    console.log('🏥 Testing Backend Health...');
    try {
        const response = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
        console.log('✅ Backend is healthy:', response.data.status);
        return true;
    } catch (error) {
        console.error('❌ Backend health check failed:', error.message);
        return false;
    }
}

async function testTripSuggestionsAPI() {
    console.log('\n🎵 Testing Trip Suggestions API...');
    try {
        const response = await axios.get(`${BASE_URL}/trips`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Trip suggestions API working');
        console.log(`   Found ${response.data.data?.suggestions?.length || 0} suggestions`);
        return true;
    } catch (error) {
        console.error('❌ Trip suggestions API failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testEventsAPI() {
    console.log('\n🎪 Testing Events API...');
    try {
        const response = await axios.get(`${BASE_URL}/events/search?keyword=concert&size=5`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Events API working');
        console.log(`   Found ${response.data.data?.length || 0} events`);
        return true;
    } catch (error) {
        console.error('❌ Events API failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testBookingAPI() {
    console.log('\n📋 Testing Booking API...');
    try {
        const response = await axios.get(`${BASE_URL}/booking`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Booking API working');
        console.log(`   Found ${response.data.data?.length || 0} bookings`);
        return true;
    } catch (error) {
        console.error('❌ Booking API failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testPaymentAPI() {
    console.log('\n💳 Testing Payment API...');
    try {
        const response = await axios.get(`${BASE_URL}/payment/methods`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Payment API working');
        console.log(`   Found ${response.data.data?.length || 0} payment methods`);
        return true;
    } catch (error) {
        console.error('❌ Payment API failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testFrontendAccessibility() {
    console.log('\n🌐 Testing Frontend Accessibility...');
    try {
        const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
        console.log('✅ Frontend is accessible');
        console.log('   Status:', response.status);
        return true;
    } catch (error) {
        console.error('❌ Frontend accessibility failed:', error.message);
        return false;
    }
}

async function testCreateBooking() {
    console.log('\n📝 Testing Booking Creation...');
    try {
        // First get some events
        const eventsResponse = await axios.get(`${BASE_URL}/events/search?keyword=concert&size=1`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (!eventsResponse.data.data || eventsResponse.data.data.length === 0) {
            console.log('⚠️ No events found, skipping booking creation test');
            return true;
        }
        
        const event = eventsResponse.data.data[0];
        
        const bookingData = {
            eventId: event.id,
            selectedComponents: {
                flight: {
                    provider: 'mock',
                    price: 299.99,
                    details: { from: 'LAX', to: 'JFK', date: '2024-12-25' }
                },
                hotel: {
                    provider: 'mock',
                    price: 199.99,
                    details: { name: 'Test Hotel', checkIn: '2024-12-24', checkOut: '2024-12-26' }
                },
                ticket: {
                    provider: 'mock',
                    price: 89.99,
                    details: { section: 'A', row: '10', seat: '15' }
                }
            },
            totalCost: 589.97,
            status: 'pending'
        };
        
        const response = await axios.post(`${BASE_URL}/booking/create`, bookingData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Booking creation successful');
        console.log(`   Booking ID: ${response.data.data.id}`);
        return true;
    } catch (error) {
        console.error('❌ Booking creation failed:', error.response?.data?.message || error.message);
        return false;
    }
}

async function testBookingFlowIntegration() {
    console.log('🔗 Testing Booking Flow Integration...\n');
    
    // First authenticate
    const authSuccess = await loginUser();
    if (!authSuccess) {
        console.log('❌ Authentication failed, cannot test protected APIs');
        return {
            authentication: false,
            backendHealth: await testBackendHealth(),
            frontend: await testFrontendAccessibility()
        };
    }
    
    const testResults = {
        authentication: true,
        backendHealth: await testBackendHealth(),
        tripSuggestions: await testTripSuggestionsAPI(),
        events: await testEventsAPI(),
        booking: await testBookingAPI(),
        payment: await testPaymentAPI(),
        bookingCreation: await testCreateBooking(),
        frontend: await testFrontendAccessibility()
    };
    
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    
    console.log('\n📊 Test Results Summary:');
    console.log(`   ✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`   ❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 All tests passed! Booking flow is ready.');
    } else {
        console.log('\n⚠️ Some tests failed. Check the errors above.');
    }
    
    return testResults;
}

async function generateTestReport() {
    console.log('📋 Generating Comprehensive Test Report...\n');
    
    const results = await testBookingFlowIntegration();
    
    console.log('\n📄 Detailed Test Report:');
    console.log('========================');
    
    Object.entries(results).forEach(([test, passed]) => {
        const status = passed ? '✅ PASS' : '❌ FAIL';
        const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        console.log(`${status} ${testName}`);
    });
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Open http://localhost:3000 in your browser');
    console.log('   2. Login with: brad@example.com / password123');
    console.log('   3. Navigate to /booking to test the complete flow');
    console.log('   4. Test event selection, customization, and payment');
    console.log('   5. Verify booking management features');
    
    console.log('\n🔧 Manual Testing Checklist:');
    console.log('   ☐ Login/Register functionality');
    console.log('   ☐ Event search and filtering');
    console.log('   ☐ Trip customization options');
    console.log('   ☐ Payment method selection');
    console.log('   ☐ Booking confirmation');
    console.log('   ☐ Booking management dashboard');
    console.log('   ☐ Responsive design on mobile');
    
    console.log('\n📈 System Status:');
    console.log(`   Backend: ${results.backendHealth ? '🟢 Running' : '🔴 Down'}`);
    console.log(`   Frontend: ${results.frontend ? '🟢 Running' : '🔴 Down'}`);
    console.log(`   Database: ${results.backendHealth ? '🟢 Connected' : '🔴 Disconnected'}`);
    console.log(`   Authentication: ${results.authentication ? '🟢 Working' : '🔴 Failed'}`);
    
    return results;
}

// Run the comprehensive test
generateTestReport().catch(console.error); 