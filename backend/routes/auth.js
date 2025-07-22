// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const winston = require('winston');

// Create logger instance
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}] ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

console.log('auth.js loaded');
console.log('=== AUTH ROUTES FILE LOADED ==='); // Debug log
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { generateToken, generateRefreshToken, authenticateToken } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validation');
const crypto = require('crypto'); // Added for companion setup token
const speakeasy = require('speakeasy');
const { decrypt, encrypt } = require('../utils/encryption');
const nodemailer = require('nodemailer');

// Placeholder: configure your real email transport here
// For development, use a mock transport to prevent connection errors
const transporter = {
  sendMail: async (mailOptions) => {
    console.log('Mock email sent:', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      text: mailOptions.text
    });
    return { messageId: 'mock-message-id' };
  }
};

async function sendResetEmail(email, resetLink) {
  try {
    // Replace with your real email logic
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'no-reply@concerttravel.com',
      to: email,
      subject: 'Password Reset Request',
      text: `Reset your password: ${resetLink}`,
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`
    });
  } catch (error) {
    console.log('Email sending failed (expected in development):', error.message);
    // Don't throw error - just log it for development
  }
}

// Register endpoint
router.post('/register', validateRegister, async (req, res) => {
    console.log('=== REGISTRATION ENDPOINT HIT ==='); // Debug log
    logger.info('=== REGISTRATION ENDPOINT HIT ==='); // Debug log with winston
    console.log('REGISTRATION ENDPOINT CALLED'); // Simple log
    try {
        // Always required
        const { email, password } = req.body;
        // Optional fields
        const optionalFields = [
            'firstName', 'lastName', 'phone', 'streetAddress', 'city', 'state', 'zipCode', 'country'
        ];
        // Build columns and values arrays
        const columns = ['email', 'password_hash', 'needs_onboarding'];
        const values = [email];
        const paramIndexes = ['$1', '$2', '$3'];

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        values.push(passwordHash);
        values.push(true); // needs_onboarding = true for new users

        let paramIdx = 4; // Start from 4 since we have 3 columns already
        for (const field of optionalFields) {
            if (req.body[field] !== undefined) {
                columns.push(
                    field === 'firstName' ? 'first_name' :
                    field === 'lastName' ? 'last_name' :
                    field === 'streetAddress' ? 'street_address' :
                    field === 'zipCode' ? 'zip_code' :
                    field // phone, city, state, country
                );
                values.push(req.body[field]);
                paramIndexes.push(`$${paramIdx}`);
                paramIdx++;
            }
        }

        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Build dynamic insert query
        const insertQuery = `
            INSERT INTO users (${columns.join(', ')})
            VALUES (${paramIndexes.join(', ')})
            RETURNING id, email, first_name, last_name, phone, street_address, city, state, zip_code, country, created_at, needs_onboarding
        `;
        const result = await pool.query(insertQuery, values);
        const user = result.rows[0];
        
        console.log('Database user result:', user); // Debug log
        console.log('needs_onboarding value:', user.needs_onboarding); // Debug log
        console.log('needs_onboarding type:', typeof user.needs_onboarding); // Debug log

        // Generate tokens
        const token = await generateToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        // Set user's primary_airport in travel_preferences to the closest major airport to their home city/state
        if (user.city && user.state) {
          // Find the closest airport in the airports table
          const airportResult = await pool.query(
            `SELECT iata_code FROM airports WHERE LOWER(city) = LOWER($1) AND (state IS NULL OR LOWER(state) = LOWER($2)) LIMIT 1`,
            [user.city, user.state]
          );
          let primaryAirport = null;
          if (airportResult.rows.length > 0) {
            primaryAirport = airportResult.rows[0].iata_code;
          } else {
            // Fallback: find any airport in the state
            const stateAirportResult = await pool.query(
              `SELECT iata_code FROM airports WHERE LOWER(state) = LOWER($1) LIMIT 1`,
              [user.state]
            );
            if (stateAirportResult.rows.length > 0) {
              primaryAirport = stateAirportResult.rows[0].iata_code;
            }
          }
          if (primaryAirport) {
            await pool.query(
              `INSERT INTO travel_preferences (user_id, primary_airport) VALUES ($1, $2)
               ON CONFLICT (user_id) DO UPDATE SET primary_airport = EXCLUDED.primary_airport`,
              [user.id, primaryAirport]
            );
          }
        }

        const responseUser = {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone,
            streetAddress: user.street_address,
            city: user.city,
            state: user.state,
            zipCode: user.zip_code,
            country: user.country,
            createdAt: user.created_at,
            needsOnboarding: user.needs_onboarding
        };
        
        console.log('Response user object being sent:', responseUser); // Debug log
        console.log('needsOnboarding in response:', responseUser.needsOnboarding); // Debug log
        console.log('=== ABOUT TO SEND RESPONSE ==='); // Debug log

        res.status(201).json({
            success: true,
            message: 'User registered successfully. Please complete your profile setup.',
            data: {
                user: responseUser,
                token,
                refreshToken
            }
        });
        
        console.log('Registration response user object:', {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone,
            streetAddress: user.street_address,
            city: user.city,
            state: user.state,
            zipCode: user.zip_code,
            country: user.country,
            createdAt: user.created_at,
            needsOnboarding: user.needs_onboarding
        }); // Debug log
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Login endpoint
router.post('/login', validateLogin, async (req, res) => {
    try {
        const { email, password, totp, backupCode } = req.body;
        // Find user
        const userResult = await pool.query(
            'SELECT id, email, password_hash, first_name, last_name, phone, street_address, city, state, zip_code, country, created_at, is_2fa_enabled, totp_secret, totp_backup_codes FROM users WHERE email = $1',
            [email]
        );
        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        const user = userResult.rows[0];
        // Check password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        // If 2FA is enabled, require TOTP code or backup code
        if (user.is_2fa_enabled) {
            if (!totp && !backupCode) {
                return res.status(401).json({
                    success: false,
                    message: '2FA required',
                    twoFactorRequired: true
                });
            }
            if (totp) {
                const secret = decrypt(user.totp_secret);
                const verified = speakeasy.totp.verify({
                    secret,
                    encoding: 'base32',
                    token: totp,
                    window: 1,
                });
                if (!verified) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid 2FA code',
                        twoFactorRequired: true
                    });
                }
            } else if (backupCode) {
                if (!user.totp_backup_codes) {
                    return res.status(401).json({
                        success: false,
                        message: 'No backup codes available',
                        twoFactorRequired: true
                    });
                }
                let codes = JSON.parse(decrypt(user.totp_backup_codes));
                const codeIdx = codes.findIndex(c => c === backupCode);
                if (codeIdx === -1) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid backup code',
                        twoFactorRequired: true
                    });
                }
                // Remove used code
                codes.splice(codeIdx, 1);
                await pool.query('UPDATE users SET totp_backup_codes = $1 WHERE id = $2', [encrypt(JSON.stringify(codes)), user.id]);
            }
        }
        // Generate tokens
        const token = await generateToken(user.id);
        const refreshToken = generateRefreshToken(user.id);
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    phone: user.phone,
                    streetAddress: user.street_address,
                    city: user.city,
                    state: user.state,
                    zipCode: user.zip_code,
                    country: user.country,
                    createdAt: user.created_at
                },
                token,
                refreshToken
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    firstName: req.user.first_name,
                    lastName: req.user.last_name,
                    phone: req.user.phone,
                    streetAddress: req.user.street_address,
                    city: req.user.city,
                    state: req.user.state,
                    zipCode: req.user.zip_code,
                    country: req.user.country,
                    createdAt: req.user.created_at
                }
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }
        
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        
        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }
        
        // Verify user still exists
        const userResult = await pool.query(
            'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
            [decoded.userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const user = userResult.rows[0];
        
        // Generate new tokens
        const newToken = await generateToken(user.id);
        const newRefreshToken = generateRefreshToken(user.id);
        
        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                token: newToken,
                refreshToken: newRefreshToken
            }
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid refresh token'
        });
    }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // In a more advanced setup, you might want to blacklist the token
        // For now, we'll just return a success response
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Change password endpoint
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long'
            });
        }
        
        // Get current user with password hash
        const userResult = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );
        
        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
        
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        
        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
        
        // Update password
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newPasswordHash, req.user.id]
        );
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Create companion account endpoint
router.post('/create-companion', authenticateToken, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      streetAddress,
      city,
      state,
      zipCode,
      country,
      primaryUserId,
      tripId,
      artist,
      eventDate
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and email are required'
      });
    }

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate a temporary password and setup token
    const tempPassword = Math.random().toString(36).slice(-8);
    const setupToken = crypto.randomBytes(32).toString('hex');
    const setupTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create the companion user account
    const [result] = await pool.query(
      `INSERT INTO users (
        email, 
        password_hash, 
        first_name, 
        last_name, 
        phone, 
        street_address, 
        city, 
        state, 
        zip_code, 
        country,
        setup_token,
        setup_token_expiry,
        is_companion,
        primary_user_id,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
      [
        email,
        await bcrypt.hash(tempPassword, 10),
        firstName,
        lastName,
        phone || null,
        streetAddress || null,
        city || null,
        state || null,
        zipCode || null,
        country || 'United States',
        setupToken,
        setupTokenExpiry,
        true,
        primaryUserId,
      ]
    );

    const companionUserId = result.rows[0].id;

    // Create the relationship between primary user and companion
    await pool.query(
      `INSERT INTO user_companions (
        primary_user_id,
        companion_user_id,
        relationship_type,
        created_at
      ) VALUES ($1, $2, $3, NOW())`,
      [primaryUserId, companionUserId, 'travel_companion']
    );

    // Save companion info for future trips if requested
    await pool.query(
      `INSERT INTO saved_companions (
        user_id,
        first_name,
        last_name,
        email,
        phone,
        street_address,
        city,
        state,
        zip_code,
        country,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        primaryUserId,
        firstName,
        lastName,
        email,
        phone || null,
        streetAddress || null,
        city || null,
        state || null,
        zipCode || null,
        country || 'United States'
      ]
    );

    // Send onboarding email to companion
    const onboardingLink = `${process.env.FRONTEND_URL}/companion-setup?token=${setupToken}`;
    
    const emailContent = `
      <h2>You're invited to a concert trip!</h2>
      <p>Hi ${firstName},</p>
      <p>${req.user.first_name} ${req.user.last_name} has booked a trip for you to see <strong>${artist}</strong> on ${new Date(eventDate).toLocaleDateString()}!</p>
      <p>To complete your profile and access your trip details, please click the link below:</p>
      <p><a href="${onboardingLink}" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Complete Your Profile</a></p>
      <p>This link will expire in 24 hours.</p>
      <p>If you have any questions, please contact our support team.</p>
      <p>Enjoy your trip!</p>
      <p>The Concert Travel App Team</p>
    `;

    // Send email (you'll need to implement your email service)
    // await sendEmail(email, 'Complete Your Concert Travel Profile', emailContent);

    // For now, log the email content
    console.log('Companion onboarding email would be sent to:', email);
    console.log('Onboarding link:', onboardingLink);

    res.json({
      success: true,
      message: 'Companion account created successfully',
      data: {
        companionUserId,
        email,
        setupToken
      }
    });

  } catch (error) {
    console.error('Error creating companion account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create companion account'
    });
  }
});

// Companion setup endpoint (for completing profile)
router.post('/companion-setup', async (req, res) => {
  try {
    const { token, password, interests } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required'
      });
    }

    // Find user by setup token
    const [users] = await pool.query(
      'SELECT id, email, setup_token_expiry FROM users WHERE setup_token = $1 AND is_companion = 1',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired setup token'
      });
    }

    const user = users[0];

    // Check if token is expired
    if (new Date() > new Date(user.setup_token_expiry)) {
      return res.status(400).json({
        success: false,
        message: 'Setup token has expired'
      });
    }

    // Update user with new password and clear setup token
    await pool.query(
      'UPDATE users SET password_hash = $1, setup_token = NULL, setup_token_expiry = NULL, profile_completed = 1 WHERE id = $2',
      [await bcrypt.hash(password, 10), user.id]
    );

    // Save interests if provided
    if (interests && interests.length > 0) {
      for (const interest of interests) {
        await pool.query(
          'INSERT INTO user_interests (user_id, interest, created_at) VALUES ($1, $2, NOW())',
          [user.id, interest]
        );
      }
    }

    res.json({
      success: true,
      message: 'Profile setup completed successfully'
    });

  } catch (error) {
    console.error('Error in companion setup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete profile setup'
    });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (!userResult.rows.length) {
    // Do not reveal if user exists
    return res.json({ success: true });
  }
  const userId = userResult.rows[0].id;
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await pool.query('UPDATE users SET password_reset_token = $1, password_reset_expiry = $2 WHERE id = $3', [token, expiry, userId]);
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  await sendResetEmail(email, resetLink);
  res.json({ success: true });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
  const userResult = await pool.query('SELECT id, password_reset_expiry FROM users WHERE password_reset_token = $1', [token]);
  if (!userResult.rows.length) return res.status(400).json({ error: 'Invalid or expired token' });
  const user = userResult.rows[0];
  if (!user.password_reset_expiry || new Date(user.password_reset_expiry) < new Date()) {
    return res.status(400).json({ error: 'Token expired' });
  }
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);
  await pool.query('UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expiry = NULL, password_changed_at = NOW() WHERE id = $2', [passwordHash, user.id]);
  res.json({ success: true });
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Old and new password required' });
  const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!userResult.rows.length) return res.status(400).json({ error: 'User not found' });
  const user = userResult.rows[0];
  const isValid = await bcrypt.compare(oldPassword, user.password_hash);
  if (!isValid) return res.status(400).json({ error: 'Incorrect old password' });
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);
  await pool.query('UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2', [passwordHash, userId]);
  res.json({ success: true });
});

// POST /api/auth/check-email
router.post('/check-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  res.json({ exists: userResult.rows.length > 0 });
});

module.exports = router;