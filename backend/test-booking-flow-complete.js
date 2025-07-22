// Comprehensive Booking Flow Test Script
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';
const FRONTEND_URL = 'http://localhost:3000';

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
        const response = await axios.get(`${BASE_URL}/trips`);
        console.log('✅ Trip suggestions API working');
        console.log(`   Found ${response.data.data?.suggestions?.length || 0} suggestions`);
        return true;
    } catch (error) {
        console.error('❌ Trip suggestions API failed:', error.message);
        return false;
    }
}

async function testEventsAPI() {
    console.log('\n🎪 Testing Events API...');
    try {
        const response = await axios.get(`${BASE_URL}/events/search?keyword=concert&size=5`);
        console.log('✅ Events API working');
        console.log(`   Found ${response.data.data?.length || 0} events`);
        return true;
    } catch (error) {
        console.error('❌ Events API failed:', error.message);
        return false;
    }
}

async function testBookingAPI() {
    console.log('\n📋 Testing Booking API...');
    try {
        const response = await axios.get(`${BASE_URL}/booking`);
        console.log('✅ Booking API working');
        console.log(`   Found ${response.data.data?.length || 0} bookings`);
        return true;
    } catch (error) {
        console.error('❌ Booking API failed:', error.message);
        return false;
    }
}

async function testPaymentAPI() {
    console.log('\n💳 Testing Payment API...');
    try {
        const response = await axios.get(`${BASE_URL}/payment/methods`);
        console.log('✅ Payment API working');
        console.log(`   Found ${response.data.data?.length || 0} payment methods`);
        return true;
    } catch (error) {
        console.error('❌ Payment API failed:', error.message);
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

async function testBookingFlowIntegration() {
    console.log('\n🔗 Testing Booking Flow Integration...');
    
    const testResults = {
        backendHealth: await testBackendHealth(),
        tripSuggestions: await testTripSuggestionsAPI(),
        events: await testEventsAPI(),
        booking: await testBookingAPI(),
        payment: await testPaymentAPI(),
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
    console.log('📋 Generating Test Report...\n');
    
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
    console.log('   2. Navigate to /booking to test the complete flow');
    console.log('   3. Test event selection, customization, and payment');
    console.log('   4. Verify booking management features');
    
    console.log('\n🔧 Manual Testing Checklist:');
    console.log('   ☐ Login/Register functionality');
    console.log('   ☐ Event search and filtering');
    console.log('   ☐ Trip customization options');
    console.log('   ☐ Payment method selection');
    console.log('   ☐ Booking confirmation');
    console.log('   ☐ Booking management dashboard');
    console.log('   ☐ Responsive design on mobile');
    
    return results;
}

// Run the comprehensive test
generateTestReport().catch(console.error); 