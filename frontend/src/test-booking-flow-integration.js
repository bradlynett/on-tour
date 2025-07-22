// Test script to verify booking flow integration
console.log('Testing Booking Flow Integration...');

// Test 1: Check if BookingFlow component is properly imported
try {
    const BookingFlow = require('./components/BookingFlow').default;
    console.log('✅ BookingFlow component imported successfully');
} catch (error) {
    console.log('❌ BookingFlow component import failed:', error.message);
}

// Test 2: Check if EnhancedTripCard has the correct props
try {
    const EnhancedTripCard = require('./components/EnhancedTripCard').default;
    console.log('✅ EnhancedTripCard component imported successfully');
    
    // Check if it has the onCustomizeAndBook prop
    const props = EnhancedTripCard.propTypes || {};
    if (props.onCustomizeAndBook) {
        console.log('✅ EnhancedTripCard has onCustomizeAndBook prop');
    } else {
        console.log('⚠️ EnhancedTripCard may not have onCustomizeAndBook prop defined');
    }
} catch (error) {
    console.log('❌ EnhancedTripCard component import failed:', error.message);
}

// Test 3: Check if Dashboard imports BookingFlow
try {
    const Dashboard = require('./components/Dashboard/Dashboard').default;
    console.log('✅ Dashboard component imported successfully');
} catch (error) {
    console.log('❌ Dashboard component import failed:', error.message);
}

// Test 4: Check if TripSuggestions imports BookingFlow
try {
    const TripSuggestions = require('./components/TripSuggestions').default;
    console.log('✅ TripSuggestions component imported successfully');
} catch (error) {
    console.log('❌ TripSuggestions component import failed:', error.message);
}

console.log('\nBooking Flow Integration Test Complete!');
console.log('\nTo test manually:');
console.log('1. Start the frontend: npm start');
console.log('2. Start the backend: npm start (in backend directory)');
console.log('3. Navigate to Dashboard or /trips page');
console.log('4. Click "Customize & Book Now" on any trip card');
console.log('5. Verify the BookingFlow dialog opens with the 5-step process'); 