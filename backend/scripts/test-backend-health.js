const axios = require('axios');
const winston = require('winston');

// Create logger instance
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// Configuration
const BASE_URL = 'http://localhost:5001';

// Helper function to make requests
async function makeRequest(method, endpoint, data = null) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        if (error.response) {
            logger.error(`Request failed: ${error.response.status} - ${error.response.data.message || error.message}`);
            return error.response.data;
        } else {
            logger.error(`Request failed: ${error.message}`);
            throw error;
        }
    }
}

// Test 1: Health Check
async function testHealthCheck() {
    logger.info('🏥 Testing Health Check...');
    
    try {
        const healthResponse = await makeRequest('GET', '/health');
        if (healthResponse.status === 'ok' || healthResponse.status === 'healthy' || healthResponse.database === 'connected') {
            logger.info('✅ Health check successful');
            logger.info(`   - Status: ${healthResponse.status}`);
            logger.info(`   - Timestamp: ${healthResponse.timestamp}`);
            logger.info(`   - Uptime: ${healthResponse.uptime}`);
            return true;
        } else {
            logger.error('❌ Health check failed');
            return false;
        }
    } catch (error) {
        logger.error(`❌ Health check test failed: ${error.message}`);
        return false;
    }
}

// Test 2: Basic API Response
async function testBasicAPIResponse() {
    logger.info('🌐 Testing Basic API Response...');
    
    try {
        const apiResponse = await makeRequest('GET', '/');
        
        if (apiResponse.message && apiResponse.status) {
            logger.info('✅ Basic API response successful');
            logger.info(`   - Message: ${apiResponse.message}`);
            logger.info(`   - Status: ${apiResponse.status}`);
            logger.info(`   - Timestamp: ${apiResponse.timestamp}`);
            return true;
        } else {
            logger.error('❌ Basic API response failed');
            return false;
        }
    } catch (error) {
        logger.error(`❌ Basic API response test failed: ${error.message}`);
        return false;
    }
}

// Test 3: Travel Provider Health
async function testTravelProviderHealth() {
    logger.info('✈️ Testing Travel Provider Health...');
    
    try {
        const travelHealthResponse = await makeRequest('GET', '/travel/health');
        
        if (travelHealthResponse.status === 'ok' || travelHealthResponse.status === 'healthy') {
            logger.info('✅ Travel provider health check successful');
            logger.info(`   - Status: ${travelHealthResponse.status}`);
            if (travelHealthResponse.provider) {
                logger.info(`   - Provider: ${travelHealthResponse.provider}`);
            }
            if (travelHealthResponse.features) {
                logger.info(`   - Features: ${travelHealthResponse.features.join(', ')}`);
            }
            return true;
        } else {
            logger.error('❌ Travel provider health check failed');
            return false;
        }
    } catch (error) {
        logger.error(`❌ Travel provider health test failed: ${error.message}`);
        return false;
    }
}

// Test 4: Database Connection (via health endpoint)
async function testDatabaseConnection() {
    logger.info('🗄️ Testing Database Connection...');
    
    try {
        const healthResponse = await makeRequest('GET', '/health');
        
        if (healthResponse.database && (healthResponse.database.status === 'connected' || healthResponse.database === 'connected')) {
            logger.info('✅ Database connection successful');
            if (typeof healthResponse.database === 'string') {
                logger.info(`   - Status: ${healthResponse.database}`);
            } else {
                logger.info(`   - Status: ${healthResponse.database.status}`);
                if (healthResponse.database.tables) {
                    logger.info(`   - Tables: ${healthResponse.database.tables}`);
                }
            }
            return true;
        } else {
            logger.error('❌ Database connection failed');
            return false;
        }
    } catch (error) {
        logger.error(`❌ Database connection test failed: ${error.message}`);
        return false;
    }
}

// Main test runner
async function runHealthTests() {
    logger.info('🚀 Starting Backend Health Tests...');
    logger.info('=====================================');
    
    const tests = [
        { name: 'Health Check', fn: testHealthCheck },
        { name: 'Basic API Response', fn: testBasicAPIResponse },
        { name: 'Travel Provider Health', fn: testTravelProviderHealth },
        { name: 'Database Connection', fn: testDatabaseConnection }
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    for (const test of tests) {
        logger.info(`\n🧪 Running ${test.name}...`);
        const result = await test.fn();
        if (result) {
            passedTests++;
        }
    }
    
    logger.info('\n=====================================');
    logger.info(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        logger.info('🎉 All health tests passed! Backend is working correctly.');
        return true;
    } else {
        logger.error(`❌ ${totalTests - passedTests} health tests failed.`);
        return false;
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runHealthTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            logger.error(`❌ Test runner failed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { runHealthTests }; 