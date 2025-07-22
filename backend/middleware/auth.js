const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user and password_changed_at from DB
        const userResult = await pool.query(
            'SELECT id, email, first_name, last_name, phone, created_at, password_changed_at FROM users WHERE id = $1',
            [decoded.userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }
        const user = userResult.rows[0];
        // Invalidate token if password_changed_at is newer than in token
        if (user.password_changed_at && decoded.passwordChangedAt && new Date(user.password_changed_at) > new Date(decoded.passwordChangedAt)) {
            return res.status(401).json({ success: false, message: 'Session invalidated. Please log in again.' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Token verification failed'
            });
        }
    }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        req.user = null;
        return next();
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userResult = await pool.query(
            'SELECT id, email, first_name, last_name, phone, created_at FROM users WHERE id = $1',
            [decoded.userId]
        );
        
        req.user = userResult.rows.length > 0 ? userResult.rows[0] : null;
        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

// Generate JWT token helper function
const generateToken = async (userId) => {
    // Fetch password_changed_at from DB
    const userResult = await pool.query('SELECT password_changed_at FROM users WHERE id = $1', [userId]);
    const passwordChangedAt = userResult.rows[0]?.password_changed_at || null;
    return jwt.sign(
        { userId, passwordChangedAt },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Generate refresh token helper function
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' } // Refresh token expires in 30 days
    );
};

module.exports = {
    authenticateToken,
    optionalAuth,
    generateToken,
    generateRefreshToken
}; 