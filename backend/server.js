// Load environment variables FIRST, before anything else
require('dotenv').config({ path: require('path').resolve('.env') });

const winston = require('winston');
// Winston logger setup
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// Debug: Check if .env file exists and what's loaded
const fs = require('fs');
const path = require('path');
const envPath = path.resolve('.env');
logger.info(`Looking for .env at: ${envPath}`);
logger.info('.env file exists: ' + fs.existsSync(envPath));

// Log key environment variables (without exposing secrets)
logger.info('Environment variables loaded:');
logger.info('  NODE_ENV: ' + (process.env.NODE_ENV || 'NOT SET'));
logger.info('  PORT: ' + (process.env.PORT || 'NOT SET'));
logger.info('  JWT_SECRET: ' + (process.env.JWT_SECRET ? 'SET (' + process.env.JWT_SECRET.length + ' chars)' : 'NOT SET'));
logger.info('  STRIPE_SECRET_KEY: ' + (process.env.STRIPE_SECRET_KEY ? 'SET (' + process.env.STRIPE_SECRET_KEY.substring(0, 7) + '...)' : 'NOT SET'));
logger.info('  SPOTIFY_CLIENT_ID: ' + (process.env.SPOTIFY_CLIENT_ID ? 'SET' : 'NOT SET'));
logger.info('  DB_HOST: ' + (process.env.DB_HOST || 'NOT SET'));

// Manual fallback for environment variables ONLY if they're not already set
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'Gh35WT34$&!arkGN5687';
    logger.info('Using fallback JWT_SECRET');
}
if (!process.env.DB_HOST) {
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5433';
    process.env.DB_NAME = 'concert_travel';
    process.env.DB_USER = 'postgres';
    process.env.DB_PASSWORD = 'password';
    logger.info('Using fallback database configuration');
}
if (!process.env.PORT) {
    process.env.PORT = '5001';
    logger.info('Using fallback PORT');
}
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
    logger.info('Using fallback NODE_ENV');
}

// Check for critical credentials
if (!process.env.STRIPE_SECRET_KEY) {
    logger.warn('⚠️  WARNING: STRIPE_SECRET_KEY not found!');
    logger.warn('Payment functionality will not work without this.');
    logger.warn('Please add STRIPE_SECRET_KEY=sk_test_your_key to your .env file');
}

if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    logger.warn('⚠️  WARNING: Spotify credentials not found!');
    logger.warn('Please set the following environment variables:');
    logger.warn('SPOTIFY_CLIENT_ID=your_spotify_client_id');
    logger.warn('SPOTIFY_CLIENT_SECRET=your_spotify_client_secret');
    logger.warn('SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/spotify');
    logger.warn('');
    logger.warn('To get these credentials:');
    logger.warn('1. Go to https://developer.spotify.com/dashboard');
    logger.warn('2. Create a new app');
    logger.warn('3. Add http://127.0.0.1:3000/spotify to Redirect URIs');
    logger.warn('4. Copy the Client ID and Client Secret');
    logger.warn('');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { pool, healthCheck } = require('./config/database');
const SchedulerService = require('./services/schedulerService');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient } = require('./redisClient'); // Use shared Redis client
const morgan = require('morgan');
const { addBackgroundJob } = require('./services/jobQueue');
const artistMetadataRouter = require('./routes/artistMetadata');

// Debug: Check if JWT_SECRET is loaded
logger.info('JWT_SECRET loaded: ' + (process.env.JWT_SECRET ? 'YES' : 'NO'));
logger.info('JWT_SECRET length: ' + (process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0));

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(compression()); // Enable gzip compression
app.use(express.json({ limit: '10mb' })); // Limit request body size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiter (e.g., 1000 requests per 15 minutes per IP for development)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased for development
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
    }),
    handler: (req, res, next, options) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many requests, please try again later.'
        });
    },
});

// Only apply rate limiter to non-localhost IPs in development
app.use((req, res, next) => {
    const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1' || req.hostname === 'localhost';
    if (process.env.NODE_ENV === 'development' && isLocalhost) {
        return next(); // Skip rate limiter for localhost in dev
    }
    apiLimiter(req, res, next);
});

// Morgan HTTP request logging
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ 
        message: 'Concert Travel App Backend API',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const dbHealth = await healthCheck();
        
        // Check Redis connection
        let redisStatus = 'healthy';
        try {
            await redisClient.ping();
        } catch (redisError) {
            redisStatus = 'unhealthy';
            logger.error('Redis health check failed:', redisError);
        }
        
        // Check memory usage
        const memUsage = process.memoryUsage();
        
        res.json({ 
            status: dbHealth.status === 'healthy' && redisStatus === 'healthy' ? 'healthy' : 'unhealthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            services: {
                database: dbHealth.database,
                redis: redisStatus,
                dbTimestamp: dbHealth.timestamp
            },
            system: {
                memory: {
                    rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
                    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
                    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
                },
                nodeVersion: process.version,
                platform: process.platform
            }
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({ 
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Routes
console.log('Loading auth routes from', require('path').resolve('./routes/auth'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/spotify', require('./routes/spotify'));
app.use('/api/events', require('./routes/events'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/travel', require('./routes/travel'));
app.use('/api/trip-planning', require('./routes/tripPlanning'));
app.use('/api/booking', require('./routes/booking'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/multi-event-trips', require('./routes/multiEventTrips'));
app.use('/api/artist-metadata', artistMetadataRouter);
app.use('/api/ticketing', require('./routes/ticketing'));
app.use('/api/2fa', require('./routes/2fa'));

// Webhook routes (must be before error handling middleware)
app.use('/api/webhooks', require('./routes/stripe-webhooks'));

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: err.message 
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.originalUrl 
    });
});

const PORT = process.env.PORT || 5001;

// Function to find an available port
const findAvailablePort = async (startPort) => {
    const net = require('net');
    
    const isPortAvailable = (port) => {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.listen(port, () => {
                server.once('close', () => {
                    resolve(true);
                });
                server.close();
            });
            server.on('error', () => {
                resolve(false);
            });
        });
    };
    
    let port = startPort;
    while (!(await isPortAvailable(port))) {
        logger.warn(`⚠️  Port ${port} is in use, trying ${port + 1}...`);
        port++;
        if (port > startPort + 10) {
            throw new Error(`No available ports found between ${startPort} and ${startPort + 10}`);
        }
    }
    return port;
};

// Start server with port conflict handling
const startServer = async () => {
    try {
        const availablePort = await findAvailablePort(PORT);
        
        app.listen(availablePort, () => {
            logger.info(`🚀 Server running on port ${availablePort}`);
            logger.info(`📱 Health check: http://localhost:${availablePort}/health`);
            logger.info(`🌐 API base: http://localhost:${availablePort}/api`);
            
            // Update environment variable for other parts of the app
            process.env.CURRENT_PORT = availablePort.toString();
            
            // Initialize scheduler service
            const scheduler = new SchedulerService();
            scheduler.scheduleTripSuggestions();
            scheduler.scheduleEventSyncing();
            logger.info('🕐 Trip suggestions and event syncing schedulers initialized');

            // Add a sample background job
            addBackgroundJob('example', { message: 'Hello from BullMQ!' })
                .then(() => logger.info('Sample background job added to BullMQ queue'))
                .catch(err => logger.error('Failed to add sample job to BullMQ:', err));
        });
    } catch (error) {
        logger.error(`❌ Failed to start server: ${error.message}`);
        process.exit(1);
    }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    pool.end();
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    pool.end();
    process.exit(0);
}); 