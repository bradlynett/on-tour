require('dotenv').config();

console.log('🔍 Checking Environment Variables...');
console.log('=' .repeat(50));

// Check if dotenv loaded the .env file
console.log('Environment variables loaded:');
console.log('SERPAPI_KEY:', process.env.SERPAPI_KEY ? '✅ Found' : '❌ Not found');
console.log('SEATGEEK_CLIENT_ID:', process.env.SEATGEEK_CLIENT_ID ? '✅ Found' : '❌ Not found');
console.log('SEATGEEK_CLIENT_SECRET:', process.env.SEATGEEK_CLIENT_SECRET ? '✅ Found' : '❌ Not found');
console.log('TICKETMASTER_API_KEY:', process.env.TICKETMASTER_API_KEY ? '✅ Found' : '❌ Not found');
console.log('AMADEUS_CLIENT_ID:', process.env.AMADEUS_CLIENT_ID ? '✅ Found' : '❌ Not found');

if (process.env.SERPAPI_KEY) {
    console.log('\n🎯 SerpAPI Key Details:');
    console.log('Length:', process.env.SERPAPI_KEY.length);
    console.log('Starts with:', process.env.SERPAPI_KEY.substring(0, 10) + '...');
    console.log('Ends with:', '...' + process.env.SERPAPI_KEY.substring(process.env.SERPAPI_KEY.length - 4));
} else {
    console.log('\n❌ SerpAPI Key not found!');
    console.log('Please check your .env file and make sure SERPAPI_KEY is set correctly.');
}

if (process.env.SEATGEEK_CLIENT_ID && process.env.SEATGEEK_CLIENT_SECRET) {
    console.log('\n🎫 SeatGeek Credentials:');
    console.log('Client ID length:', process.env.SEATGEEK_CLIENT_ID.length);
    console.log('Client Secret length:', process.env.SEATGEEK_CLIENT_SECRET.length);
} else {
    console.log('\n❌ SeatGeek credentials not found!');
    console.log('Please check your .env file and make sure SEATGEEK_CLIENT_ID and SEATGEEK_CLIENT_SECRET are set correctly.');
} 