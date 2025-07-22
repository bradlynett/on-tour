const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing SerpAPI Environment Variable Loading');
console.log('=' .repeat(60));

// 1. Check if .env file exists
const envPath = path.join(__dirname, '.env');
console.log('\n1. Checking .env file...');
console.log('Path:', envPath);
console.log('Exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
    console.log('\n2. Reading .env file contents...');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    console.log('Total lines:', lines.length);
    
    // Check for SERPAPI_KEY
    let serpapiFound = false;
    let serpapiLine = '';
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
            if (trimmedLine.startsWith('SERPAPI_KEY=')) {
                serpapiFound = true;
                serpapiLine = trimmedLine;
                console.log(`✅ Found SERPAPI_KEY on line ${index + 1}`);
                console.log(`   Value: ${trimmedLine.substring(0, 20)}...`);
            }
        }
    });
    
    if (!serpapiFound) {
        console.log('❌ SERPAPI_KEY not found in .env file');
        console.log('\n3. Adding SERPAPI_KEY to .env file...');
        
        // Add SERPAPI_KEY to the end of the file
        const newLine = '\n# SerpAPI Configuration (Google Flights & Hotels)\nSERPAPI_KEY=your_serpapi_key_here\n';
        fs.appendFileSync(envPath, newLine);
        console.log('✅ Added SERPAPI_KEY placeholder to .env file');
        console.log('Please replace "your_serpapi_key_here" with your actual SerpAPI key');
    } else {
        console.log('✅ SERPAPI_KEY found in .env file');
        
        // Check if it's the placeholder value
        if (serpapiLine.includes('your_serpapi_key_here')) {
            console.log('⚠️  SERPAPI_KEY is set to placeholder value');
            console.log('Please replace "your_serpapi_key_here" with your actual SerpAPI key');
        } else {
            console.log('✅ SERPAPI_KEY appears to be set to a real value');
        }
    }
    
    // Check for other important variables
    console.log('\n4. Checking other important environment variables...');
    const importantVars = [
        'SEATGEEK_CLIENT_ID',
        'SEATGEEK_CLIENT_SECRET',
        'TICKETMASTER_API_KEY',
        'AMADEUS_CLIENT_ID',
        'AMADEUS_CLIENT_SECRET'
    ];
    
    importantVars.forEach(varName => {
        const found = lines.some(line => line.trim().startsWith(varName + '='));
        console.log(`${varName}: ${found ? '✅ Found' : '❌ Not found'}`);
    });
    
} else {
    console.log('❌ .env file not found!');
    console.log('\n3. Creating .env file...');
    
    const envContent = `# Concert Travel App Environment Variables
# Add your actual API keys and credentials below

# Database Configuration
DB_HOST=localhost
DB_PORT=5433
DB_NAME=concert_travel
DB_USER=postgres
DB_PASSWORD=password

# JWT Secret for authentication
JWT_SECRET=Gh35WT34$&!arkGN5687

# Server Configuration
PORT=5001
NODE_ENV=development

# SerpAPI Configuration (Google Flights & Hotels)
SERPAPI_KEY=your_serpapi_key_here

# SeatGeek Configuration (Tickets)
SEATGEEK_CLIENT_ID=your_seatgeek_client_id_here
SEATGEEK_CLIENT_SECRET=your_seatgeek_client_secret_here

# Ticketmaster Configuration (Tickets - Fallback)
TICKETMASTER_API_KEY=your_ticketmaster_api_key_here

# Amadeus Configuration (Flights - Fallback)
AMADEUS_CLIENT_ID=your_amadeus_client_id_here
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret_here

# Spotify Configuration (Artist Metadata)
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/spotify

# Stripe Configuration (Payments)
STRIPE_SECRET_KEY=your_stripe_secret_key_here

# Logging
LOG_LEVEL=debug
`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file with template');
    console.log('Please add your actual API keys to the .env file');
}

// 5. Test loading with dotenv
console.log('\n5. Testing dotenv loading...');
try {
    require('dotenv').config();
    console.log('✅ dotenv loaded successfully');
    console.log('SERPAPI_KEY loaded:', process.env.SERPAPI_KEY ? 'Yes' : 'No');
    
    if (process.env.SERPAPI_KEY) {
        console.log('SERPAPI_KEY length:', process.env.SERPAPI_KEY.length);
        console.log('SERPAPI_KEY starts with:', process.env.SERPAPI_KEY.substring(0, 10) + '...');
    }
} catch (error) {
    console.log('❌ Error loading dotenv:', error.message);
}

console.log('\n6. Next Steps:');
console.log('1. Make sure your .env file contains your actual SerpAPI key');
console.log('2. The key should look like: SERPAPI_KEY=abc123def456...');
console.log('3. No quotes around the key value');
console.log('4. No spaces around the = sign');
console.log('5. Run the SerpAPI test again after updating the key'); 