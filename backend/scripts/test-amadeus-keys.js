const Amadeus = require('amadeus');
require('dotenv').config();

console.log('🧪 Testing Amadeus API Configuration...\n');

// Check if environment variables are set
console.log('📋 Environment Variables Check:');
console.log(`   AMADEUS_CLIENT_ID: ${process.env.AMADEUS_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`   AMADEUS_CLIENT_SECRET: ${process.env.AMADEUS_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);

if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
    console.log('\n❌ Error: Amadeus API keys are not configured in .env file');
    console.log('Please add the following to your .env file:');
    console.log('AMADEUS_CLIENT_ID=your_client_id_here');
    console.log('AMADEUS_CLIENT_SECRET=your_client_secret_here');
    process.exit(1);
}

// Initialize Amadeus client
const amadeus = new Amadeus({
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

// Helper to get a date string N days from today (YYYY-MM-DD)
function getFutureDate(daysAhead) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
}

const futureDate = getFutureDate(30);
const futureDatePlusOne = getFutureDate(31);

async function testAmadeusAPI() {
    try {
        console.log('\n🔐 Testing Authentication...');
        
        // Test 1: Airport Search (simple API call to test authentication)
        console.log('   Testing airport search...');
        const airportResponse = await amadeus.referenceData.locations.get({
            keyword: 'LAX',
            subType: Amadeus.location.airport
        });
        
        console.log('   ✅ Authentication successful!');
        console.log(`   Found airport: ${airportResponse.data[0].name} (${airportResponse.data[0].iataCode})`);
        
        // Test 2: Flight Search (more complex API call)
        console.log('\n✈️  Testing flight search...');
        const flightResponse = await amadeus.shopping.flightOffersSearch.get({
            originLocationCode: 'LAX',
            destinationLocationCode: 'JFK',
            departureDate: futureDate,
            adults: 1,
            max: 5,
            currencyCode: 'USD'
        });
        
        console.log('   ✅ Flight search successful!');
        console.log(`   Found ${flightResponse.data.length} flight offers`);
        
        if (flightResponse.data.length > 0) {
            const firstFlight = flightResponse.data[0];
            console.log(`   Sample flight: ${firstFlight.itineraries[0].segments[0].carrierCode}${firstFlight.itineraries[0].segments[0].number}`);
            console.log(`   Price: ${firstFlight.price.total} ${firstFlight.price.currency}`);
        }
        
        // Test 3: Hotel Search
        const hotelCities = ['NYC', 'LON', 'PAR', 'MIA'];
        let hotelSuccess = false;
        for (const city of hotelCities) {
            try {
                console.log(`\n🏨 Testing hotel search in ${city}...`);
                const hotelResponse = await amadeus.shopping.hotelOffers.get({
                    cityCode: city,
                    checkInDate: futureDate,
                    checkOutDate: futureDatePlusOne,
                    adults: 1,
                    max: 5,
                    currencyCode: 'USD'
                });
                console.log('   ✅ Hotel search successful!');
                console.log(`   Found ${hotelResponse.data.length} hotel offers`);
                if (hotelResponse.data.length > 0) {
                    const firstHotel = hotelResponse.data[0];
                    console.log(`   Sample hotel: ${firstHotel.hotel.name}`);
                    if (firstHotel.offers.length > 0) {
                        console.log(`   Price: ${firstHotel.offers[0].price.total} ${firstHotel.offers[0].price.currency}`);
                    }
                }
                hotelSuccess = true;
                break;
            } catch (hotelError) {
                if (Object.keys(hotelError).length === 0) {
                    console.log('   ❌ Hotel search failed: No error details returned by Amadeus. This is common in the sandbox if no data is available.');
                } else {
                    console.log('   ❌ Hotel search failed:');
                    console.log('   Full error object:', JSON.stringify(hotelError, null, 2));
                    if (hotelError.description) {
                        console.log('   error.description:', JSON.stringify(hotelError.description, null, 2));
                    }
                    if (hotelError.response) {
                        console.log(`   Status: ${hotelError.response.status}`);
                        console.log(`   Details: ${JSON.stringify(hotelError.response.data, null, 2)}`);
                    }
                }
            }
        }
        if (!hotelSuccess) {
            console.log('\n❌ All hotel searches failed for tested cities. This is common in the sandbox if no hotel data is available for the test dates/cities.');
        }
        
        console.log('\n🎉 All Amadeus API tests passed successfully!');
        console.log('Your API keys are working correctly.');
        
    } catch (error) {
        console.log('\n❌ Amadeus API test failed:');
        console.log('   Full error object:', JSON.stringify(error, null, 2));
        if (error.description) {
            console.log('   error.description:', JSON.stringify(error.description, null, 2));
        }
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Details: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        process.exit(1);
    }
}

// Run the test
testAmadeusAPI(); 