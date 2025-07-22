const path = require('path');
const fs = require('fs');

console.log('🔍 Debugging Environment Variables...');
console.log('=' .repeat(50));

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
console.log('📁 Looking for .env file at:', envPath);
console.log('📄 File exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
    console.log('\n📋 .env file contents:');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach((line, index) => {
        if (line.trim() && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            const value = valueParts.join('=');
            console.log(`   Line ${index + 1}: ${key}=${value ? '***' : '(empty)'}`);
        }
    });
}

// Load environment variables
require('dotenv').config();

console.log('\n🔑 Environment Variables After Loading:');
console.log('SERPAPI_KEY:', process.env.SERPAPI_KEY ? '✅ Found' : '❌ Not found');
console.log('TICKETMASTER_API_KEY:', process.env.TICKETMASTER_API_KEY ? '✅ Found' : '❌ Not found');
console.log('AMADEUS_CLIENT_ID:', process.env.AMADEUS_CLIENT_ID ? '✅ Found' : '❌ Not found');

if (process.env.SERPAPI_KEY) {
    console.log('\n🎯 SerpAPI Key Details:');
    console.log('Length:', process.env.SERPAPI_KEY.length);
    console.log('Starts with:', process.env.SERPAPI_KEY.substring(0, 10) + '...');
    console.log('Ends with:', '...' + process.env.SERPAPI_KEY.substring(process.env.SERPAPI_KEY.length - 4));
} else {
    console.log('\n❌ SerpAPI Key not found!');
    console.log('💡 Troubleshooting tips:');
    console.log('1. Make sure .env file is in the backend directory');
    console.log('2. Format should be: SERPAPI_KEY=your_key_here');
    console.log('3. No spaces around = sign');
    console.log('4. No quotes around the key');
} 