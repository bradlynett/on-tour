const axios = require('axios');

async function testLogin() {
    console.log('🔍 Testing Login...');
    
    try {
        // Test login
        const loginData = {
            email: 'brad@lynett.com',
            password: 'TestPassword1'
        };
        
        console.log('Attempting login with:', { email: loginData.email, password: '***' });
        
        const response = await axios.post('http://localhost:5001/api/auth/login', loginData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Login successful!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
        if (response.data.success && response.data.data.token) {
            console.log('Token received:', response.data.data.token.substring(0, 20) + '...');
            return response.data.data.token;
        }
        
    } catch (error) {
        console.log('❌ Login failed');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Response:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error:', error.message);
        }
    }
}

testLogin(); 