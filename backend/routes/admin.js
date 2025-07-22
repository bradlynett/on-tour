const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const SchedulerService = require('../services/schedulerService');
const { pool } = require('../config/database');

// Initialize scheduler service
const scheduler = new SchedulerService();

// Environment check endpoint (for debugging)
router.get('/env-check', async (req, res) => {
    try {
        // Check JWT_SECRET
        const jwtSecretSet = !!process.env.JWT_SECRET;
        
        // Check database connection
        let databaseConnected = false;
        try {
            await pool.query('SELECT 1');
            databaseConnected = true;
        } catch (dbError) {
            console.error('Database connection test failed:', dbError);
        }
        
        res.json({
            success: true,
            data: {
                jwtSecretSet,
                databaseConnected,
                nodeEnv: process.env.NODE_ENV || 'not set',
                port: process.env.PORT || 5001
            }
        });
    } catch (error) {
        console.error('Environment check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check environment',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get scheduler status
router.get('/scheduler/status', authenticateToken, (req, res) => {
    try {
        const status = scheduler.getStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('❌ Failed to get scheduler status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get scheduler status',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Manually trigger trip suggestions generation
router.post('/scheduler/trigger', authenticateToken, async (req, res) => {
    try {
        console.log('🔧 Manual trigger requested by user:', req.user.email);
        
        // Trigger the generation
        await scheduler.triggerManualGeneration();
        
        res.json({
            success: true,
            message: 'Trip suggestions generation triggered successfully'
        });
    } catch (error) {
        console.error('❌ Failed to trigger trip suggestions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to trigger trip suggestions',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

module.exports = router; 