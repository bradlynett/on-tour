const bookingService = require('../services/bookingService');
const { pool } = require('../config/database');

async function debugBooking() {
    console.log('🔍 Debugging Booking Service...');
    
    try {
        // Step 1: Test getting event details
        console.log('\n1. Testing getEventDetails...');
        const event = await bookingService.getEventDetails(1);
        console.log('✅ Event details:', {
            id: event?.id,
            name: event?.name,
            artist: event?.artist,
            venue_city: event?.venue_city,
            event_date: event?.event_date
        });
        
        // Step 2: Test getting user travel preferences
        console.log('\n2. Testing getUserTravelPreferences...');
        const userPrefs = await bookingService.getUserTravelPreferences(20);
        console.log('✅ User preferences:', userPrefs);
        
        // Step 3: Test generating date options
        console.log('\n3. Testing generateDateOptions...');
        const dateOptions = bookingService.generateDateOptions(event.event_date, 2);
        console.log('✅ Date options:', dateOptions.length, 'options generated');
        
        // Step 4: Test getting nearest airport
        console.log('\n4. Testing getNearestAirport...');
        const airport = await bookingService.getNearestAirport(event.venue_city, event.venue_state);
        console.log('✅ Nearest airport:', airport);
        
        // Step 5: Test full trip customization
        console.log('\n5. Testing full generateTripCustomization...');
        const customization = await bookingService.generateTripCustomization(1, 20, {
            dateFlexibility: 2,
            preferences: {
                flightClass: "economy",
                hotelTier: "standard",
                includeCar: true,
                budget: 1000
            }
        });
        
        console.log('✅ Trip customization successful!');
        console.log('   Date options:', customization.dateOptions?.length || 0);
        console.log('   Flight options:', Object.keys(customization.flightOptions || {}));
        console.log('   Hotel options:', Object.keys(customization.hotelOptions || {}));
        console.log('   Bundles:', customization.bundles?.length || 0);
        
    } catch (error) {
        console.error('❌ Error in debug:', error);
        console.error('Stack trace:', error.stack);
    }
}

debugBooking(); 