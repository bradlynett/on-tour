// Test file to check rate-limit-redis exports
console.log('Testing rate-limit-redis exports...');

try {
    const rateLimitRedis = require('rate-limit-redis');
    console.log('Full module:', rateLimitRedis);
    console.log('Type of module:', typeof rateLimitRedis);
    console.log('Keys:', Object.keys(rateLimitRedis));
    
    if (rateLimitRedis.RedisStore) {
        console.log('RedisStore exists:', typeof rateLimitRedis.RedisStore);
    }
    
    const { RedisStore } = require('rate-limit-redis');
    console.log('Destructured RedisStore type:', typeof RedisStore);
    console.log('RedisStore constructor:', RedisStore.constructor.name);
    
} catch (error) {
    console.error('Error loading rate-limit-redis:', error.message);
} 