require('dotenv').config();

console.log('🔍 Testing Environment Variables...');
console.log('=' .repeat(40));

console.log('SERPAPI_KEY:', process.env.SERPAPI_KEY ? '✅ Found' : '❌ Not found');
console.log('TICKETMASTER_API_KEY:', process.env.TICKETMASTER_API_KEY ? '✅ Found' : '❌ Not found');
console.log('AMADEUS_CLIENT_ID:', process.env.AMADEUS_CLIENT_ID ? '✅ Found' : '❌ Not found');

if (process.env.SERPAPI_KEY) {
    console.log('\n🎯 SerpAPI Key is loaded!');
    console.log('Key starts with:', process.env.SERPAPI_KEY.substring(0, 10) + '...');
} else {
    console.log('\n❌ SerpAPI Key not found!');
    console.log('Make sure SERPAPI_KEY is in your .env file');
}

console.log('\n📁 Current directory:', process.cwd());
console.log('📄 .env file should be in:', process.cwd() + '\\.env'); 