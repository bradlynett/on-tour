const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const redisClient = require('../redisClient');
const tripSuggestionEngine = require('../services/tripSuggestionEngine');
const { logger } = require('../utils/logger');
const os = require('os');

// Health check status
let healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
};

// Component health status
let componentHealth = {
    database: { status: 'unknown', lastCheck: null, responseTime: null },
    cache: { status: 'unknown', lastCheck: null, responseTime: null },
    externalApis: { status: 'unknown', lastCheck: null, responseTime: null },
    system: { status: 'unknown', lastCheck: null, responseTime: null }
};

// Check database health
const checkDatabaseHealth = async () => {
    const startTime = Date.now();
    try {
        const result = await pool.query('SELECT 1 as health_check');
        const responseTime = Date.now() - startTime;
        
        componentHealth.database = {
            status: 'healthy',
            lastCheck: new Date().toISOString(),
            responseTime: `${responseTime}ms`,
            details: {
                connectionCount: pool.totalCount,
                idleCount: pool.idleCount,
                waitingCount: pool.waitingCount
            }
        };
        
        logger.info('Database health check passed', { responseTime });
        return true;
    } catch (error) {
        const responseTime = Date.now() - startTime;
        componentHealth.database = {
            status: 'unhealthy',
            lastCheck: new Date().toISOString(),
            responseTime: `${responseTime}ms`,
            error: error.message
        };
        
        logger.error('Database health check failed', { error: error.message, responseTime });
        return false;
    }
};

// Check Redis cache health
const checkCacheHealth = async () => {
    const startTime = Date.now();
    try {
        const testKey = 'health_check_test';
        const testValue = 'test_value';
        
        await redisClient.setex(testKey, 10, testValue);
        const retrievedValue = await redisClient.get(testKey);
        await redisClient.del(testKey);
        
        const responseTime = Date.now() - startTime;
        
        if (retrievedValue === testValue) {
            componentHealth.cache = {
                status: 'healthy',
                lastCheck: new Date().toISOString(),
                responseTime: `${responseTime}ms`,
                details: {
                    redisVersion: await redisClient.info('server').then(info => {
                        const versionMatch = info.match(/redis_version:([^\r\n]+)/);
                        return versionMatch ? versionMatch[1] : 'unknown';
                    }).catch(() => 'unknown')
                }
            };
            
            logger.info('Cache health check passed', { responseTime });
            return true;
        } else {
            throw new Error('Cache read/write test failed');
        }
    } catch (error) {
        const responseTime = Date.now() - startTime;
        componentHealth.cache = {
            status: 'unhealthy',
            lastCheck: new Date().toISOString(),
            responseTime: `${responseTime}ms`,
            error: error.message
        };
        
        logger.error('Cache health check failed', { error: error.message, responseTime });
        return false;
    }
};

// Check external APIs health
const checkExternalApisHealth = async () => {
    const startTime = Date.now();
    try {
        // Check if we can access external APIs (simplified check)
        const apis = [
            { name: 'Spotify API', url: 'https://api.spotify.com/v1' },
            { name: 'Ticketmaster API', url: 'https://app.ticketmaster.com/discovery/v2' },
            { name: 'Amadeus API', url: 'https://test.api.amadeus.com/v1' }
        ];
        
        const results = await Promise.allSettled(
            apis.map(async (api) => {
                try {
                    const response = await fetch(api.url, { 
                        method: 'HEAD',
                        timeout: 5000 
                    });
                    return { name: api.name, status: response.status < 500 ? 'healthy' : 'unhealthy' };
                } catch (error) {
                    return { name: api.name, status: 'unhealthy', error: error.message };
                }
            })
        );
        
        const responseTime = Date.now() - startTime;
        const healthyApis = results.filter(result => 
            result.status === 'fulfilled' && result.value.status === 'healthy'
        ).length;
        
        componentHealth.externalApis = {
            status: healthyApis > 0 ? 'healthy' : 'unhealthy',
            lastCheck: new Date().toISOString(),
            responseTime: `${responseTime}ms`,
            details: {
                totalApis: apis.length,
                healthyApis,
                apiStatus: results.map(result => 
                    result.status === 'fulfilled' ? result.value : { name: 'Unknown', status: 'error' }
                )
            }
        };
        
        logger.info('External APIs health check completed', { 
            responseTime, 
            healthyApis, 
            totalApis: apis.length 
        });
        return healthyApis > 0;
    } catch (error) {
        const responseTime = Date.now() - startTime;
        componentHealth.externalApis = {
            status: 'unhealthy',
            lastCheck: new Date().toISOString(),
            responseTime: `${responseTime}ms`,
            error: error.message
        };
        
        logger.error('External APIs health check failed', { error: error.message, responseTime });
        return false;
    }
};

// Check system resources
const checkSystemHealth = async () => {
    const startTime = Date.now();
    try {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsage = (usedMemory / totalMemory) * 100;
        
        const cpuUsage = os.loadavg();
        const uptime = os.uptime();
        
        const responseTime = Date.now() - startTime;
        
        // Determine system health based on resource usage
        const isHealthy = memoryUsage < 90 && cpuUsage[0] < 5; // 90% memory, 5.0 load average
        
        componentHealth.system = {
            status: isHealthy ? 'healthy' : 'warning',
            lastCheck: new Date().toISOString(),
            responseTime: `${responseTime}ms`,
            details: {
                memory: {
                    total: `${Math.round(totalMemory / 1024 / 1024 / 1024)}GB`,
                    used: `${Math.round(usedMemory / 1024 / 1024 / 1024)}GB`,
                    free: `${Math.round(freeMemory / 1024 / 1024 / 1024)}GB`,
                    usage: `${memoryUsage.toFixed(1)}%`
                },
                cpu: {
                    loadAverage: cpuUsage.map(load => load.toFixed(2)),
                    cores: os.cpus().length
                },
                uptime: `${Math.round(uptime / 3600)} hours`,
                platform: os.platform(),
                arch: os.arch(),
                nodeVersion: process.version
            }
        };
        
        logger.info('System health check completed', { 
            responseTime, 
            memoryUsage: `${memoryUsage.toFixed(1)}%`,
            cpuLoad: cpuUsage[0].toFixed(2)
        });
        return isHealthy;
    } catch (error) {
        const responseTime = Date.now() - startTime;
        componentHealth.system = {
            status: 'unhealthy',
            lastCheck: new Date().toISOString(),
            responseTime: `${responseTime}ms`,
            error: error.message
        };
        
        logger.error('System health check failed', { error: error.message, responseTime });
        return false;
    }
};

// Perform comprehensive health check
const performHealthCheck = async () => {
    const startTime = Date.now();
    
    try {
        const checks = await Promise.allSettled([
            checkDatabaseHealth(),
            checkCacheHealth(),
            checkExternalApisHealth(),
            checkSystemHealth()
        ]);
        
        const results = checks.map(check => check.status === 'fulfilled' ? check.value : false);
        const healthyComponents = results.filter(result => result === true).length;
        const totalComponents = results.length;
        
        const overallResponseTime = Date.now() - startTime;
        
        // Determine overall health status
        if (healthyComponents === totalComponents) {
            healthStatus.status = 'healthy';
        } else if (healthyComponents >= Math.ceil(totalComponents / 2)) {
            healthStatus.status = 'degraded';
        } else {
            healthStatus.status = 'unhealthy';
        }
        
        healthStatus.timestamp = new Date().toISOString();
        healthStatus.uptime = process.uptime();
        healthStatus.responseTime = `${overallResponseTime}ms`;
        healthStatus.components = {
            total: totalComponents,
            healthy: healthyComponents,
            unhealthy: totalComponents - healthyComponents
        };
        
        logger.info('Health check completed', {
            status: healthStatus.status,
            responseTime: overallResponseTime,
            healthyComponents,
            totalComponents
        });
        
        return healthStatus;
    } catch (error) {
        healthStatus.status = 'unhealthy';
        healthStatus.timestamp = new Date().toISOString();
        healthStatus.error = error.message;
        
        logger.error('Health check failed', { error: error.message });
        return healthStatus;
    }
};

// Health check endpoints
router.get('/', async (req, res) => {
    try {
        const health = await performHealthCheck();
        
        const statusCode = health.status === 'healthy' ? 200 : 
                          health.status === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json({
            success: true,
            data: health,
            components: componentHealth
        });
    } catch (error) {
        logger.error('Health check endpoint error', { error: error.message });
        res.status(503).json({
            success: false,
            message: 'Health check failed',
            error: error.message
        });
    }
});

// Quick health check (cached result)
router.get('/quick', (req, res) => {
    const cacheAge = Date.now() - new Date(healthStatus.timestamp).getTime();
    const maxCacheAge = 30000; // 30 seconds
    
    if (cacheAge < maxCacheAge) {
        // Return cached result
        const statusCode = healthStatus.status === 'healthy' ? 200 : 
                          healthStatus.status === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json({
            success: true,
            data: healthStatus,
            cached: true,
            cacheAge: `${Math.round(cacheAge / 1000)}s`
        });
    } else {
        // Perform fresh check
        performHealthCheck().then(health => {
            const statusCode = health.status === 'healthy' ? 200 : 
                              health.status === 'degraded' ? 200 : 503;
            
            res.status(statusCode).json({
                success: true,
                data: health,
                cached: false
            });
        }).catch(error => {
            res.status(503).json({
                success: false,
                message: 'Health check failed',
                error: error.message
            });
        });
    }
});

// Component-specific health checks
router.get('/database', async (req, res) => {
    try {
        const isHealthy = await checkDatabaseHealth();
        const statusCode = isHealthy ? 200 : 503;
        
        res.status(statusCode).json({
            success: isHealthy,
            data: componentHealth.database
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            message: 'Database health check failed',
            error: error.message
        });
    }
});

router.get('/cache', async (req, res) => {
    try {
        const isHealthy = await checkCacheHealth();
        const statusCode = isHealthy ? 200 : 503;
        
        res.status(statusCode).json({
            success: isHealthy,
            data: componentHealth.cache
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            message: 'Cache health check failed',
            error: error.message
        });
    }
});

router.get('/system', async (req, res) => {
    try {
        const isHealthy = await checkSystemHealth();
        const statusCode = isHealthy ? 200 : 503;
        
        res.status(statusCode).json({
            success: isHealthy,
            data: componentHealth.system
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            message: 'System health check failed',
            error: error.message
        });
    }
});

// Detailed health check with all components
router.get('/detailed', async (req, res) => {
    try {
        await performHealthCheck();
        
        const statusCode = healthStatus.status === 'healthy' ? 200 : 
                          healthStatus.status === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json({
            success: true,
            data: {
                ...healthStatus,
                components: componentHealth
            }
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            message: 'Detailed health check failed',
            error: error.message
        });
    }
});

// Force refresh health check
router.post('/refresh', async (req, res) => {
    try {
        const health = await performHealthCheck();
        
        const statusCode = health.status === 'healthy' ? 200 : 
                          health.status === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json({
            success: true,
            data: health,
            components: componentHealth,
            refreshed: true
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            message: 'Health check refresh failed',
            error: error.message
        });
    }
});

// Run periodic health checks
setInterval(performHealthCheck, 5 * 60 * 1000); // Every 5 minutes

module.exports = router; 